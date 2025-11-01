const OmiseClient = require('../lib/omise');

const client = new OmiseClient({
    publicKey: 'YOUR_PUBLIC_KEY',
    secretKey: 'YOUR_SECRET_KEY'
});

async function example() {
    try {
        const payment = await client.createPayment({
            amount: 1000,
            orderId: 'TEST-001',
            currency: 'THB',
            sourceType: 'promptpay',
            callback_link: 'https://yoursite.com/callback',
            name: 'Somchai Prasert',
            email: 'somchai@example.com'
        });
        
        console.log('Payment URL:', payment.data.url);
        console.log('Charge ID:', payment.data.id);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

example();
