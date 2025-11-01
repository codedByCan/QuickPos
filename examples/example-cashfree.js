const express = require('express');
const bodyParser = require('body-parser');
const CashfreeClient = require('../lib/cashfree');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Cashfree yapılandırması
const cashfreeClient = new CashfreeClient({
    appId: 'YOUR_APP_ID',
    secretKey: 'YOUR_SECRET_KEY',
    environment: 'sandbox' // 'sandbox' veya 'production'
});

// Ödeme oluşturma
app.get('/create-payment', async (req, res) => {
    try {
        const payment = await cashfreeClient.createPayment({
            amount: 1000.00,
            currency: 'INR',
            orderId: `order_${Date.now()}`,
            customerId: `customer_${Date.now()}`,
            name: 'John Doe',
            customerName: 'John Doe',
            email: 'customer@example.com',
            phone: '9999999999',
            description: 'Test payment',
            callback_link: 'http://localhost:3000/callback',
            successUrl: 'http://localhost:3000/success',
            callbackUrl: 'http://localhost:3000/callback'
        });

        console.log('Order created:', payment);
        
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
        
        const result = await cashfreeClient.handleCallback(req.body);
        
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

// Sipariş sorgulama
app.get('/order/:orderId', async (req, res) => {
    try {
        const order = await cashfreeClient.getOrder(req.params.orderId);
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ödemeleri sorgulama
app.get('/payments/:orderId', async (req, res) => {
    try {
        const payments = await cashfreeClient.getPayments(req.params.orderId);
        res.json(payments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// İade işlemi
app.post('/refund/:orderId', async (req, res) => {
    try {
        const refund = await cashfreeClient.refundPayment(req.params.orderId, {
            amount: req.body.amount
        });
        res.json(refund);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Başarı sayfası
app.get('/success', (req, res) => {
    res.send('<h1>Payment Successful!</h1><p>भुगतान के लिए धन्यवाद।</p>');
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Create payment: http://localhost:${PORT}/create-payment`);
});
