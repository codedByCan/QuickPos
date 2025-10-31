const axios = require('axios');

/**
 * NOONPayments Ödeme Entegrasyonu
 * 
 * Başlamadan önce:
 * 1. NOONPayments hesabı oluşturun
 * 2. BusinessId, AppName ve AppKey bilgilerinizi alın
 * 3. Gerekli webhook URL'lerini ayarlayın
 */
class NOONPaymentsService {
  constructor(config) {
    this.config = config || {};
    const requiredFields = ['businessId', 'appName', 'appKey'];
    for (let field of requiredFields) {
      if (!config[field]) throw new Error(`Missing required field: ${field}`);
    }

    this.businessId = config.businessId;
    this.appName = config.appName;
    this.appKey = config.appKey;
    
    // Sandbox veya Production modu seçimi
    this.sandbox = config.sandbox || false;
    
    // Region seçimi (global, sa veya eg)
    this.region = config.region || '';
    
    // API URL'ini ortama göre ayarla
    let baseUrl = 'https://api';
    if (this.sandbox) {
      baseUrl = 'https://api-test';
    }
    
    // Bölgeye göre endpoint ayarla
    if (this.region === 'sa') {
      baseUrl += '.sa';
    } else if (this.region === 'eg') {
      baseUrl += '.eg';
    }
    
    baseUrl += '.noonpayments.com/payment/v1/';
    
    this.baseUrl = config.baseUrl || baseUrl;
    
    // Auth key oluştur
    this.authKey = this._generateAuthKey();
    
    // Debug modu
    this.debug = config.debug || false;
    
    if (this.debug) {
      console.log(`NOONPayments API URL: ${this.baseUrl}`);
    }
  }

  /**
   * Base64 encoded auth key oluşturur
   */
  _generateAuthKey() {
    const authString = `${this.businessId}.${this.appName}:${this.appKey}`;
    return Buffer.from(authString).toString('base64');
  }

