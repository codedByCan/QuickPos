const UnitpayClient = require('../lib/unitpay');

const client = new UnitpayClient({
    publicKey: 'YOUR_PUBLIC_KEY',
    secretKey: 'YOUR_SECRET_KEY'
});

async function example() {
    try {
        const payment = await client.createPayment({
            amount: 500,
            orderId: 'TEST-001',
            currency: 'RUB',
            callback_link: 'https://yoursite.com/callback',
            email: 'customer@example.com',
            name: 'Test Payment'
        });
        
        console.log('Payment URL:', payment.data.url);
        console.log('Account:', payment.data.account);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

example();
