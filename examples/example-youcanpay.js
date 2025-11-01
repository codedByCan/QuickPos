const YouCanPayClient = require('../lib/youcanpay');

const client = new YouCanPayClient({
    privateKey: 'YOUR_PRIVATE_KEY',
    publicKey: 'YOUR_PUBLIC_KEY',
    sandbox: true
});

async function example() {
    try {
        const payment = await client.createPayment({
            amount: 100,
            orderId: 'TEST-001',
            currency: 'MAD',
            callback_link: 'https://yoursite.com/callback',
            name: 'Hassan Alaoui',
            email: 'hassan@example.com',
            phone: '+212600000000'
        });
        
        console.log('Payment URL:', payment.data.url);
        console.log('Token:', payment.data.token);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

example();
