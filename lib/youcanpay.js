const axios = require('axios');
const crypto = require('crypto');

class YouCanPayClient {
    constructor(config) {
        const requiredFields = ['privateKey', 'publicKey'];
        for (let field of requiredFields) {
            if (!config[field]) throw new Error(`Missing required field: ${field}`);
        }

        this.privateKey = config.privateKey;
        this.publicKey = config.publicKey;
        this.baseURL = config.sandbox 
            ? 'https://youcanpay.com/sandbox/api' 
            : 'https://youcanpay.com/api';

        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.privateKey}`
            }
        });
    }

    async createPayment(options) {
        try {
            const orderId = options.orderId || `ORDER-${Date.now()}`;
            
            const paymentData = {
                order_id: orderId,
                amount: Math.round(parseFloat(options.amount) * 100), // Amount in cents
                currency: options.currency || 'MAD',
                customer_name: options.name || options.customerName || '',
                customer_email: options.email || '',
                customer_phone: options.phone || '',
                success_url: options.successUrl || options.callback_link,
                error_url: options.failureUrl || options.callback_link,
                metadata: {
                    description: options.description || 'Payment'
                }
            };

            const response = await this.client.post('/tokenize', paymentData);

            if (response.data.token) {
                return {
                    status: 'success',
                    data: {
                        token: response.data.token,
                        url: `https://youcanpay.com/sandbox/payment/${response.data.token}`,
                        orderId: orderId,
                        amount: paymentData.amount / 100,
                        currency: paymentData.currency
                    }
                };
            } else {
                throw new Error('Failed to create payment token');
            }
        } catch (error) {
            throw new Error(`Payment creation error: ${error.response?.data?.message || error.message}`);
        }
    }

    async handleCallback(callbackData) {
        try {
            const transactionId = callbackData.transaction_id || callbackData.id;
            
            if (!transactionId) {
                throw new Error('Transaction ID not found in callback data');
            }

            // Get transaction details
            const transaction = await this.getTransactionDetails(transactionId);

            // Status mapping
            const statusMapping = {
                'paid': 'success',
                'pending': 'pending',
                'failed': 'failed',
                'refunded': 'refunded',
                'cancelled': 'failed'
            };

            return {
                status: statusMapping[transaction.status] || 'unknown',
                orderId: transaction.order_id,
                transactionId: transaction.id,
                amount: transaction.amount / 100,
                currency: transaction.currency,
                paymentStatus: transaction.status,
                paymentMethod: transaction.payment_method
            };
        } catch (error) {
            throw new Error(`Error in YouCanPay callback handling: ${error.message}`);
        }
    }

    async getTransactionDetails(transactionId) {
        try {
            const response = await this.client.get(`/transactions/${transactionId}`);
            return response.data;
        } catch (error) {
            throw new Error(`Error getting transaction details: ${error.response?.data?.message || error.message}`);
        }
    }

    async refund(transactionId, options = {}) {
        try {
            const refundData = {
                transaction_id: transactionId,
                amount: options.amount ? Math.round(parseFloat(options.amount) * 100) : undefined,
                reason: options.reason || 'Customer Request'
            };

            const response = await this.client.post('/refund', refundData);
            return response.data;
        } catch (error) {
            throw new Error(`Error processing refund: ${error.response?.data?.message || error.message}`);
        }
    }
}

module.exports = YouCanPayClient;
