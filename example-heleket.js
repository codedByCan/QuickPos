const Heleket = require('./lib/heleket');
const QuickPos = require('./app');



const quickPos = new QuickPos({
  providers: {
    heleket: {
       merchantId: '6764fdb7-7a2c-4599-962e-',
       apiKey: ''
    }
  }
});

let heleket = quickPos.providers['heleket'];

// Örnek fatura oluşturma
async function createSampleInvoice() {
  try {
    const result = await heleket.createInvoice({
      amount: "20",
      currency: "USDT",
      order_id: "test-1234",
      network: "tron"
    });
    
    console.log('Fatura oluşturuldu:', result);
  } catch (error) {
    console.error('Fatura oluşturulurken hata:', error.message);
  }
}

// Örnek ödeme hizmetlerini getirme
async function getServices() {
  try {
    const services = await heleket.getPaymentServices();
    console.log('Ödeme hizmetleri:', services);
  } catch (error) {
    console.error('Hizmetler alınırken hata:', error.message);
  }
}

// Webhook imzasını doğrulama örneği
function verifyWebhook() {
  const webhookData = {
    order_id: 'test-123',
    status: 'completed',
    amount: '20',
    currency: 'USDT',
    sign: 'example-signature-here'
  };
  
  const isValid = heleket.verifyWebhookSignature(webhookData);
  console.log('Webhook geçerli mi:', isValid);
}

// Örnek fonksiyonları çalıştır
(async () => {
  await createSampleInvoice();
  // await getServices();
  verifyWebhook();
})();