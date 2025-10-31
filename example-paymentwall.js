const PaymentwallService = require('./lib/paymentwall');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();

// Body parser kullanarak webhook'dan gelen verileri işleyebilmek için
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Tüm istekleri loglama
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] Gelen istek: ${req.method} ${req.url}`);
  console.log('Headers:', JSON.stringify(req.headers));
  if (Object.keys(req.query).length > 0) {
    console.log('Query:', JSON.stringify(req.query));
  }
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', JSON.stringify(req.body));
  }
  next();
});

// Paymentwall konfigürasyonu
const paymentwallConfig = {
  appKey: '',
  secretKey: '',
  testMode: true
};

// Paymentwall servisini başlat
const paymentwall = new PaymentwallService(paymentwallConfig);

// Tek seferlik ödeme örneği
async function createOneTimePayment() {
  try {
    const paymentResult = await paymentwall.createPayment({
      name: 'Premium Paket - Tek Seferlik',
      amount: 199.99,
      currency: 'TRY',
      email: 'musteri@ornek.com',
      productId: 'urun-123',
      orderId: 'siparis-' + Date.now(),
      userId: 'kullanici-123',
      widgetCode: 'p1_1',
      generateQr: true,
      // Webhook URL'ini Paymentwall panelindeki ayar ile aynı olmalı
      pingback_url: 'https://test.quickpanel.net/webhook',
      success_url: 'https://test.quickpanel.net/webhook/success',
      customParams: {
        description: 'Tek seferlik premium paket ödemesi'
      }
    });
    
    console.log('Tek seferlik ödeme bağlantısı oluşturuldu:');
    console.log(paymentResult);
    console.log('\nWebhook test sunucusu başlatıldı: http://localhost:80');
    console.log('Webhook URL\'inizi Paymentwall panelinde şu şekilde ayarlayın:');
    console.log('1. https://test.quickpanel.net/webhook');
    console.log('2. IP adresine izin vermeyi unutmayın');
    
    return paymentResult;
  } catch (error) {
    console.error('Ödeme oluşturma hatası:', error.message);
  }
}

// Webhook endpoint - hem GET hem POST destekler
app.all('/webhook', (req, res) => {
  console.log('🔔 Webhook çağrısı alındı!');
  
  // GET ve POST isteklerini birleştir
  const callbackData = req.method === 'POST' ? req.body : req.query;
  const clientIp = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
  
  console.log(`📌 Webhook türü: ${req.method}`);
  console.log(`📌 IP Adresi: ${clientIp}`);
  console.log('📌 Callback Verileri:', callbackData);
  
  // Test için manuel doğrulama
  if (Object.keys(callbackData).length === 0) {
    console.log('⚠️ Callback verisi boş, test cevabı dönülüyor');
    return res.status(200).send('OK TEST');
  }
  
  paymentwall.handleCallback(callbackData, clientIp)
    .then(result => {
      console.log('✅ Ödeme durumu:', result);
      
      if (result.status === 'success') {
        console.log(`✅ Başarılı Ödeme: Sipariş ${result.orderId} için ${result.amount} ${result.currency} ödeme alındı`);
      } else if (result.status === 'failed') {
        console.log(`❌ Başarısız Ödeme: Sipariş ${result.orderId} - Sebep: ${result.reason}`);
      } else {
        console.log(`ℹ️ Diğer Durum: ${result.type} - Sipariş: ${result.orderId}`);
      }
      
      // Paymentwall'a başarılı yanıt gönder - bu çok önemli!
      res.status(200).send('OK');
    })
    .catch(error => {
      console.error('⚠️ Webhook işleme hatası:', error.message);
      
      // Hata olsa bile 200 OK dönmek önemli
      res.status(200).send('OK');
    });
});

// Başarılı ödeme dönüş sayfası
app.get('/webhook/success', (req, res) => {
  console.log('✅ Başarı sayfasına yönlendirildi:', req.query);
  
  res.send(`
    <html>
      <head>
        <title>Ödeme Başarılı</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .success { color: green; font-size: 24px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="success">Ödemeniz başarıyla tamamlandı!</div>
        <p>Teşekkür ederiz. Siparişiniz işleme alındı.</p>
        <p>Sipariş detayları webhook üzerinden işleniyor...</p>
        <pre>${JSON.stringify(req.query, null, 2)}</pre>
      </body>
    </html>
  `);
});

// Basit bir test sayfası
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Paymentwall Test</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          button { padding: 10px; margin: 10px 0; background: #0066ff; color: white; border: none; border-radius: 4px; cursor: pointer; }
        </style>
      </head>
      <body>
        <h1>Paymentwall Test</h1>
        <p>Webhook URL: <code>/webhook</code></p>
        <button onclick="testWebhook()">Test Webhook</button>
        <script>
          function testWebhook() {
            fetch('/webhook-test')
              .then(response => response.text())
              .then(data => alert('Test sonucu: ' + data))
              .catch(error => alert('Hata: ' + error));
          }
        </script>
      </body>
    </html>
  `);
});

// Manuel webhook testi için endpoint
app.get('/webhook-test', (req, res) => {
  const testData = {
    type: 1,
    uid: 'kullanici-123',
    ref: 'test-' + Date.now(),
    is_test: 1,
    order_id: 'siparis-test',
    amount: '199.99',
    currency: 'TRY',
    test_mode: 1
  };
  
  console.log('🧪 Manuel webhook test çağrısı yapılıyor...');
  
  paymentwall.handleCallback(testData, '127.0.0.1')
    .then(result => {
      console.log('🧪 Test sonucu:', result);
      res.status(200).send('Test başarılı: ' + JSON.stringify(result));
    })
    .catch(error => {
      console.error('🧪 Test hatası:', error.message);
      res.status(500).send('Test hatası: ' + error.message);
    });
});

// Test sunucusunu başlat
const PORT = 80;
app.listen(PORT, () => {
  console.log(`🚀 Test sunucusu başlatıldı: http://localhost:${PORT}`);
  console.log(`🔔 Webhook URL: http://localhost:${PORT}/webhook`);
  console.log(`⚠️ Önemli: Gerçek ortamda, webhook URL'inizi Paymentwall panelinde`);
  console.log(`   https://test.quickpanel.net/webhook olarak ayarlayın`);
  
  // Ödeme örneğini başlat
  createOneTimePayment();
});

// Sunucuyu kapatmak için CTRL+C
process.on('SIGINT', () => {
  console.log('Test sunucusu kapatılıyor...');
  process.exit(0);
});
