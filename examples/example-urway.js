const URWayClient = require('../lib/urway');

const client = new URWayClient({
    terminalId: 'YOUR_TERMINAL_ID',
    password: 'YOUR_PASSWORD',
    merchantKey: 'YOUR_MERCHANT_KEY',
    testMode: true
});

async function example() {
    try {
        const payment = await client.createPayment({
            amount: 100,
            orderId: 'TEST-001',
            currency: 'SAR',
            callback_link: 'https://yoursite.com/callback',
            email: 'customer@example.com',
            country: 'SA'
        });
        
        console.log('Payment URL:', payment.data.url);
        console.log('Track ID:', payment.data.trackId);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

example();
