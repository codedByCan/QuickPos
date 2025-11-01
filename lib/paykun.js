const axios = require('axios');
const crypto = require('crypto');

class PayKunClient {
    constructor(config) {
        const requiredFields = ['merchantId', 'accessToken', 'encryptionKey'];
        for (let field of requiredFields) {
            if (!config[field]) throw new Error(`Missing required field: ${field}`);
        }

        this.merchantId = config.merchantId;
        this.accessToken = config.accessToken;
        this.encryptionKey = config.encryptionKey;
        this.baseURL = config.sandbox 
            ? 'https://sandbox.paykun.com/api' 
            : 'https://api.paykun.com';

        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Content-Type': 'application/json',
                'MerchantId': this.merchantId
            }
        });
    }

    async createPayment(options) {
        try {
            const orderId = options.orderId || `ORDER-${Date.now()}`;
            
            const paymentData = {
                merchant_id: this.merchantId,
                access_token: this.accessToken,
                order: {
                    number: orderId,
                    amount: parseFloat(options.amount).toFixed(2),
                    currency: options.currency || 'INR'
                },
                customer: {
                    name: options.name || options.customerName || '',
                    email: options.email || '',
                    mobile: options.phone || ''
                },
                custom_fields: {
                    field1: options.field1 || '',
                    field2: options.field2 || ''
                },
                success_url: options.successUrl || options.callback_link,
                failure_url: options.failureUrl || options.callback_link
            };

            const response = await this.client.post('/payment/initiate', paymentData);

            if (response.data.status && response.data.data) {
                return {
                    status: 'success',
                    data: {
                        url: response.data.data.url,
                        transactionId: response.data.data.transaction_id,
                        orderId: orderId,
                        amount: paymentData.order.amount,
                        currency: paymentData.order.currency
                    }
                };
            } else {
                throw new Error(response.data.errors?.errorMessage || 'Payment creation failed');
            }
        } catch (error) {
            throw new Error(`Payment creation error: ${error.response?.data?.errors?.errorMessage || error.message}`);
        }
    }

    async handleCallback(callbackData) {
        try {
            const transactionId = callbackData.payment_id || callbackData.transaction_id;
            
            if (!transactionId) {
                throw new Error('Transaction ID not found in callback data');
            }

            // Verify payment
            const payment = await this.getTransactionDetails(transactionId);

            // Status mapping
            const statusMapping = {
                'Success': 'success',
                'Pending': 'pending',
                'Failed': 'failed',
                'Refund': 'refunded',
                'Cancelled': 'failed'
            };

            return {
                status: statusMapping[payment.transaction.status] || 'unknown',
                orderId: payment.transaction.order.orderId,
                transactionId: payment.transaction.payment.id,
                amount: parseFloat(payment.transaction.order.gross_amount),
                currency: payment.transaction.order.currency,
                paymentStatus: payment.transaction.status,
                paymentMethod: payment.transaction.payment.method?.type
            };
        } catch (error) {
            throw new Error(`Error in PayKun callback handling: ${error.message}`);
        }
    }

    async getTransactionDetails(transactionId) {
        try {
            const response = await this.client.get(`/payment/${this.merchantId}/${this.accessToken}/${transactionId}`);

            if (response.data.status) {
                return response.data.data;
            } else {
                throw new Error(response.data.errors?.errorMessage || 'Failed to get transaction details');
            }
        } catch (error) {
            throw new Error(`Error getting transaction details: ${error.response?.data?.errors?.errorMessage || error.message}`);
        }
    }

    async refundPayment(transactionId, options = {}) {
        try {
            const refundData = {
                merchant_id: this.merchantId,
                access_token: this.accessToken,
                transaction_id: transactionId,
                amount: options.amount,
                reason: options.reason || 'Customer Request'
            };

            const response = await this.client.post('/payment/refund', refundData);

            if (response.data.status) {
                return response.data.data;
            } else {
                throw new Error(response.data.errors?.errorMessage || 'Refund failed');
            }
        } catch (error) {
            throw new Error(`Error processing refund: ${error.response?.data?.errors?.errorMessage || error.message}`);
        }
    }
}

module.exports = PayKunClient;
