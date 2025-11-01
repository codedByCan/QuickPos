const express = require('express');
const bodyParser = require('body-parser');
const BitPayClient = require('../lib/bitpay');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// BitPay yapılandırması
const bitpayClient = new BitPayClient({
    apiToken: 'YOUR_API_TOKEN',
    environment: 'test' // 'test' veya 'prod'
});

// Ödeme oluşturma
app.get('/create-payment', async (req, res) => {
    try {
        const payment = await bitpayClient.createPayment({
            amount: 100.00,
            currency: 'USD',
            orderId: `ORDER-${Date.now()}`,
            name: 'Test Product',
            description: 'Test payment description',
            email: 'customer@example.com',
            callback_link: 'http://localhost:3000/callback',
            successUrl: 'http://localhost:3000/success',
            callbackUrl: 'http://localhost:3000/callback'
        });

        console.log('Invoice created:', payment);
        
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
        
        const result = await bitpayClient.handleCallback(req.body);
        
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

// Invoice sorgulama
app.get('/invoice/:invoiceId', async (req, res) => {
    try {
        const invoice = await bitpayClient.getInvoice(req.params.invoiceId);
        res.json(invoice);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Başarı sayfası
app.get('/success', (req, res) => {
    res.send('<h1>Payment Successful!</h1><p>Thank you for your cryptocurrency payment.</p>');
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Create payment: http://localhost:${PORT}/create-payment`);
});
