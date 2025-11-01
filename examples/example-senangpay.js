const SenangPayClient = require('../lib/senangpay');

const client = new SenangPayClient({
    merchantId: 'YOUR_MERCHANT_ID',
    secretKey: 'YOUR_SECRET_KEY',
    sandbox: true
});

async function example() {
    try {
        const payment = await client.createPayment({
            amount: 50.00,
            orderId: 'TEST-001',
            callback_link: 'https://yoursite.com/callback',
            name: 'Ahmad Abdullah',
            email: 'ahmad@example.com',
            phone: '0123456789',
            description: 'Test Payment'
        });
        
        console.log('Payment URL:', payment.data.url);
        console.log('Hash:', payment.data.hash);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

example();
