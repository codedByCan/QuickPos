const FreeKassaClient = require('../lib/freekassa');

const client = new FreeKassaClient({
    shopId: 'YOUR_SHOP_ID',
    secretKey1: 'YOUR_SECRET_KEY_1',
    secretKey2: 'YOUR_SECRET_KEY_2'
});

async function example() {
    try {
        const payment = await client.createPayment({
            amount: 1000,
            orderId: 'TEST-001',
            currency: 'RUB',
            email: 'customer@example.com',
            name: 'John Doe'
        });
        
        console.log('Payment URL:', payment.data.url);
        console.log('Signature:', payment.data.signature);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

example();
