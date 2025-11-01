const express = require('express');
const bodyParser = require('body-parser');
const EpointClient = require('../lib/epoint');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Epoint yapılandırması
const epointClient = new EpointClient({
    merchantId: 'YOUR_MERCHANT_ID',
    privateKey: 'YOUR_PRIVATE_KEY'
});

// Ödeme oluşturma
app.get('/create-payment', async (req, res) => {
    try {
        const payment = await epointClient.createPayment({
            amount: 100.00,
            currency: 'AZN',
            orderId: `ORDER-${Date.now()}`,
            name: 'Test Product',
            description: 'Test payment description',
            language: 'az',
            email: 'customer@example.com',
            phone: '+994501234567',
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
        
        const result = await epointClient.handleCallback(req.body);
        
        console.log('Payment result:', result);
        
        if (result.status === 'success') {
            // Ödeme başarılı
            console.log('Payment successful!');
            console.log('Order ID:', result.orderId);
            console.log('Payment ID:', result.transactionId);
            console.log('Amount:', result.amount, result.currency);
        }
        
        res.status(200).send('OK');
    } catch (error) {
        console.error('Callback error:', error.message);
        res.status(400).send('ERROR');
    }
});

// Ödeme durumu sorgulama
app.get('/payment-status/:paymentId', async (req, res) => {
    try {
        const status = await epointClient.getPaymentStatus(req.params.paymentId);
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Başarı sayfası
app.get('/success', (req, res) => {
    res.send('<h1>Ödəmə uğurla tamamlandı!</h1><p>Təşəkkürlər.</p>');
});

// Hata sayfası
app.get('/fail', (req, res) => {
    res.send('<h1>Ödəmə uğursuz</h1><p>Zəhmət olmasa yenidən cəhd edin.</p>');
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Create payment: http://localhost:${PORT}/create-payment`);
});
