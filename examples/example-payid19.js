const express = require('express');
const bodyParser = require('body-parser');
const QuickPos = require('./app');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const quickPos = new QuickPos({
  providers: {
    payid19: {
      apiKey: 'your-api-key',
      secretKey: 'your-secret-key'
    }
  },
});

app.use(quickPos.middleware());

// Payment form
app.get('/', (req, res) => {
  res.send(`
    <h1>PayID19 Payment Example</h1>
    <form action="/payment/payid19" method="post">
      <input type="text" name="amount" placeholder="Amount (IDR)" required>
      <input type="email" name="email" placeholder="Email" required>
      <input type="text" name="name" placeholder="Customer Name" required>
      <input type="text" name="phone" placeholder="Phone" required>
      <input type="text" name="orderId" placeholder="Order ID" required>
      <select name="paymentMethod">
        <option value="all">All Methods</option>
        <option value="va">Virtual Account</option>
        <option value="qris">QRIS</option>
        <option value="ewallet">E-Wallet</option>
      </select>
      <button type="submit">Pay with PayID19</button>
    </form>
  `);
});

// Create payment
app.post('/payment/:provider', async (req, res) => {
  const { provider } = req.params;
  
  if (!req.quickPos[provider]) {
    return res.status(400).json({ error: 'Invalid payment provider' });
  }

  try {
    const result = await req.quickPos[provider].createPayment({
      amount: req.body.amount,
      customerName: req.body.name,
      customerEmail: req.body.email,
      customerPhone: req.body.phone,
      orderId: req.body.orderId,
      paymentMethod: req.body.paymentMethod || 'all',
      callback_link: `http://localhost:3000/payment-callback/${provider}`,
      description: 'Test Product'
    });

    if (result.status === 'success') {
      res.json({ 
        success: true,
        redirectUrl: result.data.url,
        paymentId: result.data.paymentId,
        qrCode: result.data.qrCode,
        expiredAt: result.data.expiredAt
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Payment callback
app.post('/payment-callback/:provider', quickPos.handleCallback('payid19'), (req, res) => {
  console.log('Payment result:', req.paymentResult);
  res.json({ success: true, data: req.paymentResult });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} to test`);
});
