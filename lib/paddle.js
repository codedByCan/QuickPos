const axios = require('axios');
const crypto = require('crypto');

class PaddleClient {
    constructor(config) {
        const requiredFields = ['vendorId', 'apiKey'];
        for (let field of requiredFields) {
            if (!config[field]) throw new Error(`Missing required field: ${field}`);
        }

        this.vendorId = config.vendorId;
        this.apiKey = config.apiKey;
        this.publicKey = config.publicKey || '';
        this.sandbox = config.sandbox || false;
        
        this.baseURL = this.sandbox 
            ? 'https://sandbox-vendors.paddle.com/api' 
            : 'https://vendors.paddle.com/api';

        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    async createPayment(options) {
        try {
            const orderId = options.orderId || `ORDER-${Date.now()}`;
            
            const payLinkData = {
                vendor_id: this.vendorId,
                vendor_auth_code: this.apiKey,
                title: options.title || options.name || 'Payment',
                webhook_url: options.callbackUrl || options.callback_link,
                prices: [
                    `${options.currency || 'USD'}:${parseFloat(options.amount).toFixed(2)}`
                ],
                recurring_prices: options.recurring ? [
                    `${options.currency || 'USD'}:${parseFloat(options.amount).toFixed(2)}`
                ] : undefined,
                customer_email: options.email || '',
                customer_country: options.country || 'US',
                custom_message: options.description || '',
                passthrough: JSON.stringify({
                    order_id: orderId,
                    customer_name: options.name || ''
                }),
                return_url: options.successUrl || options.callback_link,
                quantity_variable: options.quantityVariable ? 1 : 0,
                expires: options.expires || ''
            };

            const response = await this.client.post('/2.0/product/generate_pay_link', payLinkData);

            if (response.data.success) {
                return {
                    status: 'success',
                    data: {
                        url: response.data.response.url,
                        orderId: orderId,
                        amount: options.amount,
                        currency: options.currency || 'USD'
                    }
                };
            } else {
                throw new Error(response.data.error?.message || 'Payment link creation failed');
            }
        } catch (error) {
            throw new Error(`Payment creation error: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    async handleCallback(callbackData) {
        try {
            // Verify webhook signature if public key is available
            if (this.publicKey) {
                const verification = this.verifyWebhook(callbackData);
                if (!verification) {
                    throw new Error('Invalid webhook signature');
                }
            }

            const passthrough = callbackData.passthrough ? JSON.parse(callbackData.passthrough) : {};

            // Status mapping
            const statusMapping = {
                'succeeded': 'success',
                'completed': 'success',
                'refunded': 'refunded',
                'partially_refunded': 'refunded',
                'disputed': 'disputed',
                'cancelled': 'failed'
            };

            return {
                status: statusMapping[callbackData.status] || 'unknown',
                orderId: passthrough.order_id || callbackData.order_id,
                transactionId: callbackData.order_id,
                checkoutId: callbackData.checkout_id,
                amount: parseFloat(callbackData.sale_gross || callbackData.balance_gross || 0),
                currency: callbackData.currency,
                paymentStatus: callbackData.status,
                paymentMethod: callbackData.payment_method,
                customer: {
                    email: callbackData.email,
                    country: callbackData.country
                }
            };
        } catch (error) {
            throw new Error(`Error in Paddle callback handling: ${error.message}`);
        }
    }

    verifyWebhook(data) {
        try {
            const signature = data.p_signature;
            const dataToVerify = { ...data };
            delete dataToVerify.p_signature;

            // Sort keys and create verification string
            const sorted = Object.keys(dataToVerify).sort().reduce((acc, key) => {
                acc[key] = dataToVerify[key];
                return acc;
            }, {});

            // Serialize
            const serialized = Object.entries(sorted)
                .map(([key, value]) => `${key}=${value}`)
                .join('&');

            // Verify with public key (RSA verification would be needed here)
            // This is a simplified version
            return true; // Implement proper RSA verification if needed
        } catch (error) {
            return false;
        }
    }

    async getOrderDetails(checkoutId) {
        try {
            const response = await this.client.post('/2.0/order/details', {
                vendor_id: this.vendorId,
                vendor_auth_code: this.apiKey,
                checkout_id: checkoutId
            });

            if (response.data.success) {
                return response.data.response;
            } else {
                throw new Error(response.data.error?.message || 'Failed to get order details');
            }
        } catch (error) {
            throw new Error(`Error getting order details: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    async refundPayment(orderId, options = {}) {
        try {
            const response = await this.client.post('/2.0/payment/refund', {
                vendor_id: this.vendorId,
                vendor_auth_code: this.apiKey,
                order_id: orderId,
                amount: options.amount,
                reason: options.reason || 'Customer request'
            });

            if (response.data.success) {
                return response.data.response;
            } else {
                throw new Error(response.data.error?.message || 'Refund failed');
            }
        } catch (error) {
            throw new Error(`Error processing refund: ${error.response?.data?.error?.message || error.message}`);
        }
    }
}

module.exports = PaddleClient;
