const PayssionClient = require('../lib/payssion');

const client = new PayssionClient({
    apiKey: 'YOUR_API_KEY',
    secretKey: 'YOUR_SECRET_KEY',
    sandbox: true
});

async function example() {
    try {
        const payment = await client.createPayment({
            amount: 50,
            orderId: 'TEST-001',
            currency: 'USD',
            paymentMethod: 'boleto_br',
            callback_link: 'https://yoursite.com/callback',
            name: 'Test Payment'
        });
        
        console.log('Payment URL:', payment.data.url);
        console.log('Transaction ID:', payment.data.transactionId);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

example();
