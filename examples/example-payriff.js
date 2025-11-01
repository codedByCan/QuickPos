const express = require('express');
const bodyParser = require('body-parser');
const PayriffClient = require('../lib/payriff');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Payriff yapılandırması
const payriffClient = new PayriffClient({
    merchantId: 'YOUR_MERCHANT_ID',
    secretKey: 'YOUR_SECRET_KEY'
});

// Ödeme oluşturma
app.get('/create-payment', async (req, res) => {
    try {
        const payment = await payriffClient.createPayment({
            amount: 50.00,
            currency: 'AZN',
            orderId: `ORDER-${Date.now()}`,
            name: 'Test Product',
            description: 'Test payment description',
            language: 'AZ',
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
        
        const result = await payriffClient.handleCallback(req.body);
        
        console.log('Payment result:', result);
        
        if (result.status === 'success') {
            // Ödeme başarılı
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

// Sipariş durumu sorgulama
app.get('/order-status/:orderId', async (req, res) => {
    try {
        const status = await payriffClient.getOrderStatus(req.params.orderId);
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Başarı sayfası
app.get('/success', (req, res) => {
    res.send('<h1>Ödəniş Uğurlu!</h1><p>Ödənişiniz üçün təşəkkür edirik.</p>');
});

// Hata sayfası
app.get('/fail', (req, res) => {
    res.send('<h1>Ödəniş Uğursuz</h1><p>Ödənişiniz icra oluna bilmədi.</p>');
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Create payment: http://localhost:${PORT}/create-payment`);
});
