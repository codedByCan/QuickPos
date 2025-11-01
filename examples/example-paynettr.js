const PayNetTRClient = require("../lib/paynettr");

const client = new PayNetTRClient({
    merchantId: "YOUR_MERCHANT_ID",
    secretKey: "YOUR_SECRET_KEY"
});

async function example() {
    const payment = await client.createPayment({
        amount: 100.00,
        orderId: "TEST-001",
        callback_link: "https://yoursite.com/callback",
        name: "Test Payment"
    });
    console.log("Payment URL:", payment.data.url);
}

example();
