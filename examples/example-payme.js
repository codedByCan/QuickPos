const PayMeService = require('./lib/payme');
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

// PayMe konfigürasyonu - kendi API anahtarınızı kullanmalısınız
const paymeConfig = {
  sellerPaymeId: 'MPLDEMO-MPLDEMO-MPLDEMO-1234567', // Demo seller ID, kendi anahtarınızla değiştirin
  sandbox: true,  // Sandbox ortamı için true, canlı ortam için false
  debug: true     // Debug modu açık (geliştirme sırasında)
};

// PayMe servisini başlat
const payme = new PayMeService(paymeConfig);

// Ödeme oluşturma örneği
async function createPaymentExample() {
  try {
    console.log('Yeni ödeme isteği oluşturuluyor...');
    
    const paymentResult = await payme.createPayment({
      name: 'Premium Üyelik - 1 Ay',
      amount: 100.50,          // 100.50 birim
      currency: 'ILS',         // Para birimi (ILS = İsrail Şekeli)
      orderId: 'siparis-' + Date.now(),
      installments: '1',       // Tek çekim
      sendNotification: true,  // E-posta ve SMS bildirimleri gönder
      email: 'musteri@ornek.com',
      phone: '+905321234567',
      buyerName: 'İsim Soyisim',
      callbackUrl: 'https://test.quickpanel.net/webhook/payme', // Webhook URL
      returnUrl: 'https://test.quickpanel.net/success',   // Başarılı ödeme dönüş sayfası
      saleType: 'sale',        // Satış tipi (sale, auth vb.)
      paymentMethod: 'credit-card', // Ödeme yöntemi
      language: 'he',          // Ödeme sayfası dili - 'he' (İbranice) veya 'en' (İngilizce) kullanın
      generateQr: true         // QR kod oluştur
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
app.post('/webhook/payme', async (req, res) => {
  console.log('🔔 PayMe webhook çağrısı alındı!');
  
  try {
    // Callback işleme
    const result = await payme.handleCallback(req.body);
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
    
    // PayMe'ye başarılı yanıt gönder (HTTP 200)
    res.status(200).end();
  } catch (error) {
    console.error('⚠️ Webhook işleme hatası:', error.message);
    // Webhook işleme hatası durumunda bile 200 OK dönmek önemli
    // (böylece PayMe tekrar deneme yapmayı bırakır)
    res.status(200).end();
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
        <title>PayMe Ödeme Testi</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
          button { padding: 10px 15px; background: #0066ff; color: white; border: none; border-radius: 4px; cursor: pointer; }
          .container { margin-top: 20px; }
          pre { background: #f4f4f4; padding: 10px; border-radius: 4px; overflow: auto; }
          .error { color: red; }
        </style>
      </head>
      <body>
        <h1>PayMe Ödeme Testi</h1>
        <p>PayMe ${paymeConfig.sandbox ? 'Sandbox' : 'Canlı'} API ile ödeme bağlantısı oluşturma testi.</p>
        <button onclick="createPayment()">Yeni Ödeme Oluştur</button>
        
        <div class="container" id="result">
          <p>Bu test için aşağıdaki bilgileri kullanıyoruz:</p>
          <pre>Seller ID: ${paymeConfig.sellerPaymeId}
Ortam: ${paymeConfig.sandbox ? 'Sandbox (test)' : 'Production (canlı)'}</pre>
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
                    <p>PayMe Kodu: \${data.data.paymeCode}</p>
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
const PORT = 81;
app.listen(PORT, () => {
  console.log(`🚀 Test sunucusu başlatıldı: http://localhost:${PORT}`);
  console.log(`🔔 Webhook URL: http://localhost:${PORT}/webhook/payme`);
  console.log('⚠️ PayMe Entegrasyon Ayarları:');
  console.log(`   - Seller ID: ${paymeConfig.sellerPaymeId}`);
  console.log(`   - Ortam: ${paymeConfig.sandbox ? 'Sandbox (Test)' : 'Production (Canlı)'}`);
  console.log(`   - API Base URL: ${payme.baseUrl}`);
  
  console.log('⚠️ Not: Gerçek ortamda, webhook URL\'inizi PayMe panelinde ayarlayın');
  console.log('⚠️ Ayrıca, example-payme.js dosyasındaki Seller ID\'yi kendi ID\'nizle değiştirmeyi unutmayın');
});

// Sunucuyu kapatmak için CTRL+C
process.on('SIGINT', () => {
  console.log('Test sunucusu kapatılıyor...');
  process.exit(0);
});
