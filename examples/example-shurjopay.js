const express = require('express');
const bodyParser = require('body-parser');
const ShurjoPayClient = require('../lib/shurjopay');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ShurjoPay yapılandırması
const shurjopayClient = new ShurjoPayClient({
    username: 'YOUR_USERNAME',
    password: 'YOUR_PASSWORD',
    prefix: 'YOUR_PREFIX',
    sandbox: true
});

// Ödeme oluşturma
app.get('/create-payment', async (req, res) => {
    try {
        const payment = await shurjopayClient.createPayment({
            amount: 1000.00,
            currency: 'BDT',
            orderId: `ORDER-${Date.now()}`,
            name: 'John Doe',
            customerName: 'John Doe',
            email: 'customer@example.com',
            phone: '01711111111',
            address: 'Dhaka, Bangladesh',
            city: 'Dhaka',
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
        
        const result = await shurjopayClient.handleCallback(req.body);
        
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

// Ödeme doğrulama
app.get('/verify/:orderId', async (req, res) => {
    try {
        const verification = await shurjopayClient.verifyPayment(req.params.orderId);
        res.json(verification);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Başarı sayfası
app.get('/success', (req, res) => {
    res.send('<h1>Payment Successful!</h1><p>ধন্যবাদ আপনার পেমেন্টের জন্য।</p>');
});

// Hata sayfası
app.get('/fail', (req, res) => {
    res.send('<h1>Payment Failed</h1><p>পেমেন্ট সম্পন্ন হয়নি। অনুগ্রহ করে আবার চেষ্টা করুন।</p>');
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Create payment: http://localhost:${PORT}/create-payment`);
});
