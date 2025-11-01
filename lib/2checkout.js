const axios = require('axios');
const crypto = require('crypto');

class TwoCheckoutClient {
    constructor(config) {
        const requiredFields = ['merchantCode', 'secretKey'];
        for (let field of requiredFields) {
            if (!config[field]) throw new Error(`Missing required field: ${field}`);
        }

        this.merchantCode = config.merchantCode;
        this.secretKey = config.secretKey;
        this.baseURL = config.sandbox 
            ? 'https://api.sandbox.2checkout.com' 
            : 'https://api.2checkout.com';

        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    generateSignature(params) {
        const signatureString = Object.keys(params)
            .sort()
            .map(key => params[key].length + params[key])
            .join('');
        
        return crypto
            .createHmac('sha256', this.secretKey)
            .update(signatureString)
            .digest('hex');
    }

    async createPayment(options) {
        try {
            const orderId = options.orderId || `ORDER-${Date.now()}`;
            const timestamp = new Date().toISOString();
            
            const params = {
                'merchant': this.merchantCode,
                'dynamic': '1',
                'return-url': options.successUrl || options.callback_link,
                'return-type': 'redirect',
                'expiration': timestamp,
                'order-ext-ref': orderId,
                'item-ext-ref': orderId,
                'customer-ext-ref': options.customerId || '',
                'currency': options.currency || 'USD',
                'language': options.language || 'en',
                'test': options.sandbox ? '1' : '0',
                'prod-name[0]': options.name || 'Payment',
                'prod-type[0]': 'PRODUCT',
                'prod-price[0]': parseFloat(options.amount).toString(),
                'prod-qty[0]': '1',
                'prod-description[0]': options.description || '',
                'customer-email': options.email || '',
                'customer-name': options.customerName || ''
            };

            const signature = this.generateSignature(params);
            params.signature = signature;

            // Create form URL
            const formParams = new URLSearchParams(params);
            const paymentUrl = `https://secure.2checkout.com/order/checkout.php?${formParams.toString()}`;

            return {
                status: 'success',
                data: {
                    url: paymentUrl,
                    orderId: orderId,
                    params: params
                }
            };
        } catch (error) {
            throw new Error(`Payment creation error: ${error.message}`);
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
                'COMPLETE': 'success',
                'PENDING': 'pending',
                'REFUND': 'refunded',
                'REVERSED': 'failed'
            };

            return {
                status: statusMapping[data.order_status] || 'unknown',
                orderId: data['order-ext-ref'] || data.order_number,
                transactionId: data.order_number,
                amount: parseFloat(data.invoice_list_amount || data.order_amount),
                currency: data.list_currency,
                paymentStatus: data.order_status,
                invoiceId: data.invoice_id
            };
        } catch (error) {
            throw new Error(`Error in 2Checkout callback handling: ${error.message}`);
        }
    }

    async verifyCallback(data) {
        try {
            const hash = data.hash || data.HASH;
            
            if (!hash) {
                return {
                    status: false,
                    error: {
                        code: 400,
                        message: 'Hash not found in callback data'
                    }
                };
            }

            // Verify IPN hash
            const params = { ...data };
            delete params.hash;
            delete params.HASH;
            
            const calculatedHash = crypto
                .createHmac('md5', this.secretKey)
                .update(JSON.stringify(params))
                .digest('hex');

            if (hash !== calculatedHash) {
                return {
                    status: false,
                    error: {
                        code: 401,
                        message: 'Invalid hash'
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
}

module.exports = TwoCheckoutClient;
