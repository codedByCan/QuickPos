const Stripe = require('../lib/stripe');
const QuickPos = require('../app');
const express = require('express');
const bodyParser = require('body-parser');

// QuickPos yapılandırması
const quickPos = new QuickPos({
  providers: {
    stripe: {
      secretKey: 'sk_test_YOUR_TEST_SECRET_KEY'
    }
  }
});

// Stripe sağlayıcısını al
let stripe = quickPos.providers['stripe'];

// Express uygulaması oluştur
const app = express();
// Webhook doğrulaması için raw body kaydetmek gerekebilir (Stripe özel durumu)
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Ana sayfa - Basit form
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Stripe Ödeme</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: Arial; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 500px; margin: 0 auto; background: white; padding: 20px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        h1 { margin-top: 0; }
        label { display: block; margin-bottom: 5px; }
        input, select { width: 100%; padding: 8px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 3px; }
        button { background: #635bff; color: white; border: none; padding: 10px 15px; border-radius: 3px; cursor: pointer; width: 100%; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Stripe ile Ödeme Oluştur</h1>
        <form action="/checkout" method="POST">
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

// Ödeme sayfası - Stripe Checkout Session oluşturur
app.post('/checkout', async (req, res) => {
  try {
    const { amount, currency, description } = req.body;
    
    const payment = await stripe.createPayment({
      amount: amount || '99.99',
      currency: currency || 'USD',
      description: description || 'Premium Üyelik',
      orderId: 'order-' + Date.now(),
      successUrl: \`http://\${req.headers.host}/success\`,
      cancelUrl: \`http://\${req.headers.host}/cancel\`
    });
    
    // Stripe ödeme sayfasına yönlendir
    res.redirect(payment.paymentUrl);
  } catch (error) {
    res.status(500).send(`
      <div style="text-align:center; padding:20px;">
        <h1>Hata</h1>
        <p>\${error.message}</p>
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

// Başarılı ödeme sayfası
app.get('/success', (req, res) => {
  const { session_id, order_id } = req.query;
  
  res.send(`
    <div style="text-align:center; padding:20px;">
      <h1>Ödeme Başarılı</h1>
      <p>Sipariş ID: \${order_id || 'N/A'}</p>
      <p>Stripe Session ID: \${session_id || 'N/A'}</p>
      <p style="color:green; font-weight:bold;">Ödeme durumu: Başarılı</p>
      <p>İşlem tarihi: \${new Date().toLocaleString('tr-TR')}</p>
      <a href="/">Yeni Ödeme</a>
    </div>
  `);
});

// Stripe webhook handler
app.post('/stripe-webhook', async (req, res) => {
  try {
    // We pass req to handleCallback to allow signature verification
    const result = await stripe.handleCallback(req.body, req);
    
    if (result.success && result.status === 'completed') {
      console.log('Ödeme başarıyla tamamlandı:', result.orderId, result.amount, result.currency);
      // Veritabanını güncelleyebilir veya email gönderebilirsiniz
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook işleme hatası:', error.message);
    res.status(400).send(\`Webhook Error: \${error.message}\`);
  }
});

// Sunucuyu başlat
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`Sunucu çalışıyor: http://localhost:\${PORT}\`);
  console.log(\`Örnek ödeme sayfası: http://localhost:\${PORT}\`);
});
