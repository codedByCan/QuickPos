const YooKassaClient = require('../lib/yookassa');

const client = new YooKassaClient({
    shopId: 'YOUR_SHOP_ID',
    secretKey: 'YOUR_SECRET_KEY'
});

async function example() {
    try {
        const payment = await client.createPayment({
            amount: 1000,
            orderId: 'TEST-001',
            currency: 'RUB',
            callback_link: 'https://yoursite.com/callback',
            description: 'Test Payment',
            email: 'customer@example.com',
            phone: '+79001234567'
        });
        
        console.log('Payment URL:', payment.data.url);
        console.log('Payment ID:', payment.data.id);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

example();
