const axios = require('axios');
const crypto = require('crypto');

class PayriffClient {
    constructor(config) {
        const requiredFields = ['merchantId', 'secretKey'];
        for (let field of requiredFields) {
            if (!config[field]) throw new Error(`Missing required field: ${field}`);
        }

        this.merchantId = config.merchantId;
        this.secretKey = config.secretKey;
        this.baseURL = 'https://api.payriff.com';

        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    generateSignature(data) {
        const signatureString = `${data.merchant}${data.order}${data.amount}${data.currency}${this.secretKey}`;
        return crypto.createHash('sha256').update(signatureString).digest('hex').toUpperCase();
    }

    async createPayment(options) {
        try {
            const orderId = options.orderId || `ORDER-${Date.now()}`;
            const amount = parseFloat(options.amount);
            
            const paymentData = {
                merchant: this.merchantId,
                order: orderId,
                amount: amount,
                currency: options.currency || 'AZN',
                description: options.description || options.name || 'Payment',
                approveURL: options.successUrl || options.callback_link,
                cancelURL: options.failUrl || options.callback_link,
                declineURL: options.failUrl || options.callback_link,
                callbackURL: options.callbackUrl || options.callback_link,
                language: options.language || 'AZ'
            };

            paymentData.signature = this.generateSignature(paymentData);

            const response = await this.client.post('/api/v2/createOrder', paymentData);

            if (response.data.code === 1) {
                return {
                    status: 'success',
                    data: {
                        url: response.data.payload.redirect,
                        orderId: orderId,
                        sessionId: response.data.payload.sessionId,
                        amount: amount,
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
                'APPROVED': 'success',
                'DECLINED': 'failed',
                'CANCELLED': 'failed',
                'PENDING': 'pending'
            };

            return {
                status: statusMapping[callbackData.status] || 'unknown',
                orderId: callbackData.order,
                transactionId: callbackData.rrn || callbackData.sessionId,
                amount: parseFloat(callbackData.amount),
                currency: callbackData.currency,
                paymentStatus: callbackData.status,
                cardNumber: callbackData.cardNumber
            };
        } catch (error) {
            throw new Error(`Error in Payriff callback handling: ${error.message}`);
        }
    }

    async verifyCallback(data) {
        try {
            const receivedSign = data.signature;
            const expectedSign = this.generateSignature({
                merchant: data.merchant,
                order: data.order,
                amount: data.amount,
                currency: data.currency
            });

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

    async getOrderStatus(orderId) {
        try {
            const response = await this.client.post('/api/v2/getOrderStatus', {
                merchant: this.merchantId,
                order: orderId
            });

            return response.data;
        } catch (error) {
            throw new Error(`Error getting order status: ${error.response?.data?.message || error.message}`);
        }
    }
}

module.exports = PayriffClient;
