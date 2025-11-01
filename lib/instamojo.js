const axios = require('axios');
const crypto = require('crypto');

class InstamojoClient {
    constructor(config) {
        const requiredFields = ['apiKey', 'authToken'];
        for (let field of requiredFields) {
            if (!config[field]) throw new Error(`Missing required field: ${field}`);
        }

        this.apiKey = config.apiKey;
        this.authToken = config.authToken;
        this.baseURL = config.sandbox 
            ? 'https://test.instamojo.com/api/1.1' 
            : 'https://www.instamojo.com/api/1.1';

        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': this.apiKey,
                'X-Auth-Token': this.authToken
            }
        });
    }

    async createPayment(options) {
        try {
            const orderId = options.orderId || `ORDER-${Date.now()}`;
            
            const paymentData = {
                purpose: options.purpose || options.name || 'Payment',
                amount: parseFloat(options.amount).toFixed(2),
                buyer_name: options.name || options.buyerName || '',
                email: options.email || '',
                phone: options.phone || '',
                send_email: options.sendEmail !== false,
                send_sms: options.sendSms || false,
                redirect_url: options.successUrl || options.callback_link,
                webhook: options.callbackUrl || options.callback_link,
                allow_repeated_payments: false
            };

            const response = await this.client.post('/payment-requests/', paymentData);

            if (response.data.success) {
                return {
                    status: 'success',
                    data: {
                        id: response.data.payment_request.id,
                        url: response.data.payment_request.longurl,
                        orderId: orderId,
                        amount: response.data.payment_request.amount,
                        currency: 'INR',
                        status: response.data.payment_request.status
                    }
                };
            } else {
                throw new Error(response.data.message || 'Payment request creation failed');
            }
        } catch (error) {
            throw new Error(`Payment creation error: ${error.response?.data?.message || error.message}`);
        }
    }

    async handleCallback(callbackData) {
        try {
            // Get payment details
            const paymentId = callbackData.payment_id;
            
            if (!paymentId) {
                throw new Error('Payment ID not found in callback data');
            }

            const payment = await this.getPaymentDetails(paymentId);

            // Status mapping
            const statusMapping = {
                'Credit': 'success',
                'Pending': 'pending',
                'Failed': 'failed',
                'Initiated': 'pending'
            };

            return {
                status: statusMapping[payment.status] || 'unknown',
                orderId: payment.payment_request?.id,
                transactionId: payment.payment_id,
                amount: parseFloat(payment.amount),
                currency: payment.currency || 'INR',
                paymentStatus: payment.status,
                paymentMethod: payment.instrument_type,
                fees: parseFloat(payment.fees || 0),
                buyer: {
                    name: payment.buyer_name,
                    email: payment.buyer_email,
                    phone: payment.buyer_phone
                }
            };
        } catch (error) {
            throw new Error(`Error in Instamojo callback handling: ${error.message}`);
        }
    }

    async getPaymentDetails(paymentId) {
        try {
            const response = await this.client.get(`/payments/${paymentId}/`);

            if (response.data.success) {
                return response.data.payment;
            } else {
                throw new Error(response.data.message || 'Failed to get payment details');
            }
        } catch (error) {
            throw new Error(`Error getting payment details: ${error.response?.data?.message || error.message}`);
        }
    }

    async getPaymentRequestDetails(requestId) {
        try {
            const response = await this.client.get(`/payment-requests/${requestId}/`);

            if (response.data.success) {
                return response.data.payment_request;
            } else {
                throw new Error(response.data.message || 'Failed to get payment request details');
            }
        } catch (error) {
            throw new Error(`Error getting payment request details: ${error.response?.data?.message || error.message}`);
        }
    }

    async initiateRefund(paymentId, options = {}) {
        try {
            const refundData = {
                payment_id: paymentId,
                type: options.type || 'RFD', // RFD or TNR
                body: options.reason || 'Customer request'
            };

            if (options.refund_amount) {
                refundData.refund_amount = parseFloat(options.refund_amount).toFixed(2);
            }

            const response = await this.client.post('/refunds/', refundData);

            if (response.data.success) {
                return response.data.refund;
            } else {
                throw new Error(response.data.message || 'Refund initiation failed');
            }
        } catch (error) {
            throw new Error(`Error initiating refund: ${error.response?.data?.message || error.message}`);
        }
    }
}

module.exports = InstamojoClient;
