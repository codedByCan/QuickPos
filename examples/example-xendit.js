const XenditClient = require('../lib/xendit');

const client = new XenditClient({
    apiKey: 'YOUR_API_KEY',
    webhookToken: 'YOUR_WEBHOOK_TOKEN'
});

async function example() {
    try {
        const payment = await client.createPayment({
            amount: 100000,
            orderId: 'TEST-001',
            paymentMethod: 'invoice',
            currency: 'IDR',
            callback_link: 'https://yoursite.com/callback',
            name: 'Budi Santoso',
            email: 'budi@example.com',
            phone: '+628123456789'
        });
        
        console.log('Payment URL:', payment.data.url);
        console.log('Invoice ID:', payment.data.id);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

example();
