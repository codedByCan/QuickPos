const PayKunClient = require('../lib/paykun');

const client = new PayKunClient({
    merchantId: 'YOUR_MERCHANT_ID',
    accessToken: 'YOUR_ACCESS_TOKEN',
    encryptionKey: 'YOUR_ENCRYPTION_KEY',
    sandbox: true
});

async function example() {
    try {
        const payment = await client.createPayment({
            amount: 1000,
            orderId: 'TEST-001',
            currency: 'INR',
            callback_link: 'https://yoursite.com/callback',
            name: 'Rajesh Kumar',
            email: 'rajesh@example.com',
            phone: '9876543210'
        });
        
        console.log('Payment URL:', payment.data.url);
        console.log('Transaction ID:', payment.data.transactionId);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

example();
