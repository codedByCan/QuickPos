const axios = require('axios');
const crypto = require('crypto');

class CashfreeClient {
    constructor(config) {
        const requiredFields = ['appId', 'secretKey'];
        for (let field of requiredFields) {
            if (!config[field]) throw new Error(`Missing required field: ${field}`);
        }

        this.appId = config.appId;
        this.secretKey = config.secretKey;
        this.environment = config.environment || 'production'; // 'sandbox' or 'production'
        this.baseURL = this.environment === 'sandbox' 
            ? 'https://sandbox.cashfree.com/pg' 
            : 'https://api.cashfree.com/pg';

        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Content-Type': 'application/json',
                'x-client-id': this.appId,
                'x-client-secret': this.secretKey,
                'x-api-version': '2023-08-01'
            }
        });
    }

    async createPayment(options) {
        try {
            const orderId = options.orderId || `order_${Date.now()}`;
            
            const orderData = {
                order_id: orderId,
                order_amount: parseFloat(options.amount),
                order_currency: options.currency || 'INR',
                customer_details: {
                    customer_id: options.customerId || `customer_${Date.now()}`,
                    customer_email: options.email || '',
                    customer_phone: options.phone || '',
                    customer_name: options.name || options.customerName || ''
                },
                order_meta: {
                    return_url: options.successUrl || options.callback_link,
                    notify_url: options.callbackUrl || options.callback_link
                },
                order_note: options.description || ''
            };

            const response = await this.client.post('/orders', orderData);

            if (response.data.order_status === 'ACTIVE') {
                return {
                    status: 'success',
                    data: {
                        orderId: orderId,
                        paymentSessionId: response.data.payment_session_id,
                        orderStatus: response.data.order_status,
                        amount: orderData.order_amount,
                        currency: orderData.order_currency,
                        // Payment link construction
                        url: `${this.baseURL}/checkout?order_id=${orderId}&payment_session_id=${response.data.payment_session_id}`
                    }
                };
            } else {
                throw new Error('Order creation failed');
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

            const orderId = callbackData.order_id || callbackData.orderId;
            
            // Get order details
            const order = await this.getOrder(orderId);

            // Status mapping
            const statusMapping = {
                'PAID': 'success',
                'ACTIVE': 'pending',
                'EXPIRED': 'failed',
                'TERMINATED': 'failed',
                'PENDING': 'pending'
            };

            return {
                status: statusMapping[order.order_status] || 'unknown',
                orderId: order.order_id,
                transactionId: order.cf_order_id,
                amount: parseFloat(order.order_amount),
                currency: order.order_currency,
                paymentStatus: order.order_status,
                paymentMethod: order.payment_method
            };
        } catch (error) {
            throw new Error(`Error in Cashfree callback handling: ${error.message}`);
        }
    }

    async verifyCallback(data) {
        try {
            // Verify signature if present
            if (data.signature) {
                const { signature, ...callbackData } = data;
                const signatureString = Object.keys(callbackData)
                    .sort()
                    .map(key => `${key}=${callbackData[key]}`)
                    .join('&');
                
                const expectedSignature = crypto
                    .createHmac('sha256', this.secretKey)
                    .update(signatureString)
                    .digest('hex');

                if (signature !== expectedSignature) {
                    return {
                        status: false,
                        error: {
                            code: 401,
                            message: 'Invalid signature'
                        }
                    };
                }
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

    async getOrder(orderId) {
        try {
            const response = await this.client.get(`/orders/${orderId}`);
            return response.data;
        } catch (error) {
            throw new Error(`Error fetching order: ${error.response?.data?.message || error.message}`);
        }
    }

    async getPayments(orderId) {
        try {
            const response = await this.client.get(`/orders/${orderId}/payments`);
            return response.data;
        } catch (error) {
            throw new Error(`Error fetching payments: ${error.response?.data?.message || error.message}`);
        }
    }

    async refundPayment(orderId, options = {}) {
        try {
            const refundData = {
                refund_amount: options.amount,
                refund_id: options.refundId || `refund_${Date.now()}`,
                refund_note: options.note || 'Refund'
            };

            const response = await this.client.post(`/orders/${orderId}/refunds`, refundData);
            return response.data;
        } catch (error) {
            throw new Error(`Error creating refund: ${error.response?.data?.message || error.message}`);
        }
    }
}

module.exports = CashfreeClient;
