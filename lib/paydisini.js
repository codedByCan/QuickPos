const axios = require('axios');
const crypto = require('crypto');
const querystring = require('querystring');

class Paydisini {
  constructor(config) {
    this.config = config || {};
    const requiredFields = ['apiKey'];
    
    for (let field of requiredFields) {
      if (!config[field]) throw new Error(`Missing required field: ${field}`);
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.paydisini.co.id/v1/';
    this.debug = config.debug || false;
  }

  async createPayment(paymentDetails) {
    try {
      // Zorunlu alanları kontrol et
      const requiredData = ['amount', 'uniqueCode', 'note'];
      for (let data of requiredData) {
        if (!paymentDetails[data]) throw new Error(`Missing required data: ${data}`);
      }

      // Default değerler ayarla
      const service = paymentDetails.service || '11'; // Default QRIS
      const validTime = paymentDetails.validTime || '1800';
      const typeFee = paymentDetails.typeFee || '1';
      const paymentGuide = paymentDetails.paymentGuide !== undefined ? paymentDetails.paymentGuide : true;
      const returnUrl = paymentDetails.returnUrl || '';

      // İmza oluştur
      const signature = this.generateSignature(
        this.apiKey, 
        paymentDetails.uniqueCode, 
        service, 
        paymentDetails.amount
      );

      // Form verilerini hazırla
      const formData = {
        key: this.apiKey,
        request: 'new',
        unique_code: paymentDetails.uniqueCode,
        service: service,
        amount: paymentDetails.amount,
        note: paymentDetails.note,
        valid_time: validTime,
        type_fee: typeFee,
        payment_guide: paymentGuide ? 'TRUE' : 'FALSE',
        signature: signature,
        return_url: returnUrl
      };

      if (this.debug) {
        console.log('Paydisini request data:', formData);
      }

      // API isteği yap
      const response = await axios({
        method: 'post',
        url: this.baseUrl,
        data: querystring.stringify(formData),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });

      const responseData = response.data;

      if (this.debug) {
        console.log('Paydisini response:', responseData);
      }

      if (responseData.success) {
        return {
          status: 'success',
          data: {
            uniqueCode: paymentDetails.uniqueCode,
            paymentId: responseData.id,
            trxid: responseData.trxid,
            amount: responseData.amount,
            service: responseData.payment || responseData.service,
            serviceName: responseData.service_name,
            note: responseData.note,
            url: responseData.url || responseData.payment_url,
            expired: responseData.expired,
            qrCode: responseData.qrcode_url,
            qrString: responseData.qrstring,
            payNumber: responseData.pay_number,
            total: responseData.total
          }
        };
      } else {
        return {
          status: 'fail',
          message: responseData.msg || 'Payment creation failed',
          error: responseData
        };
      }
    } catch (error) {
      if (error.response) {
        if (this.debug) {
          console.error('Paydisini API error response:', error.response.data);
        }
        throw new Error(`Paydisini API error: ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        throw new Error('No response received from Paydisini API');
      } else {
        throw new Error(`Error in Paydisini payment creation: ${error.message}`);
      }
    }
  }

  // İşlem durumu sorgulama
  async checkStatus(transactionId) {
    try {
      const signature = this.generateSignature(
        this.apiKey,
        transactionId,
        '',
        ''
      );

      const formData = {
        key: this.apiKey,
        request: 'status',
        trxid: transactionId,
        signature: signature
      };

      if (this.debug) {
        console.log('Paydisini status check request:', formData);
      }

      const response = await axios({
        method: 'post',
        url: this.baseUrl,
        data: querystring.stringify(formData),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (this.debug) {
        console.log('Paydisini status response:', response.data);
      }

      return response.data;
    } catch (error) {
      if (this.debug) {
        console.error('Paydisini status check error:', error);
      }
      throw new Error(`Error checking transaction status: ${error.message}`);
    }
  }

  async handleCallback(callbackData) {
    try {
      if (this.debug) {
        console.log('Processing Paydisini callback data:', callbackData);
      }

      // Gerekli alanları kontrol et
      if (!callbackData.key || !callbackData.unique_code || !callbackData.status || !callbackData.signature) {
        throw new Error('Missing required callback parameters');
      }

      // Gelen anahtarı kontrol et
      if (callbackData.key !== this.apiKey) {
        throw new Error('Invalid API key in callback');
      }

      // IP adresini beyaz listeden kontrol etmek için (opsiyonel)
      // const whitelistedIPs = ['45.87.242.188']; // Paydisini IP adresi
      // if (!whitelistedIPs.includes(ipAddress)) {
      //   throw new Error('Invalid IP address for callback');
      // }

      // İmzayı doğrula
      const expectedSignature = this.generateCallbackSignature(
        this.apiKey,
        callbackData.unique_code,
        'CallbackStatus'
      );

      if (callbackData.signature !== expectedSignature) {
        throw new Error('Invalid signature in callback');
      }

      // İşlem durumunu kontrol et
      if (callbackData.status === 'Success') {
        return {
          status: 'success',
          orderId: callbackData.unique_code,
          trxid: callbackData.trxid || '',
          amount: parseFloat(callbackData.amount || '0'),
          service: callbackData.payment || callbackData.service || '',
          serviceName: callbackData.service_name || '',
          date: callbackData.date || new Date().toISOString()
        };
      } else {
        throw new Error(`Payment failed with status: ${callbackData.status}`);
      }
    } catch (error) {
      if (this.debug) {
        console.error('Callback handling error:', error);
      }
      throw new Error(`Error in Paydisini callback handling: ${error.message}`);
    }
  }

  // Ödeme oluşturma için imza
  generateSignature(apiKey, uniqueCode, service, amount) {
    return crypto
      .createHash('md5')
      .update(apiKey + uniqueCode + service + amount)
      .digest('hex');
  }

  // Callback için imza
  generateCallbackSignature(apiKey, uniqueCode, suffix) {
    return crypto
      .createHash('md5')
      .update(apiKey + uniqueCode + suffix)
      .digest('hex');
  }

  // Servisleri listele
  async getServices() {
    try {
      const signature = crypto
        .createHash('md5')
        .update(this.apiKey + 'services')
        .digest('hex');

      const formData = {
        key: this.apiKey,
        request: 'services',
        signature: signature
      };

      const response = await axios({
        method: 'post',
        url: this.baseUrl,
        data: querystring.stringify(formData),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error) {
      throw new Error(`Error getting services: ${error.message}`);
    }
  }

  // Bakiye sorgulama
  async getBalance() {
    try {
      const signature = crypto
        .createHash('md5')
        .update(this.apiKey + 'balance')
        .digest('hex');

      const formData = {
        key: this.apiKey,
        request: 'balance',
        signature: signature
      };

      const response = await axios({
        method: 'post',
        url: this.baseUrl,
        data: querystring.stringify(formData),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error) {
      throw new Error(`Error checking balance: ${error.message}`);
    }
  }
}

module.exports = Paydisini;
