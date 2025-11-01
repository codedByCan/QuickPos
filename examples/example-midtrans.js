const express = require('express');
const bodyParser = require('body-parser');
const QuickPos = require('./app');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const quickPos = new QuickPos({
  providers: {
    midtrans: {
      serverKey: 'your-server-key',
      clientKey: 'your-client-key',
      isProduction: false // Set to true for production
    }
  },
});

app.use(quickPos.middleware());

// Payment form
app.get('/', (req, res) => {
  res.send(`
    <h1>Midtrans Payment Example</h1>
    <form action="/payment/midtrans" method="post">
      <input type="text" name="amount" placeholder="Amount" required>
      <input type="email" name="email" placeholder="Email" required>
      <input type="text" name="name" placeholder="Name" required>
      <input type="text" name="phone" placeholder="Phone" required>
      <input type="text" name="orderId" placeholder="Order ID" required>
      <button type="submit">Pay with Midtrans</button>
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
      name: req.body.name,
      amount: req.body.amount,
      email: req.body.email,
      phone: req.body.phone,
      orderId: req.body.orderId,
      callbackUrl: `http://localhost:3000/payment-callback/${provider}`,
      itemName: 'Test Product'
    });

    if (result.status === 'success') {
      res.json({ 
        success: true,
        redirectUrl: result.data.url,
        token: result.data.token,
        orderId: result.data.orderId
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Payment callback
app.post('/payment-callback/:provider', quickPos.handleCallback('midtrans'), (req, res) => {
  console.log('Payment result:', req.paymentResult);
  res.json({ success: true, data: req.paymentResult });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} to test`);
});
