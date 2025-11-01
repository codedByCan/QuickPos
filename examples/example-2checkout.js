const express = require('express');
const bodyParser = require('body-parser');
const TwoCheckoutClient = require('../lib/2checkout');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 2Checkout yapılandırması
const twoCheckoutClient = new TwoCheckoutClient({
    merchantCode: 'YOUR_MERCHANT_CODE',
    secretKey: 'YOUR_SECRET_KEY',
    sandbox: true
});

// Ödeme oluşturma
app.get('/create-payment', async (req, res) => {
    try {
        const payment = await twoCheckoutClient.createPayment({
            amount: 100.00,
            currency: 'USD',
            orderId: `ORDER-${Date.now()}`,
            name: 'Test Product',
            description: 'Test payment description',
            email: 'customer@example.com',
            customerName: 'John Doe',
            customerId: 'CUST123',
            callback_link: 'http://localhost:3000/callback',
            successUrl: 'http://localhost:3000/success',
            sandbox: true
        });

        console.log('Payment created:', payment);
        
        // Kullanıcıyı ödeme sayfasına yönlendir
        res.redirect(payment.data.url);
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// IPN Callback endpoint
app.post('/callback', async (req, res) => {
    try {
        console.log('IPN received:', req.body);
        
        const result = await twoCheckoutClient.handleCallback(req.body);
        
        console.log('Payment result:', result);
        
        if (result.status === 'success') {
            // Ödeme başarılı
            console.log('Payment successful!');
            console.log('Order ID:', result.orderId);
            console.log('Transaction ID:', result.transactionId);
            console.log('Amount:', result.amount, result.currency);
        }
        
        // 2Checkout expects XML response
        res.set('Content-Type', 'application/xml');
        res.send('<IPN_RESPONSE><DATE>' + new Date().toISOString() + '</DATE></IPN_RESPONSE>');
    } catch (error) {
        console.error('Callback error:', error.message);
        res.status(400).send('ERROR');
    }
});

// Başarı sayfası
app.get('/success', (req, res) => {
    res.send('<h1>Payment Successful!</h1><p>Thank you for your purchase.</p>');
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Create payment: http://localhost:${PORT}/create-payment`);
});
