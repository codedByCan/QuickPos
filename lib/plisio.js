const axios = require('axios');
const crypto = require('crypto');

class PlisioClient {
    constructor(config) {
        const requiredFields = ['apiKey'];
        for (let field of requiredFields) {
            if (!config[field]) throw new Error(`Missing required field: ${field}`);
        }

        this.apiKey = config.apiKey;
        this.URL = 'https://api.plisio.net/api/v1';

        this.client = axios.create({
            baseURL: this.URL,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        this.client.interceptors.response.use(response => {
            return response;
        }, error => {
            if (error.response) {
                throw new Error(`Plisio API error: ${error.response.data.message || error.message}`);
            }
            throw new Error(`Plisio API error: ${error.message}`);
        });
    }

    async createPayment(options) {
        try {
            const params = {
                api_key: this.apiKey,
                order_name: options.orderName || options.name || 'Order',
                order_number: options.orderNumber || options.orderId || `ORDER-${Date.now()}`,
                amount: parseFloat(options.amount),
                currency: options.currency || 'USD',
                source_currency: options.sourceCurrency || options.currency || 'USD',
                source_amount: options.sourceAmount || parseFloat(options.amount),
                callback_url: options.callbackUrl || options.callback_link,
                email: options.email,
                language: options.language || 'en_US'
            };

            // Opsiyonel parametreler
            if (options.plugin) params.plugin = options.plugin;
            if (options.version) params.version = options.version;
            if (options.success_callback) params.success_callback = options.success_callback;
            if (options.fail_callback) params.fail_callback = options.fail_callback;

            const response = await this.client.get('/invoices/new', { params });

            if (response.data.status !== 'success') {
                throw new Error(response.data.message || 'Payment creation failed');
            }

            return {
                status: 'success',
                data: {
                    txnId: response.data.data.txn_id,
                    url: response.data.data.invoice_url,
                    amount: response.data.data.amount,
                    currency: response.data.data.source_currency,
                    orderId: params.order_number
                }
            };
        } catch (error) {
            throw new Error(`Payment creation error: ${error.message}`);
        }
    }

    async getTransactionDetails(txnId) {
        try {
            const params = {
                api_key: this.apiKey,
                id: txnId
            };

            const response = await this.client.get('/operations/invoice', { params });
            
            if (response.data.status !== 'success') {
                throw new Error(response.data.message || 'Failed to get transaction details');
            }

            return response.data.data;
        } catch (error) {
            throw new Error(`Transaction details error: ${error.message}`);
        }
    }

    async getBalance(currency) {
        try {
            const params = {
                api_key: this.apiKey,
                currency: currency || 'BTC'
            };

            const response = await this.client.get('/balances', { params });
            
            if (response.data.status !== 'success') {
                throw new Error(response.data.message || 'Failed to get balance');
            }

            return response.data.data;
        } catch (error) {
            throw new Error(`Balance error: ${error.message}`);
        }
    }

    async handleCallback(callbackData) {
        try {
            const verification = await this.verifyCallback(callbackData);
            
            if (!verification.status) {
                throw new Error(verification.error.message);
            }

            const data = verification.data;
            
            // Status mapping
            const statusMapping = {
                'completed': 'success',
                'pending': 'pending',
                'expired': 'expired',
                'error': 'failed',
                'mismatch': 'failed',
                'cancelled': 'cancelled'
            };

            return {
                status: statusMapping[data.status] || 'unknown',
                orderId: data.order_number,
                txnId: data.txn_id,
                amount: parseFloat(data.amount),
                currency: data.currency,
                sourceCurrency: data.source_currency,
                sourceAmount: parseFloat(data.source_amount),
                paymentStatus: data.status,
                confirmations: data.confirmations || 0
            };
        } catch (error) {
            throw new Error(`Error in Plisio callback handling: ${error.message}`);
        }
    }

    async verifyCallback(data) {
        try {
            // Verify hash signature
            if (data.verify_hash) {
                const expectedHash = this.generateVerifyHash(data);
                
                if (data.verify_hash !== expectedHash) {
                    return {
                        status: false,
                        error: {
                            code: 401,
                            message: 'Invalid verify hash'
                        }
                    };
                }
            }

            // Check if payment is completed
            if (data.status === 'error' || data.status === 'cancelled') {
                return {
                    status: false,
                    error: {
                        code: 400,
                        message: `Payment ${data.status}`
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

    generateVerifyHash(data) {
        // Plisio verify hash generation
        const params = {
            'currency': data.currency || '',
            'order_number': data.order_number || '',
            'order_name': data.order_name || '',
            'source_currency': data.source_currency || '',
            'source_rate': data.source_rate || '',
            'amount': data.amount || '',
            'status': data.status || '',
            'tx_urls': data.tx_urls || '',
            'txn_id': data.txn_id || ''
        };

        const orderedParams = Object.keys(params)
            .sort()
            .map(key => params[key])
            .join('|');

        return crypto
            .createHash('sha1')
            .update(orderedParams + '|' + this.apiKey)
            .digest('hex');
    }

    async getSupportedCurrencies() {
        try {
            const params = {
                api_key: this.apiKey
            };

            const response = await this.client.get('/currencies', { params });
            
            if (response.data.status !== 'success') {
                throw new Error(response.data.message || 'Failed to get currencies');
            }

            return response.data.data;
        } catch (error) {
            throw new Error(`Supported currencies error: ${error.message}`);
        }
    }
}

module.exports = PlisioClient;
