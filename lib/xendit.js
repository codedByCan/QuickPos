const axios = require('axios');
const crypto = require('crypto');

class XenditClient {
    constructor(config) {
        const requiredFields = ['apiKey'];
        for (let field of requiredFields) {
            if (!config[field]) throw new Error(`Missing required field: ${field}`);
        }

        this.apiKey = config.apiKey;
        this.webhookToken = config.webhookToken;
        this.baseURL = 'https://api.xendit.co';

        this.client = axios.create({
            baseURL: this.baseURL,
            auth: {
                username: this.apiKey,
                password: ''
            },
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    async createPayment(options) {
        try {
            const orderId = options.orderId || `ORDER-${Date.now()}`;
            
            // Xendit supports multiple payment methods
            const paymentMethod = options.paymentMethod || 'invoice'; // invoice, ewallet, va, qr, card

            let response;

            if (paymentMethod === 'invoice') {
                response = await this.createInvoice(options, orderId);
            } else if (paymentMethod === 'ewallet') {
                response = await this.createEWallet(options, orderId);
            } else if (paymentMethod === 'va') {
                response = await this.createVirtualAccount(options, orderId);
            } else {
                throw new Error(`Unsupported payment method: ${paymentMethod}`);
            }

            return response;
        } catch (error) {
            throw new Error(`Payment creation error: ${error.response?.data?.message || error.message}`);
        }
    }

    async createInvoice(options, orderId) {
        const invoiceData = {
            external_id: orderId,
            amount: parseFloat(options.amount),
            payer_email: options.email || '',
            description: options.description || options.name || 'Payment',
            currency: options.currency || 'IDR',
            success_redirect_url: options.successUrl || options.callback_link,
            failure_redirect_url: options.failureUrl || options.callback_link,
            customer: {
                given_names: options.name || '',
                email: options.email || '',
                mobile_number: options.phone || ''
            },
            items: options.items || [{
                name: options.name || 'Payment',
                quantity: 1,
                price: parseFloat(options.amount)
            }]
        };

        const response = await this.client.post('/v2/invoices', invoiceData);

        return {
            status: 'success',
            data: {
                id: response.data.id,
                url: response.data.invoice_url,
                orderId: orderId,
                amount: response.data.amount,
                currency: response.data.currency,
                status: response.data.status
            }
        };
    }

    async createEWallet(options, orderId) {
        const ewalletData = {
            reference_id: orderId,
            currency: options.currency || 'IDR',
            amount: parseFloat(options.amount),
            checkout_method: 'ONE_TIME_PAYMENT',
            channel_code: options.ewalletType || 'ID_OVO', // ID_OVO, ID_DANA, ID_LINKAJA, PH_GCASH, etc.
            channel_properties: {
                success_redirect_url: options.successUrl || options.callback_link,
                failure_redirect_url: options.failureUrl || options.callback_link,
                mobile_number: options.phone || ''
            },
            metadata: {
                order_id: orderId
            }
        };

        const response = await this.client.post('/ewallets/charges', ewalletData);

        return {
            status: 'success',
            data: {
                id: response.data.id,
                url: response.data.actions?.desktop_web_checkout_url || response.data.actions?.mobile_web_checkout_url,
                orderId: orderId,
                amount: response.data.charge_amount,
                currency: response.data.currency,
                status: response.data.status
            }
        };
    }

    async createVirtualAccount(options, orderId) {
        const vaData = {
            external_id: orderId,
            bank_code: options.bankCode || 'BNI', // BNI, BRI, MANDIRI, PERMATA, etc.
            name: options.name || 'Customer',
            expected_amount: parseFloat(options.amount),
            is_closed: true,
            expiration_date: options.expirationDate || new Date(Date.now() + 24*60*60*1000).toISOString()
        };

        const response = await this.client.post('/callback_virtual_accounts', vaData);

        return {
            status: 'success',
            data: {
                id: response.data.id,
                accountNumber: response.data.account_number,
                bankCode: response.data.bank_code,
                orderId: orderId,
                amount: response.data.expected_amount,
                currency: 'IDR'
            }
        };
    }

    async handleCallback(callbackData) {
        try {
            // Verify webhook token if provided
            if (this.webhookToken && callbackData.callback_token !== this.webhookToken) {
                throw new Error('Invalid webhook token');
            }

            // Different callback structures for different payment methods
            let orderId, transactionId, amount, currency, paymentStatus;

            if (callbackData.external_id) {
                // Invoice or VA callback
                orderId = callbackData.external_id;
                transactionId = callbackData.id;
                amount = parseFloat(callbackData.amount || callbackData.paid_amount);
                currency = callbackData.currency || 'IDR';
                paymentStatus = callbackData.status;
            } else if (callbackData.reference_id) {
                // E-wallet callback
                orderId = callbackData.data?.reference_id || callbackData.reference_id;
                transactionId = callbackData.id || callbackData.data?.id;
                amount = parseFloat(callbackData.data?.charge_amount || callbackData.charge_amount);
                currency = callbackData.data?.currency || callbackData.currency || 'IDR';
                paymentStatus = callbackData.data?.status || callbackData.status;
            }

            // Status mapping
            const statusMapping = {
                'PAID': 'success',
                'SETTLED': 'success',
                'SUCCEEDED': 'success',
                'PENDING': 'pending',
                'ACTIVE': 'pending',
                'EXPIRED': 'failed',
                'FAILED': 'failed',
                'VOIDED': 'failed'
            };

            return {
                status: statusMapping[paymentStatus] || 'unknown',
                orderId: orderId,
                transactionId: transactionId,
                amount: amount,
                currency: currency,
                paymentStatus: paymentStatus
            };
        } catch (error) {
            throw new Error(`Error in Xendit callback handling: ${error.message}`);
        }
    }

    async getInvoice(invoiceId) {
        try {
            const response = await this.client.get(`/v2/invoices/${invoiceId}`);
            return response.data;
        } catch (error) {
            throw new Error(`Error getting invoice: ${error.response?.data?.message || error.message}`);
        }
    }
}

module.exports = XenditClient;
