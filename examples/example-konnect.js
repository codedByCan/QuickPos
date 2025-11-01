const KonnectService = require('./lib/konnect');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();

// Body parser middleware
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

// Konnect konfigürasyonu - kendi API anahtarınızı ve cüzdan ID'nizi kullanmalısınız
const konnectConfig = {
  apiKey: ':',             // Konnect API anahtarınız
  receiverWalletId: '', // Konnect cüzdan ID'niz
  sandbox: true,                           // Sandbox ortamı için true, canlı ortam için false
  testMode: true
};

// Konnect servisini başlat
const konnect = new KonnectService(konnectConfig);

// Ödeme oluşturma örneği
async function createPaymentExample() {
  try {
    console.log('Yeni ödeme isteği oluşturuluyor...');
    
    const paymentResult = await konnect.createPayment({
      amount: 10000,           // 10 TND (millimes cinsinden)
      token: 'TND',            // Para birimi (TND, EUR, veya USD)
      description: 'Premium Üyelik - 1 Ay',
      type: 'immediate',       // Anında ödeme
      orderId: 'siparis-' + Date.now(),
      webhook: 'https://test.quickpanel.net/webhook',
      email: 'musteri@ornek.com',
      firstName: 'İsim',
      lastName: 'Soyisim',
      phoneNumber: '22777777',
      acceptedPaymentMethods: ["wallet", "bank_card", "e-DINAR"],
      lifespan: 60,            // 60 dakika ödeme süresi
      checkoutForm: true,      // Ödeme formunu göster
      theme: 'light',          // Arayüz teması
      generateQr: true         // QR kod oluştur
    });
    
    console.log('Ödeme bağlantısı oluşturuldu:');
    console.log(JSON.stringify(paymentResult, null, 2));
    console.log('\nWebhook test sunucusu başlatıldı: http://localhost:80');
    console.log('Webhook URL\'inizi Konnect panelinde ayarlayabilir veya her ödeme için belirtebilirsiniz.');
    
    return paymentResult;
  } catch (error) {
    console.error('Ödeme oluşturma hatası:', error.message);
    return { status: 'error', message: error.message };
  }
}

// Webhook endpoint
app.get('/webhook', async (req, res) => {
  console.log('🔔 Konnect webhook çağrısı alındı!');
  
  const paymentRef = req.query.payment_ref;
  if (!paymentRef) {
    console.error('❌ Webhook hata: payment_ref parametresi eksik');
    return res.status(400).send('Missing payment_ref');
  }
  
  console.log(`📌 Ödeme Referansı: ${paymentRef}`);
  
  try {
    // Callback işleme
    const result = await konnect.handleCallback({ payment_ref: paymentRef });
    console.log('✅ Ödeme durumu:', result);
    
    if (result.status === 'success') {
      console.log(`✅ Başarılı Ödeme: Sipariş ${result.orderId} için ${result.amount} ${result.currency} ödeme alındı`);
      
      // Burada başarılı ödeme işlemleri yapılabilir
      // - Veritabanı güncelleme
      // - Sipariş durumu değiştirme
      // - Kullanıcı hesabını aktifleştirme vb.
      
    } else {
      console.log(`❌ Başarısız Ödeme: Sipariş ${result.orderId} - Sebep: ${result.reason}`);
    }
    
    // Konnect webhook success sayfasına yönlendir
    res.status(200).send('OK');
  } catch (error) {
    console.error('⚠️ Webhook işleme hatası:', error.message);
    res.status(200).send('Error: ' + error.message);
  }
});

// Ödeme durumu kontrol endpoint'i
app.get('/payment-status/:paymentRef', async (req, res) => {
  const paymentRef = req.params.paymentRef;
  
  try {
    const paymentDetails = await konnect.getPaymentDetails(paymentRef);
    res.json(paymentDetails);
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
        <div class="success">Ödemeniz başarıyla tamamlandı!</div>
        <p>Teşekkür ederiz. Siparişiniz işleme alındı.</p>
        <pre>${JSON.stringify(req.query, null, 2)}</pre>
      </body>
    </html>
  `);
});

// Ana sayfa
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Konnect Ödeme Testi</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
          button { padding: 10px 15px; background: #0066ff; color: white; border: none; border-radius: 4px; cursor: pointer; }
          .container { margin-top: 20px; }
          pre { background: #f4f4f4; padding: 10px; border-radius: 4px; overflow: auto; }
          .error { color: red; }
        </style>
      </head>
      <body>
        <h1>Konnect Ödeme Testi</h1>
        <p>Konnect Sandbox API ile ödeme bağlantısı oluşturma testi.</p>
        <button onclick="createPayment()">Yeni Ödeme Oluştur</button>
        
        <div class="container" id="result">
          <p>Bu test için aşağıdaki bilgileri kullanıyoruz:</p>
          <pre>API Anahtarı: ${konnectConfig.apiKey.substring(0, 10)}...
Cüzdan ID: ${konnectConfig.receiverWalletId}
Ortam: ${konnectConfig.sandbox ? 'Sandbox (test)' : 'Production (canlı)'}</pre>
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
                    <p>Ödeme ID: \${data.data.id}</p>
                    <p>Ödeme URL: <a href="\${data.data.url}" target="_blank">\${data.data.url}</a></p>
                  \`;
                  
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
  console.log(`🔔 Webhook URL: http://localhost:${PORT}/webhook`);
  console.log('⚠️ Konnect Entegrasyon Ayarları:');
  console.log(`   - API Key: ${konnectConfig.apiKey.substring(0, 10)}...`);
  console.log(`   - Wallet ID: ${konnectConfig.receiverWalletId}`);
  console.log(`   - Ortam: ${konnectConfig.sandbox ? 'Sandbox (Test)' : 'Production (Canlı)'}`);
  console.log(`   - API Base URL: ${konnect.baseUrl}`);
  
  console.log('⚠️ Gerçek ortamda, webhook URL\'inizi Konnect panelinde ayarlayın');
  console.log('⚠️ Konnect entegrasyonu için:');
  console.log('  1. Konnect hesabı oluşturun:');
  console.log('     - Sandbox (test): https://dashboard.sandbox.konnect.network');
  console.log('     - Üretim: https://dashboard.konnect.network');
  console.log('  2. KYC/KYB doğrulamasını tamamlayın (kimlik ve kurum doğrulama)');
  console.log('  3. API anahtarınızı ve cüzdan ID\'nizi alın');
  console.log('  4. example-konnect.js dosyasındaki yapılandırmayı güncelleyin');
});
