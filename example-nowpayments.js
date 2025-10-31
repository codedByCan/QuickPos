const NOWPaymentsService = require('./lib/nowpayments');
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const app = express();

// Body parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Tüm istekleri loglama
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] Gelen istek: ${req.method} ${req.url}`);
  if (Object.keys(req.query).length > 0) {
    console.log('Query:', JSON.stringify(req.query));
  }
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', JSON.stringify(req.body));
  }
  next();
});

// NOWPayments konfigürasyonu - kendi API anahtarınızı kullanmalısınız
const nowpaymentsConfig = {
  apiKey: 'V25V8J9-1ZY4B7K', // NOWPayments API anahtarınız
  ipnSecret: '2uy+CaE',   // Webhook güvenlik anahtarı
  sandbox: false,                     // Sandbox ortamı için true, canlı ortam için false
  debug: true                         // Debug modu açık (geliştirme sırasında)
};

// NOWPayments servisini başlat
const nowpayments = new NOWPaymentsService(nowpaymentsConfig);

// Ödeme oluşturma örneği
async function createPaymentExample() {
  try {
    console.log('Yeni kripto ödeme isteği oluşturuluyor...');
    
    // Benzersiz sipariş ID'si oluştur
    const orderId = 'order-' + Date.now();
    
    const paymentResult = await nowpayments.createPayment({
      price: 100.50,                  // 100.50 USD/EUR/TL vb.
      currency_from: 'USD',           // Ödeme almak istediğiniz para birimi (USD, EUR, TRY vb.)
      currency_to: 'ETH',             // Hangi kripto para ile ödeme alınacak (BTC, ETH, LTC vb.)
      order_id: orderId,              // Sipariş ID'niz
      description: 'Premium Üyelik - 1 Ay',
      callbackUrl: 'https://test.quickpanel.net/webhook/nowpayments', // Webhook URL
      successUrl: 'https://test.quickpanel.net/success',  // Başarılı ödeme dönüş sayfası
      cancelUrl: 'https://test.quickpanel.net/cancel',    // İptal edilirse dönüş sayfası
      generateQr: true                // Kripto adresi için QR kod oluştur
    });
    
    console.log('Ödeme bağlantısı oluşturuldu:');
    console.log(JSON.stringify(paymentResult, null, 2));
    
    return paymentResult;
  } catch (error) {
    console.error('Ödeme oluşturma hatası:', error.message);
    return { status: 'error', message: error.message };
  }
}

// Webhook endpoint
app.post('/webhook/nowpayments', async (req, res) => {
  console.log('🔔 NOWPayments webhook çağrısı alındı!');
  
  try {
    // Webhook verilerini işle
    const result = await nowpayments.handleWebhook(req.body);
    console.log('✅ Ödeme durumu:', result);
    
    if (result.status === 'success') {
      console.log(`✅ Başarılı Ödeme: Sipariş ${result.orderId} için ${result.priceAmount} ${result.priceCurrency} ödeme alındı`);
      console.log(`   ${result.payAmount} ${result.payCurrency} olarak ödendi`);
      
      // Burada başarılı ödeme işlemleri yapılabilir
      // - Veritabanı güncelleme
      // - Sipariş durumu değiştirme
      // - Kullanıcı hesabını aktifleştirme vb.
      
    } else if (result.status === 'partially_paid') {
      console.log(`⚠️ Kısmi Ödeme: Sipariş ${result.orderId} için kısmi ödeme alındı`);
      console.log(`   Beklenen: ${result.payAmount} ${result.payCurrency}, Alınan: ${result.actualAmount} ${result.payCurrency}`);
    } else if (result.status === 'waiting') {
      console.log(`⏳ Ödeme Bekleniyor: Sipariş ${result.orderId} için ${result.priceAmount} ${result.priceCurrency} ödeme bekleniyor`);
      console.log(`   Beklenen kripto: ${result.payAmount} ${result.payCurrency}`);
    } else if (result.status === 'confirming') {
      console.log(`🔄 Ödeme Onaylanıyor: Sipariş ${result.orderId} için blok zinciri onayı bekleniyor`);
    } else if (result.status === 'refunded') {
      console.log(`♻️ İade Edilen Ödeme: Sipariş ${result.orderId} için ödeme iade edildi`);
    } else if (result.status === 'failed') {
      console.log(`❌ Başarısız Ödeme: Sipariş ${result.orderId}`);
    } else {
      console.log(`ℹ️ Ödeme durumu güncellendi: ${result.orderId} - ${result.status} (${result.statusDescription})`);
    }
    
    // NOWPayments'e başarılı yanıt gönder
    res.status(200).send('OK');
  } catch (error) {
    console.error('⚠️ Webhook işleme hatası:', error.message);
    // Webhook işleme hatası durumunda bile 200 OK dönmek önemli
    res.status(200).send('OK');
  }
});

// Ödeme durumu kontrol endpoint'i
app.get('/payment-status/:paymentId', async (req, res) => {
  try {
    const result = await nowpayments.checkPaymentStatus(req.params.paymentId);
    res.json(result);
  } catch (error) {
    console.error(`❌ Ödeme durumu sorgulama hatası: ${error.message}`);
    res.status(400).json({ error: error.message });
  }
});

// Başarılı ödeme dönüş sayfası
app.get('/success', (req, res) => {
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
        <div class="success">Ödemeniz işleme alındı!</div>
        <p>Teşekkür ederiz. Ödemeniz onaylandığında siparişiniz işleme alınacaktır.</p>
        <p>Not: Kripto para ödemeleri, işlemin blok zincirinde onaylanmasını gerektirdiği için biraz zaman alabilir.</p>
        <pre>${JSON.stringify(req.query, null, 2)}</pre>
      </body>
    </html>
  `);
});

