const PicPayClient = require('../lib/picpay');

const client = new PicPayClient({
    token: 'YOUR_TOKEN',
    sellerToken: 'YOUR_SELLER_TOKEN'
});

async function example() {
    try {
        const payment = await client.createPayment({
            amount: 10.50,
            orderId: 'TEST-001',
            callback_link: 'https://yoursite.com/callback',
            name: 'João Silva',
            email: 'joao@example.com',
            document: '123.456.789-10',
            phone: '+5511999999999'
        });
        
        console.log('Payment URL:', payment.data.paymentUrl);
        console.log('QR Code:', payment.data.qrcode);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

example();
