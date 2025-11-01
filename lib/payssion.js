const axios = require('axios');
const crypto = require('crypto');

class PayssionClient {
    constructor(config) {
        const requiredFields = ['apiKey', 'secretKey'];
        for (let field of requiredFields) {
            if (!config[field]) throw new Error(`Missing required field: ${field}`);
        }

        this.apiKey = config.apiKey;
        this.secretKey = config.secretKey;
        this.baseURL = config.sandbox 
            ? 'https://sandbox.payssion.com/api/v1' 
            : 'https://www.payssion.com/api/v1';

        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    generateSignature(params) {
        const sorted = Object.keys(params).sort().reduce((acc, key) => {
            if (params[key]) acc[key] = params[key];
            return acc;
        }, {});

        const signatureString = Object.entries(sorted)
            .map(([key, value]) => `${key}=${value}`)
            .join('|');

        return crypto
            .createHash('md5')
            .update(signatureString + '|' + this.secretKey)
            .digest('hex');
    }

    async createPayment(options) {
        try {
            const orderId = options.orderId || `ORDER-${Date.now()}`;
            
            const params = {
                api_key: this.apiKey,
                pm_id: options.paymentMethod || 'boleto_br', // Payment method ID
                amount: parseFloat(options.amount).toFixed(2),
                currency: options.currency || 'USD',
                description: options.description || options.name || 'Payment',
                order_id: orderId,
                return_url: options.successUrl || options.callback_link,
                notify_url: options.callbackUrl || options.callback_link
            };

            params.api_sig = this.generateSignature(params);

            const response = await this.client.post('/payment/create', params);

            if (response.data.result_code === 200) {
                return {
                    status: 'success',
                    data: {
                        transactionId: response.data.transaction.transaction_id,
                        url: response.data.transaction.redirect_url,
                        orderId: orderId,
                        amount: params.amount,
                        currency: params.currency,
                        state: response.data.transaction.state
                    }
                };
            } else {
                throw new Error(response.data.description || 'Payment creation failed');
            }
        } catch (error) {
            throw new Error(`Payment creation error: ${error.response?.data?.description || error.message}`);
        }
    }

    async handleCallback(callbackData) {
        try {
            const verification = await this.verifyCallback(callbackData);
            
            if (!verification.status) {
                throw new Error(verification.error.message);
            }

            // Get transaction details
            const transaction = await this.getTransactionDetails(callbackData.transaction_id);

            // Status mapping
            const statusMapping = {
                'completed': 'success',
                'paid_partial': 'pending',
                'pending': 'pending',
                'failed': 'failed',
                'expired': 'failed',
                'refund': 'refunded',
                'cancelled': 'failed'
            };

            return {
                status: statusMapping[transaction.state] || 'unknown',
                orderId: transaction.order_id,
                transactionId: transaction.transaction_id,
                amount: parseFloat(transaction.amount),
                currency: transaction.currency,
                paymentStatus: transaction.state,
                paidAmount: parseFloat(transaction.paid || 0)
            };
        } catch (error) {
            throw new Error(`Error in Payssion callback handling: ${error.message}`);
        }
    }

    async verifyCallback(data) {
        try {
            const receivedSig = data.notify_sig;
            const params = {
                api_key: this.apiKey,
                transaction_id: data.transaction_id,
                order_id: data.order_id,
                state: data.state,
                amount: data.amount,
                currency: data.currency
            };

            const expectedSig = this.generateSignature(params);

            if (receivedSig !== expectedSig) {
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

    async getTransactionDetails(transactionId) {
        try {
            const params = {
                api_key: this.apiKey,
                transaction_id: transactionId
            };

            params.api_sig = this.generateSignature(params);

            const response = await this.client.post('/payment/details', params);

            if (response.data.result_code === 200) {
                return response.data.transaction;
            } else {
                throw new Error(response.data.description || 'Failed to get transaction details');
            }
        } catch (error) {
            throw new Error(`Error getting transaction details: ${error.response?.data?.description || error.message}`);
        }
    }
}

module.exports = PayssionClient;
