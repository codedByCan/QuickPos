const axios = require('axios');
const crypto = require('crypto');

class PortWalletClient {
    constructor(config) {
        const requiredFields = ['apiKey', 'merchantId'];
        for (let field of requiredFields) {
            if (!config[field]) throw new Error(`Missing required field: ${field}`);
        }

        this.apiKey = config.apiKey;
        this.merchantId = config.merchantId;
        this.secretKey = config.secretKey || '';
        this.baseURL = 'https://api.portwallet.com';

        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            }
        });
    }

    generateSignature(data) {
        if (!this.secretKey) return '';
        
        const signatureString = Object.keys(data)
            .sort()
            .map(key => `${key}=${data[key]}`)
            .join('&');
        
        return crypto
            .createHmac('sha256', this.secretKey)
            .update(signatureString)
            .digest('hex');
    }

    async createPayment(options) {
        try {
            const orderId = options.orderId || `ORDER-${Date.now()}`;
            
            const paymentData = {
                merchant_id: this.merchantId,
                order_id: orderId,
                amount: parseFloat(options.amount),
                currency: options.currency || 'USD',
                description: options.description || options.name || 'Payment',
                return_url: options.successUrl || options.callback_link,
                cancel_url: options.failUrl || options.callback_link,
                callback_url: options.callbackUrl || options.callback_link,
                customer_email: options.email || '',
                customer_name: options.name || ''
            };

            if (this.secretKey) {
                paymentData.signature = this.generateSignature(paymentData);
            }

            const response = await this.client.post('/v1/payments', paymentData);

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
        } catch (error) {
            throw new Error(`Payment creation error: ${error.response?.data?.message || error.message}`);
        }
    }

    async handleCallback(callbackData) {
        try {
            if (this.secretKey) {
                const verification = await this.verifyCallback(callbackData);
                
                if (!verification.status) {
                    throw new Error(verification.error.message);
                }
            }

            // Status mapping
            const statusMapping = {
                'completed': 'success',
                'success': 'success',
                'failed': 'failed',
                'cancelled': 'failed',
                'pending': 'pending'
            };

            return {
                status: statusMapping[callbackData.status] || 'unknown',
                orderId: callbackData.order_id,
                transactionId: callbackData.payment_id,
                amount: parseFloat(callbackData.amount),
                currency: callbackData.currency,
                paymentStatus: callbackData.status
            };
        } catch (error) {
            throw new Error(`Error in PortWallet callback handling: ${error.message}`);
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
}

module.exports = PortWalletClient;
