const express = require('express');
const bodyParser = require('body-parser');
const QuickPos = require('./app');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const quickPos = new QuickPos({
  providers: {
    zarinpal: {
      merchantId: 'your-merchant-id',
      sandbox: true // Set to false for production
    }
  },
});

app.use(quickPos.middleware());

// Payment form
app.get('/', (req, res) => {
  res.send(`
    <h1>Zarinpal Payment Example (Iran)</h1>
    <form action="/payment/zarinpal" method="post">
      <input type="text" name="amount" placeholder="Amount (Toman)" required>
      <input type="email" name="email" placeholder="Email" required>
      <input type="text" name="mobile" placeholder="Mobile" required>
      <input type="text" name="orderId" placeholder="Order ID" required>
      <input type="text" name="description" placeholder="Description" required>
      <button type="submit">Pay with Zarinpal</button>
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
      description: req.body.description,
      email: req.body.email,
      mobile: req.body.mobile,
      orderId: req.body.orderId,
      callback_link: `http://localhost:3000/payment-callback/${provider}`
    });

    if (result.status === 'success') {
      res.json({ 
        success: true,
        redirectUrl: result.data.url,
        authority: result.data.authority
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Payment callback
app.get('/payment-callback/:provider', async (req, res) => {
  const { provider } = req.params;
  const authority = req.query.Authority;
  const status = req.query.Status;

  if (status === 'OK') {
    try {
      // You need to verify the payment with the amount stored in your database
      const amount = 1000; // Get this from your database based on authority
      
      const result = await quickPos.providers[provider].verifyPayment(authority, amount);
      console.log('Payment verified:', result);
      
      res.send(`
        <h1>Payment Successful!</h1>
        <p>Reference ID: ${result.data.refId}</p>
        <p>Authority: ${authority}</p>
      `);
    } catch (error) {
      res.send(`<h1>Payment Verification Failed!</h1><p>${error.message}</p>`);
    }
  } else {
    res.send('<h1>Payment Cancelled!</h1>');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} to test`);
});
