const YallaPayService = require('./lib/yallapay');
const express = require('express');
const bodyParser = require('body-parser');
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

// YallaPay konfigürasyonu - kendi API anahtarınızı kullanmalısınız
const yallapayConfig = {
  privateKey: 'YOUR_PRIVATE_KEY',  // YallaPay Merchant Dashboard'dan alınır
  currency: 'USD',                 // İşlem para birimi
  webhookSecret: 'YOUR_WEBHOOK_SECRET_KEY', // YallaPay Webhook Dashboard'dan alınır
  debug: true                      // Debug modu açık (geliştirme sırasında)
};

// YallaPay servisini başlat
const yallapay = new YallaPayService(yallapayConfig);

// Ödeme oluşturma örneği
async function createPaymentExample() {
  try {
    console.log('Yeni ödeme isteği oluşturuluyor...');
    
    const paymentResult = await yallapay.createPayment({
      amount: 100,                   // Ödeme tutarı
      purpose: 'Premium Üyelik',     // Ödeme açıklaması
      external_id: 'siparis-' + Date.now(), // Sipariş ID'si
      is_fallback: '1',              // Fallback URL kullan
      fallback_url: 'https://test.quickpanel.net/success', // Başarılı ödeme dönüş sayfası
      generateQr: true               // QR kod oluştur
    });
    
    console.log('Ödeme bağlantısı oluşturuldu:');
    console.log(JSON.stringify(paymentResult, null, 2));
    
    return paymentResult;
  } catch (error) {
    console.error('Ödeme oluşturma hatası:', error.message);
    return { status: 'error', message: error.message };
  }
}

// Örnek işlem doğrulama
async function verifyTransactionExample(transactionId) {
  try {
    console.log(`${transactionId} işlemi doğrulanıyor...`);
    
    const result = await yallapay.verifyTransaction(transactionId);
    console.log('İşlem durumu:', result);
    
    return result;
  } catch (error) {
    console.error('İşlem doğrulama hatası:', error.message);
    return { status: 'error', message: error.message };
  }
}

// Webhook endpoint
app.post('/webhook/yallapay', async (req, res) => {
  console.log('🔔 YallaPay webhook çağrısı alındı!');
  
  try {
    // Webhook verilerini işle - artık webhook secret'ı ayrıca vermiyoruz
    const result = await yallapay.handleWebhook(req.body);
    console.log('✅ Ödeme durumu:', result);
    
    if (result.status === 'success') {
      console.log(`✅ Başarılı Ödeme: Sipariş ${result.orderId} için ${result.amount} ${result.currency} ödeme alındı`);
      
      // Burada başarılı ödeme işlemleri yapılabilir
      // - Veritabanı güncelleme
      // - Sipariş durumu değiştirme
      // - Kullanıcı hesabını aktifleştirme vb.
    } else if (result.status === 'refunded') {
      console.log(`♻️ İade Edilen Ödeme: Sipariş ${result.orderId} için ${result.amount} ${result.currency} iade edildi`);
    } else if (result.status === 'failed') {
      console.log(`❌ Başarısız Ödeme: Sipariş ${result.orderId}`);
    }
    
    // YallaPay'e başarılı yanıt gönder
    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('⚠️ Webhook işleme hatası:', error.message);
    // YallaPay'e hata yanıtı gönder
    res.status(400).json({ status: 'error', message: error.message });
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
        <div class="success">Ödemeniz başarıyla tamamlandı!</div>
        <p>Teşekkür ederiz. Siparişiniz işleme alındı.</p>
        <pre>${JSON.stringify(req.query, null, 2)}</pre>
      </body>
    </html>
  `);
});

// İşlem doğrulama endpoint'i
app.get('/verify/:transactionId', async (req, res) => {
  try {
    const result = await verifyTransactionExample(req.params.transactionId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
});

// Ana sayfa
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>YallaPay Ödeme Testi</title>
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
        <h1>YallaPay Ödeme Testi</h1>
        <p>YallaPay API ile ödeme bağlantısı oluşturma testi.</p>
        <button onclick="createPayment()">Yeni Ödeme Oluştur</button>
        
        <div class="container" id="result">
          <p>Bu test için aşağıdaki bilgileri kullanıyoruz:</p>
          <pre>Private Key: ${yallapayConfig.privateKey.substring(0, 10)}...
Para Birimi: ${yallapayConfig.currency}</pre>
        </div>
        
        <div class="verify-form">
          <h3>İşlem Doğrulama</h3>
          <p>YallaPay işlem ID'si ile ödeme durumunu kontrol edin:</p>
          <input type="text" id="transactionId" placeholder="İşlem ID'si girin">
          <button onclick="verifyTransaction()">Doğrula</button>
          <div id="verifyResult"></div>
        </div>
        
        <script>
          function createPayment() {
            document.getElementById('result').innerHTML = '<p>Ödeme oluşturuluyor...</p>';
            
            fetch('/create-payment')
              .then(response => response.json())
              .then(data => {
                if (data.status === 'success') {
                  let html = \`
                    <h3>Ödeme Bağlantısı Oluşturuldu</h3>
                    <p>İşlem ID: \${data.data.id}</p>
                    <p>Ödeme URL: <a href="\${data.data.url}" target="_blank">\${data.data.url}</a></p>
                  \`;
                  
                  if (data.data.fallbackUrl) {
                    html += \`<p>Dönüş URL: \${data.data.fallbackUrl}</p>\`;
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
          }
          
          function verifyTransaction() {
            const transactionId = document.getElementById('transactionId').value.trim();
            if (!transactionId) {
              alert('Lütfen bir işlem ID\'si girin');
              return;
            }
            
            document.getElementById('verifyResult').innerHTML = '<p>İşlem doğrulanıyor...</p>';
            
            fetch(\`/verify/\${transactionId}\`)
              .then(response => response.json())
              .then(data => {
                let html = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
                document.getElementById('verifyResult').innerHTML = html;
              })
              .catch(error => {
                document.getElementById('verifyResult').innerHTML = '<p class="error">Hata: ' + error + '</p>';
              });
          }
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
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Test sunucusu başlatıldı: http://localhost:${PORT}`);
  console.log(`🔔 Webhook URL: http://localhost:${PORT}/webhook/yallapay`);
  console.log('⚠️ YallaPay Entegrasyon Ayarları:');
  console.log(`   - Private Key: ${yallapayConfig.privateKey.substring(0, 10)}...`);
  console.log(`   - Para Birimi: ${yallapayConfig.currency}`);
  console.log(`   - Webhook Secret: ${yallapayConfig.webhookSecret ? (yallapayConfig.webhookSecret.substring(0, 10) + '...') : 'Ayarlanmadı'}`);
  
  console.log('⚠️ Not: Gerçek ortamda, webhook URL\'inizi YallaPay panelinde ayarlayın');
  console.log('⚠️ Ayrıca, example-yallapay.js dosyasındaki private key ve webhook secret\'ı kendi değerlerinizle değiştirmeyi unutmayın');
});

// Sunucuyu kapatmak için CTRL+C
process.on('SIGINT', () => {
  console.log('Test sunucusu kapatılıyor...');
  process.exit(0);
});
