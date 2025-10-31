const express = require('express');
const bodyParser = require('body-parser');
const QuickPos = require('./app');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// QuickPos sağlayıcı yapılandırması 
const quickPos = new QuickPos({
  providers: {
    paydisini: {
      apiKey: '', // Gerçek API anahtarınızla değiştirin
      debug: true // Geliştirme modunda hata ayıklama için
    }
  }
});

// QuickPos middleware'ini ekle
app.use(quickPos.middleware());

// Ana sayfa - Ödeme formu
app.get('/', (req, res) => {
  res.send(`
    <h1>Paydisini Ödeme Testi</h1>
    <form action="/create-payment" method="post">
      <div>
        <label>Tutar:</label>
        <input type="text" name="amount" value="10000" required>
      </div>
      <div>
        <label>Benzersiz Kod:</label>
        <input type="text" name="uniqueCode" value="ORD${Date.now().toString().substring(5)}" required>
      </div>
      <div>
        <label>Servis:</label>
        <select name="service" required>
          <option value="1">Virtual Account Bank BCA (Min: 10,000 IDR)</option>
          <option value="2">Virtual Account Bank BRI (Min: 10,000 IDR)</option>
          <option value="3">Virtual Account Bank CIMB (Min: 10,000 IDR)</option>
          <option value="4">Virtual Account Bank BNI (Min: 10,000 IDR)</option>
          <option value="5">Virtual Account Bank MANDIRI (Min: 10,000 IDR)</option>
          <option value="7">Virtual Account Bank Permata (Min: 10,000 IDR)</option>
          <option value="8">Virtual Account BANK DANAMON (Min: 10,000 IDR)</option>
          <option value="9">Virtual Account BANK BSI (Min: 10,000 IDR)</option>
          <option value="10">Virtual Account BANK BNC - Neo Commerce (Min: 10,000 IDR)</option>
          <option value="11" selected>QRIS Merchant PayDisini (Min: 100 IDR)</option>
          <option value="12">OVO (Min: 1,000 IDR)</option>
          <option value="13">DANA (Min: 1,000 IDR)</option>
          <option value="14">LINKAJA (Min: 1,000 IDR)</option>
          <option value="17">QRIS Custom [Perlu KTP] (Min: 100 IDR)</option>
          <option value="18">ALFAMART (Min: 10,000 IDR)</option>
          <option value="19">INDOMARET (Min: 10,000 IDR)</option>
          <option value="20">QRIS Merchant PayDisini by Danamon (Min: 1,000 IDR)</option>
          <option value="21">Virtual Account Bank OCBC (Min: 10,000 IDR)</option>
          <option value="22">Virtual Account Bank Muamalat (Min: 10,000 IDR)</option>
        </select>
      </div>
      <div>
        <label>Not:</label>
        <input type="text" name="note" value="Test ödeme" required>
      </div>
      <div>
        <label>Geçerlilik Süresi (saniye):</label>
        <input type="number" name="validTime" value="1800">
      </div>
      <div>
        <label>Ücret Tipi:</label>
        <select name="typeFee">
          <option value="1">Müşteri Öder</option>
          <option value="2">Satıcı Öder</option>
        </select>
      </div>
      <div>
        <label>Ödeme Kılavuzu:</label>
        <select name="paymentGuide">
          <option value="TRUE">Göster</option>
          <option value="FALSE">Gösterme</option>
        </select>
      </div>
      <div>
        <label>Dönüş URL'i:</label>
        <input type="text" name="returnUrl" value="http://${req.headers.host}/payment-return">
      </div>
      <button type="submit">Ödeme Oluştur</button>
    </form>
    
    <hr>
    
    <h3>Diğer İşlemler</h3>
    <ul>
      <li><a href="/services">Servis Listesi</a></li>
      <li><a href="/balance">Bakiye Sorgula</a></li>
    </ul>

    <hr>
    
    <h3>Ödeme Kanalları Referans Bilgisi</h3>
    <table border="1" cellpadding="5" cellspacing="0" style="font-size: 12px; width: 100%;">
      <tr style="background-color: #f2f2f2;">
        <th>ID</th>
        <th>Ödeme Kanalı</th>
        <th>Minimum</th>
        <th>Maximum</th>
        <th>Ücret</th>
        <th>Hesaplaşma</th>
        <th>Tip</th>
      </tr>
      <tr><td>1</td><td>Virtual Account Bank BCA</td><td>Rp 10,000</td><td>Rp 10,000,000</td><td>Rp 4,900</td><td>1x24Jam</td><td>VA</td></tr>
      <tr><td>2</td><td>Virtual Account Bank BRI</td><td>Rp 10,000</td><td>Rp 50,000,000</td><td>Rp 2,500</td><td>1x24Jam</td><td>VA</td></tr>
      <tr><td>3</td><td>Virtual Account Bank CIMB</td><td>Rp 10,000</td><td>Rp 50,000,000</td><td>Rp 2,500</td><td>1x24Jam</td><td>VA</td></tr>
      <tr><td>4</td><td>Virtual Account Bank BNI</td><td>Rp 10,000</td><td>Rp 50,000,000</td><td>Rp 4,000</td><td>1x24Jam</td><td>VA</td></tr>
      <tr><td>5</td><td>Virtual Account Bank MANDIRI</td><td>Rp 10,000</td><td>Rp 50,000,000</td><td>Rp 2,500</td><td>1x24Jam</td><td>VA</td></tr>
      <tr><td>7</td><td>Virtual Account Bank Permata</td><td>Rp 10,000</td><td>Rp 50,000,000</td><td>Rp 2,500</td><td>1x24Jam</td><td>VA</td></tr>
      <tr><td>8</td><td>Virtual Account BANK DANAMON</td><td>Rp 10,000</td><td>Rp 50,000,000</td><td>Rp 2,500</td><td>1x24Jam</td><td>VA</td></tr>
      <tr><td>9</td><td>Virtual Account BANK BSI</td><td>Rp 10,000</td><td>Rp 50,000,000</td><td>Rp 3,500</td><td>1x24Jam</td><td>VA</td></tr>
      <tr><td>10</td><td>Virtual Account BANK BNC (Neo Commerce)</td><td>Rp 10,000</td><td>Rp 50,000,000</td><td>Rp 3,500</td><td>1x24Jam</td><td>VA</td></tr>
      <tr><td>11</td><td>QRIS Merchant PayDisini</td><td>Rp 100</td><td>Rp 10,000,000</td><td>0.7%</td><td>1x24Jam</td><td>QRIS</td></tr>
      <tr><td>12</td><td>OVO</td><td>Rp 1,000</td><td>Rp 2,000,000</td><td>3%</td><td>1x24Jam</td><td>OVO</td></tr>
      <tr><td>13</td><td>DANA</td><td>Rp 1,000</td><td>Rp 2,000,000</td><td>3%</td><td>1x24Jam</td><td>EWALLET</td></tr>
      <tr><td>14</td><td>LINKAJA</td><td>Rp 1,000</td><td>Rp 2,000,000</td><td>3%</td><td>1x24Jam</td><td>EWALLET</td></tr>
      <tr><td>17</td><td>QRIS Custom [Perlu KTP untuk aktivasi merchant]</td><td>Rp 100</td><td>Rp 10,000,000</td><td>0.7%</td><td>1x24Jam</td><td>QRIS</td></tr>
      <tr><td>18</td><td>ALFAMART</td><td>Rp 10,000</td><td>Rp 5,000,000</td><td>Rp 2,500</td><td>3x24Jam</td><td>RETAIL</td></tr>
      <tr><td>19</td><td>INDOMARET</td><td>Rp 10,000</td><td>Rp 5,000,000</td><td>Rp 2,500</td><td>3x24Jam</td><td>RETAIL</td></tr>
      <tr><td>20</td><td>QRIS Merchant PayDisini by danamon</td><td>Rp 1,000</td><td>Rp 10,000,000</td><td>0.9%</td><td>1x24Jam</td><td>QRIS</td></tr>
      <tr><td>21</td><td>Virtual Account Bank OCBC</td><td>Rp 10,000</td><td>Rp 50,000,000</td><td>Rp 1,500</td><td>1x24Jam</td><td>VA</td></tr>
      <tr><td>22</td><td>Virtual Account Bank Muamalat</td><td>Rp 10,000</td><td>Rp 50,000,000</td><td>Rp 3,500</td><td>1x24Jam</td><td>VA</td></tr>
    </table>
  `);
});

