const axios = require('axios');
const crypto = require('crypto');

class OmiseClient {
    constructor(config) {
        const requiredFields = ['publicKey', 'secretKey'];
        for (let field of requiredFields) {
            if (!config[field]) throw new Error(`Missing required field: ${field}`);
        }

        this.publicKey = config.publicKey;
        this.secretKey = config.secretKey;
        this.baseURL = 'https://api.omise.co';

        this.client = axios.create({
            baseURL: this.baseURL,
            auth: {
                username: this.secretKey,
                password: ''
            },
            headers: {
                'Content-Type': 'application/json',
                'Omise-Version': '2019-05-29'
            }
        });
    }

    async createPayment(options) {
        try {
            const orderId = options.orderId || `ORDER-${Date.now()}`;
            
            // Create charge
            const chargeData = {
                amount: Math.round(parseFloat(options.amount) * 100), // Amount in smallest unit (satang for THB)
                currency: options.currency || 'THB',
                description: options.description || options.name || 'Payment',
                metadata: {
                    order_id: orderId,
                    customer_name: options.name || ''
                },
                return_uri: options.successUrl || options.callback_link
            };

            // If source token is provided (for card payments)
            if (options.sourceToken) {
                chargeData.card = options.sourceToken;
            } else if (options.sourceType) {
                // For internet banking, mobile banking, etc.
                chargeData.source = {
                    type: options.sourceType // e.g., 'internet_banking_scb', 'mobile_banking_scb', 'promptpay'
                };
            }

            const response = await this.client.post('/charges', chargeData);

            return {
                status: 'success',
                data: {
                    id: response.data.id,
                    url: response.data.authorize_uri,
                    orderId: orderId,
                    amount: response.data.amount / 100,
                    currency: response.data.currency,
                    status: response.data.status
                }
            };
        } catch (error) {
            throw new Error(`Payment creation error: ${error.response?.data?.message || error.message}`);
        }
    }

    async handleCallback(callbackData) {
        try {
            const chargeId = callbackData.id || callbackData.charge_id;
            
            if (!chargeId) {
                throw new Error('Charge ID not found in callback data');
            }

            // Get charge details
            const charge = await this.getChargeDetails(chargeId);

            // Status mapping
            const statusMapping = {
                'successful': 'success',
                'pending': 'pending',
                'failed': 'failed',
                'reversed': 'refunded',
                'expired': 'failed'
            };

            return {
                status: statusMapping[charge.status] || 'unknown',
                orderId: charge.metadata?.order_id || '',
                transactionId: charge.id,
                amount: charge.amount / 100,
                currency: charge.currency,
                paymentStatus: charge.status,
                refunded: charge.refunded,
                netAmount: charge.net / 100,
                fee: charge.fee / 100
            };
        } catch (error) {
            throw new Error(`Error in Omise callback handling: ${error.message}`);
        }
    }

    async getChargeDetails(chargeId) {
        try {
            const response = await this.client.get(`/charges/${chargeId}`);
            return response.data;
        } catch (error) {
            throw new Error(`Error getting charge details: ${error.response?.data?.message || error.message}`);
        }
    }

    async createRefund(chargeId, options = {}) {
        try {
            const refundData = {
                amount: options.amount ? Math.round(parseFloat(options.amount) * 100) : undefined
            };

            if (options.metadata) {
                refundData.metadata = options.metadata;
            }

            const response = await this.client.post(`/charges/${chargeId}/refunds`, refundData);
            return response.data;
        } catch (error) {
            throw new Error(`Error creating refund: ${error.response?.data?.message || error.message}`);
        }
    }

    async createCustomer(options) {
        try {
            const customerData = {
                email: options.email,
                description: options.description || options.name,
                metadata: options.metadata || {}
            };

            const response = await this.client.post('/customers', customerData);
            return response.data;
        } catch (error) {
            throw new Error(`Error creating customer: ${error.response?.data?.message || error.message}`);
        }
    }
}

module.exports = OmiseClient;
