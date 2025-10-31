const axios = require('axios');

/**
 * YallaPay Ödeme Entegrasyonu
 * 
 * Başlamadan önce:
 * 1. YallaPay hesabı oluşturun
 * 2. Merchant Dashboard'dan private key alın
 * 3. Webhook URL'inizi ayarlayın
 */
class YallaPayService {
  constructor(config) {
    this.config = config || {};
    const requiredFields = ['privateKey', 'currency'];
    for (let field of requiredFields) {
      if (!config[field]) throw new Error(`Missing required field: ${field}`);
    }

    this.privateKey = config.privateKey;
    this.currency = config.currency;
    this.baseUrl = config.baseUrl || 'https://yallapay.net/api';
    this.webhookSecret = config.webhookSecret || '';
    this.debug = config.debug || false;
  }

  /**
   * Ödeme bağlantısı oluşturur
   * 
   * @param {Object} paymentDetails - Ödeme detayları
   * @returns {Promise<Object>} Ödeme sonucu
   */
  async createPayment(paymentDetails) {
    try {
      // Zorunlu alanları kontrol et
      let requiredData = ['amount', 'purpose', 'external_id'];
      for (let data of requiredData) {
        if (!paymentDetails[data]) throw new Error(`Missing required data: ${data}`);
      }

      // Form verilerini hazırla
      const formData = new FormData();
      formData.append('private_key', this.privateKey);
      formData.append('currency', paymentDetails.currency || this.currency);
      formData.append('amount', paymentDetails.amount);
      formData.append('purpose', paymentDetails.purpose);
      formData.append('external_id', paymentDetails.external_id);
      
      // İsteğe bağlı parametreler
      if (paymentDetails.is_fallback) {
        formData.append('is_fallback', paymentDetails.is_fallback);
        if (paymentDetails.is_fallback === '1' && paymentDetails.fallback_url) {
          formData.append('fallback_url', paymentDetails.fallback_url);
        }
      }
      
      if (paymentDetails.store_id) {
        formData.append('store_id', paymentDetails.store_id);
      }

      // Debug modunda istek detaylarını göster
      if (this.debug) {
        console.log('YallaPay ödeme isteği hazırlanıyor:', Object.fromEntries(formData));
      }
      
      // API isteği gönder
      const response = await axios({
        method: 'POST',
        url: `${this.baseUrl}/request`,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        data: Object.fromEntries(formData)
      });

      const responseData = response.data;

      // Debug modunda yanıt detaylarını göster
      if (this.debug) {
        console.log('YallaPay API yanıtı:', responseData);
      }

      // Hata kontrolü
      if (responseData.status !== "success") {
        throw new Error(`YallaPay API error: ${responseData.message || 'Unknown error'}`);
      }

      // QR kod oluştur (isteğe bağlı)
      let qrCode = null;
      if (paymentDetails.generateQr && responseData.data.checkout_url) {
        qrCode = await this.generateQrCode(responseData.data.checkout_url);
      }

      // Başarılı yanıt
      return {
        status: 'success',
        data: {
          transactionId: responseData.data.transaction_id,
          url: responseData.data.checkout_url,
          fallbackUrl: responseData.data.fallback_url || null,
          id: responseData.data.transaction_id,
          qr: qrCode
        }
      };
    } catch (error) {
      if (this.debug) {
        console.error('YallaPay API hatası:', error);
      }
      
      if (error.response) {
        console.error('Hata detayları:', {
          statusCode: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
        throw new Error(`YallaPay API error (${error.response.status}): ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        console.error('Yanıt alınamadı:', error.request);
        throw new Error('No response received from YallaPay API');
      } else {
        throw new Error(`Error in YallaPay payment creation: ${error.message}`);
      }
    }
  }

  /**
   * İşlem durumunu doğrular
   * 
   * @param {string} transactionId - YallaPay işlem ID'si
   * @returns {Promise<Object>} İşlem durumu
   */
  async verifyTransaction(transactionId) {
    try {
      if (!transactionId) {
        throw new Error("Transaction ID is required");
      }

      // Form verilerini hazırla
      const formData = new FormData();
      formData.append('private_key', this.privateKey);
      formData.append('trx_id', transactionId);

      // API isteği gönder
      const response = await axios({
        method: 'POST',
        url: `${this.baseUrl}/transaction/verify`,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        data: Object.fromEntries(formData)
      });

      const responseData = response.data;

      // Debug modunda yanıt detaylarını göster
      if (this.debug) {
        console.log('YallaPay doğrulama yanıtı:', responseData);
      }

      // Hata kontrolü
      if (responseData.status !== "success") {
        throw new Error(`YallaPay verification error: ${responseData.message || 'Unknown error'}`);
      }

      // İşlem durumunu belirle
      let status = this.mapTransactionStatus(responseData.data.status);

      return {
        status: status,
        transaction: {
          id: responseData.data.transaction_id,
          external_id: responseData.data.external_id,
          amount: responseData.data.amount,
          net_amount: responseData.data.net_amount,
          currency: responseData.data.currency,
          payment_method: responseData.data.payment_method,
          payment_date: responseData.data.payment_date,
          status_code: responseData.data.status,
          status: status
        }
      };
    } catch (error) {
      if (this.debug) {
        console.error('YallaPay doğrulama hatası:', error);
      }
      throw new Error(`Error in YallaPay transaction verification: ${error.message}`);
    }
  }

  /**
   * Webhook callback'ini işler
   * 
   * @param {Object} webhookData - Webhook verileri
   * @returns {Promise<Object>} İşlem sonucu
   */
  async handleWebhook(webhookData) {
    try {
      // Debug modunda webhook verilerini göster
      if (this.debug) {
        console.log('YallaPay webhook verileri:', webhookData);
      }

      // Webhook verilerini doğrula
      if (!webhookData.transaction_id || !webhookData.webhook_secret) {
        throw new Error("Missing required fields in webhook data");
      }

      // Webhook secret'ı doğrula
      if (this.webhookSecret && webhookData.webhook_secret !== this.webhookSecret) {
        throw new Error("Invalid webhook secret");
      }

      // İşlem durumunu belirle
      let status = this.mapTransactionStatus(webhookData.status);

      // İşlem durumuna göre yanıt döndür
      return {
        status: status,
        orderId: webhookData.external_id,
        merchant_oid: webhookData.transaction_id,
        amount: webhookData.amount,
        net_amount: webhookData.net_amount,
        currency: webhookData.currency,
        paymentType: webhookData.payment_method,
        payment_date: webhookData.payment_date
      };
    } catch (error) {
      if (this.debug) {
        console.error('YallaPay webhook işleme hatası:', error);
      }
      throw new Error(`Error in YallaPay webhook handling: ${error.message}`);
    }
  }

  /**
   * YallaPay durum kodunu anlaşılır ifadelere dönüştürür
   * 
   * @param {number} statusCode - YallaPay durum kodu
   * @returns {string} Durum açıklaması
   */
  mapTransactionStatus(statusCode) {
    const statusMap = {
      0: 'failed',
      1: 'success',
      3: 'refunded',
      4: 'disputed',
      5: 'initiated'
    };
    
    return statusMap[statusCode] || 'unknown';
  }

  /**
   * Ödeme bağlantısı için QR kod oluşturur
   * 
   * @param {string} paymentUrl - Ödeme URL'i
   * @returns {Promise<string|null>} Base64 formatında QR kod
   */
  async generateQrCode(paymentUrl) {
    try {
      const response = await axios.get('https://api.qrserver.com/v1/create-qr-code/', {
        params: {
          size: '300x300',
          data: paymentUrl
        },
        responseType: 'arraybuffer'
      });
      
      const base64Image = Buffer.from(response.data, 'binary').toString('base64');
      return `data:image/png;base64,${base64Image}`;
    } catch (error) {
      console.error('QR kod oluşturma hatası:', error);
      return null;
    }
  }
}

module.exports = YallaPayService;
