const Heleket = require('./lib/heleket');
const QuickPos = require('./app');



const quickPos = new QuickPos({
  providers: {
    heleket: {
       merchantId: '6764fdb7-7a2c-4599--',
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

// Webhook callback işleme örneği
async function handleCallbackExample() {
  const webhookData = {
    order_id: 'test-123',
    transaction_id: 'tx-456789',
    status: 'completed',
    amount: '20',
    currency: 'USDT',
    network: 'tron',
    sign: 'example-signature-here'
  };
  
  try {
    const result = await heleket.handleCallback(webhookData);
    console.log('Callback işleme sonucu:', result);
  } catch (error) {
    console.error('Callback işlenirken hata:', error.message);
  }
}

// Örnek ödeme webhook'u test etme
async function testPaymentWebhookExample() {
  try {
    const result = await heleket.testPaymentWebhook({
      url_callback: "https://test.speedsmm.com/api/payment/callback/heleket",
      currency: "USDT",
      network: "tron",
      order_id: "Sb4afa7aadbb8833c1811daf5353a7df0T1746284735962",
      status: "paid"
    });
    
    console.log('Ödeme webhook testi sonucu:', result);
  } catch (error) {
    console.error('Ödeme webhook testi sırasında hata:', error.message);
  }
}
testPaymentWebhookExample();
// Örnek ödeme çıkışı webhook'u test etme
async function testPayoutWebhookExample() {
  try {
    const result = await heleket.testPayoutWebhook({
      url_callback: "https://your-webhook-url.com/callback",
      currency: "USDT",
      network: "tron",
      order_id: "test-5678",
      status: "paid"
    });
    
    console.log('Ödeme çıkışı webhook testi sonucu:', result);
  } catch (error) {
    console.error('Ödeme çıkışı webhook testi sırasında hata:', error.message);
  }
}

// Örnek cüzdan webhook'u test etme
async function testWalletWebhookExample() {
  try {
    const result = await heleket.testWalletWebhook({
      url_callback: "https://your-webhook-url.com/callback",
      currency: "USDT",
      network: "tron",
      uuid: "645eb262-19e5-481c-85ee-28331b5f3254",
      status: "paid"
    });
    
    console.log('Cüzdan webhook testi sonucu:', result);
  } catch (error) {
    console.error('Cüzdan webhook testi sırasında hata:', error.message);
  }
}

// Örnek fonksiyonları çalıştır
(async () => {
  // await createSampleInvoice();
  // // await getServices();
  // verifyWebhook();
  // handleCallbackExample();
  
  // Test webhook fonksiyonlarını çalıştır
  // await testPaymentWebhookExample();
  // await testPayoutWebhookExample();
  // await testWalletWebhookExample();
})();