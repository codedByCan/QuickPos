const axios = require('axios');
const crypto = require('crypto');

class PicPayClient {
    constructor(config) {
        const requiredFields = ['token', 'sellerToken'];
        for (let field of requiredFields) {
            if (!config[field]) throw new Error(`Missing required field: ${field}`);
        }

        this.token = config.token;
        this.sellerToken = config.sellerToken;
        this.baseURL = 'https://appws.picpay.com/ecommerce/public';

        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Content-Type': 'application/json',
                'x-picpay-token': this.token,
                'x-seller-token': this.sellerToken
            }
        });
    }

    async createPayment(options) {
        try {
            const orderId = options.orderId || `ORDER-${Date.now()}`;
            
            const paymentData = {
                referenceId: orderId,
                callbackUrl: options.callbackUrl || options.callback_link,
                returnUrl: options.successUrl || options.callback_link,
                value: parseFloat(options.amount),
                expiresAt: options.expiresAt || new Date(Date.now() + 24*60*60*1000).toISOString(),
                buyer: {
                    firstName: options.firstName || options.name?.split(' ')[0] || '',
                    lastName: options.lastName || options.name?.split(' ').slice(1).join(' ') || '',
                    document: options.document || '',
                    email: options.email || '',
                    phone: options.phone || ''
                }
            };

            const response = await this.client.post('/payments', paymentData);

            return {
                status: 'success',
                data: {
                    referenceId: orderId,
                    paymentUrl: response.data.paymentUrl,
                    qrcode: response.data.qrcode,
                    amount: paymentData.value,
                    currency: 'BRL',
                    expiresAt: response.data.expiresAt
                }
            };
        } catch (error) {
            throw new Error(`Payment creation error: ${error.response?.data?.message || error.message}`);
        }
    }

    async handleCallback(callbackData) {
        try {
            const referenceId = callbackData.referenceId;
            
            if (!referenceId) {
                throw new Error('Reference ID not found in callback data');
            }

            // Get payment status
            const payment = await this.getPaymentStatus(referenceId);

            // Status mapping
            const statusMapping = {
                'paid': 'success',
                'completed': 'success',
                'analysis': 'pending',
                'created': 'pending',
                'expired': 'failed',
                'refunded': 'refunded',
                'chargeback': 'disputed'
            };

            return {
                status: statusMapping[payment.status] || 'unknown',
                orderId: payment.referenceId,
                transactionId: payment.authorizationId,
                amount: parseFloat(payment.value),
                currency: 'BRL',
                paymentStatus: payment.status
            };
        } catch (error) {
            throw new Error(`Error in PicPay callback handling: ${error.message}`);
        }
    }

    async getPaymentStatus(referenceId) {
        try {
            const response = await this.client.get(`/payments/${referenceId}/status`);
            return response.data;
        } catch (error) {
            throw new Error(`Error getting payment status: ${error.response?.data?.message || error.message}`);
        }
    }

    async cancelPayment(referenceId, authorizationId) {
        try {
            const response = await this.client.post(`/payments/${referenceId}/cancellations`, {
                authorizationId: authorizationId
            });

            return response.data;
        } catch (error) {
            throw new Error(`Error canceling payment: ${error.response?.data?.message || error.message}`);
        }
    }
}

module.exports = PicPayClient;
