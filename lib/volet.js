const axios = require('axios');
const crypto = require('crypto');

class VoletClient {
    constructor(config) {
        const requiredFields = ['merchantId', 'secretKey'];
        for (let field of requiredFields) {
            if (!config[field]) throw new Error(`Missing required field: ${field}`);
        }

        this.merchantId = config.merchantId;
        this.secretKey = config.secretKey;
        this.URL = 'https://volet.com/sci';

        this.client = axios.create({
            baseURL: this.URL,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
    }

    generateSignature(data) {
        const signatureString = Object.keys(data)
            .sort()
            .map(key => `${key}=${data[key]}`)
            .join(':');
        
        return crypto
            .createHash('md5')
            .update(signatureString + ':' + this.secretKey)
            .digest('hex');
    }

    async createPayment(options) {
        try {
            const orderId = options.orderId || `ORDER-${Date.now()}`;
            
            const paymentData = {
                v_merchant_id: this.merchantId,
                v_amount: parseFloat(options.amount),
                v_currency: options.currency || 'USD',
                v_description: options.description || options.name || 'Payment',
                v_order_id: orderId,
                v_success_url: options.successUrl || options.callback_link,
                v_fail_url: options.failUrl || options.callback_link,
                v_status_url: options.callbackUrl || options.callback_link,
                v_email: options.email || '',
                v_phone: options.phone || ''
            };

            // Generate signature
            paymentData.v_sign = this.generateSignature(paymentData);

            // Create payment URL
            const params = new URLSearchParams(paymentData);
            const paymentUrl = `${this.URL}?${params.toString()}`;

            return {
                status: 'success',
                data: {
                    url: paymentUrl,
                    orderId: orderId,
                    merchantId: this.merchantId
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
                'SUCCESS': 'success',
                'PENDING': 'pending',
                'FAIL': 'failed'
            };

            return {
                status: statusMapping[data.v_status] || 'unknown',
                orderId: data.v_order_id,
                transactionId: data.v_transaction_id,
                amount: parseFloat(data.v_amount),
                currency: data.v_currency,
                paymentStatus: data.v_status,
                paymentMethod: data.v_payment_method
            };
        } catch (error) {
            throw new Error(`Error in Volet callback handling: ${error.message}`);
        }
    }

    async verifyCallback(data) {
        try {
            const receivedSign = data.v_sign;
            const dataToVerify = { ...data };
            delete dataToVerify.v_sign;

            const expectedSign = this.generateSignature(dataToVerify);

            if (receivedSign !== expectedSign) {
                return {
                    status: false,
                    error: {
                        code: 401,
                        message: 'Invalid signature'
                    }
                };
            }

            if (data.v_status === 'FAIL') {
                return {
                    status: false,
                    error: {
                        code: 400,
                        message: 'Payment failed'
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

module.exports = VoletClient;
