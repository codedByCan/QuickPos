const axios = require('axios');
const crypto = require('crypto');

class PayoneerClient {
    constructor(config) {
        const requiredFields = ['programId', 'username', 'password'];
        for (let field of requiredFields) {
            if (!config[field]) throw new Error(`Missing required field: ${field}`);
        }

        this.programId = config.programId;
        this.username = config.username;
        this.password = config.password;
        this.baseURL = config.sandbox 
            ? 'https://api.sandbox.payoneer.com' 
            : 'https://api.payoneer.com';

        this.client = axios.create({
            baseURL: this.baseURL,
            auth: {
                username: this.username,
                password: this.password
            },
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    async createPayment(options) {
        try {
            const payeeId = options.payeeId || options.email;
            const orderId = options.orderId || `ORDER-${Date.now()}`;
            
            const paymentData = {
                program_id: this.programId,
                payee_id: payeeId,
                payment_id: orderId,
                amount: parseFloat(options.amount),
                currency: options.currency || 'USD',
                description: options.description || options.name || 'Payment',
                payee_email: options.email,
                payee_first_name: options.firstName || '',
                payee_last_name: options.lastName || ''
            };

            const response = await this.client.post('/v2/payments', paymentData);

            return {
                status: 'success',
                data: {
                    paymentId: orderId,
                    payeeId: payeeId,
                    amount: paymentData.amount,
                    currency: paymentData.currency,
                    status: response.data.status,
                    paymentStatus: response.data.payment_status
                }
            };
        } catch (error) {
            throw new Error(`Payment creation error: ${error.response?.data?.error || error.message}`);
        }
    }

    async handleCallback(callbackData) {
        try {
            // Payoneer typically doesn't use callbacks but status checks
            const paymentId = callbackData.payment_id || callbackData.paymentId;
            
            if (!paymentId) {
                throw new Error('Payment ID not found in callback data');
            }

            // Get payment status
            const payment = await this.getPaymentStatus(paymentId);

            // Status mapping
            const statusMapping = {
                'Done': 'success',
                'Completed': 'success',
                'Pending': 'pending',
                'Canceled': 'failed',
                'Failed': 'failed'
            };

            return {
                status: statusMapping[payment.status] || 'unknown',
                orderId: payment.payment_id,
                transactionId: payment.payment_id,
                amount: parseFloat(payment.amount),
                currency: payment.currency,
                paymentStatus: payment.status,
                payeeId: payment.payee_id
            };
        } catch (error) {
            throw new Error(`Error in Payoneer callback handling: ${error.message}`);
        }
    }

    async getPaymentStatus(paymentId) {
        try {
            const response = await this.client.get(`/v2/payments/${paymentId}`);
            return response.data;
        } catch (error) {
            throw new Error(`Error getting payment status: ${error.response?.data?.error || error.message}`);
        }
    }

    async getPayeeDetails(payeeId) {
        try {
            const response = await this.client.get(`/v2/payees/${payeeId}`);
            return response.data;
        } catch (error) {
            throw new Error(`Error getting payee details: ${error.response?.data?.error || error.message}`);
        }
    }

    async cancelPayment(paymentId) {
        try {
            const response = await this.client.delete(`/v2/payments/${paymentId}`);
            return response.data;
        } catch (error) {
            throw new Error(`Error canceling payment: ${error.response?.data?.error || error.message}`);
        }
    }
}

module.exports = PayoneerClient;
