const express = require('express');
const bodyParser = require('body-parser');
const QuickPos = require('./app');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const quickPos = new QuickPos({
  providers: {
    cardcom: {
      terminalNumber: 'your-terminal-number',
      userName: 'your-username'
    }
  },
});

app.use(quickPos.middleware());

// Payment form
app.get('/', (req, res) => {
  res.send(`
    <h1>Cardcom Payment Example (Israel)</h1>
    <form action="/payment/cardcom" method="post">
      <input type="text" name="amount" placeholder="Amount (ILS)" required>
      <input type="email" name="email" placeholder="Email" required>
      <input type="text" name="name" placeholder="Customer Name" required>
      <input type="text" name="mobile" placeholder="Mobile" required>
      <input type="text" name="orderId" placeholder="Order ID" required>
      <input type="text" name="description" placeholder="Description" required>
      <button type="submit">Pay with Cardcom</button>
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
      email: req.body.email,
      mobile: req.body.mobile,
      description: req.body.description,
      orderId: req.body.orderId,
      callback_link: `http://localhost:3000/payment-callback/${provider}`
    });

    if (result.status === 'success') {
      res.json({ 
        success: true,
        redirectUrl: result.data.url,
        lowProfileId: result.data.lowProfileId,
        lowProfileCode: result.data.lowProfileCode
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Payment callback
app.post('/payment-callback/:provider', quickPos.handleCallback('cardcom'), (req, res) => {
  console.log('Payment result:', req.paymentResult);
  res.json({ success: true, data: req.paymentResult });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} to test`);
});
