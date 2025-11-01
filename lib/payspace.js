const axios = require('axios');
const crypto = require('crypto');

class PaySpaceClient {
    constructor(config) {
        const requiredFields = ['merchantId', 'apiKey'];
        for (let field of requiredFields) {
            if (!config[field]) throw new Error(`Missing required field: ${field}`);
        }

        this.merchantId = config.merchantId;
        this.apiKey = config.apiKey;
        this.baseURL = 'https://api.payspace.com';

        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            }
        });
    }

    generateSignature(data) {
        const signatureString = Object.keys(data)
            .filter(key => key !== 'signature')
            .sort()
            .map(key => `${key}=${data[key]}`)
            .join('&');
        
        return crypto
            .createHash('sha256')
            .update(signatureString + this.apiKey)
            .digest('hex');
    }

    async createPayment(options) {
        try {
            const orderId = options.orderId || `ORDER-${Date.now()}`;
            
            const paymentData = {
                merchant_id: this.merchantId,
                order_id: orderId,
                amount: parseFloat(options.amount),
                currency: options.currency || 'ZAR',
                description: options.description || options.name || 'Payment',
                return_url: options.successUrl || options.callback_link,
                cancel_url: options.failUrl || options.callback_link,
                notify_url: options.callbackUrl || options.callback_link,
                customer_email: options.email || '',
                customer_name: options.name || '',
                customer_phone: options.phone || ''
            };

            paymentData.signature = this.generateSignature(paymentData);

            const response = await this.client.post('/v1/payments', paymentData);

            if (response.data.success) {
                return {
                    status: 'success',
                    data: {
                        url: response.data.payment_url,
                        orderId: orderId,
                        paymentId: response.data.payment_id,
                        amount: paymentData.amount,
                        currency: paymentData.currency
                    }
                };
            } else {
                throw new Error(response.data.message || 'Payment creation failed');
            }
        } catch (error) {
            throw new Error(`Payment creation error: ${error.response?.data?.message || error.message}`);
        }
    }

    async handleCallback(callbackData) {
        try {
            const verification = await this.verifyCallback(callbackData);
            
            if (!verification.status) {
                throw new Error(verification.error.message);
            }

            // Status mapping
            const statusMapping = {
                'completed': 'success',
                'successful': 'success',
                'failed': 'failed',
                'cancelled': 'failed',
                'pending': 'pending',
                'processing': 'pending'
            };

            return {
                status: statusMapping[callbackData.status.toLowerCase()] || 'unknown',
                orderId: callbackData.order_id,
                transactionId: callbackData.payment_id || callbackData.transaction_id,
                amount: parseFloat(callbackData.amount),
                currency: callbackData.currency,
                paymentStatus: callbackData.status,
                paymentMethod: callbackData.payment_method
            };
        } catch (error) {
            throw new Error(`Error in PaySpace callback handling: ${error.message}`);
        }
    }

    async verifyCallback(data) {
        try {
            const receivedSign = data.signature;
            const dataToVerify = { ...data };
            delete dataToVerify.signature;

            const expectedSign = this.generateSignature(dataToVerify);

            if (receivedSign !== expectedSign) {
                return {
                    status: false,
                    error: {
                        code: 401,
                        message: 'Invalid signature'
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

    async getPaymentStatus(paymentId) {
        try {
            const response = await this.client.get(`/v1/payments/${paymentId}`);
            return response.data;
        } catch (error) {
            throw new Error(`Error getting payment status: ${error.response?.data?.message || error.message}`);
        }
    }

    async refundPayment(paymentId, options = {}) {
        try {
            const refundData = {
                payment_id: paymentId,
                amount: options.amount,
                reason: options.reason || 'Customer request'
            };

            const response = await this.client.post('/v1/refunds', refundData);
            return response.data;
        } catch (error) {
            throw new Error(`Error creating refund: ${error.response?.data?.message || error.message}`);
        }
    }
}

module.exports = PaySpaceClient;
