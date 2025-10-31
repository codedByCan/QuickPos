/**
 * Payop API Example Usage
 * This file demonstrates how to use the Payop API based on official documentation
 * https://github.com/Payop/payop-api-doc
 */

// Import the Payop library
const Payop = require('./lib/payop');
const crypto = require('crypto');

// Initialize the client with your credentials
const payop = new Payop({
  publicKey: 'application-xxx', // Replace with your actual public key
  secretKey: 'your-secret-key', // Replace with your actual secret key
  environment: 'production' // Use 'sandbox' for testing
});

// Helper function to generate signature according to Payop documentation
function generateSignature(amount, currency, orderId, secretKey) {
  const data = [amount, currency, orderId, secretKey].join(':');
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Example 1: Create an invoice
async function createInvoice() {
  try {
    console.log('Creating invoice...');
    
    // Generate a unique order ID
    const orderId = `order-${Date.now()}`;
    const amount = "100.00";
    const currency = "USD";
    
    // Generate signature for the invoice
    const signature = generateSignature(amount, currency, orderId, payop.config.secretKey);
    
    const invoice = await payop.createInvoice({
      order: orderId,
      amount: amount,
      currency: currency,
      description: "Test payment",
      customer: {
        email: "test.user@example.com",
        name: "John Doe"
      },
      resultUrl: "https://your-site.com/success?invoiceId={{invoiceId}}&txid={{txid}}",
      failPath: "https://your-site.com/fail?invoiceId={{invoiceId}}"
    });
    
    console.log('Invoice created:');
    console.log('Invoice ID:', invoice.data);
    console.log('Redirect URL:', `https://checkout.payop.com/en/payment/invoice-preprocessing/${invoice.data}`);
    
    return invoice.data; // Return invoice ID for further operations
  } catch (error) {
    console.error('Failed to create invoice:', error.message);
  }
}

// Example 2: Get available payment methods
async function getPaymentMethods(applicationId) {
  try {
    console.log(`Getting available payment methods for application ${applicationId}...`);
    const result = await payop.getPaymentMethods(applicationId);
    
    console.log('Available payment methods:');
    if (result.data && Array.isArray(result.data)) {
      result.data.forEach(method => {
        console.log(`- ${method.title} (ID: ${method.identifier})`);
        console.log(`  Supported currencies: ${method.currencies.join(', ')}`);
        console.log(`  Countries: ${method.countries.join(', ')}`);
        console.log('  Required fields:');
        if (method.config && method.config.fields) {
          method.config.fields.forEach(field => {
            console.log(`    ${field.name} (${field.type})${field.required ? ' - Required' : ''}`);
          });
        }
        console.log('---');
      });
    }
    
    return result;
  } catch (error) {
    console.error('Failed to get payment methods:', error.message);
  }
}

// Example 3: Create a checkout transaction
async function createCheckout(invoiceId, paymentMethodId) {
  try {
    console.log(`Creating checkout for invoice ${invoiceId} with payment method ${paymentMethodId}...`);
    
    const result = await fetch("https://api.payop.com/v1/checkout/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${payop.config.publicKey}`
      },
      body: JSON.stringify({
        invoiceIdentifier: invoiceId,
        customer: {
          email: "test.user@example.com",
          name: "John Doe",
          ip: "192.168.1.1",
          extraFields: {
            // These fields depend on the selected payment method
            // This is an example for a bank transfer
            date_of_birth: "01.01.1990",
            bank_code: "DEUTDEFF",
            bank_type: "SEPA",
            bank_country: "DE"
          }
        },
        paymentMethod: paymentMethodId,
        checkStatusUrl: `https://your-site.com/check-status/{{txid}}`
      })
    });
    
    const checkout = await result.json();
    
    if (checkout.data && checkout.data.isSuccess) {
      console.log('Checkout created successfully!');
      console.log('Transaction ID:', checkout.data.txid);
    } else {
      console.error('Failed to create checkout:', checkout.data?.message || 'Unknown error');
    }
    
    return checkout;
  } catch (error) {
    console.error('Failed to create checkout:', error.message);
  }
}

// Example 4: Check invoice status
async function checkInvoiceStatus(invoiceId) {
  try {
    console.log(`Checking status of invoice ${invoiceId}...`);
    
    const result = await fetch(`https://api.payop.com/v1/checkout/check-invoice-status/${invoiceId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${payop.config.publicKey}`
      }
    });
    
    const status = await result.json();
    
    if (status.data) {
      console.log('Invoice status:', status.data.status);
      
      if (status.data.status === 'success') {
        console.log('Payment successful!');
      } else if (status.data.status === 'fail') {
        console.log('Payment failed!');
      } else if (status.data.status === 'pending') {
        console.log('Payment is pending. Additional action may be required.');
        
        // Check if a form needs to be submitted (e.g., 3D Secure)
        if (status.data.form) {
          console.log('Form information:');
          console.log('Method:', status.data.form.method);
          console.log('URL:', status.data.form.url);
          console.log('Form fields:', status.data.form.fields);
        }
      }
    } else {
      console.error('Failed to check invoice status:', status.message || 'Unknown error');
    }
    
    return status;
  } catch (error) {
    console.error('Failed to check invoice status:', error.message);
  }
}