// Ödeme oluşturma
app.post('/create-payment', async (req, res) => {
  try {
    const result = await quickPos.providers['paydisini'].createPayment({
      amount: req.body.amount,
      uniqueCode: req.body.uniqueCode,
      service: req.body.service,
      note: req.body.note,
      validTime: req.body.validTime,
      typeFee: req.body.typeFee,
      paymentGuide: req.body.paymentGuide === 'TRUE',
      returnUrl: req.body.returnUrl
    });

    if (result.status === 'success') {
      console.log('Ödeme başarıyla oluşturuldu:', result.data);
      
      // Sonuç sayfasını göster
      res.send(`
        <h1>Ödeme Bilgileri</h1>
        <div style="border: 1px solid #ccc; padding: 15px; margin-bottom: 20px;">
          <p><strong>Sipariş Kodu:</strong> ${result.data.uniqueCode}</p>
          <p><strong>Ödeme ID:</strong> ${result.data.paymentId}</p>
          <p><strong>Tutar:</strong> ${result.data.amount} IDR</p>
          <p><strong>Servis:</strong> ${result.data.serviceName}</p>
          <p><strong>Son Tarih:</strong> ${result.data.expired}</p>
          ${result.data.qrCode ? `
            <h3>QR Kodu:</h3>
            <img src="${result.data.qrCode}" alt="QR Code" style="max-width: 200px;">
          ` : ''}
          ${result.data.payNumber ? `
            <p><strong>Ödeme Numarası:</strong> ${result.data.payNumber}</p>
          ` : ''}
        </div>
        <p><a href="${result.data.url}" target="_blank" style="padding: 10px 15px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px;">Ödeme Sayfasına Git</a></p>
        <p><a href="/">Ana Sayfaya Dön</a></p>
      `);
    } else {
      res.status(400).send(`
        <h1>Ödeme Oluşturma Hatası</h1>
        <p>${result.message}</p>
        <pre>${JSON.stringify(result.error, null, 2)}</pre>
        <p><a href="/">Ana Sayfaya Dön</a></p>
      `);
    }
  } catch (error) {
    console.error('Ödeme oluşturma hatası:', error);
    res.status(500).send(`
      <h1>Sunucu Hatası</h1>
      <p>${error.message}</p>
      <p><a href="/">Ana Sayfaya Dön</a></p>
    `);
  }
});

