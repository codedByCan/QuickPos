const axios = require('axios');

/**
 * PayMe Ödeme Entegrasyonu
 * 
 * Başlamadan önce:
 * 1. PayMe hesabı oluşturun
 * 2. API anahtarınızı alın (seller_payme_id)
 * 3. Gerekli webhook URL'lerini ayarlayın
 */
class PayMeService {
  constructor(config) {
    this.config = config || {};
    const requiredFields = ['sellerPaymeId'];
    for (let field of requiredFields) {
      if (!config[field]) throw new Error(`Missing required field: ${field}`);
    }

    this.sellerPaymeId = config.sellerPaymeId;
    
    // Sandbox veya Production modu seçimi
    this.sandbox = config.sandbox || false;
    
    // API URL'ini ortama göre ayarla
    if (this.sandbox) {
      this.baseUrl = 'https://sandbox.payme.io/api';
    } else {
      this.baseUrl = 'https://live.payme.io/api';
    }
    
    // Debug modu
    this.debug = config.debug || false;
    console.log(`PayMe API URL: ${this.baseUrl}`);
  }

  /**
   * Yeni bir ödeme linki oluşturur
   * 
   * @param {Object} paymentDetails - Ödeme detayları
   * @returns {Promise<Object>} Ödeme sonucu
   */
  async createPayment(paymentDetails) {
    try {
      // Zorunlu alanları kontrol et
      let requiredData = ['name', 'amount', 'currency'];
      for (let data of requiredData) {
        if (!paymentDetails[data]) throw new Error(`Missing required data: ${data}`);
      }

      // PayMe için fiyat formatını ayarla (kuruş/cents cinsinden)
      const salePrice = Math.round(paymentDetails.amount * 100);
      
      // Temel ödeme verilerini hazırla
      const paymentData = {
        seller_payme_id: this.sellerPaymeId,
        sale_price: salePrice,
        currency: paymentDetails.currency || 'ILS',
        product_name: paymentDetails.name,
        transaction_id: paymentDetails.orderId || `order-${Date.now()}`,
        installments: paymentDetails.installments || '1',
        market_fee: paymentDetails.marketFee || 0,
        sale_send_notification: paymentDetails.sendNotification || false,
        sale_type: paymentDetails.saleType || 'sale',
        sale_payment_method: paymentDetails.paymentMethod || 'credit-card',
        language: paymentDetails.language || 'he'  // Varsayılan dil: İbranice (he)
      };

      // İsteğe bağlı alanları ekle
      if (paymentDetails.callbackUrl) paymentData.sale_callback_url = paymentDetails.callbackUrl;
      if (paymentDetails.returnUrl) paymentData.sale_return_url = paymentDetails.returnUrl;
      if (paymentDetails.email) paymentData.sale_email = paymentDetails.email;
      if (paymentDetails.phone) paymentData.sale_mobile = paymentDetails.phone;
      if (paymentDetails.buyerName) paymentData.sale_name = paymentDetails.buyerName;
      if (paymentDetails.layout) paymentData.layout = paymentDetails.layout;
      
      // Buyer token kaydetme
      if (paymentDetails.captureBuyer === true) {
        paymentData.capture_buyer = '1';
      }

      // Debug modunda istek detaylarını göster
      if (this.debug) {
        console.log('PayMe ödeme isteği hazırlanıyor:', JSON.stringify(paymentData, null, 2));
      }
      
      // API isteği gönder
      const response = await axios({
        method: 'POST',
        url: `${this.baseUrl}/generate-sale`,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        data: paymentData
      });

      const responseData = response.data;

      // Debug modunda yanıt detaylarını göster
      if (this.debug) {
        console.log('PayMe API yanıtı:', JSON.stringify(responseData, null, 2));
      }

      // Hata kontrolü
      if (responseData.status_code !== 0) {
        throw new Error(`PayMe API error: ${responseData.status_error_details || 'Unknown error'}`);
      }

      // QR kod oluştur (isteğe bağlı)
      let qrCode = null;
      if (paymentDetails.generateQr) {
        qrCode = await this.generateQrCode(responseData.sale_url);
      }

      return {
        status: 'success',
        data: {
          transactionId: responseData.transaction_id,
          paymeId: responseData.payme_sale_id,
          paymeCode: responseData.payme_sale_code,
          url: responseData.sale_url,
          id: responseData.payme_sale_id,
          qr: qrCode
        }
      };
    } catch (error) {
      if (this.debug) {
        console.error('PayMe API hatası:', error);
      }
      
      if (error.response) {
        console.error('Hata detayları:', {
          statusCode: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
        throw new Error(`PayMe API error (${error.response.status}): ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        console.error('Yanıt alınamadı:', error.request);
        throw new Error('No response received from PayMe API');
      } else {
        throw new Error(`Error in PayMe payment creation: ${error.message}`);
      }
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
        console.log('PayMe callback verileri:', JSON.stringify(callbackData, null, 2));
      }

      // PayMe'den gelen önemli alanları kontrol et
      if (!callbackData.payme_sale_id || !callbackData.status_code) {
        throw new Error("Missing required fields in callback data");
      }

      // Signature doğrulaması (tam implementasyon için PayMe ile kontrol gerekebilir)
      if (callbackData.payme_signature) {
        // İleri düzey implementasyon: Signature doğrulaması
        console.log('PayMe signature:', callbackData.payme_signature);
      }

      // Bildirim türü
      const notifyType = callbackData.notify_type || '';
      const saleStatus = callbackData.sale_status || '';
      
      // Ödeme durumunu notifyType ve saleStatus'a göre belirle
      if (notifyType === 'sale-complete' || saleStatus === 'completed') {
        // Başarılı ödeme
        return {
          status: 'success',
          orderId: callbackData.transaction_id || '',
          merchant_oid: callbackData.payme_sale_id,
          amount: parseFloat(callbackData.price) / 100, // Kuruş/cents'ten ana birime çevirme
          currency: callbackData.currency || '',
          paymentType: 'payme',
          card: {
            cardMask: callbackData.buyer_card_mask || '',
            cardExp: callbackData.buyer_card_exp || '',
            cardBrand: callbackData.payme_transaction_card_brand || ''
          },
          buyer: {
            name: callbackData.buyer_name || '',
            email: callbackData.buyer_email || '',
            phone: callbackData.buyer_phone || '',
            socialId: callbackData.buyer_social_id || '',
            buyerKey: callbackData.buyer_key || ''  // Token için kullanılabilir
          },
          sale: {
            id: callbackData.payme_sale_id,
            code: callbackData.payme_sale_code || '',
            transactionId: callbackData.payme_transaction_id || '',
            authNumber: callbackData.payme_transaction_auth_number || '',
            installments: callbackData.installments || '1',
            createDate: callbackData.sale_created || '',
            paidDate: callbackData.sale_paid_date || '',
            releaseDate: callbackData.sale_release_date || '',
            isTokenSale: callbackData.is_token_sale === '1',
            invoiceUrl: callbackData.sale_invoice_url || ''
          }
        };
      } else if (notifyType === 'sale-authorized') {
        // Yetkilendirilmiş ödeme (para henüz çekilmemiş)
        return {
          status: 'authorized',
          orderId: callbackData.transaction_id || '',
          merchant_oid: callbackData.payme_sale_id,
          amount: parseFloat(callbackData.price) / 100,
          currency: callbackData.currency || '',
          paymentType: 'payme',
          authNumber: callbackData.payme_transaction_auth_number || ''
        };
      } else if (notifyType === 'refund' || saleStatus === 'refunded' || saleStatus === 'partial-refund') {
        // İade edilen ödeme
        return {
          status: 'refunded',
          orderId: callbackData.transaction_id || '',
          merchant_oid: callbackData.payme_sale_id,
          amount: parseFloat(callbackData.price) / 100,
          currency: callbackData.currency || '',
          isPartial: saleStatus === 'partial-refund'
        };
      } else if (notifyType === 'sale-chargeback' || saleStatus === 'chargeback' || saleStatus === 'partial-chargeback') {
        // Chargeback - müşteri bankasından geri ödeme talebi
        return {
          status: 'chargeback',
          orderId: callbackData.transaction_id || '',
          merchant_oid: callbackData.payme_sale_id,
          amount: parseFloat(callbackData.price) / 100,
          currency: callbackData.currency || '',
          isPartial: saleStatus === 'partial-chargeback'
        };
      } else if (notifyType === 'sale-chargeback-refund') {
        // Chargeback geri alındı
        return {
          status: 'chargeback-refund',
          orderId: callbackData.transaction_id || '',
          merchant_oid: callbackData.payme_sale_id,
          amount: parseFloat(callbackData.price) / 100,
          currency: callbackData.currency || ''
        };
      } else if (notifyType === 'sale-failure' || saleStatus === 'failed' || saleStatus === 'canceled') {
        // Başarısız ödeme
        return {
          status: 'failed',
          orderId: callbackData.transaction_id || '',
          merchant_oid: callbackData.payme_sale_id,
          reason: callbackData.status_error_details || 'Payment failed or canceled'
        };
      } else {
        // Diğer durumlar
        return {
          status: 'other',
          type: notifyType,
          saleStatus: saleStatus,
          orderId: callbackData.transaction_id || '',
          merchant_oid: callbackData.payme_sale_id,
          rawData: callbackData
        };
      }
    } catch (error) {
      if (this.debug) {
        console.error('PayMe callback işleme hatası:', error);
      }
      throw new Error(`Error in PayMe callback handling: ${error.message}`);
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

module.exports = PayMeService;