// Example 5: Get transaction details
async function getTransactionDetails(transactionId) {
  try {
    console.log(`Getting details for transaction ${transactionId}...`);
    
    const result = await fetch(`https://api.payop.com/v2/transactions/${transactionId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${payop.config.publicKey}`
      }
    });
    
    const transaction = await result.json();
    
    if (transaction.data) {
      console.log('Transaction details:');
      console.log('ID:', transaction.data.identifier);
      console.log('Amount:', transaction.data.amount, transaction.data.currency);
      console.log('State:', getTransactionStateText(transaction.data.state));
      console.log('Created at:', new Date(transaction.data.createdAt * 1000).toLocaleString());
      console.log('Order ID:', transaction.data.orderId);
      
      if (transaction.data.error) {
        console.log('Error:', transaction.data.error);
      }
    } else {
      console.error('Failed to get transaction details:', transaction.message || 'Unknown error');
    }
    
    return transaction;
  } catch (error) {
    console.error('Failed to get transaction details:', error.message);
  }
}

// Example 6: Handle IPN (Instant Payment Notification)
function handleIPN(request, response) {
  try {
    console.log('Received IPN notification');
    
    // In a real application, this would be the request body sent by Payop
    const notificationData = request.body;
    
    console.log('IPN Data:', JSON.stringify(notificationData, null, 2));
    
    // Extract important information from the IPN
    if (notificationData.invoice && notificationData.transaction) {
      const invoiceId = notificationData.invoice.id;
      const invoiceStatus = notificationData.invoice.status;
      const transactionId = notificationData.transaction.id;
      const transactionState = notificationData.transaction.state;
      const orderId = notificationData.transaction.order?.id;
      
      console.log(`Order ${orderId}, Invoice ${invoiceId}, Transaction ${transactionId}`);
      console.log(`Invoice status: ${invoiceStatus}, Transaction state: ${getTransactionStateText(transactionState)}`);
      
      // Handle transaction state
      if (transactionState === 2) { // Accepted/Success
        // Update your database - mark order as paid
        console.log('Payment successful! Update your database and fulfill the order.');
      } else if (transactionState === 3 || transactionState === 5) { // Failed
        // Update your database - mark order as failed
        console.log('Payment failed! Update your database and notify customer if needed.');
        
        if (notificationData.transaction.error) {
          console.log('Error message:', notificationData.transaction.error.message);
        }
      } else if (transactionState === 4) { // Pending
        // Payment is still being processed
        console.log('Payment is pending. Waiting for final status.');
      }
      
      // Always respond with 200 OK to acknowledge receipt of the IPN
      response.status(200).send('OK');
    } else {
      console.error('Invalid IPN data structure');
      response.status(400).send('Invalid IPN data');
    }
  } catch (error) {
    console.error('Error processing IPN:', error.message);
    response.status(500).send('Internal server error');
  }
}

// Helper function to translate transaction state codes to text
function getTransactionStateText(state) {
  const states = {
    1: 'New - No actions taken',
    2: 'Accepted - Paid successfully',
    3: 'Failed - Not paid (technical reasons)',
    4: 'Pending - Awaiting payment',
    5: 'Failed - Not paid (financial reasons)',
    9: 'Pre-approved - Submitted through bank, awaiting funds',
    15: 'Timeout - Timed out due to lack of confirmation'
  };
  
  return states[state] || `Unknown state (${state})`;
}

// Example 7: Simulate an IPN for testing
function simulateIPN() {
  console.log('Simulating an IPN...');
  
  // Create a mock request and response object
  const mockRequest = {
    body: {
      "invoice": {
        "id": "d024f697-ba2d-456f-910e-4d7fdfd338dd",
        "status": 1,
        "txid": "dca59ca5-be19-470d-9494-9b76944e0241",
        "metadata": {
          "orderId": "test-123",
          "amount": 100,
          "customerId": 15487
        }
      },
      "transaction": {
        "id": "dca59ca5-be19-470d-9494-9b76944e0241",
        "state": 2,
        "order": {
          "id": "test-123"
        },
        "error": {
          "message": "",
          "code": ""
        }
      }
    }
  };
  
  const mockResponse = {
    status: (code) => {
      console.log(`Response status: ${code}`);
      return {
        send: (message) => {
          console.log(`Response body: ${message}`);
        }
      };
    }
  };
  
  // Process the simulated IPN
  handleIPN(mockRequest, mockResponse);
}

// Run examples
async function runExamples() {
  try {
    console.log('=== Payop API Integration Examples ===\n');
    
    // Example 1: Create an invoice
    console.log('\n--- Example 1: Create Invoice ---');
    const invoiceId = await createInvoice();
    
    // In a real application, you would redirect the user to:
    // https://checkout.payop.com/en/payment/invoice-preprocessing/{invoiceId}
    
    // Example 2: Get available payment methods
    // Note: This requires a valid application ID and bearer token
    // console.log('\n--- Example 2: Get Payment Methods ---');
    // await getPaymentMethods('your-application-id');
    
    // Example 7: Simulate an IPN for testing
    console.log('\n--- Example 7: Simulate IPN ---');
    simulateIPN();
    
    console.log('\n=== End of Examples ===');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run all examples
runExamples();
