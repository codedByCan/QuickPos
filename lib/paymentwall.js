const Paymentwall = require('paymentwall');
const axios = require('axios');

class PaymentwallService {
  constructor(config) {
    this.config = config || {};
    const requiredFields = ['appKey', 'secretKey'];
    for (let field of requiredFields) {
      if (!config[field]) throw new Error(`Missing required field: ${field}`);
    }

    // Paymentwall SDK'sını yapılandır
    Paymentwall.Configure(
      Paymentwall.Base.API_GOODS,
      config.appKey,
      config.secretKey
    );
    
    this.testMode = config.testMode || false;
  }

  async createPayment(paymentDetails) {
    try {
      let requiredData = ['name', 'amount', 'currency', 'email'];
      for (let data of requiredData) {
        if (!paymentDetails[data]) throw new Error(`Missing required data: ${data}`);
      }

      // Benzersiz bir ürün ve işlem ID'si oluştur
      const productId = paymentDetails.productId || 'product_' + Date.now();
      const orderId = paymentDetails.orderId || 'order_' + Date.now();
      
      // Ürünü tek seferlik (one-time) ödeme olarak yapılandır
      const product = new Paymentwall.Product(
        productId,
        paymentDetails.amount,
        paymentDetails.currency,
        paymentDetails.name,
        Paymentwall.Product.TYPE_FIXED // Tek seferlik ödeme tipi
      );

      // Kullanıcı bilgilerini oluştur
      const userId = paymentDetails.userId || 'user_' + Date.now();
      const userInfo = {
        'email': paymentDetails.email,
        'order_id': orderId
      };
      
      if (paymentDetails.userName) userInfo.name = paymentDetails.userName;
      
      // Tüm extra parametreleri toplayalım
      const extraParams = {};
      
      // Custom parametreleri ekle (varsa)
      if (paymentDetails.customParams) {
        Object.entries(paymentDetails.customParams).forEach(([key, value]) => {
          extraParams[key] = value;
        });
      }

      // Webhook URL'ini ayarla (varsa)
      if (paymentDetails.pingback_url) {
        extraParams['pingback_url'] = paymentDetails.pingback_url;
      }

      // Dönüş URL'ini ayarla (varsa)
      if (paymentDetails.successUrl) {
        extraParams['success_url'] = paymentDetails.successUrl;
      }
      
      // Ödeme Widget'ını oluştur
      const widgetCode = paymentDetails.widgetCode || 'p1_1';
      const widget = new Paymentwall.Widget(
        userId,
        widgetCode,
        [product],
        {...userInfo, ...extraParams}
      );

      // Widget URL'sini al
      const widgetUrl = widget.getUrl();

      // QR kod oluştur (isteğe bağlı)
      let qrCode = null;
      if (paymentDetails.generateQr) {
        qrCode = await this.generateQrCode(widgetUrl);
      }

      return {
        status: 'success',
        data: {
          transactionId: orderId,
          url: widgetUrl,
          id: orderId,
          qr: qrCode
        }
      };
    } catch (error) {
      throw new Error(`Error in Paymentwall payment creation: ${error.message}`);
    }
  }

  async handleCallback(callbackData, ipAddress) {
    try {
      console.log('🔍 Paymentwall callback işleniyor:', callbackData);
      
      // Test modu kontrolü
      if (callbackData.is_test === 1 || callbackData.is_test === '1' || callbackData.test_mode === 1) {
        console.log('🧪 Test modu callback algılandı');
        
        // Test callback işleme - gerçek data doğrulama yapmadan test için
        return {
          status: 'success',
          orderId: callbackData.order_id || callbackData.uid || 'test-order',
          merchant_oid: callbackData.ref || 'test-ref',
          amount: callbackData.amount || '199.99',
          currency: callbackData.currency || 'TRY',
          paymentType: 'paymentwall-test'
        };
      }
      
      // Paymentwall pingback nesnesi oluştur
      const pingback = new Paymentwall.Pingback(
        callbackData,
        ipAddress,
        this.testMode
      );
      
      console.log('🔍 Pingback oluşturuldu, doğrulanıyor...');

      // Pingback'in geçerli olup olmadığını kontrol et
      if (pingback.validate()) {
        console.log('✅ Pingback doğrulandı. Tip:', pingback.getType());
        
        // Callback verileri direkt olarak kullanılacak
        let amount = callbackData.amount || '0';
        let currency = callbackData.currency || 'TRY';
        
        // Callback veri yapısına göre doğru alan isimlerini kullan
        if (callbackData.goodsid) {
          console.log('✅ Ürün ID tespit edildi:', callbackData.goodsid);
        }
        
        // Ödeme başarılı mı kontrolü
        if (pingback.isDeliverable()) {
          console.log('✅ Ödeme başarılı (deliverable)');
          // Tek seferlik ödeme başarılı
          return {
            status: 'success',
            orderId: callbackData.order_id || callbackData.uid || '',
            merchant_oid: callbackData.ref || '',
            amount: amount,
            currency: currency,
            paymentType: 'paymentwall',
            raw: callbackData // Tüm veriyi de ekleyelim
          };
        } else if (pingback.isCancelable()) {
          console.log('❌ Ödeme iptal edildi (cancelable)');
          return {
            status: 'failed',
            orderId: callbackData.order_id || callbackData.uid || '',
            reason: 'Payment was cancelled',
            raw: callbackData
          };
        } else {
          console.log('ℹ️ Diğer pingback tipi:', pingback.getType());
          return {
            status: 'other',
            type: pingback.getType(),
            orderId: callbackData.order_id || callbackData.uid || '',
            raw: callbackData
          };
        }
      } else {
        const errorCode = pingback.getErrorCode();
        console.error('❌ Geçersiz pingback:', errorCode);
        throw new Error('Invalid pingback: ' + errorCode);
      }
    } catch (error) {
      console.error('❌ Callback işleme hatası:', error);
      throw new Error(`Error in Paymentwall callback handling: ${error.message}`);
    }
  }

  // QR code oluşturmak için yardımcı fonksiyon
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

module.exports = PaymentwallService;
