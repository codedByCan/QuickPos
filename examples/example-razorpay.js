const RazorpayClient = require('../lib/razorpay');

const client = new RazorpayClient({
    keyId: 'YOUR_KEY_ID',
    keySecret: 'YOUR_KEY_SECRET'
});

async function example() {
    try {
        const payment = await client.createPayment({
            amount: 500,
            orderId: 'TEST-001',
            currency: 'INR',
            callback_link: 'https://yoursite.com/callback',
            name: 'Amit Sharma',
            email: 'amit@example.com',
            phone: '9999999999',
            merchantName: 'Your Business'
        });
        
        console.log('Order ID:', payment.data.orderId);
        console.log('Amount:', payment.data.amount);
        console.log('Key ID:', payment.data.keyId);
        console.log('Use these details with Razorpay Checkout.js');
    } catch (error) {
        console.error('Error:', error.message);
    }
}

example();
