const axios = require('axios');
const crypto = require('crypto');

class PayNetTRClient {
    constructor(config) {
        const requiredFields = ['merchantId', 'secretKey'];
        for (let field of requiredFields) {
            if (!config[field]) throw new Error(`Missing required field: ${field}`);
        }

        this.merchantId = config.merchantId;
        this.secretKey = config.secretKey;
        this.baseURL = 'https://api.paynet.com.tr';

        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    generateSignature(data) {
        const signatureString = Object.keys(data)
            .filter(key => key !== 'signature')
            .sort()
            .map(key => `${key}=${data[key]}`)
            .join('&');
        
        return crypto
            .createHmac('sha256', this.secretKey)
            .update(signatureString)
            .digest('hex')
            .toUpperCase();
    }

    async createPayment(options) {
        try {
            const orderId = options.orderId || `ORDER-${Date.now()}`;
            const amount = parseFloat(options.amount) * 100; // Kuruş cinsine çevir
            
            const paymentData = {
                merchant_id: this.merchantId,
                order_id: orderId,
                amount: amount,
                currency: options.currency || 'TRY',
                description: options.description || options.name || 'Payment',
                success_url: options.successUrl || options.callback_link,
                fail_url: options.failUrl || options.callback_link,
                callback_url: options.callbackUrl || options.callback_link,
                customer_email: options.email || '',
                customer_name: options.name || '',
                customer_phone: options.phone || ''
            };

            paymentData.signature = this.generateSignature(paymentData);

            const response = await this.client.post('/api/v1/payment', paymentData);

            if (response.data.success) {
                return {
                    status: 'success',
                    data: {
                        url: response.data.payment_url,
                        orderId: orderId,
                        paymentId: response.data.payment_id,
                        amount: amount / 100,
                        currency: paymentData.currency
                    }
                };
            } else {
                throw new Error(response.data.message || 'Payment creation failed');
            }
        } catch (error) {
            throw new Error(`Payment creation error: ${error.response?.data?.message || error.message}`);
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
                'success': 'success',
                'completed': 'success',
                'approved': 'success',
                'failed': 'failed',
                'declined': 'failed',
                'cancelled': 'failed',
                'pending': 'pending',
                'processing': 'pending'
            };

            return {
                status: statusMapping[data.status] || 'unknown',
                orderId: data.order_id,
                transactionId: data.payment_id || data.transaction_id,
                amount: parseFloat(data.amount) / 100,
                currency: data.currency,
                paymentStatus: data.status,
                paymentMethod: data.payment_method
            };
        } catch (error) {
            throw new Error(`Error in PayNetTR callback handling: ${error.message}`);
        }
    }

    async verifyCallback(data) {
        try {
            const receivedSign = data.signature;
            const dataToVerify = { ...data };
            delete dataToVerify.signature;

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

    async getPaymentStatus(paymentId) {
        try {
            const data = {
                merchant_id: this.merchantId,
                payment_id: paymentId
            };
            
            data.signature = this.generateSignature(data);
            
            const response = await this.client.post('/api/v1/payment/status', data);
            return response.data;
        } catch (error) {
            throw new Error(`Error getting payment status: ${error.response?.data?.message || error.message}`);
        }
    }
}

module.exports = PayNetTRClient;
