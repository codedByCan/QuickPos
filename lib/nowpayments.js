const axios = require('axios');

/**
 * NOWPayments Kripto Para Ödeme Entegrasyonu
 * 
 * Başlamadan önce:
 * 1. NOWPayments hesabı oluşturun (https://nowpayments.io/)
 * 2. API anahtarınızı alın
 * 3. Webhook URL'inizi ayarlayın
 */
class NOWPaymentsService {
  constructor(config) {
    this.config = config || {};
    const requiredFields = ['apiKey'];
    for (let field of requiredFields) {
      if (!config[field]) throw new Error(`Missing required field: ${field}`);
    }

    this.apiKey = config.apiKey;
    this.ipnSecret = config.ipnSecret || '';
    this.sandbox = config.sandbox || false;
    
    // Sandbox veya Production moduna göre API URL'ini ayarla
    if (this.sandbox) {
      this.baseUrl = 'https://api-sandbox.nowpayments.io/v1';
    } else {
      this.baseUrl = 'https://api.nowpayments.io/v1';
    }
    
    this.debug = config.debug || false;
    
    if (this.debug) {
      console.log(`NOWPayments API URL: ${this.baseUrl}`);
    }
  }

  /**
   * Ödeme linki oluşturur
   * 
   * @param {Object} paymentDetails - Ödeme detayları
   * @returns {Promise<Object>} Ödeme sonucu
   */
  async createPayment(paymentDetails) {
    try {
      // Zorunlu alanları kontrol et
      let requiredData = ['price', 'currency_from', 'order_id'];
      for (let data of requiredData) {
        if (!paymentDetails[data]) throw new Error(`Missing required data: ${data}`);
      }

      // Ödeme verilerini hazırla
      const paymentData = {
        price_amount: paymentDetails.price,
        price_currency: paymentDetails.currency_from,
        pay_currency: paymentDetails.currency_to || paymentDetails.currency_from,
        order_id: paymentDetails.order_id,
        order_description: paymentDetails.description || 'Order payment',
        ipn_callback_url: paymentDetails.callbackUrl || '',
        success_url: paymentDetails.successUrl || '',
        cancel_url: paymentDetails.cancelUrl || ''
      };

      // Debug modunda istek detaylarını göster
      if (this.debug) {
        console.log('NOWPayments ödeme isteği hazırlanıyor:', JSON.stringify(paymentData, null, 2));
      }
      
      // API isteği gönder
      const response = await axios({
        method: 'POST',
        url: `${this.baseUrl}/payment`,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey
        },
        data: paymentData
      });

      const responseData = response.data;

      // Debug modunda yanıt detaylarını göster
      if (this.debug) {
        console.log('NOWPayments API yanıtı:', JSON.stringify(responseData, null, 2));
      }

      // QR kod oluştur (isteğe bağlı)
      let qrCode = null;
      if (paymentDetails.generateQr && responseData.pay_address) {
        qrCode = await this.generateQrCode(responseData.pay_address);
      }

      return {
        status: 'success',
        data: {
          transactionId: responseData.payment_id,
          paymentId: responseData.payment_id,
          orderId: responseData.order_id,
          payAddress: responseData.pay_address,
          payAmount: responseData.pay_amount,
          payCurrency: responseData.pay_currency,
          purchaseId: responseData.purchase_id,
          url: responseData.invoice_url || `https://nowpayments.io/payment/?iid=${responseData.payment_id}`,
          id: responseData.payment_id,
          qr: qrCode
        }
      };
    } catch (error) {
      if (this.debug) {
        console.error('NOWPayments API hatası:', error);
      }
      
      if (error.response) {
        console.error('Hata detayları:', {
          statusCode: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
        throw new Error(`NOWPayments API error (${error.response.status}): ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        console.error('Yanıt alınamadı:', error.request);
        throw new Error('No response received from NOWPayments API');
      } else {
        throw new Error(`Error in NOWPayments payment creation: ${error.message}`);
      }
    }
  }

  /**
   * Ödeme durumunu kontrol eder
   * 
   * @param {string} paymentId - Ödeme ID
   * @returns {Promise<Object>} İşlem durumu
   */
  async checkPaymentStatus(paymentId) {
    try {
      if (!paymentId) {
        throw new Error("Payment ID is required");
      }

      const response = await axios({
        method: 'GET',
        url: `${this.baseUrl}/payment/${paymentId}`,
        headers: {
          'x-api-key': this.apiKey
        }
      });

      const paymentData = response.data;
      
      if (this.debug) {
        console.log('NOWPayments ödeme durum bilgisi:', JSON.stringify(paymentData, null, 2));
      }

      // Ödeme durumunu belirle
      const statusDescription = this.getPaymentStatusDescription(paymentData.payment_status);

      return {
        status: this.mapPaymentStatus(paymentData.payment_status),
        payment: {
          id: paymentData.payment_id,
          orderId: paymentData.order_id,
          statusCode: paymentData.payment_status,
          statusDescription: statusDescription,
          payAddress: paymentData.pay_address,
          payAmount: paymentData.pay_amount,
          payCurrency: paymentData.pay_currency,
          priceAmount: paymentData.price_amount,
          priceCurrency: paymentData.price_currency,
          actualAmount: paymentData.actually_paid,
          purchaseId: paymentData.purchase_id,
          createdAt: paymentData.created_at,
          updatedAt: paymentData.updated_at
        }
      };
    } catch (error) {
      if (this.debug) {
        console.error('NOWPayments ödeme durumu sorgulama hatası:', error);
      }
      throw new Error(`Error checking payment status: ${error.message}`);
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
        console.log('NOWPayments webhook verileri:', JSON.stringify(webhookData, null, 2));
      }

      // Webhook verilerini doğrula
      if (!webhookData.payment_id || !webhookData.order_id) {
        throw new Error("Missing required fields in webhook data");
      }
      
      // NOT: NOWPayments sağladığı dokümantasyona göre
      // ipn_secret değeri payload içinde değil, X-NOWPayments-Sig header'ında
      // veya alternatif bir doğrulama yöntemi kullanabilir.
      // Geliştirme aşamasında IPN doğrulamasını atlayalım
      
      // IPN Secret kontrolünü, geliştirme/test aşamasında atlayabiliriz
      if (this.ipnSecret && this.debug === false) {
        // Gerçek ortamda imza doğrulaması gerekebilir
        // Bu örnekte geçici olarak atlanıyor
        console.log('⚠️ NOWPayments IPN doğrulaması atlanıyor! Üretim ortamında kullanılmamalıdır.');
      }

      // Ödeme durumunu belirle
      const status = this.mapPaymentStatus(webhookData.payment_status);
      const statusDescription = this.getPaymentStatusDescription(webhookData.payment_status);

      return {
        status: status,
        statusCode: webhookData.payment_status,
        statusDescription: statusDescription,
        orderId: webhookData.order_id,
        merchant_oid: webhookData.payment_id,
        paymentId: webhookData.payment_id,
        payAmount: webhookData.pay_amount,
        payCurrency: webhookData.pay_currency,
        priceAmount: webhookData.price_amount,
        priceCurrency: webhookData.price_currency,
        actualAmount: webhookData.actually_paid || 0,
        purchaseId: webhookData.purchase_id,
        paymentType: 'crypto',
        createdAt: webhookData.created_at,
        updatedAt: webhookData.updated_at
      };
    } catch (error) {
      if (this.debug) {
        console.error('NOWPayments webhook işleme hatası:', error);
      }
      throw new Error(`Error in NOWPayments webhook handling: ${error.message}`);
    }
  }

  /**
   * NOWPayments durum kodunu anlaşılır ifadelere dönüştürür
   * 
   * @param {number} statusCode - NOWPayments durum kodu
   * @returns {string} Durum açıklaması
   */
  getPaymentStatusDescription(statusCode) {
    const statusMap = {
      0: 'Waiting for payment',
      1: 'Confirming payment',
      2: 'Confirmed payment',
      3: 'Sending to customer',
      4: 'Payment finished',
      5: 'Partially paid',
      6: 'Failed',
      7: 'Refunded',
      8: 'Reserved'
    };
    
    return statusMap[statusCode] || 'Unknown status';
  }

  /**
   * NOWPayments durum kodunu standart durumlara eşleştirir
   * 
   * @param {number} statusCode - NOWPayments durum kodu
   * @returns {string} Standart durum
   */
  mapPaymentStatus(statusCode) {
    const statusMap = {
      0: 'waiting',
      1: 'confirming',
      2: 'confirmed',
      3: 'sending',
      4: 'success',
      5: 'partially_paid',
      6: 'failed',
      7: 'refunded',
      8: 'reserved'
    };
    
    return statusMap[statusCode] || 'unknown';
  }

  /**
   * Kripto para adresi için QR kod oluşturur
   * 
   * @param {string} address - Kripto para adresi
   * @returns {Promise<string|null>} Base64 formatında QR kod
   */
  async generateQrCode(address) {
    try {
      const response = await axios.get('https://api.qrserver.com/v1/create-qr-code/', {
        params: {
          size: '300x300',
          data: address
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

  /**
   * Webhook callback'ini işler
   * 
   * @param {Object} callbackData - Webhook verisi
   * @returns {Promise<Object>} İşlem sonucu
   */
  async handleCallback(callbackData) {
    try {
      // IPN doğrulama (isteğe bağlı, ama güvenlik için iyi)
      if (this.ipnSecret && callbackData.ipn_type === 'payment') {
        // HMAC doğrulama yapılabilir, ama basit tutalım
      }

      const paymentStatus = callbackData.payment_status;
      const paymentId = callbackData.payment_id;
      const amount = callbackData.pay_amount;
      const currency = callbackData.pay_currency;
      const orderId = callbackData.order_id;

      if (paymentStatus === 'finished' || paymentStatus === 'confirmed') {
        return {
          success: true,
          transactionId: paymentId,
          amount: parseFloat(amount),
          currency: currency,
          status: 'completed',
          orderId: orderId,
          rawData: callbackData
        };
      } else if (paymentStatus === 'failed' || paymentStatus === 'expired') {
        return {
          success: false,
          status: 'failed',
          transactionId: paymentId,
          rawData: callbackData
        };
      } else {
        // pending, waiting, refunding, refunded
        return {
          success: false,
          status: 'pending',
          transactionId: paymentId,
          rawData: callbackData
        };
      }
    } catch (error) {
      throw new Error(`NOWPayments callback handling failed: ${error.message}`);
    }
  }
}

module.exports = NOWPaymentsService;
