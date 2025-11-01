const express = require('express');
const bodyParser = require('body-parser');
const PayUIndiaClient = require('../lib/payuindia');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// PayU India yapılandırması
const payuIndiaClient = new PayUIndiaClient({
    merchantKey: 'YOUR_MERCHANT_KEY',
    salt: 'YOUR_SALT',
    sandbox: true
});

// Ödeme oluşturma
app.get('/create-payment', async (req, res) => {
    try {
        const payment = await payuIndiaClient.createPayment({
            amount: 1000.00,
            orderId: `TXN${Date.now()}`,
            productInfo: 'Test Product',
            firstname: 'John',
            name: 'John Doe',
            email: 'customer@example.com',
            phone: '9999999999',
            callback_link: 'http://localhost:3000/callback',
            successUrl: 'http://localhost:3000/success',
            failUrl: 'http://localhost:3000/fail'
        });

        console.log('Payment created:', payment);
        
        // Create and submit form
        const form = `
            <!DOCTYPE html>
            <html>
            <body>
                <form id="payuForm" action="${payment.data.url}" method="POST">
                    ${Object.keys(payment.data.params).map(key => 
                        `<input type="hidden" name="${key}" value="${payment.data.params[key]}">`
                    ).join('\n')}
                </form>
                <script>
                    document.getElementById('payuForm').submit();
                </script>
            </body>
            </html>
        `;
        
        res.send(form);
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Callback endpoint (Success/Failure)
app.post('/callback', async (req, res) => {
    try {
        console.log('Callback received:', req.body);
        
        const result = await payuIndiaClient.handleCallback(req.body);
        
        console.log('Payment result:', result);
        
        if (result.status === 'success') {
            // Ödeme başarılı
            console.log('Payment successful!');
            console.log('Order ID:', result.orderId);
            console.log('Transaction ID:', result.transactionId);
            console.log('Amount:', result.amount, result.currency);
            
            res.redirect('/success');
        } else {
            res.redirect('/fail');
        }
    } catch (error) {
        console.error('Callback error:', error.message);
        res.redirect('/fail');
    }
});

// Ödeme doğrulama
app.get('/verify/:txnid', async (req, res) => {
    try {
        const verification = await payuIndiaClient.verifyPayment(req.params.txnid);
        res.json(verification);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Başarı sayfası
app.get('/success', (req, res) => {
    res.send('<h1>Payment Successful!</h1><p>भुगतान सफल रहा। धन्यवाद!</p>');
});

// Hata sayfası
app.get('/fail', (req, res) => {
    res.send('<h1>Payment Failed</h1><p>भुगतान विफल रहा। कृपया पुनः प्रयास करें।</p>');
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Create payment: http://localhost:${PORT}/create-payment`);
});
