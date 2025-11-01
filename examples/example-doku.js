const DokuClient = require('../lib/doku');

const client = new DokuClient({
    clientId: 'YOUR_CLIENT_ID',
    secretKey: 'YOUR_SECRET_KEY',
    sharedKey: 'YOUR_SHARED_KEY',
    sandbox: true
});

async function example() {
    try {
        const payment = await client.createPayment({
            amount: 50000,
            orderId: 'TEST-001',
            callback_link: 'https://yoursite.com/callback',
            name: 'Test Payment',
            email: 'customer@example.com'
        });
        
        console.log('Payment URL:', payment.data.url);
        console.log('Payment Code:', payment.data.paymentCode);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

example();
