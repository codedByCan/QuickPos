const axios = require('axios');
const crypto = require('crypto');

class CoinbaseCommerceClient {
    constructor(config) {
        const requiredFields = ['apiKey'];
        for (let field of requiredFields) {
            if (!config[field]) throw new Error(`Missing required field: ${field}`);
        }

        this.apiKey = config.apiKey;
        this.webhookSecret = config.webhookSecret || '';
        this.baseURL = 'https://api.commerce.coinbase.com';

        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Content-Type': 'application/json',
                'X-CC-Api-Key': this.apiKey,
                'X-CC-Version': '2018-03-22'
            }
        });
    }

    async createPayment(options) {
        try {
            const orderId = options.orderId || `ORDER-${Date.now()}`;
            
            const chargeData = {
                name: options.name || 'Payment',
                description: options.description || 'Payment description',
                pricing_type: 'fixed_price',
                local_price: {
                    amount: parseFloat(options.amount).toFixed(2),
                    currency: options.currency || 'USD'
                },
                metadata: {
                    order_id: orderId,
                    customer_email: options.email || '',
                    customer_name: options.customerName || ''
                },
                redirect_url: options.successUrl || options.callback_link,
                cancel_url: options.failUrl || options.callback_link
            };

            const response = await this.client.post('/charges', chargeData);

            return {
                status: 'success',
                data: {
                    id: response.data.data.id,
                    code: response.data.data.code,
                    url: response.data.data.hosted_url,
                    orderId: orderId,
                    amount: response.data.data.pricing.local.amount,
                    currency: response.data.data.pricing.local.currency,
                    addresses: response.data.data.addresses,
                    expiresAt: response.data.data.expires_at
                }
            };
        } catch (error) {
            throw new Error(`Payment creation error: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    async handleCallback(callbackData, signature) {
        try {
            // Verify webhook signature
            if (this.webhookSecret && signature) {
                const verification = this.verifyWebhook(callbackData, signature);
                if (!verification) {
                    throw new Error('Invalid webhook signature');
                }
            }

            const event = callbackData.event;
            const charge = event.data;

            // Status mapping based on event type
            const statusMapping = {
                'charge:confirmed': 'success',
                'charge:resolved': 'success',
                'charge:pending': 'pending',
                'charge:failed': 'failed',
                'charge:delayed': 'pending'
            };

            return {
                status: statusMapping[event.type] || 'unknown',
                orderId: charge.metadata?.order_id,
                transactionId: charge.id,
                code: charge.code,
                amount: parseFloat(charge.pricing?.local?.amount || 0),
                currency: charge.pricing?.local?.currency,
                paymentStatus: event.type,
                timeline: charge.timeline,
                payments: charge.payments
            };
        } catch (error) {
            throw new Error(`Error in Coinbase Commerce callback handling: ${error.message}`);
        }
    }

    verifyWebhook(payload, signature) {
        try {
            const computedSignature = crypto
                .createHmac('sha256', this.webhookSecret)
                .update(JSON.stringify(payload))
                .digest('hex');

            return computedSignature === signature;
        } catch (error) {
            return false;
        }
    }

    async getCharge(chargeId) {
        try {
            const response = await this.client.get(`/charges/${chargeId}`);
            return response.data.data;
        } catch (error) {
            throw new Error(`Error fetching charge: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    async listCharges(options = {}) {
        try {
            const params = {
                limit: options.limit || 25,
                order: options.order || 'desc'
            };

            const response = await this.client.get('/charges', { params });
            return response.data;
        } catch (error) {
            throw new Error(`Error listing charges: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    async cancelCharge(chargeId) {
        try {
            const response = await this.client.post(`/charges/${chargeId}/cancel`);
            return response.data.data;
        } catch (error) {
            throw new Error(`Error canceling charge: ${error.response?.data?.error?.message || error.message}`);
        }
    }
}

module.exports = CoinbaseCommerceClient;
