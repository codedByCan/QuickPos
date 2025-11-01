const axios = require('axios');
const crypto = require('crypto');

class CoinGateClient {
    constructor(config) {
        const requiredFields = ['apiKey'];
        for (let field of requiredFields) {
            if (!config[field]) throw new Error(`Missing required field: ${field}`);
        }

        this.apiKey = config.apiKey;
        this.environment = config.environment || 'live'; // 'sandbox' or 'live'
        this.baseURL = this.environment === 'sandbox' 
            ? 'https://api-sandbox.coingate.com/v2' 
            : 'https://api.coingate.com/v2';

        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${this.apiKey}`
            }
        });
    }

    async createPayment(options) {
        try {
            const orderId = options.orderId || `ORDER-${Date.now()}`;
            
            const orderData = {
                order_id: orderId,
                price_amount: parseFloat(options.amount),
                price_currency: options.currency || 'USD',
                receive_currency: options.receiveCurrency || options.currency || 'USD',
                title: options.title || options.name || 'Payment',
                description: options.description || '',
                callback_url: options.callbackUrl || options.callback_link,
                cancel_url: options.failUrl || options.callback_link,
                success_url: options.successUrl || options.callback_link,
                purchaser_email: options.email || '',
                token: options.token || 'DO_NOT_CONVERT'
            };

            const response = await this.client.post('/orders', orderData);

            return {
                status: 'success',
                data: {
                    id: response.data.id,
                    url: response.data.payment_url,
                    orderId: orderId,
                    amount: response.data.price_amount,
                    currency: response.data.price_currency,
                    status: response.data.status,
                    payAmount: response.data.pay_amount,
                    payCurrency: response.data.pay_currency
                }
            };
        } catch (error) {
            throw new Error(`Payment creation error: ${error.response?.data?.message || error.message}`);
        }
    }

    async handleCallback(callbackData) {
        try {
            const orderId = callbackData.id || callbackData.order_id;
            
            if (!orderId) {
                throw new Error('Order ID not found in callback data');
            }

            // Get order details for verification
            const order = await this.getOrder(orderId);

            // Status mapping
            const statusMapping = {
                'paid': 'success',
                'confirmed': 'success',
                'pending': 'pending',
                'expired': 'failed',
                'canceled': 'failed',
                'refunded': 'refunded',
                'invalid': 'failed'
            };

            return {
                status: statusMapping[order.status] || 'unknown',
                orderId: order.order_id,
                transactionId: order.id.toString(),
                amount: parseFloat(order.price_amount),
                currency: order.price_currency,
                paymentStatus: order.status,
                payAmount: order.pay_amount,
                payCurrency: order.pay_currency,
                receiveAmount: order.receive_amount,
                receiveCurrency: order.receive_currency
            };
        } catch (error) {
            throw new Error(`Error in CoinGate callback handling: ${error.message}`);
        }
    }

    async getOrder(orderId) {
        try {
            const response = await this.client.get(`/orders/${orderId}`);
            return response.data;
        } catch (error) {
            throw new Error(`Error fetching order: ${error.response?.data?.message || error.message}`);
        }
    }

    async listOrders(options = {}) {
        try {
            const params = {
                sort: options.sort || 'created_at_desc',
                per_page: options.perPage || 100,
                page: options.page || 1
            };

            const response = await this.client.get('/orders', { params });
            return response.data;
        } catch (error) {
            throw new Error(`Error listing orders: ${error.response?.data?.message || error.message}`);
        }
    }

    async getExchangeRate(from, to) {
        try {
            const response = await this.client.get(`/rates/merchant/${from}/${to}`);
            return parseFloat(response.data);
        } catch (error) {
            throw new Error(`Error getting exchange rate: ${error.response?.data?.message || error.message}`);
        }
    }
}

module.exports = CoinGateClient;