// İptal sayfası
app.get('/cancel', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Ödeme İptal Edildi</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .cancel { color: red; font-size: 24px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="cancel">Ödeme işlemi iptal edildi</div>
        <p>Ödeme işleminiz tamamlanmadı. Tekrar denemek için anasayfaya dönebilirsiniz.</p>
        <a href="/">Anasayfaya Dön</a>
      </body>
    </html>
  `);
});

// Ana sayfa
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>NOWPayments Kripto Ödeme Testi</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
          button { padding: 10px 15px; background: #0066ff; color: white; border: none; border-radius: 4px; cursor: pointer; }
          .container { margin-top: 20px; }
          pre { background: #f4f4f4; padding: 10px; border-radius: 4px; overflow: auto; }
          .error { color: red; }
          .verify-form { margin-top: 30px; padding: 15px; border: 1px solid #ddd; border-radius: 4px; }
          input { padding: 8px; width: 300px; }
        </style>
      </head>
      <body>
        <h1>NOWPayments Kripto Ödeme Testi</h1>
        <p>NOWPayments API ile kripto para ödeme bağlantısı oluşturma testi.</p>
        <button id="create-payment-btn">Yeni Kripto Ödeme Oluştur</button>
        
        <div class="container" id="result">
          <p>Bu test için aşağıdaki bilgileri kullanıyoruz:</p>
          <pre>API Key: ${nowpaymentsConfig.apiKey.substring(0, 10)}...
Ortam: ${nowpaymentsConfig.sandbox ? 'Sandbox (test)' : 'Production (canlı)'}</pre>
        </div>
        
        <div class="verify-form">
          <h3>Ödeme Durumu Sorgulama</h3>
          <p>NOWPayments ödeme ID'si ile durumu kontrol edin:</p>
          <input type="text" id="paymentId" placeholder="Ödeme ID'si girin">
          <button id="check-status-btn">Sorgula</button>
          <div id="statusResult"></div>
        </div>
        
        <script>
          // DOM yüklendikten sonra çalıştırılacak fonksiyonlar
          document.addEventListener('DOMContentLoaded', function() {
            // Ödeme oluşturma butonu click event'i
            document.getElementById('create-payment-btn').addEventListener('click', function() {
              document.getElementById('result').innerHTML = '<p>Ödeme oluşturuluyor...</p>';
              
              fetch('/create-payment')
                .then(response => response.json())
                .then(data => {
                  if (data.status === 'success') {
                    let html = \`
                      <h3>Kripto Ödeme Bağlantısı Oluşturuldu</h3>
                      <p>Ödeme ID: \${data.data.id}</p>
                      <p>Sipariş ID: \${data.data.orderId}</p>
                      <p>Ödeme URL: <a href="\${data.data.url}" target="_blank">\${data.data.url}</a></p>
                    \`;
                    
                    if (data.data.payAmount && data.data.payCurrency) {
                      html += \`<p>Ödeme miktarı: \${data.data.payAmount} \${data.data.payCurrency}</p>\`;
                    }
                    
                    if (data.data.payAddress) {
                      html += \`<p>Ödeme adresi: \${data.data.payAddress}</p>\`;
                    }
                    
                    if (data.data.qr) {
                      html += \`<p>QR Kod:</p><img src="\${data.data.qr}" width="200" />\`;
                    }
                    
                    document.getElementById('result').innerHTML = html;
                  } else {
                    document.getElementById('result').innerHTML = '<p class="error">Hata: ' + data.message + '</p>';
                  }
                })
                .catch(error => {
                  document.getElementById('result').innerHTML = '<p class="error">Hata: ' + error + '</p>';
                });
            });
            
            // Durum sorgulama butonu click event'i
            document.getElementById('check-status-btn').addEventListener('click', function() {
              const paymentId = document.getElementById('paymentId').value.trim();
              if (!paymentId) {
                alert('Lütfen bir ödeme ID\\'si girin');
                return;
              }
              
              document.getElementById('statusResult').innerHTML = '<p>Ödeme durumu sorgulanıyor...</p>';
              
              fetch(\`/payment-status/\${paymentId}\`)
                .then(response => response.json())
                .then(data => {
                  let html = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
                  document.getElementById('statusResult').innerHTML = html;
                })
                .catch(error => {
                  document.getElementById('statusResult').innerHTML = '<p class="error">Hata: ' + error + '</p>';
                });
            });
          });
        </script>
      </body>
    </html>
  `);
});