// Webhook callback
app.post('/payment-callback', quickPos.handleCallback('paydisini'), (req, res) => {
  try {
    console.log('Ödeme sonucu:', req.paymentResult);
    // Ödeme sonucu: {
    //   status: 'success',
    //   orderId: 'ORD12345',
    //   trxid: 'PD1234567890',
    //   amount: 10000,
    //   service: '11',
    //   serviceName: 'QRIS Merchant PayDisini',
    //   date: '2025-03-14T10:15:30Z'
    // }
    
    if (req.paymentResult && req.paymentResult.status === 'success') {
      // Veritabanında ödeme durumunu güncelle
      // db.updatePaymentStatus(req.paymentResult.orderId, 'success')
      
      // Başarılı yanıt
      res.json({ success: true });
    } else {
      console.error('Ödeme başarısız:', req.paymentResult);
      res.json({ success: false });
    }
  } catch (error) {
    console.error('Webhook hatası:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ödeme dönüş sayfası
app.get('/payment-return', async (req, res) => {
  try {
    const trxid = req.query.trxid;
    let paymentStatus = 'unknown';
    let paymentDetails = {};
    
    if (trxid) {
      // İşlem durumunu kontrol et
      const statusResult = await quickPos.providers['paydisini'].checkStatus(trxid);
      paymentStatus = statusResult.success ? 'success' : 'pending';
      paymentDetails = statusResult;
    }
    
    if (paymentStatus === 'success') {
      res.send(`
        <h1>Ödeme Başarılı</h1>
        <p>İşlem No: ${trxid}</p>
        <p>Durumu: Ödeme başarıyla tamamlandı</p>
        <pre>${JSON.stringify(paymentDetails, null, 2)}</pre>
        <p><a href="/">Ana Sayfaya Dön</a></p>
      `);
    } else {
      res.send(`
        <h1>Ödeme Durumu</h1>
        <p>İşlem No: ${trxid || 'Belirtilmedi'}</p>
        <p>Durumu: ${paymentStatus === 'pending' ? 'İşleminiz henüz tamamlanmadı' : 'Ödeme durumu bilinmiyor'}</p>
        ${paymentDetails ? `<pre>${JSON.stringify(paymentDetails, null, 2)}</pre>` : ''}
        <p><a href="/">Ana Sayfaya Dön</a></p>
      `);
    }
  } catch (error) {
    console.error('Ödeme dönüş hatası:', error);
    res.status(500).send(`
      <h1>Ödeme Durumu Sorgulama Hatası</h1>
      <p>${error.message}</p>
      <p><a href="/">Ana Sayfaya Dön</a></p>
    `);
  }
});

// Servis listesi 
app.get('/services', async (req, res) => {
  try {
    const services = await quickPos.providers['paydisini'].getServices();
    
    res.send(`
      <h1>Paydisini Servis Listesi</h1>
      ${services.success ? `
        <table border="1" cellpadding="10" cellspacing="0">
          <tr>
            <th>Kod</th>
            <th>Servis Adı</th>
            <th>Ücret</th>
            <th>Minimum</th>
            <th>Maksimum</th>
            <th>Tipi</th>
          </tr>
          ${services.data.map(service => `
            <tr>
              <td>${service.id}</td>
              <td>${service.name}</td>
              <td>${service.fee}</td>
              <td>${service.min}</td>
              <td>${service.max}</td>
              <td>${service.type}</td>
            </tr>
          `).join('')}
        </table>
      ` : `<p>Servis listesi alınamadı: ${services.msg}</p>`}
      <p><a href="/">Ana Sayfaya Dön</a></p>
    `);
  } catch (error) {
    res.status(500).send(`
      <h1>Servis Listesi Hatası</h1>
      <p>${error.message}</p>
      <p><a href="/">Ana Sayfaya Dön</a></p>
    `);
  }
});

// Bakiye sorgulama
app.get('/balance', async (req, res) => {
  try {
    const balance = await quickPos.providers['paydisini'].getBalance();
    
    res.send(`
      <h1>Paydisini Bakiye Bilgisi</h1>
      ${balance.success ? `
        <p><strong>Bakiye:</strong> ${balance.data.balance} IDR</p>
        <p><strong>Kullanıcı:</strong> ${balance.data.username}</p>
        <p><strong>Email:</strong> ${balance.data.email}</p>
      ` : `<p>Bakiye bilgisi alınamadı: ${balance.msg}</p>`}
      <p><a href="/">Ana Sayfaya Dön</a></p>
    `);
  } catch (error) {
    res.status(500).send(`
      <h1>Bakiye Sorgulama Hatası</h1>
      <p>${error.message}</p>
      <p><a href="/">Ana Sayfaya Dön</a></p>
    `);
  }
});

// Programatik örnek kullanım
async function programaticExample() {
  try {
    console.log('Starting Paydisini transaction example...');
    
    const result = await quickPos.providers['paydisini'].createPayment({
      amount: '10000',
      uniqueCode: 'NODE' + Date.now().toString().substring(8),
      service: '11', // QRIS
      note: 'Programatik örnek ödeme',
      validTime: '1800',
      typeFee: '1',
      paymentGuide: true
    });
    
    console.log('Payment result:', result);
    
    if (result.status === 'success') {
      console.log('Payment URL:', result.data.url);
      console.log('QR Code URL:', result.data.qrCode);
    }
  } catch (error) {
    console.error('Payment creation error:', error);
  }
}

// Sunucuyu başlat
const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // İsteğe bağlı: Programatik örneği çalıştır
  // programaticExample();
});