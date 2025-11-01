const express = require('express');
const bodyParser = require('body-parser');
const QuickPos = require('./app');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const quickPos = new QuickPos({
  providers: {
    checkout: {
      secretKey: 'your-secret-key',
      publicKey: 'your-public-key',
      sandbox: true
    }
  },
});

app.use(quickPos.middleware());

// Payment form
app.get('/', (req, res) => {
  res.send(`
    <h1>Checkout.com Payment Example</h1>
    <form action="/payment/checkout" method="post">
      <input type="text" name="amount" placeholder="Amount" required>
      <input type="email" name="email" placeholder="Email" required>
      <input type="text" name="name" placeholder="Customer Name" required>
      <input type="text" name="orderId" placeholder="Order ID" required>
      <select name="currency">
        <option value="USD">USD</option>
        <option value="EUR">EUR</option>
        <option value="GBP">GBP</option>
      </select>
      <button type="submit">Create Payment Link</button>
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
      currency: req.body.currency || 'USD',
      customerEmail: req.body.email,
      customerName: req.body.name,
      orderId: req.body.orderId,
      name: 'Test Product',
      useHostedPage: true, // Use hosted payment page
      callback_link: `http://localhost:3000/payment-callback/${provider}`
    });

    if (result.status === 'success') {
      res.json({ 
        success: true,
        redirectUrl: result.data.url,
        paymentId: result.data.id,
        expiresOn: result.data.expiresOn
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Payment webhook
app.post('/payment-callback/:provider', quickPos.handleCallback('checkout'), (req, res) => {
  console.log('Payment result:', req.paymentResult);
  res.json({ success: true, data: req.paymentResult });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} to test`);
});
