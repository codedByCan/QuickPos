const axios = require('axios');
const crypto = require('crypto');

class DokuClient {
    constructor(config) {
        const requiredFields = ['clientId', 'secretKey'];
        for (let field of requiredFields) {
            if (!config[field]) throw new Error(`Missing required field: ${field}`);
        }

        this.clientId = config.clientId;
        this.secretKey = config.secretKey;
        this.sharedKey = config.sharedKey || this.secretKey;
        this.baseURL = config.sandbox 
            ? 'https://sandbox.doku.com' 
            : 'https://api.doku.com';

        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Content-Type': 'application/json',
                'Client-Id': this.clientId
            }
        });
    }

    generateSignature(data, timestamp) {
        const digest = crypto.createHash('sha256')
            .update(JSON.stringify(data))
            .digest('hex');
        
        const signatureComponents = `${this.clientId}:${timestamp}:${digest}`;
        
        return crypto
            .createHmac('sha256', this.secretKey)
            .update(signatureComponents)
            .digest('base64');
    }

    async createPayment(options) {
        try {
            const orderId = options.orderId || `ORDER-${Date.now()}`;
            const timestamp = new Date().toISOString();
            
            const paymentData = {
                order: {
                    invoice_number: orderId,
                    amount: parseFloat(options.amount)
                },
                payment: {
                    payment_due_date: options.dueDate || new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0]
                },
                customer: {
                    name: options.name || options.customerName || '',
                    email: options.email || '',
                    phone: options.phone || ''
                },
                callback_url: options.callbackUrl || options.callback_link,
                return_url: options.successUrl || options.callback_link
            };

            const signature = this.generateSignature(paymentData, timestamp);

            const response = await this.client.post('/v1/payment-code', paymentData, {
                headers: {
                    'Request-Timestamp': timestamp,
                    'Signature': signature
                }
            });

            return {
                status: 'success',
                data: {
                    orderId: orderId,
                    paymentCode: response.data.payment_code,
                    amount: paymentData.order.amount,
                    expiredDate: response.data.expired_date,
                    virtualAccount: response.data.virtual_account_info
                }
            };
        } catch (error) {
            throw new Error(`Payment creation error: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    async handleCallback(callbackData) {
        try {
            const verification = await this.verifyCallback(callbackData);
            
            if (!verification.status) {
                throw new Error(verification.error.message);
            }

            // Status mapping
            const statusMapping = {
                'SUCCESS': 'success',
                'PAID': 'success',
                'PENDING': 'pending',
                'FAILED': 'failed',
                'EXPIRED': 'failed'
            };

            return {
                status: statusMapping[callbackData.transaction.status] || 'unknown',
                orderId: callbackData.order.invoice_number,
                transactionId: callbackData.transaction.id,
                amount: parseFloat(callbackData.order.amount),
                currency: 'IDR',
                paymentStatus: callbackData.transaction.status,
                paymentChannel: callbackData.payment_channel
            };
        } catch (error) {
            throw new Error(`Error in Doku callback handling: ${error.message}`);
        }
    }

    async verifyCallback(data) {
        try {
            const receivedSignature = data.signature;
            const timestamp = data.timestamp;
            
            const callbackData = { ...data };
            delete callbackData.signature;
            delete callbackData.timestamp;

            const expectedSignature = this.generateSignature(callbackData, timestamp);

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

    async checkPaymentStatus(invoiceNumber) {
        try {
            const timestamp = new Date().toISOString();
            const requestData = { invoice_number: invoiceNumber };
            const signature = this.generateSignature(requestData, timestamp);

            const response = await this.client.get(`/v1/payment-code/${invoiceNumber}`, {
                headers: {
                    'Request-Timestamp': timestamp,
                    'Signature': signature
                }
            });

            return response.data;
        } catch (error) {
            throw new Error(`Error checking payment status: ${error.response?.data?.error?.message || error.message}`);
        }
    }
}

module.exports = DokuClient;
