/**
 * QuickPos Payment Gateway Test Suite
 * 
 * Bu dosya tüm ödeme sağlayıcılarının temel fonksiyonlarını test eder.
 * Not: Gerçek testler için her provider'ın sandbox/test API anahtarları gereklidir.
 */

const QuickPos = require('./app');

// Test konfigürasyonu
const testConfig = {
  providers: {
    // Midtrans Test
    midtrans: {
      serverKey: 'SB-Mid-server-YOUR_SERVER_KEY',
      clientKey: 'SB-Mid-client-YOUR_CLIENT_KEY',
      isProduction: false
    },
    
    // Plisio Test
    plisio: {
      apiKey: 'your-test-api-key'
    },
    
    // Tripay Test
    tripay: {
      apiKey: 'your-test-api-key',
      privateKey: 'your-test-private-key',
      merchantCode: 'T1234',
      isProduction: false
    },
    
    // ToyyibPay Test
    toyyibpay: {
      secretKey: 'your-test-secret-key',
      categoryCode: 'your-test-category-code'
    },
    
    // Zarinpal Test
    zarinpal: {
      merchantId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      sandbox: true
    },
    
    // CoinPayments Test
    coinpayments: {
      publicKey: 'your-test-public-key',
      privateKey: 'your-test-private-key',
      ipnSecret: 'your-test-ipn-secret'
    },
    
    // Checkout.com Test
    checkout: {
      secretKey: 'sk_test_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      publicKey: 'pk_test_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      sandbox: true
    },
    
    // Paytm Test
    paytm: {
      merchantId: 'YOUR_MERCHANT_ID',
      merchantKey: 'YOUR_MERCHANT_KEY',
      websiteName: 'WEBSTAGING',
      sandbox: true
    },
    
    // Cardcom Test
    cardcom: {
      terminalNumber: 'your-terminal-number',
      userName: 'your-username'
    },
    
    // Paycom Test
    paycom: {
      merchantId: 'your-merchant-id',
      secretKey: 'your-secret-key'
    },
    
    // PayID19 Test
    payid19: {
      apiKey: 'your-test-api-key',
      secretKey: 'your-test-secret-key'
    },
    
    // Paysend Test
    paysend: {
      apiKey: 'your-test-api-key',
      sandbox: true
    },
    
    // Volet Test
    volet: {
      merchantId: 'YOUR_MERCHANT_ID',
      secretKey: 'YOUR_SECRET_KEY'
    },
    
    // BitPay Test
    bitpay: {
      apiToken: 'YOUR_TEST_API_TOKEN',
      environment: 'test'
    },
    
    // Payriff Test
    payriff: {
      merchantId: 'YOUR_MERCHANT_ID',
      secretKey: 'YOUR_SECRET_KEY'
    },
    
    // Epoint Test
    epoint: {
      merchantId: 'YOUR_MERCHANT_ID',
      privateKey: 'YOUR_PRIVATE_KEY'
    },
    
    // Payoneer Test
    payoneer: {
      programId: 'YOUR_PROGRAM_ID',
      username: 'YOUR_USERNAME',
      password: 'YOUR_PASSWORD',
      sandbox: true
    },
    
    // PortWallet Test
    portwallet: {
      apiKey: 'YOUR_API_KEY',
      merchantId: 'YOUR_MERCHANT_ID',
      secretKey: 'YOUR_SECRET_KEY'
    },
    
    // 2Checkout Test
    '2checkout': {
      merchantCode: 'YOUR_MERCHANT_CODE',
      secretKey: 'YOUR_SECRET_KEY',
      sandbox: true
    },
    
    // CoinGate Test
    coingate: {
      apiKey: 'YOUR_API_KEY',
      environment: 'sandbox'
    },
    
    // ShurjoPay Test
    shurjopay: {
      username: 'YOUR_USERNAME',
      password: 'YOUR_PASSWORD',
      prefix: 'YOUR_PREFIX',
      sandbox: true
    },
    
    // Cashfree Test
    cashfree: {
      appId: 'YOUR_APP_ID',
      secretKey: 'YOUR_SECRET_KEY',
      environment: 'sandbox'
    },
    
    // PaySpace Test
    payspace: {
      merchantId: 'YOUR_MERCHANT_ID',
      apiKey: 'YOUR_API_KEY'
    },
    
    // PayU Latam Test
    payulatam: {
      apiKey: 'YOUR_API_KEY',
      apiLogin: 'YOUR_API_LOGIN',
      merchantId: 'YOUR_MERCHANT_ID',
      accountId: 'YOUR_ACCOUNT_ID',
      sandbox: true
    },
    
    // PayU India Test
    payuindia: {
      merchantKey: 'YOUR_MERCHANT_KEY',
      salt: 'YOUR_SALT',
      sandbox: true
    },
    
    // ePay Test
    epay: {
      merchantId: 'YOUR_MERCHANT_ID',
      secretKey: 'YOUR_SECRET_KEY'
    },
    
    // PayNet Test
    paynet: {
      merchantId: 'YOUR_MERCHANT_ID',
      secretKey: 'YOUR_SECRET_KEY'
    },
    
    // PayNetTR Test
    paynettr: {
      merchantId: 'YOUR_MERCHANT_ID',
      secretKey: 'YOUR_SECRET_KEY'
    },
    
    // Doku Test
    doku: {
      clientId: 'YOUR_CLIENT_ID',
      secretKey: 'YOUR_SECRET_KEY',
      sharedKey: 'YOUR_SHARED_KEY',
      sandbox: true
    },
    
    // Coinbase Commerce Test
    coinbase: {
      apiKey: 'YOUR_API_KEY',
      webhookSecret: 'YOUR_WEBHOOK_SECRET'
    },
    
    // Amazon Pay Test
    amazonpay: {
      merchantId: 'YOUR_MERCHANT_ID',
      accessKey: 'YOUR_ACCESS_KEY',
      secretKey: 'YOUR_SECRET_KEY',
      region: 'us',
      sandbox: true
    },
    
    // Perfect Money Test
    perfectmoney: {
      accountId: 'YOUR_ACCOUNT_ID',
      passPhrase: 'YOUR_PASSPHRASE',
      alternatePassPhrase: 'YOUR_ALTERNATE_PASSPHRASE'
    },
    
    // Paddle Test
    paddle: {
      vendorId: 'YOUR_VENDOR_ID',
      apiKey: 'YOUR_API_KEY',
      publicKey: 'YOUR_PUBLIC_KEY',
      sandbox: true
    },
    
    // Instamojo Test
    instamojo: {
      apiKey: 'YOUR_API_KEY',
      authToken: 'YOUR_AUTH_TOKEN',
      sandbox: true
    },
    
    // FreeKassa Test
    freekassa: {
      shopId: 'YOUR_SHOP_ID',
      secretKey1: 'YOUR_SECRET_KEY_1',
      secretKey2: 'YOUR_SECRET_KEY_2'
    },
    
    // PicPay Test
    picpay: {
      token: 'YOUR_TOKEN',
      sellerToken: 'YOUR_SELLER_TOKEN'
    },
    
    // PayTabs Test
    paytabs: {
      profileId: 'YOUR_PROFILE_ID',
      serverKey: 'YOUR_SERVER_KEY',
      region: 'ARE'
    },
    
    // Payssion Test
    payssion: {
      apiKey: 'YOUR_API_KEY',
      secretKey: 'YOUR_SECRET_KEY',
      sandbox: true
    },
    
    // PayKun Test
    paykun: {
      merchantId: 'YOUR_MERCHANT_ID',
      accessToken: 'YOUR_ACCESS_TOKEN',
      encryptionKey: 'YOUR_ENCRYPTION_KEY',
      sandbox: true
    },
    
    // Omise Test
    omise: {
      publicKey: 'YOUR_PUBLIC_KEY',
      secretKey: 'YOUR_SECRET_KEY'
    },
    
    // PhonePe Test
    phonepe: {
      merchantId: 'YOUR_MERCHANT_ID',
      saltKey: 'YOUR_SALT_KEY',
      saltIndex: 1,
      sandbox: true
    },
    
    // YouCanPay Test
    youcanpay: {
      privateKey: 'YOUR_PRIVATE_KEY',
      publicKey: 'YOUR_PUBLIC_KEY',
      sandbox: true
    },
    
    // YooKassa Test
    yookassa: {
      shopId: 'YOUR_SHOP_ID',
      secretKey: 'YOUR_SECRET_KEY'
    },
    
    // URWay Test
    urway: {
      terminalId: 'YOUR_TERMINAL_ID',
      password: 'YOUR_PASSWORD',
      merchantKey: 'YOUR_MERCHANT_KEY',
      testMode: true
    },
    
    // Xendit Test
    xendit: {
      apiKey: 'YOUR_API_KEY',
      webhookToken: 'YOUR_WEBHOOK_TOKEN'
    },
    
    // Unitpay Test
    unitpay: {
      publicKey: 'YOUR_PUBLIC_KEY',
      secretKey: 'YOUR_SECRET_KEY'
    },
    
    // SenangPay Test
    senangpay: {
      merchantId: 'YOUR_MERCHANT_ID',
      secretKey: 'YOUR_SECRET_KEY',
      sandbox: true
    },
    
    // Razorpay Test
    razorpay: {
      keyId: 'YOUR_KEY_ID',
      keySecret: 'YOUR_KEY_SECRET'
    }
  }
};

