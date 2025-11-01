const express = require('express');
const bodyParser = require('body-parser');
const QuickPos = require('./app');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const quickPos = new QuickPos({
  providers: {
    paysend: {
      apiKey: 'your-api-key',
      sandbox: true
    }
  },
});

app.use(quickPos.middleware());

// Payment form
app.get('/', (req, res) => {
  res.send(`
    <h1>Paysend Transfer Example</h1>
    <form action="/payment/paysend" method="post">
      <input type="text" name="amount" placeholder="Amount" required>
      <input type="text" name="currency" placeholder="Currency (USD, EUR, GBP)" required>
      <input type="text" name="cardNumber" placeholder="Recipient Card Number" required>
      <input type="text" name="recipientName" placeholder="Recipient Name" required>
      <input type="email" name="email" placeholder="Your Email" required>
      <input type="text" name="orderId" placeholder="Order ID" required>
      <button type="submit">Send Money</button>
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
      cardNumber: req.body.cardNumber,
      recipientName: req.body.recipientName,
      senderEmail: req.body.email,
      orderId: req.body.orderId,
      callback_link: `http://localhost:3000/payment-callback/${provider}`
    });

    if (result.status === 'success') {
      res.json({ 
        success: true,
        transferId: result.data.transferId,
        status: result.data.status,
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
app.post('/payment-callback/:provider', quickPos.handleCallback('paysend'), (req, res) => {
  console.log('Transfer result:', req.paymentResult);
  res.json({ success: true, data: req.paymentResult });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} to test`);
});
