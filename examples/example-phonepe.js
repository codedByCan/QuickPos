const PhonePeClient = require('../lib/phonepe');

const client = new PhonePeClient({
    merchantId: 'YOUR_MERCHANT_ID',
    saltKey: 'YOUR_SALT_KEY',
    saltIndex: 1,
    sandbox: true
});

async function example() {
    try {
        const payment = await client.createPayment({
            amount: 100,
            orderId: 'TEST-001',
            callback_link: 'https://yoursite.com/callback',
            phone: '9999999999',
            userId: 'USER123'
        });
        
        console.log('Payment URL:', payment.data.url);
        console.log('Transaction ID:', payment.data.transactionId);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

example();
