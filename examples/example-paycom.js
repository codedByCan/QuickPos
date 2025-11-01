const express = require('express');
const bodyParser = require('body-parser');
const QuickPos = require('./app');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const quickPos = new QuickPos({
  providers: {
    paycom: {
      merchantId: 'your-merchant-id',
      secretKey: 'your-secret-key'
    }
  },
});

app.use(quickPos.middleware());

// Payment form
app.get('/', (req, res) => {
  res.send(`
    <h1>Paycom Payment Example (Uzbekistan)</h1>
    <form action="/payment/paycom" method="post">
      <input type="text" name="amount" placeholder="Amount (UZS)" required>
      <input type="text" name="orderId" placeholder="Order ID" required>
      <button type="submit">Pay with Paycom</button>
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
      orderId: req.body.orderId,
      callback_link: `http://localhost:3000/payment-callback/${provider}`
    });

    if (result.status === 'success') {
      res.json({ 
        success: true,
        redirectUrl: result.data.url,
        orderId: result.data.orderId
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Payment callback - Paycom uses JSON-RPC 2.0 protocol
app.post('/payment-callback/:provider', async (req, res) => {
  try {
    const result = await quickPos.providers.paycom.handleCallback(req.body);
    res.json(result);
  } catch (error) {
    res.json({
      jsonrpc: '2.0',
      id: req.body.id,
      error: {
        code: -32400,
        message: error.message
      }
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} to test`);
});
