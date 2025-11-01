const express = require('express');
const bodyParser = require('body-parser');
const PayULatamClient = require('../lib/payulatam');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// PayU Latam yapılandırması
const payuLatamClient = new PayULatamClient({
    apiKey: 'YOUR_API_KEY',
    apiLogin: 'YOUR_API_LOGIN',
    merchantId: 'YOUR_MERCHANT_ID',
    accountId: 'YOUR_ACCOUNT_ID',
    sandbox: true
});

// Ödeme oluşturma
app.get('/create-payment', async (req, res) => {
    try {
        const payment = await payuLatamClient.createPayment({
            amount: 10000,
            currency: 'COP',
            orderId: `ORDER-${Date.now()}`,
            name: 'Juan Perez',
            description: 'Pago de prueba',
            email: 'customer@example.com',
            dniNumber: '123456789',
            country: 'CO',
            address: 'Calle 123',
            city: 'Bogotá',
            state: 'Bogotá D.C.',
            postalCode: '110111',
            paymentMethod: 'VISA',
            callback_link: 'http://localhost:3000/callback',
            callbackUrl: 'http://localhost:3000/callback'
        });

        console.log('Payment created:', payment);
        res.json(payment);
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Callback endpoint (Confirmation Page)
app.post('/callback', async (req, res) => {
    try {
        console.log('Callback received:', req.body);
        
        const result = await payuLatamClient.handleCallback(req.body);
        
        console.log('Payment result:', result);
        
        if (result.status === 'success') {
            // Ödeme başarılı
            console.log('¡Pago exitoso!');
            console.log('Order ID:', result.orderId);
            console.log('Transaction ID:', result.transactionId);
            console.log('Monto:', result.amount, result.currency);
        }
        
        res.status(200).send('OK');
    } catch (error) {
        console.error('Callback error:', error.message);
        res.status(400).send('ERROR');
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`Crear pago: http://localhost:${PORT}/create-payment`);
});
