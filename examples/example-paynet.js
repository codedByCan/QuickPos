const express = require('express');
const bodyParser = require('body-parser');
const PayNetClient = require('../lib/paynet');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// PayNet yapılandırması
const paynetClient = new PayNetClient({
    merchantId: 'YOUR_MERCHANT_ID',
    secretKey: 'YOUR_SECRET_KEY'
});

// Ödeme oluşturma
app.get('/create-payment', async (req, res) => {
    try {
        const payment = await paynetClient.createPayment({
            amount: 100.00,
            currency: 'MDL',
            orderId: `ORDER-${Date.now()}`,
            name: 'Ion Popescu',
            description: 'Test payment',
            language: 'ro',
            email: 'customer@example.com',
            phone: '+37369123456',
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
        
        const result = await paynetClient.handleCallback(req.body);
        
        console.log('Payment result:', result);
        
        if (result.status === 'success') {
            // Ödeme başarılı
            console.log('Plata a fost efectuată cu succes!');
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

// Ödeme durumu sorgulama
app.get('/payment-status/:paymentId', async (req, res) => {
    try {
        const status = await paynetClient.getPaymentStatus(req.params.paymentId);
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// İade işlemi
app.post('/refund/:paymentId', async (req, res) => {
    try {
        const refund = await paynetClient.refundPayment(req.params.paymentId, {
            amount: req.body.amount,
            reason: req.body.reason || 'Solicitarea clientului'
        });
        res.json(refund);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Başarı sayfası
app.get('/success', (req, res) => {
    res.send('<h1>Plată efectuată cu succes!</h1><p>Vă mulțumim pentru plată.</p>');
});

// Hata sayfası
app.get('/fail', (req, res) => {
    res.send('<h1>Plată eșuată</h1><p>Plata nu a putut fi procesată.</p>');
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Create payment: http://localhost:${PORT}/create-payment`);
});
