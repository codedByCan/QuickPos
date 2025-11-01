const axios = require('axios');
const crypto = require('crypto');

class YooKassaClient {
    constructor(config) {
        const requiredFields = ['shopId', 'secretKey'];
        for (let field of requiredFields) {
            if (!config[field]) throw new Error(`Missing required field: ${field}`);
        }

        this.shopId = config.shopId;
        this.secretKey = config.secretKey;
        this.baseURL = 'https://api.yookassa.ru/v3';

        this.client = axios.create({
            baseURL: this.baseURL,
            auth: {
                username: this.shopId,
                password: this.secretKey
            },
            headers: {
                'Content-Type': 'application/json',
                'Idempotence-Key': this.generateIdempotenceKey()
            }
        });
    }

    generateIdempotenceKey() {
        return crypto.randomBytes(16).toString('hex');
    }

    async createPayment(options) {
        try {
            const orderId = options.orderId || `ORDER-${Date.now()}`;
            
            const paymentData = {
                amount: {
                    value: parseFloat(options.amount).toFixed(2),
                    currency: options.currency || 'RUB'
                },
                confirmation: {
                    type: 'redirect',
                    return_url: options.successUrl || options.callback_link
                },
                capture: options.autoCapture !== false,
                description: options.description || options.name || 'Payment',
                metadata: {
                    order_id: orderId
                },
                receipt: options.receipt || undefined
            };

            // Customer info
            if (options.email || options.phone) {
                paymentData.receipt = {
                    customer: {
                        email: options.email,
                        phone: options.phone
                    },
                    items: options.items || [{
                        description: paymentData.description,
                        quantity: '1.00',
                        amount: paymentData.amount,
                        vat_code: options.vatCode || 1
                    }]
                };
            }

            const response = await this.client.post('/payments', paymentData, {
                headers: {
                    'Idempotence-Key': this.generateIdempotenceKey()
                }
            });

            return {
                status: 'success',
                data: {
                    id: response.data.id,
                    url: response.data.confirmation.confirmation_url,
                    orderId: orderId,
                    amount: response.data.amount.value,
                    currency: response.data.amount.currency,
                    status: response.data.status
                }
            };
        } catch (error) {
            throw new Error(`Payment creation error: ${error.response?.data?.description || error.message}`);
        }
    }

    async handleCallback(callbackData) {
        try {
            const payment = callbackData.object;
            
            if (!payment || !payment.id) {
                throw new Error('Invalid callback data');
            }

            // Verify payment
            const verifiedPayment = await this.getPaymentDetails(payment.id);

            // Status mapping
            const statusMapping = {
                'succeeded': 'success',
                'pending': 'pending',
                'waiting_for_capture': 'pending',
                'canceled': 'failed'
            };

            return {
                status: statusMapping[verifiedPayment.status] || 'unknown',
                orderId: verifiedPayment.metadata?.order_id || '',
                transactionId: verifiedPayment.id,
                amount: parseFloat(verifiedPayment.amount.value),
                currency: verifiedPayment.amount.currency,
                paymentStatus: verifiedPayment.status,
                paymentMethod: verifiedPayment.payment_method?.type,
                paid: verifiedPayment.paid,
                refundable: verifiedPayment.refundable
            };
        } catch (error) {
            throw new Error(`Error in YooKassa callback handling: ${error.message}`);
        }
    }

    async getPaymentDetails(paymentId) {
        try {
            const response = await this.client.get(`/payments/${paymentId}`);
            return response.data;
        } catch (error) {
            throw new Error(`Error getting payment details: ${error.response?.data?.description || error.message}`);
        }
    }

    async capturePayment(paymentId, options = {}) {
        try {
            const captureData = {
                amount: options.amount ? {
                    value: parseFloat(options.amount).toFixed(2),
                    currency: options.currency || 'RUB'
                } : undefined
            };

            const response = await this.client.post(`/payments/${paymentId}/capture`, captureData, {
                headers: {
                    'Idempotence-Key': this.generateIdempotenceKey()
                }
            });

            return response.data;
        } catch (error) {
            throw new Error(`Error capturing payment: ${error.response?.data?.description || error.message}`);
        }
    }

    async cancelPayment(paymentId) {
        try {
            const response = await this.client.post(`/payments/${paymentId}/cancel`, {}, {
                headers: {
                    'Idempotence-Key': this.generateIdempotenceKey()
                }
            });

            return response.data;
        } catch (error) {
            throw new Error(`Error canceling payment: ${error.response?.data?.description || error.message}`);
        }
    }

    async createRefund(paymentId, options = {}) {
        try {
            const refundData = {
                payment_id: paymentId,
                amount: {
                    value: parseFloat(options.amount).toFixed(2),
                    currency: options.currency || 'RUB'
                }
            };

            const response = await this.client.post('/refunds', refundData, {
                headers: {
                    'Idempotence-Key': this.generateIdempotenceKey()
                }
            });

            return response.data;
        } catch (error) {
            throw new Error(`Error creating refund: ${error.response?.data?.description || error.message}`);
        }
    }
}

module.exports = YooKassaClient;
