const express = require('express');
const bodyParser = require('body-parser');
const VoletClient = require('../lib/volet');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Volet yapılandırması
const voletClient = new VoletClient({
    merchantId: 'YOUR_MERCHANT_ID',
    secretKey: 'YOUR_SECRET_KEY'
});

// Ödeme oluşturma
app.get('/create-payment', async (req, res) => {
    try {
        const payment = await voletClient.createPayment({
            amount: 100.00,
            currency: 'USD',
            orderId: `ORDER-${Date.now()}`,
            name: 'Test Product',
            description: 'Test payment description',
            email: 'customer@example.com',
            phone: '+1234567890',
            callback_link: 'http://localhost:3000/callback',
            successUrl: 'http://localhost:3000/success',
            failUrl: 'http://localhost:3000/fail',
            callbackUrl: 'http://localhost:3000/callback'
        });

        console.log('Payment created:', payment);
        
        // Kullanıcıyı ödeme sayfasına yönlendir
        res.redirect(payment.data.url);
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Callback endpoint
app.post('/callback', async (req, res) => {
    try {
        console.log('Callback received:', req.body);
        
        const result = await voletClient.handleCallback(req.body);
        
        console.log('Payment result:', result);
        
        if (result.status === 'success') {
            // Ödeme başarılı - sipariş işlemlerini gerçekleştir
            console.log('Payment successful!');
            console.log('Order ID:', result.orderId);
            console.log('Transaction ID:', result.transactionId);
            console.log('Amount:', result.amount, result.currency);
        }
        
        res.status(200).send('OK');
    } catch (error) {
        console.error('Callback error:', error.message);
        res.status(400).send('ERROR');
    }
});

// Başarı sayfası
app.get('/success', (req, res) => {
    res.send('<h1>Payment Successful!</h1><p>Thank you for your payment.</p>');
});

// Hata sayfası
app.get('/fail', (req, res) => {
    res.send('<h1>Payment Failed</h1><p>Your payment could not be processed.</p>');
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Create payment: http://localhost:${PORT}/create-payment`);
});