  /**
   * Ödeme başlatır
   * 
   * @param {Object} paymentDetails - Ödeme detayları
   * @returns {Promise<Object>} Ödeme sonucu
   */
  async createPayment(paymentDetails) {
    try {
      // Zorunlu alanları kontrol et
      let requiredData = ['amount', 'currency', 'reference', 'name'];
      for (let data of requiredData) {
        if (!paymentDetails[data]) throw new Error(`Missing required data: ${data}`);
      }

      // Ödeme verilerini hazırla
      const paymentData = {
        apiOperation: "INITIATE",
        order: {
          amount: paymentDetails.amount,
          currency: paymentDetails.currency,
          reference: paymentDetails.reference || `order-${Date.now()}`,
          name: paymentDetails.name,
          channel: paymentDetails.channel || "web",
          category: paymentDetails.category || "pay"
        },
        configuration: {
          tokenizeCc: paymentDetails.tokenizeCc || "true",
          returnUrl: paymentDetails.returnUrl || "https://merchant.com/response",
          locale: paymentDetails.locale || "en",
          paymentAction: paymentDetails.paymentAction || "AUTHORIZE,SALE"
        }
      };

      // İsteğe bağlı alanları ekle
      if (paymentDetails.billing) {
        paymentData.billing = paymentDetails.billing;
      }
      
      if (paymentDetails.shipping) {
        paymentData.shipping = paymentDetails.shipping;
      }
      
      // Kart bilgisi ekleme (PCI-DSS uyumlu direct integration için)
      if (paymentDetails.cardData) {
        paymentData.paymentData = {
          type: "CARD",
          data: paymentDetails.cardData
        };
      }
      
      // Token kullanarak ödeme
      if (paymentDetails.tokenIdentifier) {
        paymentData.paymentData = {
          type: "CARD",
          data: {
            tokenIdentifier: paymentDetails.tokenIdentifier
          }
        };
      }

      // Debug modunda istek detaylarını göster
      if (this.debug) {
        console.log('NOONPayments ödeme isteği hazırlanıyor:', JSON.stringify(paymentData, null, 2));
      }
      
      // API isteği gönder
      const response = await axios({
        method: 'POST',
        url: `${this.baseUrl}order`,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Key ${this.authKey}`
        },
        data: paymentData
      });

      const responseData = response.data;

      // Debug modunda yanıt detaylarını göster
      if (this.debug) {
        console.log('NOONPayments API yanıtı:', JSON.stringify(responseData, null, 2));
      }

      // Hata kontrolü
      if (responseData.resultCode !== 0) {
        throw new Error(`NOONPayments API error: ${responseData.resultMessage || 'Unknown error'}`);
      }

      // QR kod oluştur (isteğe bağlı)
      let qrCode = null;
      if (paymentDetails.generateQr && responseData.result.url) {
        qrCode = await this.generateQrCode(responseData.result.url);
      }

      return {
        status: 'success',
        data: {
          transactionId: responseData.result.order.id,
          orderId: responseData.result.order.reference,
          url: responseData.result.url,
          id: responseData.result.order.id,
          qr: qrCode
        }
      };
    } catch (error) {
      if (this.debug) {
        console.error('NOONPayments API hatası:', error);
      }
      
      if (error.response) {
        console.error('Hata detayları:', {
          statusCode: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
        throw new Error(`NOONPayments API error (${error.response.status}): ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        console.error('Yanıt alınamadı:', error.request);
        throw new Error('No response received from NOONPayments API');
      } else {
        throw new Error(`Error in NOONPayments payment creation: ${error.message}`);
      }
    }
  }

  /**
   * Ödeme durumunu kontrol eder
   * 
   * @param {string} orderId - Sipariş ID
   * @returns {Promise<Object>} İşlem durumu
   */
  async getOrderStatus(orderId) {
    try {
      const response = await axios({
        method: 'GET',
        url: `${this.baseUrl}order/${orderId}`,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Key ${this.authKey}`
        }
      });

      const responseData = response.data;
      
      if (this.debug) {
        console.log('NOONPayments sipariş durumu:', JSON.stringify(responseData, null, 2));
      }

      return {
        status: responseData.result.order.status === 'PAID' ? 'success' : responseData.result.order.status,
        orderId: responseData.result.order.reference,
        amount: responseData.result.order.amount,
        currency: responseData.result.order.currency,
        paymentDetails: responseData.result.paymentDetails || {},
        transactions: responseData.result.transactions || []
      };
    } catch (error) {
      if (this.debug) {
        console.error('NOONPayments sipariş sorgulama hatası:', error);
      }
      throw new Error(`Error checking order status: ${error.message}`);
    }
  }

  /**
   * Sipariş referansına göre sipariş durumunu kontrol eder
   * 
   * @param {string} orderReference - Sipariş referansı
   * @returns {Promise<Object>} İşlem durumu
   */
  async getOrderByReference(orderReference) {
    try {
      const response = await axios({
        method: 'GET',
        url: `${this.baseUrl}order/getbyreference/${orderReference}`,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Key ${this.authKey}`
        }
      });

      const responseData = response.data;
      
      if (this.debug) {
        console.log('NOONPayments sipariş durumu (referans ile):', JSON.stringify(responseData, null, 2));
      }

      return {
        status: responseData.result.order.status === 'PAID' ? 'success' : responseData.result.order.status,
        orderId: responseData.result.order.reference,
        amount: responseData.result.order.amount,
        currency: responseData.result.order.currency,
        paymentDetails: responseData.result.paymentDetails || {},
        transactions: responseData.result.transactions || []
      };
    } catch (error) {
      if (this.debug) {
        console.error('NOONPayments sipariş sorgulama hatası (referans ile):', error);
      }
      throw new Error(`Error checking order by reference: ${error.message}`);
    }
  }