// API endpoint - yeni ödeme oluşturma
app.get('/create-payment', async (req, res) => {
  try {
    const result = await createPaymentExample();
    res.json(result);
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
});

// Test sunucusunu başlat
const PORT = 80;
app.listen(PORT, () => {
  console.log(`🚀 Test sunucusu başlatıldı: http://localhost:${PORT}`);
  console.log(`🔔 Webhook URL: http://localhost:${PORT}/webhook/nowpayments`);
  console.log('⚠️ NOWPayments Entegrasyon Ayarları:');
  console.log(`   - API Key: ${nowpaymentsConfig.apiKey.substring(0, 10)}...`);
  console.log(`   - IPN Secret: ${nowpaymentsConfig.ipnSecret ? (nowpaymentsConfig.ipnSecret.substring(0, 10) + '...') : 'Ayarlanmadı'}`);
  console.log(`   - Ortam: ${nowpaymentsConfig.sandbox ? 'Sandbox (Test)' : 'Production (Canlı)'}`);
  
  console.log('⚠️ Not: Gerçek ortamda, webhook URL\'inizi NOWPayments panelinde ayarlayın');
  console.log('⚠️ Ayrıca, example-nowpayments.js dosyasındaki API anahtarını ve webhook secret\'ı kendi değerlerinizle değiştirmeyi unutmayın');
});

// Sunucuyu kapatmak için CTRL+C
process.on('SIGINT', () => {
  console.log('Test sunucusu kapatılıyor...');
  process.exit(0);
});