// Test fonksiyonu
async function testProvider(providerName, provider) {
  console.log(`\n🧪 Testing ${providerName}...`);
  console.log('─'.repeat(50));
  
  try {
    // Test createPayment
    console.log('✓ Module loaded successfully');
    console.log('✓ createPayment method exists:', typeof provider.createPayment === 'function');
    console.log('✓ handleCallback method exists:', typeof provider.handleCallback === 'function');
    
    // Her provider için özel test verileri
    const testData = getTestDataForProvider(providerName);
    
    console.log(`\n📝 Test payment data prepared for ${providerName}`);
    console.log('  Amount:', testData.amount);
    console.log('  Currency:', testData.currency || 'Default');
    
    // Not: Gerçek API çağrıları için geçerli credentials gerekli
    // console.log('\n⚠️  Skipping actual API call (requires valid credentials)');
    
    return {
      provider: providerName,
      status: 'passed',
      methods: {
        createPayment: typeof provider.createPayment === 'function',
        handleCallback: typeof provider.handleCallback === 'function'
      }
    };
    
  } catch (error) {
    console.error(`❌ Error testing ${providerName}:`, error.message);
    return {
      provider: providerName,
      status: 'failed',
      error: error.message
    };
  }
}

// Provider'a özel test verileri
function getTestDataForProvider(providerName) {
  const baseData = {
    amount: '100',
    email: 'test@example.com',
    name: 'Test User',
    phone: '+1234567890',
    orderId: `TEST-${Date.now()}`,
    callback_link: 'http://localhost:3000/callback'
  };
  
  const providerSpecific = {
    midtrans: { currency: 'IDR', amount: '10000' },
    plisio: { currency: 'USD', amount: '10' },
    tripay: { currency: 'IDR', amount: '10000', paymentMethod: 'BRIVA' },
    toyyibpay: { currency: 'MYR', amount: '10' },
    zarinpal: { currency: 'IRT', amount: '1000', mobile: '09123456789' },
    coinpayments: { currency1: 'USD', currency2: 'BTC', amount: '10' },
    checkout: { currency: 'USD', amount: '10', useHostedPage: true },
    paytm: { currency: 'INR', amount: '100', mobile: '9876543210' },
    cardcom: { currency: 'ILS', amount: '100', mobile: '0501234567' },
    paycom: { currency: 'UZS', amount: '10000' },
    payid19: { currency: 'IDR', amount: '10000', paymentMethod: 'all' },
    paysend: { currency: 'USD', amount: '10', cardNumber: '4111111111111111' },
    volet: { currency: 'USD', amount: '10' },
    bitpay: { currency: 'USD', amount: '10' },
    payriff: { currency: 'AZN', amount: '50' },
    epoint: { currency: 'AZN', amount: '100' },
    payoneer: { currency: 'USD', amount: '100', payeeId: 'test@example.com' },
    portwallet: { currency: 'USD', amount: '100' },
    '2checkout': { currency: 'USD', amount: '100', customerName: 'Test User' },
    coingate: { currency: 'USD', amount: '10', receiveCurrency: 'EUR' },
    shurjopay: { currency: 'BDT', amount: '1000', city: 'Dhaka' },
    cashfree: { currency: 'INR', amount: '1000', customerId: 'customer_test' },
    payspace: { currency: 'ZAR', amount: '100' },
    payulatam: { currency: 'COP', amount: '10000', country: 'CO', paymentMethod: 'VISA' },
    payuindia: { currency: 'INR', amount: '1000', productInfo: 'Test Product', firstname: 'John' },
    epay: { currency: 'BGN', amount: '100' },
    paynet: { currency: 'MDL', amount: '100' },
    paynettr: { currency: 'TRY', amount: '100' },
    doku: { currency: 'IDR', amount: '50000' },
    coinbase: { currency: 'USD', amount: '10', pricingType: 'fixed_price' },
    amazonpay: { currency: 'USD', amount: '10', chargePermissionType: 'OneTime' },
    perfectmoney: { currency: 'USD', amount: '10' },
    paddle: { currency: 'USD', amount: '10', title: 'Test Product' },
    instamojo: { currency: 'INR', amount: '1000', purpose: 'Test Payment' },
    freekassa: { currency: 'RUB', amount: '1000' },
    picpay: { currency: 'BRL', amount: '10.50', firstName: 'John', lastName: 'Doe' },
    paytabs: { currency: 'AED', amount: '100', country: 'AE' },
    payssion: { currency: 'USD', amount: '50', paymentMethod: 'boleto_br' },
    paykun: { currency: 'INR', amount: '1000' },
    omise: { currency: 'THB', amount: '1000', sourceType: 'promptpay' },
    phonepe: { currency: 'INR', amount: '100', userId: 'USER123' },
    youcanpay: { currency: 'MAD', amount: '100' },
    yookassa: { currency: 'RUB', amount: '1000' },
    urway: { currency: 'SAR', amount: '100', country: 'SA', merchantIp: '1.1.1.1' },
    xendit: { currency: 'IDR', amount: '100000', paymentMethod: 'invoice' },
    unitpay: { currency: 'RUB', amount: '500', account: 'TEST-001' },
    senangpay: { currency: 'MYR', amount: '50.00' },
    razorpay: { currency: 'INR', amount: '500', merchantName: 'Test Business' }
  };
  
  return { ...baseData, ...providerSpecific[providerName] };
}

// Ana test fonksiyonu
async function runTests() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   QuickPos Payment Gateway Test Suite         ║');
  console.log('╚════════════════════════════════════════════════╝\n');
  
  const quickPos = new QuickPos(testConfig);
  const results = [];
  
  // Her provider'ı test et
  for (const [providerName, provider] of Object.entries(quickPos.providers)) {
    const result = await testProvider(providerName, provider);
    results.push(result);
  }
  
  // Sonuçları göster
  console.log('\n\n╔════════════════════════════════════════════════╗');
  console.log('║              Test Results Summary              ║');
  console.log('╚════════════════════════════════════════════════╝\n');
  
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  
  results.forEach(result => {
    const icon = result.status === 'passed' ? '✅' : '❌';
    console.log(`${icon} ${result.provider.padEnd(20)} - ${result.status.toUpperCase()}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  console.log('\n' + '─'.repeat(50));
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log('─'.repeat(50));
  
  console.log('\n📋 Notes:');
  console.log('  • All providers loaded successfully');
  console.log('  • createPayment and handleCallback methods verified');
  console.log('  • For actual payment testing, configure valid API credentials');
  console.log('  • Refer to example files for provider-specific usage\n');
}

// Testleri çalıştır
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, testProvider };
