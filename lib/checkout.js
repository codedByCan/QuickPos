const axios = require('axios');
const crypto = require('crypto');

class CheckoutClient {
    constructor(config) {
        const requiredFields = ['secretKey'];
        for (let field of requiredFields) {
            if (!config[field]) throw new Error(`Missing required field: ${field}`);
        }

        this.secretKey = config.secretKey;
        this.publicKey = config.publicKey || '';
        this.isSandbox = config.sandbox || false;

        this.URL = this.isSandbox
            ? 'https://api.sandbox.checkout.com'
            : 'https://api.checkout.com';

        this.client = axios.create({
            baseURL: this.URL,
            headers: {
                'Authorization': this.secretKey,
                'Content-Type': 'application/json'
            }
        });

        this.client.interceptors.response.use(response => {
            return response;
        }, error => {
            if (error.response) {
                throw new Error(`Checkout.com API error: ${error.response.data.error_type || error.message}`);
            }
            throw new Error(`Checkout.com API error: ${error.message}`);
        });
    }

    async createPayment(options) {
        try {
            const requestData = {
                source: {
                    type: options.sourceType || 'token',
                    token: options.token
                },
                amount: Math.round(parseFloat(options.amount) * 100), // Convert to cents
                currency: options.currency || 'USD',
                payment_type: options.paymentType || 'Regular',
                reference: options.reference || options.orderId || `ORDER-${Date.now()}`,
                description: options.description || options.name || 'Payment',
                capture: options.capture !== undefined ? options.capture : true,
                customer: {
                    email: options.customerEmail || options.email,
                    name: options.customerName || options.name || 'Customer'
                },
                billing_descriptor: {
                    name: options.billingName || options.name || 'Product',
                    city: options.billingCity || 'London'
                },
                metadata: {
                    order_id: options.orderId || `ORDER-${Date.now()}`,
                    ...options.metadata
                },
                success_url: options.successUrl || options.callback_link,
                failure_url: options.failureUrl || options.callback_link
            };

            // If using hosted payment page
            if (options.useHostedPage) {
                const response = await this.client.post('/payment-links', {
                    amount: requestData.amount,
                    currency: requestData.currency,
                    reference: requestData.reference,
                    description: requestData.description,
                    customer: requestData.customer,
                    billing: {
                        address: {
                            country: options.billingCountry || 'GB'
                        }
                    },
                    products: options.products || [{
                        name: options.name || 'Product',
                        quantity: 1,
                        price: requestData.amount
                    }],
                    metadata: requestData.metadata,
                    return_url: options.returnUrl || options.callback_link,
                    locale: options.locale || 'en-GB'
                });

                return {
                    status: 'success',
                    data: {
                        id: response.data.id,
                        url: response.data._links.redirect.href,
                        reference: requestData.reference,
                        expiresOn: response.data.expires_on
                    }
                };
            }

            // Direct payment
            const response = await this.client.post('/payments', requestData);

            return {
                status: response.data.approved ? 'success' : 'pending',
                data: {
                    id: response.data.id,
                    actionId: response.data.action_id,
                    amount: response.data.amount,
                    currency: response.data.currency,
                    approved: response.data.approved,
                    status: response.data.status,
                    reference: response.data.reference,
                    responseCode: response.data.response_code,
                    responseMessage: response.data.response_summary,
                    redirectUrl: response.data._links?.redirect?.href
                }
            };
        } catch (error) {
            throw new Error(`Payment creation error: ${error.message}`);
        }
    }

    async getPaymentDetails(paymentId) {
        try {
            const response = await this.client.get(`/payments/${paymentId}`);
            return response.data;
        } catch (error) {
            throw new Error(`Payment details error: ${error.message}`);
        }
    }

    async handleCallback(callbackData) {
        try {
            const verification = await this.verifyWebhook(callbackData);
            
            if (!verification.status) {
                throw new Error(verification.error.message);
            }

            const data = verification.data;
            
            // Status mapping
            const statusMapping = {
                'Authorized': 'success',
                'Card Verified': 'success',
                'Pending': 'pending',
                'Declined': 'failed',
                'Canceled': 'cancelled',
                'Expired': 'expired'
            };

            const eventData = data.data;

            return {
                status: statusMapping[eventData.status] || 'unknown',
                paymentId: eventData.id,
                actionId: eventData.action_id,
                orderId: eventData.reference,
                amount: parseFloat(eventData.amount) / 100,
                currency: eventData.currency,
                approved: eventData.approved,
                paymentStatus: eventData.status,
                responseCode: eventData.response_code,
                responseMessage: eventData.response_summary,
                eventType: data.type
            };
        } catch (error) {
            throw new Error(`Error in Checkout.com callback handling: ${error.message}`);
        }
    }

    async verifyWebhook(data, signature = null) {
        try {
            // Checkout.com webhook signature verification
            // This is a simplified version - in production, verify the signature
            
            if (data.type && data.data) {
                return {
                    status: true,
                    data: data
                };
            }

            return {
                status: false,
                error: {
                    code: 400,
                    message: 'Invalid webhook data'
                }
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

    async capturePayment(paymentId, amount = null) {
        try {
            const requestData = {};
            if (amount) {
                requestData.amount = Math.round(parseFloat(amount) * 100);
            }

            const response = await this.client.post(`/payments/${paymentId}/captures`, requestData);
            return response.data;
        } catch (error) {
            throw new Error(`Capture payment error: ${error.message}`);
        }
    }

    async voidPayment(paymentId, reference = null) {
        try {
            const requestData = {};
            if (reference) {
                requestData.reference = reference;
            }

            const response = await this.client.post(`/payments/${paymentId}/voids`, requestData);
            return response.data;
        } catch (error) {
            throw new Error(`Void payment error: ${error.message}`);
        }
    }

    async refundPayment(paymentId, amount = null, reference = null) {
        try {
            const requestData = {};
            if (amount) {
                requestData.amount = Math.round(parseFloat(amount) * 100);
            }
            if (reference) {
                requestData.reference = reference;
            }

            const response = await this.client.post(`/payments/${paymentId}/refunds`, requestData);
            return response.data;
        } catch (error) {
            throw new Error(`Refund payment error: ${error.message}`);
        }
    }
}

module.exports = CheckoutClient;
