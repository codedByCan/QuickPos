const PayTabsClient = require('../lib/paytabs');

const client = new PayTabsClient({
    profileId: 'YOUR_PROFILE_ID',
    serverKey: 'YOUR_SERVER_KEY',
    region: 'ARE'
});

async function example() {
    try {
        const payment = await client.createPayment({
            amount: 100,
            orderId: 'TEST-001',
            currency: 'AED',
            callback_link: 'https://yoursite.com/callback',
            name: 'Ahmed Mohammed',
            email: 'ahmed@example.com',
            phone: '+971501234567'
        });
        
        console.log('Payment URL:', payment.data.url);
        console.log('Transaction Ref:', payment.data.transactionRef);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

example();
