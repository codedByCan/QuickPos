const axios = require('axios');
const crypto = require('crypto');

class RazorpayClient {
    constructor(config) {
        const requiredFields = ['keyId', 'keySecret'];
        for (let field of requiredFields) {
            if (!config[field]) throw new Error(`Missing required field: ${field}`);
        }

        this.keyId = config.keyId;
        this.keySecret = config.keySecret;
        this.baseURL = 'https://api.razorpay.com/v1';

        this.client = axios.create({
            baseURL: this.baseURL,
            auth: {
                username: this.keyId,
                password: this.keySecret
            },
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    async createPayment(options) {
        try {
            const orderId = options.orderId || `ORDER-${Date.now()}`;
            
            // Create Razorpay order
            const orderData = {
                amount: Math.round(parseFloat(options.amount) * 100), // Amount in paise
                currency: options.currency || 'INR',
                receipt: orderId,
                notes: {
                    description: options.description || options.name || 'Payment',
                    customer_name: options.name || '',
                    customer_email: options.email || '',
                    customer_phone: options.phone || ''
                }
            };

            const response = await this.client.post('/orders', orderData);

            // For Razorpay, you need to use Checkout.js on frontend
            // This returns the order details needed for checkout
            return {
                status: 'success',
                data: {
                    orderId: response.data.id,
                    orderIdCustom: orderId,
                    amount: response.data.amount / 100,
                    currency: response.data.currency,
                    status: response.data.status,
                    // These are needed for Razorpay Checkout.js
                    keyId: this.keyId,
                    name: options.merchantName || 'Your Business',
                    description: options.description || 'Payment',
                    prefill: {
                        name: options.name || '',
                        email: options.email || '',
                        contact: options.phone || ''
                    },
                    callback_url: options.callbackUrl || options.callback_link,
                    redirect: options.redirect !== false
                }
            };
        } catch (error) {
            throw new Error(`Payment creation error: ${error.response?.data?.error?.description || error.message}`);
        }
    }

    async handleCallback(callbackData) {
        try {
            // Verify payment signature
            const verification = await this.verifyPaymentSignature(callbackData);
            
            if (!verification.status) {
                throw new Error(verification.error.message);
            }

            // Get payment details
            const payment = await this.getPaymentDetails(callbackData.razorpay_payment_id);

            // Status mapping
            const statusMapping = {
                'captured': 'success',
                'authorized': 'success',
                'refunded': 'refunded',
                'failed': 'failed'
            };

            return {
                status: statusMapping[payment.status] || 'unknown',
                orderId: payment.notes?.order_id || payment.order_id,
                paymentId: payment.id,
                amount: payment.amount / 100,
                currency: payment.currency,
                paymentStatus: payment.status,
                method: payment.method,
                email: payment.email,
                contact: payment.contact,
                fee: payment.fee / 100,
                tax: payment.tax / 100
            };
        } catch (error) {
            throw new Error(`Error in Razorpay callback handling: ${error.message}`);
        }
    }

    async verifyPaymentSignature(data) {
        try {
            const expectedSignature = crypto
                .createHmac('sha256', this.keySecret)
                .update(data.razorpay_order_id + '|' + data.razorpay_payment_id)
                .digest('hex');

            if (expectedSignature !== data.razorpay_signature) {
                return {
                    status: false,
                    error: {
                        code: 401,
                        message: 'Invalid payment signature'
                    }
                };
            }

            return {
                status: true,
                data: data
            };
        } catch (error) {
            return {
                status: false,
                error: {
                    code: 500,
                    message: error.message
                }
            };
        }
    }

    async getPaymentDetails(paymentId) {
        try {
            const response = await this.client.get(`/payments/${paymentId}`);
            return response.data;
        } catch (error) {
            throw new Error(`Error getting payment details: ${error.response?.data?.error?.description || error.message}`);
        }
    }

    async getOrderDetails(orderId) {
        try {
            const response = await this.client.get(`/orders/${orderId}`);
            return response.data;
        } catch (error) {
            throw new Error(`Error getting order details: ${error.response?.data?.error?.description || error.message}`);
        }
    }

    async capturePayment(paymentId, amount) {
        try {
            const response = await this.client.post(`/payments/${paymentId}/capture`, {
                amount: Math.round(parseFloat(amount) * 100),
                currency: 'INR'
            });

            return response.data;
        } catch (error) {
            throw new Error(`Error capturing payment: ${error.response?.data?.error?.description || error.message}`);
        }
    }

    async createRefund(paymentId, options = {}) {
        try {
            const refundData = {
                amount: options.amount ? Math.round(parseFloat(options.amount) * 100) : undefined,
                speed: options.speed || 'normal', // normal or optimum
                notes: options.notes || {},
                receipt: options.receipt
            };

            const response = await this.client.post(`/payments/${paymentId}/refund`, refundData);
            return response.data;
        } catch (error) {
            throw new Error(`Error creating refund: ${error.response?.data?.error?.description || error.message}`);
        }
    }

    async verifyWebhookSignature(webhookBody, webhookSignature, webhookSecret) {
        try {
            const expectedSignature = crypto
                .createHmac('sha256', webhookSecret)
                .update(webhookBody)
                .digest('hex');

            return expectedSignature === webhookSignature;
        } catch (error) {
            return false;
        }
    }
}

module.exports = RazorpayClient;