  /**
   * AUTHORIZE işlemi yapar
   * 
   * @param {string} orderId - Sipariş ID
   * @returns {Promise<Object>} İşlem sonucu
   */
  async authorizePayment(orderId) {
    try {
      const requestData = {
        apiOperation: "AUTHORIZE",
        order: {
          id: orderId
        }
      };

      const response = await axios({
        method: 'POST',
        url: `${this.baseUrl}order`,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Key ${this.authKey}`
        },
        data: requestData
      });

      const responseData = response.data;
      
      if (this.debug) {
        console.log('NOONPayments yetkilendirme yanıtı:', JSON.stringify(responseData, null, 2));
      }

      // Hata kontrolü
      if (responseData.resultCode !== 0) {
        throw new Error(`NOONPayments API error: ${responseData.resultMessage || 'Unknown error'}`);
      }

      return {
        status: 'success',
        data: {
          transactionId: responseData.result.transaction.id,
          orderId: responseData.result.order.reference,
          orderStatus: responseData.result.order.status
        }
      };
    } catch (error) {
      if (this.debug) {
        console.error('NOONPayments yetkilendirme hatası:', error);
      }
      throw new Error(`Error in payment authorization: ${error.message}`);
    }
  }

  /**
   * SALE işlemi yapar
   * 
   * @param {string} orderId - Sipariş ID
   * @returns {Promise<Object>} İşlem sonucu
   */
  async salePayment(orderId) {
    try {
      const requestData = {
        apiOperation: "SALE",
        order: {
          id: orderId
        }
      };

      const response = await axios({
        method: 'POST',
        url: `${this.baseUrl}order`,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Key ${this.authKey}`
        },
        data: requestData
      });

      const responseData = response.data;
      
      if (this.debug) {
        console.log('NOONPayments sale yanıtı:', JSON.stringify(responseData, null, 2));
      }

      // Hata kontrolü
      if (responseData.resultCode !== 0) {
        throw new Error(`NOONPayments API error: ${responseData.resultMessage || 'Unknown error'}`);
      }

      return {
        status: 'success',
        data: {
          transactionId: responseData.result.transaction.id,
          orderId: responseData.result.order.reference,
          orderStatus: responseData.result.order.status
        }
      };
    } catch (error) {
      if (this.debug) {
        console.error('NOONPayments sale hatası:', error);
      }
      throw new Error(`Error in payment sale: ${error.message}`);
    }
  }

  /**
   * CAPTURE işlemi yapar (Authorization sonrası)
   * 
   * @param {string} orderId - Sipariş ID
   * @param {Object} transactionDetails - İşlem detayları
   * @returns {Promise<Object>} İşlem sonucu
   */
  async capturePayment(orderId, transactionDetails) {
    try {
      // Zorunlu alanları kontrol et
      let requiredData = ['amount', 'currency'];
      for (let data of requiredData) {
        if (!transactionDetails[data]) throw new Error(`Missing required data: ${data}`);
      }

      const requestData = {
        apiOperation: "CAPTURE",
        order: {
          id: orderId
        },
        transaction: {
          amount: transactionDetails.amount,
          currency: transactionDetails.currency,
          finalCapture: transactionDetails.finalCapture || true,
          description: transactionDetails.description || "Capture transaction"
        }
      };

      const response = await axios({
        method: 'POST',
        url: `${this.baseUrl}order`,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Key ${this.authKey}`
        },
        data: requestData
      });

      const responseData = response.data;
      
      if (this.debug) {
        console.log('NOONPayments capture yanıtı:', JSON.stringify(responseData, null, 2));
      }

      // Hata kontrolü
      if (responseData.resultCode !== 0) {
        throw new Error(`NOONPayments API error: ${responseData.resultMessage || 'Unknown error'}`);
      }

      return {
        status: 'success',
        data: {
          transactionId: responseData.result.transaction.id,
          orderId: responseData.result.order.reference,
          orderStatus: responseData.result.order.status
        }
      };
    } catch (error) {
      if (this.debug) {
        console.error('NOONPayments capture hatası:', error);
      }
      throw new Error(`Error in payment capture: ${error.message}`);
    }
  }

  /**
   * REFUND işlemi yapar
   * 
   * @param {string} orderId - Sipariş ID
   * @param {Object} transactionDetails - İşlem detayları
   * @returns {Promise<Object>} İşlem sonucu
   */
  async refundPayment(orderId, transactionDetails) {
    try {
      // Zorunlu alanları kontrol et
      let requiredData = ['amount', 'currency', 'targetTransactionId'];
      for (let data of requiredData) {
        if (!transactionDetails[data]) throw new Error(`Missing required data: ${data}`);
      }

      const requestData = {
        apiOperation: "REFUND",
        order: {
          id: orderId
        },
        transaction: {
          amount: transactionDetails.amount,
          currency: transactionDetails.currency,
          targetTransactionId: transactionDetails.targetTransactionId,
          description: transactionDetails.description || "Refund transaction"
        }
      };

      const response = await axios({
        method: 'POST',
        url: `${this.baseUrl}order`,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Key ${this.authKey}`
        },
        data: requestData
      });

      const responseData = response.data;
      
      if (this.debug) {
        console.log('NOONPayments refund yanıtı:', JSON.stringify(responseData, null, 2));
      }

      // Hata kontrolü
      if (responseData.resultCode !== 0) {
        throw new Error(`NOONPayments API error: ${responseData.resultMessage || 'Unknown error'}`);
      }

      return {
        status: 'success',
        data: {
          transactionId: responseData.result.transaction.id,
          orderId: responseData.result.order.reference,
          orderStatus: responseData.result.order.status
        }
      };
    } catch (error) {
      if (this.debug) {
        console.error('NOONPayments refund hatası:', error);
      }
      throw new Error(`Error in payment refund: ${error.message}`);
    }
  }

  /**
   * CANCEL işlemi yapar
   * 
   * @param {string} orderId - Sipariş ID
   * @returns {Promise<Object>} İşlem sonucu
   */
  async cancelPayment(orderId) {
    try {
      const requestData = {
        apiOperation: "CANCEL",
        order: {
          id: orderId
        }
      };

      const response = await axios({
        method: 'POST',
        url: `${this.baseUrl}order`,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Key ${this.authKey}`
        },
        data: requestData
      });

      const responseData = response.data;
      
      if (this.debug) {
        console.log('NOONPayments iptal yanıtı:', JSON.stringify(responseData, null, 2));
      }

      // Hata kontrolü
      if (responseData.resultCode !== 0) {
        throw new Error(`NOONPayments API error: ${responseData.resultMessage || 'Unknown error'}`);
      }

      return {
        status: 'success',
        data: {
          orderId: responseData.result.order.reference,
          orderStatus: responseData.result.order.status
        }
      };
    } catch (error) {
      if (this.debug) {
        console.error('NOONPayments iptal hatası:', error);
      }
      throw new Error(`Error in payment cancellation: ${error.message}`);
    }
  }

  /**
   * Webhook callback'ini işler
   * 
   * @param {Object} callbackData - Callback verileri
   * @returns {Promise<Object>} İşlem sonucu
   */
  async handleCallback(callbackData) {
    try {
      // Debug modunda callback verilerini göster
      if (this.debug) {
        console.log('NOONPayments callback verileri:', JSON.stringify(callbackData, null, 2));
      }

      // Webhook verilerini doğrula
      if (!callbackData.order || !callbackData.order.id) {
        throw new Error("Missing required fields in callback data");
      }

      // Sipariş durumunu belirle
      const orderStatus = callbackData.order.status;
      
      // Ödeme durumunu orderStatus'a göre belirle
      let paymentStatus = 'unknown';
      if (orderStatus === 'PAID') {
        paymentStatus = 'success';
      } else if (orderStatus === 'CANCELLED') {
        paymentStatus = 'cancelled';
      } else if (orderStatus === 'FAILED') {
        paymentStatus = 'failed';
      } else if (orderStatus === 'AUTHORIZED') {
        paymentStatus = 'authorized';
      } else if (orderStatus === 'AUTHORIZED_FAILED') {
        paymentStatus = 'authorization_failed';
      } else if (orderStatus === 'CAPTURED') {
        paymentStatus = 'captured';
      } else if (orderStatus === 'CAPTURE_FAILED') {
        paymentStatus = 'capture_failed';
      } else if (orderStatus === 'REFUNDED') {
        paymentStatus = 'refunded';
      } else if (orderStatus === 'REFUND_FAILED') {
        paymentStatus = 'refund_failed';
      } else if (orderStatus === 'INITIATED') {
        paymentStatus = 'initiated';
      } else if (orderStatus === 'PAYMENT_INFO_ADDED') {
        paymentStatus = 'payment_info_added';
      }

      return {
        status: paymentStatus,
        orderId: callbackData.order.reference,
        merchant_oid: callbackData.order.id,
        amount: callbackData.order.amount,
        currency: callbackData.order.currency,
        paymentType: 'noonpayments',
        transactions: callbackData.transactions || []
      };
    } catch (error) {
      if (this.debug) {
        console.error('NOONPayments callback işleme hatası:', error);
      }
      throw new Error(`Error in NOONPayments callback handling: ${error.message}`);
    }
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

module.exports = NOONPaymentsService;
