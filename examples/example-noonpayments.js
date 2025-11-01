const NOONPaymentsService = require('./lib/noonpayments');
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

// NOONPayments konfigürasyonu - kendi API anahtarınızı kullanmalısınız
const noonpaymentsConfig = {
  businessId: 'test',   // NOONPayments panelinden alınır
  appName: 'test',         // NOONPayments uygulamanızın adı
  appKey: 'test',           // NOONPayments uygulamanızın anahtarı
  region: '',                       // Boş bırakılırsa global, 'sa' veya 'eg' olabilir
  sandbox: true,                    // Sandbox (test) ortamı için true
  debug: true                       // Debug modu açık (geliştirme sırasında)
};

// NOONPayments servisini başlat
const noonpayments = new NOONPaymentsService(noonpaymentsConfig);

// Ödeme oluşturma örneği
async function createPaymentExample() {
  try {
    console.log('Yeni ödeme isteği oluşturuluyor...');
    
    // Benzersiz sipariş ID'si oluştur
    const orderId = 'order-' + Date.now();
    
    const paymentResult = await noonpayments.createPayment({
      amount: 100.50,                 // Ödeme tutarı
      currency: 'AED',                // Para birimi (AED, SAR, EGP vb.)
      reference: orderId,             // Sipariş referansı/ID'si
      name: 'Premium Üyelik',         // Sipariş/ürün adı
      channel: 'web',                 // Ödeme kanalı (web, mobile)
      category: 'pay',                // Kategori (noonpayments panelinde tanımlı)
      returnUrl: 'https://test.quickpanel.net/success', // Başarılı ödeme dönüş URL'i
      locale: 'en',                   // Dil
      generateQr: true,               // QR kod oluştur
      // İsteğe bağlı alanlar
      billing: {                      // Fatura bilgileri
        address: {
          street: 'Test Street',
          city: 'Dubai',
          stateProvince: 'Dubai',
          country: 'AE',
          postalCode: '12345'
        },
        contact: {
          firstName: 'John',
          lastName: 'Doe',
          phone: '05012345678',
          email: 'test@example.com'
        }
      },
      shipping: {                     // Teslimat bilgileri (gerekiyorsa)
        address: {
          street: 'Test Street',
          city: 'Dubai',
          stateProvince: 'Dubai',
          country: 'AE',
          postalCode: '12345'
        },
        contact: {
          firstName: 'John',
          lastName: 'Doe',
          phone: '05012345678',
          email: 'test@example.com'
        }
      },
      // Doğrudan kart bilgileri ile ödeme (PCI-DSS uyumlu merchantlar için)
      // cardData: {
      //   nameOnCard: 'John Doe',
      //   numberPlain: '4111111111111111',
      //   cvv: '123',
      //   expiryMonth: '12',
      //   expiryYear: '2030'
      // },
      // Token kullanarak ödeme
      // tokenIdentifier: 'a9eca373-c4c8-4dde-be64-d058b3ce6eb9',
      paymentAction: 'AUTHORIZE,SALE' // AUTHORIZE sonra SALE için
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
app.post('/webhook', async (req, res) => {
  console.log('🔔 NOONPayments webhook çağrısı alındı!');
  
  try {
    // Webhook verilerini işle
    const result = await noonpayments.handleCallback(req.body);
    console.log('✅ Ödeme durumu:', result);
    
    if (result.status === 'success') {
      console.log(`✅ Başarılı Ödeme: Sipariş ${result.orderId} için ${result.amount} ${result.currency} ödeme alındı`);
      
      // Burada başarılı ödeme işlemleri yapılabilir
      // - Veritabanı güncelleme
      // - Sipariş durumu değiştirme
      // - Kullanıcı hesabını aktifleştirme vb.
      
    } else if (result.status === 'authorized') {
      console.log(`🔄 Yetkilendirilmiş Ödeme: Sipariş ${result.orderId} için ${result.amount} ${result.currency} ödeme yetkilendirildi`);
    } else if (result.status === 'captured') {
      console.log(`💰 Çekilen Ödeme: Sipariş ${result.orderId} için ${result.amount} ${result.currency} ödeme çekildi`);
    } else if (result.status === 'refunded') {
      console.log(`♻️ İade Edilen Ödeme: Sipariş ${result.orderId} için ${result.amount} ${result.currency} iade edildi`);
    } else if (result.status === 'failed' || result.status === 'authorization_failed' || result.status === 'capture_failed') {
      console.log(`❌ Başarısız Ödeme: Sipariş ${result.orderId}`);
    } else {
      console.log(`ℹ️ Diğer Ödeme Durumu: ${result.status} - Sipariş: ${result.orderId}`);
    }
    
    // Başarılı yanıt gönder
    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('⚠️ Webhook işleme hatası:', error.message);
    // Hata durumunda bile 200 OK dönmek genelde daha iyidir
    res.status(200).json({ status: 'error', message: error.message });
  }
});

// Ödeme durumu sorgulama endpoint'i
app.get('/order-status/:orderId', async (req, res) => {
  try {
    const result = await noonpayments.getOrderStatus(req.params.orderId);
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
        <p>Teşekkür ederiz. Siparişiniz işleme alınacaktır.</p>
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
        <title>NOONPayments Ödeme Testi</title>
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
        <h1>NOONPayments Ödeme Testi</h1>
        <p>NOONPayments API ile ödeme bağlantısı oluşturma testi.</p>
        <button id="create-payment-btn">Yeni Ödeme Oluştur</button>
        
        <div class="container" id="result">
          <p>Bu test için aşağıdaki bilgileri kullanıyoruz:</p>
          <pre>Business ID: ${noonpaymentsConfig.businessId}
Application: ${noonpaymentsConfig.appName}
Ortam: ${noonpaymentsConfig.sandbox ? 'Sandbox (test)' : 'Production (canlı)'}</pre>
        </div>
        
        <div class="verify-form">
          <h3>Sipariş Durumu Sorgulama</h3>
          <p>NOONPayments sipariş ID'si ile ödeme durumunu kontrol edin:</p>
          <input type="text" id="orderId" placeholder="Sipariş ID'si girin">
          <button id="check-status-btn">Sorgula</button>
          <div id="statusResult"></div>
        </div>
        
        <script>
          document.addEventListener('DOMContentLoaded', function() {
            document.getElementById('create-payment-btn').addEventListener('click', function() {
              document.getElementById('result').innerHTML = '<p>Ödeme oluşturuluyor...</p>';
              
              fetch('/create-payment')
                .then(response => response.json())
                .then(data => {
                  if (data.status === 'success') {
                    let html = \`
                      <h3>Ödeme Bağlantısı Oluşturuldu</h3>
                      <p>Sipariş ID: \${data.data.id}</p>
                      <p>Sipariş Referansı: \${data.data.orderId}</p>
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
            });
            
            document.getElementById('check-status-btn').addEventListener('click', function() {
              const orderId = document.getElementById('orderId').value.trim();
              if (!orderId) {
                alert('Lütfen bir sipariş ID\\'si girin');
                return;
              }
              
              document.getElementById('statusResult').innerHTML = '<p>Sipariş durumu sorgulanıyor...</p>';
              
              fetch(\`/order-status/\${orderId}\`)
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
  console.log(`🔔 Webhook URL: http://localhost:${PORT}/webhook`);
  console.log('⚠️ NOONPayments Entegrasyon Ayarları:');
  console.log(`   - Business ID: ${noonpaymentsConfig.businessId}`);
  console.log(`   - App Name: ${noonpaymentsConfig.appName}`);
  console.log(`   - Ortam: ${noonpaymentsConfig.sandbox ? 'Sandbox (Test)' : 'Production (Canlı)'}`);
  console.log(`   - API Base URL: ${noonpayments.baseUrl}`);
  
  console.log('⚠️ Not: Gerçek ortamda, webhook URL\'inizi NOONPayments panelinde ayarlayın');
  console.log('⚠️ Ayrıca, example-noonpayments.js dosyasındaki konfigürasyon bilgilerini kendi değerlerinizle değiştirmeyi unutmayın');
});

// Sunucuyu kapatmak için CTRL+C
process.on('SIGINT', () => {
  console.log('Test sunucusu kapatılıyor...');
  process.exit(0);
});
