/**
 * PrimePayments API Example Usage
 * This file demonstrates how to use the PrimePayments library
 */

// Import the PrimePayments library
const PrimePayments = require('./lib/primepayments');

// Initialize the client with your credentials
const primeClient = new PrimePayments({
  projectId: '5172', // Replace with your actual project ID
  secretWord1: '', // Replace with your actual secret word 1
  secretWord2: '', // Replace with your actual secret word 2
  payoutKey: '' // Replace with your actual payout key
});


const express = require('express');
const app = express();


app.get('/primePayments.txt', (req, res) => {
    res.send('92f87dea');
});

app.listen(80)

// Example 1: Initialize a payment
async function createPayment() {
  try {
    console.log('Attempting to create payment...');
    const result = await primeClient.initPayment({
      sum: 1000,
      currency: 'RUB',
      innerID: 'order123',
      email: 'customer@example.com',
      payWay: '1', // Card payment
      comment: 'Payment for services'
    });
    
    if (result.status === 'OK') {
      console.log('Payment URL:', result.result);
      console.log('Order ID:', result.order_id);
      // Redirect user to payment page
      // window.location.href = result.result;
    } else {
      console.error('Payment error:', result.result);
      console.log('Note: If project is in MODERATION status, it cannot accept payments.');
    }
    
    return result;
  } catch (error) {
    console.error('API request failed:', error.message);
  }
}

// Example 2: Process a payout
async function processPayout() {
  try {
    const result = await primeClient.initPayout({
      sum: 500,
      currency: 'RUB',
      payWay: '1', // Card payout
      email: 'recipient@example.com',
      purse: '1234567890123456', // Card number
      comment: 'Affiliate payout'
    });
    
    if (result.status === 'OK') {
      console.log('Payout created, ID:', result.result.payout_id);
    } else {
      console.error('Payout error:', result.result);
    }
    
    return result;
  } catch (error) {
    console.error('API request failed:', error.message);
  }
}

// Example 3: Check order status
async function checkOrderStatus(orderID) {
  try {
    const result = await primeClient.getOrderInfo(orderID);
    
    if (result.status === 'OK') {
      const orderInfo = result.result;
      console.log('Order status:', getOrderStatusText(orderInfo.pay_status));
      console.log('Payment amount:', orderInfo.sum, 'from', orderInfo.payed_from);
    } else {
      console.error('Error getting order info:', result.result);
    }
    
    return result;
  } catch (error) {
    console.error('API request failed:', error.message);
  }
}

// Helper function to convert status code to text
function getOrderStatusText(statusCode) {
  const statuses = {
    '0': 'In progress',
    '-2': 'Expired',
    '-1': 'Failed',
    '1': 'Paid',
    '2': 'Refund in progress',
    '3': 'Refunded'
  };
  
  return statuses[statusCode] || 'Unknown';
}

// Example 4: Get project balance
async function checkBalance() {
  try {
    const result = await primeClient.getProjectBalance();
    
    if (result.status === 'OK') {
      console.log('Project balance:', result.result);
    } else {
      console.error('Error getting balance:', result.result);
    }
    
    return result;
  } catch (error) {
    console.error('API request failed:', error.message);
  }
}

// Example 5: Get project info and available payment methods
async function getProjectInfo() {
  try {
    console.log('Retrieving project information...');
    const result = await primeClient.getProjectInfo();
    
    if (result.status === 'OK') {
      console.log('Project status:', result.result.status);
      
      // Check if payWays exists before trying to access it
      if (result.result.payWays && typeof result.result.payWays === 'object') {
        console.log('Available payment methods:', Object.keys(result.result.payWays).join(', '));
      } else {
        console.log('No payment methods available yet. This is normal for projects in MODERATION status.');
      }
      
      // Display all project info
      console.log('Full project information:', JSON.stringify(result.result, null, 2));
    } else {
      console.error('Error getting project info:', result.result);
    }
    
    return result;
  } catch (error) {
    console.error('API request failed:', error.message);
    console.log('Full error details:', error);
  }
}

// Example 6: Refund a payment
async function refundPayment(orderID) {
  try {
    const result = await primeClient.refund(orderID);
    
    if (result.status === 'OK') {
      console.log('Payment refunded successfully. Order ID:', result.result.order_id);
    } else {
      console.error('Refund error:', result.result);
    }
    
    return result;
  } catch (error) {
    console.error('API request failed:', error.message);
  }
}

// Example of handling a payment notification
// Express.js example (uncomment to use)
/*
const express = require('express');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));

app.post('/payment-notification', (req, res) => {
  const isValid = primeClient.verifyPaymentNotification(req.body);
  
  if (isValid) {
    const innerID = req.body.innerID;
    const orderID = req.body.orderID;
    const sum = req.body.sum;
    
    if (req.body.action === 'order_payed') {
      console.log(`Payment successful for order ${innerID}. Amount: ${sum}`);
      // Update order status to paid in your database
      // updateOrderStatus(innerID, 'paid');
    } else if (req.body.action === 'order_cancel') {
      console.log(`Payment canceled for order ${innerID}`);
      // Handle canceled payment
      // updateOrderStatus(innerID, 'canceled');
    }
    
    res.send('OK'); // Important: must respond with "OK" or "YES"
  } else {
    console.error('Invalid payment notification signature');
    res.status(400).send('Invalid signature');
  }
});

app.listen(3000, () => {
  console.log('Notification server running on port 3000');
});
*/

// Execute examples
(async function runExamples() {
  console.log('=== PrimePayments API Examples ===');
  
  // Get project info first to check status
  console.log('\n1. Getting project info...');
  const projectInfo = await getProjectInfo();
  
  // Check if project is active before trying to create payment
  const isProjectActive = projectInfo && 
                          projectInfo.status === 'OK' && 
                          projectInfo.result && 
                          projectInfo.result.status === 'ACTIVE';
  
  if (isProjectActive) {
    console.log('\n2. Creating payment...');
    const paymentResult = await createPayment();
    
    // If payment was created successfully, check its status
    if (paymentResult && paymentResult.status === 'OK' && paymentResult.order_id) {
      console.log('\n3. Checking order status...');
      await checkOrderStatus(paymentResult.order_id);
    }
  } else {
    console.log('\n2. Skipping payment creation because project is not active.');
    console.log('   Project must be in ACTIVE status to accept payments.');
    console.log('   Current status:', projectInfo?.result?.status || 'Unknown');
  }
  
  // Check balance - this should work regardless of project status
  console.log('\n3. Checking balance...');
  await checkBalance();
  
  console.log('\n=== End of examples ===');
})();
