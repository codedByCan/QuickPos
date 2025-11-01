const express = require('express');
const bodyParser = require('body-parser');
const CoinGateClient = require('../lib/coingate');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// CoinGate yapılandırması
const coingateClient = new CoinGateClient({
    apiKey: 'YOUR_API_KEY',
    environment: 'sandbox' // 'sandbox' veya 'live'
});

// Ödeme oluşturma
app.get('/create-payment', async (req, res) => {
    try {
        const payment = await coingateClient.createPayment({
            amount: 100.00,
            currency: 'USD',
            receiveCurrency: 'EUR', // Almak istediğiniz para birimi
            orderId: `ORDER-${Date.now()}`,
            title: 'Test Product',
            description: 'Test cryptocurrency payment',
            email: 'customer@example.com',
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
        
        const result = await coingateClient.handleCallback(req.body);
        
        console.log('Payment result:', result);
        
        if (result.status === 'success') {
            // Ödeme başarılı
            console.log('Payment successful!');
            console.log('Order ID:', result.orderId);
            console.log('Transaction ID:', result.transactionId);
            console.log('Paid:', result.payAmount, result.payCurrency);
            console.log('Received:', result.receiveAmount, result.receiveCurrency);
        }
        
        res.status(200).send('OK');
    } catch (error) {
        console.error('Callback error:', error.message);
        res.status(400).send('ERROR');
    }
});

// Sipariş sorgulama
app.get('/order/:orderId', async (req, res) => {
    try {
        const order = await coingateClient.getOrder(req.params.orderId);
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Exchange rate sorgulama
app.get('/rate/:from/:to', async (req, res) => {
    try {
        const rate = await coingateClient.getExchangeRate(req.params.from, req.params.to);
        res.json({ rate });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Başarı sayfası
app.get('/success', (req, res) => {
    res.send('<h1>Payment Successful!</h1><p>Thank you for your cryptocurrency payment.</p>');
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
