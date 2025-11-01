const axios = require('axios');
const crypto = require('crypto');

class PayID19Client {
    constructor(config) {
        const requiredFields = ['apiKey', 'secretKey'];
        for (let field of requiredFields) {
            if (!config[field]) throw new Error(`Missing required field: ${field}`);
        }

        this.apiKey = config.apiKey;
        this.secretKey = config.secretKey;
        this.URL = 'https://payid19.com/api/v1';

        this.client = axios.create({
            baseURL: this.URL,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            }
        });

        this.client.interceptors.response.use(response => {
            return response;
        }, error => {
            if (error.response) {
                throw new Error(`PayID19 API error: ${error.response.data.message || error.message}`);
            }
            throw new Error(`PayID19 API error: ${error.message}`);
        });
    }

    generateSignature(data) {
        const sortedData = Object.keys(data)
            .sort()
            .map(key => `${key}=${data[key]}`)
            .join('&');
        
        return crypto
            .createHmac('sha256', this.secretKey)
            .update(sortedData)
            .digest('hex');
    }

    async createPayment(options) {
        try {
            const orderId = options.orderId || `ORDER-${Date.now()}`;
            
            const requestData = {
                merchant_order_id: orderId,
                amount: parseFloat(options.amount),
                currency: options.currency || 'IDR',
                customer_name: options.customerName || options.name || 'Customer',
                customer_email: options.customerEmail || options.email,
                customer_phone: options.customerPhone || options.phone || '',
                callback_url: options.callbackUrl || options.callback_link,
                return_url: options.returnUrl || options.callback_link,
                description: options.description || options.name || 'Payment',
                payment_method: options.paymentMethod || 'all'
            };

            // Generate signature
            const signature = this.generateSignature(requestData);
            requestData.signature = signature;

            const response = await this.client.post('/payment/create', requestData);

            if (response.data.status === 'success') {
                return {
                    status: 'success',
                    data: {
                        paymentId: response.data.data.payment_id,
                        url: response.data.data.payment_url,
                        orderId: orderId,
                        qrCode: response.data.data.qr_code,
                        expiredAt: response.data.data.expired_at
                    }
                };
            } else {
                throw new Error(response.data.message || 'Payment creation failed');
            }
        } catch (error) {
            throw new Error(`Payment creation error: ${error.message}`);
        }
    }

    async getPaymentStatus(paymentId) {
        try {
            const response = await this.client.get(`/payment/status/${paymentId}`);
            
            if (response.data.status === 'success') {
                return response.data.data;
            } else {
                throw new Error(response.data.message || 'Failed to get payment status');
            }
        } catch (error) {
            throw new Error(`Payment status error: ${error.message}`);
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
                'paid': 'success',
                'pending': 'pending',
                'expired': 'expired',
                'failed': 'failed',
                'cancelled': 'cancelled'
            };

            return {
                status: statusMapping[data.payment_status] || 'unknown',
                paymentId: data.payment_id,
                orderId: data.merchant_order_id,
                amount: parseFloat(data.amount),
                currency: data.currency,
                paymentMethod: data.payment_method,
                paymentStatus: data.payment_status,
                paidAt: data.paid_at,
                fee: parseFloat(data.fee || 0),
                netAmount: parseFloat(data.net_amount || data.amount)
            };
        } catch (error) {
            throw new Error(`Error in PayID19 callback handling: ${error.message}`);
        }
    }

    async verifyCallback(data) {
        try {
            const receivedSignature = data.signature;
            delete data.signature;

            const expectedSignature = this.generateSignature(data);

            if (receivedSignature !== expectedSignature) {
                return {
                    status: false,
                    error: {
                        code: 401,
                        message: 'Invalid signature'
                    }
                };
            }

            if (data.payment_status === 'failed' || data.payment_status === 'cancelled') {
                return {
                    status: false,
                    error: {
                        code: 400,
                        message: `Payment ${data.payment_status}`
                    }
                };
            }

            // Restore signature for callback response
            data.signature = receivedSignature;

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

    async getBalance() {
        try {
            const response = await this.client.get('/merchant/balance');
            
            if (response.data.status === 'success') {
                return response.data.data;
            } else {
                throw new Error(response.data.message || 'Failed to get balance');
            }
        } catch (error) {
            throw new Error(`Balance error: ${error.message}`);
        }
    }

    async getPaymentMethods() {
        try {
            const response = await this.client.get('/payment/methods');
            
            if (response.data.status === 'success') {
                return response.data.data;
            } else {
                throw new Error(response.data.message || 'Failed to get payment methods');
            }
        } catch (error) {
            throw new Error(`Payment methods error: ${error.message}`);
        }
    }
}

module.exports = PayID19Client;
