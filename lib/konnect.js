const axios = require('axios');

/**
 * Konnect Ödeme Entegrasyonu
 * 
 * Başlamadan önce:
 * 1. Konnect hesabı oluşturun:
 *    - Sandbox (test): https://dashboard.sandbox.konnect.network
 *    - Üretim: https://dashboard.konnect.network
 * 2. KYC/KYB doğrulamasını tamamlayın (kimlik ve kurum doğrulama)
 * 3. API anahtarınızı ve cüzdan ID'nizi alın
 */
class KonnectService {
  constructor(config) {
    this.config = config || {};
    const requiredFields = ['apiKey', 'receiverWalletId'];
    for (let field of requiredFields) {
      if (!config[field]) throw new Error(`Missing required field: ${field}`);
    }

    this.apiKey = config.apiKey;
    this.receiverWalletId = config.receiverWalletId;
    
    // Sandbox veya Production modu seçimi
    this.sandbox = config.sandbox || false;
    
    // API URL'ini ortama göre ayarla
    if (this.sandbox) {
      this.baseUrl = 'https://api.sandbox.konnect.network/api/v2';
    } else {
      this.baseUrl = config.baseUrl || 'https://api.konnect.network/api/v2';
    }
    
    console.log(`Konnect API URL: ${this.baseUrl}`);
    this.testMode = config.testMode || false;
  }

  async createPayment(paymentDetails) {
    try {
      let requiredData = ['amount', 'token'];
      for (let data of requiredData) {
        if (!paymentDetails[data]) throw new Error(`Missing required data: ${data}`);
      }

      // Temel ödeme verilerini hazırla
      const paymentData = {
        receiverWalletId: this.receiverWalletId,
        token: paymentDetails.token || 'TND',
        amount: paymentDetails.amount,
        type: paymentDetails.type || 'immediate',
        description: paymentDetails.description || 'Ödeme',
        acceptedPaymentMethods: paymentDetails.acceptedPaymentMethods || ["wallet", "bank_card", "e-DINAR"],
        lifespan: paymentDetails.lifespan || 60, // varsayılan 60 dakika
        checkoutForm: paymentDetails.checkoutForm || false,
        addPaymentFeesToAmount: paymentDetails.addPaymentFeesToAmount || false,
        orderId: paymentDetails.orderId || `order-${Date.now()}`,
        theme: paymentDetails.theme || 'light'
      };

      // Müşteri bilgilerini ekle (varsa)
      if (paymentDetails.firstName) paymentData.firstName = paymentDetails.firstName;
      if (paymentDetails.lastName) paymentData.lastName = paymentDetails.lastName;
      if (paymentDetails.phoneNumber) paymentData.phoneNumber = paymentDetails.phoneNumber;
      if (paymentDetails.email) paymentData.email = paymentDetails.email;
      
      // Webhook URL'ini ekle (varsa)
      if (paymentDetails.webhook) paymentData.webhook = paymentDetails.webhook;
      
      console.log('Konnect ödeme isteği hazırlanıyor:', JSON.stringify(paymentData, null, 2));
      
      // API isteği gönder
      const response = await axios({
        method: 'POST',
        url: `${this.baseUrl}/payments/init-payment`,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey
        },
        data: paymentData
      });

      const responseData = response.data;
      console.log('Konnect API yanıtı:', JSON.stringify(responseData, null, 2));

      // QR kod oluştur (isteğe bağlı)
      let qrCode = null;
      if (paymentDetails.generateQr) {
        qrCode = await this.generateQrCode(responseData.payUrl);
      }

      return {
        status: 'success',
        data: {
          transactionId: responseData.paymentRef,
          url: responseData.payUrl,
          id: responseData.paymentRef,
          qr: qrCode
        }
      };
    } catch (error) {
      console.error('Konnect API hatası:', error);
      
      if (error.response) {
        console.error('Hata detayları:', {
          statusCode: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
        throw new Error(`Konnect API error (${error.response.status}): ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        console.error('Yanıt alınamadı:', error.request);
        throw new Error('No response received from Konnect API');
      } else {
        throw new Error(`Error in Konnect payment creation: ${error.message}`);
      }
    }
  }

  async getPaymentDetails(paymentRef) {
    try {
      const response = await axios({
        method: 'GET',
        url: `${this.baseUrl}/payments/${paymentRef}`,
        headers: {
          'x-api-key': this.apiKey
        }
      });

      const paymentData = response.data.payment;
      
      // İşlem durumunu belirle
      let status = 'pending';
      if (paymentData.status === 'completed') {
        status = 'success';
      }

      return {
        status: status,
        paymentId: paymentData.id,
        orderId: paymentData.orderId,
        amount: paymentData.amount,
        reachedAmount: paymentData.reachedAmount,
        token: paymentData.token,
        type: paymentData.type,
        description: paymentData.details,
        expirationDate: paymentData.expirationDate,
        transactions: paymentData.transactions || [],
        raw: paymentData
      };
    } catch (error) {
      if (error.response && error.response.status === 404) {
        throw new Error(`Payment not found: ${paymentRef}`);
      } else if (error.response) {
        throw new Error(`Konnect API error: ${error.response.data.message || error.response.statusText}`);
      } else {
        throw new Error(`Error fetching payment details: ${error.message}`);
      }
    }
  }

  async handleCallback(callbackData) {
    try {
      if (!callbackData.payment_ref) {
        throw new Error("Missing payment_ref in callback data");
      }

      // Ödeme detaylarını al
      const paymentDetails = await this.getPaymentDetails(callbackData.payment_ref);
      
      if (paymentDetails.status === 'success') {
        return {
          status: 'success',
          orderId: paymentDetails.orderId,
          merchant_oid: paymentDetails.paymentId,
          amount: paymentDetails.amount,
          currency: paymentDetails.token,
          paymentType: 'konnect'
        };
      } else {
        return {
          status: 'failed',
          orderId: paymentDetails.orderId || callbackData.payment_ref,
          reason: 'Payment is not completed'
        };
      }
    } catch (error) {
      throw new Error(`Error in Konnect callback handling: ${error.message}`);
    }
  }

  // QR kod oluşturmak için yardımcı fonksiyon
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
      console.error('QR code generation failed:', error);
      return null;
    }
  }
}

module.exports = KonnectService;
