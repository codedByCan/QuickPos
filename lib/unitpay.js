const axios = require('axios');
const crypto = require('crypto');

class UnitpayClient {
    constructor(config) {
        const requiredFields = ['publicKey', 'secretKey'];
        for (let field of requiredFields) {
            if (!config[field]) throw new Error(`Missing required field: ${field}`);
        }

        this.publicKey = config.publicKey;
        this.secretKey = config.secretKey;
        this.domain = config.domain || 'unitpay.ru';
        this.baseURL = `https://${this.domain}/api`;

        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    generateSignature(params) {
        const sorted = Object.keys(params).sort().reduce((acc, key) => {
            if (params[key] !== undefined && params[key] !== null) {
                acc[key] = params[key];
            }
            return acc;
        }, {});

        const signatureString = Object.entries(sorted)
            .map(([key, value]) => value)
            .join('{up}');

        return crypto
            .createHash('sha256')
            .update(signatureString + '{up}' + this.secretKey)
            .digest('hex');
    }

    async createPayment(options) {
        try {
            const orderId = options.orderId || `ORDER-${Date.now()}`;
            
            const params = {
                account: options.account || orderId,
                sum: parseFloat(options.amount).toFixed(2),
                desc: options.description || options.name || 'Payment',
                currency: options.currency || 'RUB',
                resultUrl: options.callbackUrl || options.callback_link,
                successUrl: options.successUrl || options.callback_link,
                errorUrl: options.failureUrl || options.callback_link,
                customerEmail: options.email || '',
                customerPhone: options.phone || '',
                locale: options.locale || 'ru'
            };

            params.signature = this.generateSignature({
                account: params.account,
                currency: params.currency,
                desc: params.desc,
                sum: params.sum
            });

            // Create payment URL
            const paymentUrl = `https://${this.domain}/pay/${this.publicKey}?` + 
                new URLSearchParams(params).toString();

            return {
                status: 'success',
                data: {
                    url: paymentUrl,
                    orderId: orderId,
                    account: params.account,
                    amount: params.sum,
                    currency: params.currency
                }
            };
        } catch (error) {
            throw new Error(`Payment creation error: ${error.message}`);
        }
    }

    async handleCallback(callbackData) {
        try {
            const method = callbackData.method;
            const params = callbackData.params || callbackData;

            // Verify signature
            const verification = await this.verifyCallback(params, method);
            
            if (!verification.status) {
                throw new Error(verification.error.message);
            }

            // Handle different methods
            if (method === 'check') {
                // Payment check - validate order
                return {
                    status: 'pending',
                    orderId: params.account,
                    message: 'Order validation'
                };
            } else if (method === 'pay') {
                // Payment successful
                return {
                    status: 'success',
                    orderId: params.account,
                    transactionId: params.unitpayId,
                    amount: parseFloat(params.orderSum),
                    currency: params.orderCurrency || 'RUB',
                    paymentStatus: 'completed',
                    paymentType: params.paymentType,
                    profit: parseFloat(params.profit || 0)
                };
            } else if (method === 'error') {
                // Payment error
                return {
                    status: 'failed',
                    orderId: params.account,
                    message: params.message || 'Payment failed'
                };
            } else if (method === 'refund') {
                // Refund notification
                return {
                    status: 'refunded',
                    orderId: params.account,
                    transactionId: params.unitpayId,
                    amount: parseFloat(params.orderSum)
                };
            }

            throw new Error(`Unknown method: ${method}`);
        } catch (error) {
            throw new Error(`Error in Unitpay callback handling: ${error.message}`);
        }
    }

    async verifyCallback(params, method) {
        try {
            const receivedSignature = params.signature;
            
            let signatureParams;
            if (method === 'check') {
                signatureParams = {
                    account: params.account,
                    orderSum: params.orderSum,
                    orderCurrency: params.orderCurrency,
                    method: method
                };
            } else if (method === 'pay') {
                signatureParams = {
                    account: params.account,
                    orderSum: params.orderSum,
                    orderCurrency: params.orderCurrency,
                    profit: params.profit,
                    method: method
                };
            } else if (method === 'refund') {
                signatureParams = {
                    account: params.account,
                    orderSum: params.orderSum,
                    method: method
                };
            } else {
                signatureParams = params;
            }

            const expectedSignature = this.generateSignature(signatureParams);

            if (receivedSignature !== expectedSignature) {
                return {
                    status: false,
                    error: {
                        code: 401,
                        message: 'Invalid signature'
                    }
                };
            }

            return {
                status: true,
                data: params
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

    async initPayment(options) {
        try {
            // API method to init payment and get payment ID
            const params = {
                account: options.account || options.orderId || `ORDER-${Date.now()}`,
                sum: parseFloat(options.amount).toFixed(2),
                projectId: this.publicKey,
                desc: options.description || 'Payment',
                currency: options.currency || 'RUB',
                resultUrl: options.callbackUrl || options.callback_link,
                secretKey: this.secretKey
            };

            const response = await this.client.get('/initPayment', { params });

            if (response.data.result) {
                return response.data.result;
            } else {
                throw new Error(response.data.error?.message || 'Payment initialization failed');
            }
        } catch (error) {
            throw new Error(`Error initializing payment: ${error.response?.data?.error?.message || error.message}`);
        }
    }
}

module.exports = UnitpayClient;
