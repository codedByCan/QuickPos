const express = require('express');
const bodyParser = require('body-parser');
const QuickPos = require('./app');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const quickPos = new QuickPos({
  providers: {
    plisio: {
      apiKey: 'your-api-key'
    }
  },
});

app.use(quickPos.middleware());

// Payment form
app.get('/', (req, res) => {
  res.send(`
    <h1>Plisio Crypto Payment Example</h1>
    <form action="/payment/plisio" method="post">
      <input type="text" name="amount" placeholder="Amount (USD)" required>
      <input type="email" name="email" placeholder="Email" required>
      <input type="text" name="name" placeholder="Product Name" required>
      <input type="text" name="orderId" placeholder="Order ID" required>
      <select name="currency2">
        <option value="BTC">Bitcoin (BTC)</option>
        <option value="ETH">Ethereum (ETH)</option>
        <option value="LTC">Litecoin (LTC)</option>
        <option value="USDT">Tether (USDT)</option>
      </select>
      <button type="submit">Pay with Crypto</button>
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
      currency: 'USD',
      email: req.body.email,
      orderId: req.body.orderId,
      callbackUrl: `http://localhost:3000/payment-callback/${provider}`,
      orderName: req.body.name
    });

    if (result.status === 'success') {
      res.json({ 
        success: true,
        redirectUrl: result.data.url,
        txnId: result.data.txnId,
        amount: result.data.amount,
        currency: result.data.currency
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Payment callback
app.post('/payment-callback/:provider', quickPos.handleCallback('plisio'), (req, res) => {
  console.log('Payment result:', req.paymentResult);
  res.json({ success: true, data: req.paymentResult });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} to test`);
});
