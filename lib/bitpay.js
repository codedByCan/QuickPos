const axios = require('axios');
const crypto = require('crypto');

class BitPayClient {
    constructor(config) {
        const requiredFields = ['apiToken'];
        for (let field of requiredFields) {
            if (!config[field]) throw new Error(`Missing required field: ${field}`);
        }

        this.apiToken = config.apiToken;
        this.environment = config.environment || 'test'; // 'test' or 'prod'
        this.baseURL = this.environment === 'prod' 
            ? 'https://bitpay.com' 
            : 'https://test.bitpay.com';

        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Content-Type': 'application/json',
                'X-Accept-Version': '2.0.0',
                'Authorization': `Bearer ${this.apiToken}`
            }
        });
    }

    async createPayment(options) {
        try {
            const orderId = options.orderId || `ORDER-${Date.now()}`;
            
            const invoiceData = {
                price: parseFloat(options.amount),
                currency: options.currency || 'USD',
                orderId: orderId,
                itemDesc: options.description || options.name || 'Payment',
                notificationURL: options.callbackUrl || options.callback_link,
                redirectURL: options.successUrl || options.callback_link,
                buyer: {
                    email: options.email || '',
                    name: options.name || ''
                }
            };

            const response = await this.client.post('/invoices', invoiceData);

            return {
                status: 'success',
                data: {
                    invoiceId: response.data.data.id,
                    url: response.data.data.url,
                    orderId: orderId,
                    amount: response.data.data.price,
                    currency: response.data.data.currency,
                    status: response.data.data.status
                }
            };
        } catch (error) {
            throw new Error(`Payment creation error: ${error.response?.data?.error || error.message}`);
        }
    }

    async handleCallback(callbackData) {
        try {
            const invoiceId = callbackData.id || callbackData.data?.id;
            
            if (!invoiceId) {
                throw new Error('Invoice ID not found in callback data');
            }

            // Get invoice details
            const invoice = await this.getInvoice(invoiceId);

            // Status mapping
            const statusMapping = {
                'confirmed': 'success',
                'complete': 'success',
                'paid': 'success',
                'new': 'pending',
                'expired': 'failed',
                'invalid': 'failed'
            };

            return {
                status: statusMapping[invoice.status.toLowerCase()] || 'unknown',
                orderId: invoice.orderId,
                transactionId: invoice.id,
                amount: parseFloat(invoice.price),
                currency: invoice.currency,
                paymentStatus: invoice.status,
                exceptionStatus: invoice.exceptionStatus
            };
        } catch (error) {
            throw new Error(`Error in BitPay callback handling: ${error.message}`);
        }
    }

    async getInvoice(invoiceId) {
        try {
            const response = await this.client.get(`/invoices/${invoiceId}`);
            return response.data.data;
        } catch (error) {
            throw new Error(`Error fetching invoice: ${error.response?.data?.error || error.message}`);
        }
    }

    async refundInvoice(invoiceId, options = {}) {
        try {
            const refundData = {
                amount: options.amount,
                currency: options.currency,
                preview: options.preview || false
            };

            const response = await this.client.post(`/invoices/${invoiceId}/refunds`, refundData);
            return response.data.data;
        } catch (error) {
            throw new Error(`Error creating refund: ${error.response?.data?.error || error.message}`);
        }
    }
}

module.exports = BitPayClient;
