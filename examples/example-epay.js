const express = require('express');
const bodyParser = require('body-parser');
const EpayClient = require('../lib/epay');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ePay yapılandırması
const epayClient = new EpayClient({
    merchantId: 'YOUR_MERCHANT_ID',
    secretKey: 'YOUR_SECRET_KEY'
});

// Ödeme oluşturma
app.get('/create-payment', async (req, res) => {
    try {
        const payment = await epayClient.createPayment({
            amount: 100.00,
            orderId: `ORDER-${Date.now()}`,
            name: 'Test Product',
            description: 'Тестово плащане',
            expirationTime: epayClient.getExpirationTime(24) // 24 saat
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
        
        const result = await epayClient.handleCallback(req.body);
        
        console.log('Payment result:', result);
        
        if (result.status === 'success') {
            // Ödeme başarılı
            console.log('Плащането е успешно!');
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

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Create payment: http://localhost:${PORT}/create-payment`);
});
