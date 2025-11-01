const express = require('express');
const bodyParser = require('body-parser');
const QuickPos = require('./app');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const quickPos = new QuickPos({
  providers: {
    coinpayments: {
      publicKey: 'your-public-key',
      privateKey: 'your-private-key',
      ipnSecret: 'your-ipn-secret'
    }
  },
});

app.use(quickPos.middleware());

// Payment form
app.get('/', (req, res) => {
  res.send(`
    <h1>CoinPayments Crypto Payment Example</h1>
    <form action="/payment/coinpayments" method="post">
      <input type="text" name="amount" placeholder="Amount (USD)" required>
      <input type="email" name="email" placeholder="Email" required>
      <input type="text" name="name" placeholder="Name" required>
      <input type="text" name="orderId" placeholder="Order ID" required>
      <select name="currency2">
        <option value="BTC">Bitcoin (BTC)</option>
        <option value="ETH">Ethereum (ETH)</option>
        <option value="LTCT">Litecoin Test (LTCT)</option>
        <option value="LTC">Litecoin (LTC)</option>
      </select>
      <button type="submit">Pay with CoinPayments</button>
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
      currency1: 'USD',
      currency2: req.body.currency2 || 'BTC',
      buyerEmail: req.body.email,
      buyerName: req.body.name,
      itemName: 'Test Product',
      orderId: req.body.orderId,
      callback_link: `http://localhost:3000/payment-callback/${provider}`
    });

    if (result.status === 'success') {
      res.json({ 
        success: true,
        txnId: result.data.txnId,
        address: result.data.address,
        amount: result.data.amount,
        qrcodeUrl: result.data.qrcodeUrl,
        statusUrl: result.data.statusUrl,
        checkoutUrl: result.data.url
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Payment IPN callback
app.post('/payment-callback/:provider', quickPos.handleCallback('coinpayments'), (req, res) => {
  console.log('Payment result:', req.paymentResult);
  res.json({ success: true, data: req.paymentResult });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} to test`);
});
