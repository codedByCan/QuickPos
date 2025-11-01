const express = require('express');
const bodyParser = require('body-parser');
const PayoneerClient = require('../lib/payoneer');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Payoneer yapılandırması
const payoneerClient = new PayoneerClient({
    programId: 'YOUR_PROGRAM_ID',
    username: 'YOUR_USERNAME',
    password: 'YOUR_PASSWORD',
    sandbox: true
});

// Ödeme oluşturma
app.get('/create-payment', async (req, res) => {
    try {
        const payment = await payoneerClient.createPayment({
            amount: 100.00,
            currency: 'USD',
            orderId: `ORDER-${Date.now()}`,
            payeeId: 'customer@example.com',
            email: 'customer@example.com',
            firstName: 'John',
            lastName: 'Doe',
            description: 'Freelance payment'
        });

        console.log('Payment created:', payment);
        res.json(payment);
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Ödeme durumu sorgulama
app.get('/payment-status/:paymentId', async (req, res) => {
    try {
        const status = await payoneerClient.getPaymentStatus(req.params.paymentId);
        console.log('Payment status:', status);
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ödemeyi iptal et
app.post('/cancel-payment/:paymentId', async (req, res) => {
    try {
        const result = await payoneerClient.cancelPayment(req.params.paymentId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Alıcı bilgilerini sorgula
app.get('/payee/:payeeId', async (req, res) => {
    try {
        const payee = await payoneerClient.getPayeeDetails(req.params.payeeId);
        res.json(payee);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Create payment: http://localhost:${PORT}/create-payment`);
});
