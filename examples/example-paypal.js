const PayPal = require('./lib/paypal');
const QuickPos = require('./app');
const express = require('express');
const bodyParser = require('body-parser');

// QuickPos yapılandırması
const quickPos = new QuickPos({
  providers: {
    paypal: {
      environment: 'sandbox',
      merchantId: 'rd8zm2zmqgt3sm2h',
      publicKey: 'zhpbyq9tr997dvvp',
      privateKey: '',
      paypalEmail: 'sb-jzsll25277773@business.example.com'
    }
  }
});

// PayPal sağlayıcısını al
let paypal = quickPos.providers['paypal'];

// Express uygulaması oluştur
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Ana sayfa - Basit form
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Ödeme</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: Arial; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 500px; margin: 0 auto; background: white; padding: 20px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        h1 { margin-top: 0; }
        label { display: block; margin-bottom: 5px; }
        input, select { width: 100%; padding: 8px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 3px; }
        button { background: #4a7aff; color: white; border: none; padding: 10px 15px; border-radius: 3px; cursor: pointer; width: 100%; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Ödeme Oluştur</h1>
        <form action="/checkout" method="GET">
          <label for="amount">Tutar:</label>
          <input type="text" id="amount" name="amount" value="99.99" required>
          
          <label for="currency">Para Birimi:</label>
          <select id="currency" name="currency">
            <option value="USD">USD - Amerikan Doları</option>
            <option value="EUR">EUR - Euro</option>
            <option value="TRY">TRY - Türk Lirası</option>
          </select>
          
          <label for="description">Açıklama:</label>
          <input type="text" id="description" name="description" value="Premium Üyelik" required>
          
          <button type="submit">Ödeme Sayfasına Git</button>
        </form>
      </div>
    </body>
    </html>
  `);
});

// Ödeme sayfası - renderHtmlCheckout metodunu kullanır
app.get('/checkout', async (req, res) => {
  try {
    const { amount, currency, description } = req.query;
    
    // HTML sayfasını renderla
    const html = await paypal.renderHtmlCheckout({
      amount: amount || '99.99',
      currency: currency || 'USD',
      description: description || 'Premium Üyelik',
      orderId: 'order-' + Date.now(),
      successUrl: `http://${req.headers.host}/success`,
      cancelUrl: `http://${req.headers.host}/cancel`
    });
    
    res.send(html);
  } catch (error) {
    res.status(500).send(`
      <div style="text-align:center; padding:20px;">
        <h1>Hata</h1>
        <p>${error.message}</p>
        <a href="/">Geri Dön</a>
      </div>
    `);
  }
});

// İptal sayfası - basit HTML
app.get('/cancel', (req, res) => {
  res.send(`
    <div style="text-align:center; padding:20px;">
      <h1>Ödeme İptal Edildi</h1>
      <p>İşlem iptal edildi, herhangi bir ücret tahsil edilmedi.</p>
      <a href="/">Geri Dön</a>
    </div>
  `);
});

// Ödeme doğrulama fonksiyonu
async function verifyPayment(paymentDetails) {
  try {
    // PayPal API ile ödeme doğrulama
    const verificationResult = await paypal.verifyPayment(paymentDetails);
    return {
      success: true,
      verified: verificationResult.verified,
      details: verificationResult.details
    };
  } catch (error) {
    console.error('Ödeme doğrulama hatası:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Başarılı ödeme sayfası - doğrulama ile birlikte
app.get('/success', async (req, res) => {
  const { order_id, PayerID, paymentId } = req.query;
  
  // Ödeme doğrulama işlemi
  const verification = await verifyPayment({
    orderId: order_id,
    payerId: PayerID,
    paymentId: paymentId
  });
  
  if (verification.success && verification.verified) {
    res.send(`
      <div style="text-align:center; padding:20px;">
        <h1>Ödeme Başarılı ve Doğrulandı</h1>
        <p>Sipariş ID: ${order_id || 'N/A'}</p>
        <p>Ödeme ID: ${paymentId || 'N/A'}</p>
        <p>Ödeme Yapan ID: ${PayerID || 'N/A'}</p>
        <p style="color:green; font-weight:bold;">Ödeme durumu: Doğrulanmış</p>
        <p>İşlem tarihi: ${new Date().toLocaleString('tr-TR')}</p>
        <a href="/">Yeni Ödeme</a>
      </div>
    `);
  } else {
    res.send(`
      <div style="text-align:center; padding:20px;">
        <h1>Ödeme Bilgisi Alındı</h1>
        <p>Sipariş ID: ${order_id || 'N/A'}</p>
        <p>Ödeme ID: ${paymentId || 'N/A'}</p>
        <p>Ödeme Yapan ID: ${PayerID || 'N/A'}</p>
        <p style="color:orange; font-weight:bold;">Ödeme durumu: Doğrulanamadı</p>
        <p>Hata: ${verification.error || 'Bilinmeyen doğrulama hatası'}</p>
        <a href="/">Geri Dön</a>
      </div>
    `);
  }
});

// PayPal webhook handler - IPN (Instant Payment Notification) için
app.post('/paypal-webhook', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
  try {
    // PayPal'dan gelen webhook bildirimi doğrulama
    const event = req.body;
    const isVerified = await paypal.verifyWebhook(event);
    
    if (isVerified) {
      console.log('PayPal webhook olayı doğrulandı:', event);
      
      // Olay tipine göre işlem yapabilirsiniz
      // Örneğin: payment.capture.completed, payment.capture.denied, vb.
      const eventType = event.event_type;
      if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
        // Ödeme tamamlandı - veritabanını güncelleyebilir veya email gönderebilirsiniz
        console.log('Ödeme başarıyla tamamlandı:', event.resource);
      }
      
      res.status(200).send('OK');
    } else {
      console.warn('Geçersiz PayPal webhook bildirimi');
      res.status(400).send('Geçersiz bildirim');
    }
  } catch (error) {
    console.error('Webhook işleme hatası:', error);
    res.status(500).send('Webhook işleme hatası');
  }
});

// Sunucuyu başlat
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Sunucu çalışıyor: http://localhost:${PORT}`);
  console.log(`Örnek ödeme sayfası: http://localhost:${PORT}`);
});
