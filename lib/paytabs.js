const axios = require('axios');
const crypto = require('crypto');

class PayTabsClient {
    constructor(config) {
        const requiredFields = ['profileId', 'serverKey'];
        for (let field of requiredFields) {
            if (!config[field]) throw new Error(`Missing required field: ${field}`);
        }

        this.profileId = config.profileId;
        this.serverKey = config.serverKey;
        this.region = config.region || 'ARE'; // ARE, SAU, OMN, JOR, EGY, etc.
        
        const regionUrls = {
            'ARE': 'https://secure.paytabs.com',
            'SAU': 'https://secure.paytabs.sa',
            'OMN': 'https://secure-oman.paytabs.com',
            'JOR': 'https://secure-jordan.paytabs.com',
            'EGY': 'https://secure-egypt.paytabs.com',
            'global': 'https://secure-global.paytabs.com'
        };

        this.baseURL = regionUrls[this.region] || regionUrls['global'];

        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': this.serverKey
            }
        });
    }

    async createPayment(options) {
        try {
            const orderId = options.orderId || `ORDER-${Date.now()}`;
            
            const paymentData = {
                profile_id: this.profileId,
                tran_type: options.tranType || 'sale',
                tran_class: options.tranClass || 'ecom',
                cart_id: orderId,
                cart_description: options.description || options.name || 'Payment',
                cart_currency: options.currency || 'AED',
                cart_amount: parseFloat(options.amount).toFixed(2),
                callback: options.callbackUrl || options.callback_link,
                return: options.successUrl || options.callback_link,
                customer_details: {
                    name: options.name || options.customerName || '',
                    email: options.email || '',
                    phone: options.phone || '',
                    street1: options.address || '',
                    city: options.city || '',
                    state: options.state || '',
                    country: options.country || 'AE',
                    zip: options.zip || ''
                },
                hide_shipping: options.hideShipping !== false
            };

            const response = await this.client.post('/payment/request', paymentData);

            return {
                status: 'success',
                data: {
                    transactionRef: response.data.tran_ref,
                    url: response.data.redirect_url,
                    orderId: orderId,
                    amount: paymentData.cart_amount,
                    currency: paymentData.cart_currency
                }
            };
        } catch (error) {
            throw new Error(`Payment creation error: ${error.response?.data?.message || error.message}`);
        }
    }

    async handleCallback(callbackData) {
        try {
            const transactionRef = callbackData.tran_ref || callbackData.tranRef;
            
            if (!transactionRef) {
                throw new Error('Transaction reference not found in callback data');
            }

            // Verify payment
            const payment = await this.verifyPayment(transactionRef);

            // Status mapping
            const statusMapping = {
                'A': 'success', // Authorized/Approved
                'H': 'pending', // On Hold
                'P': 'pending', // Pending
                'V': 'pending', // Voided
                'E': 'failed',  // Error
                'D': 'failed'   // Declined
            };

            return {
                status: statusMapping[payment.payment_result?.response_status] || 'unknown',
                orderId: payment.cart_id,
                transactionRef: payment.tran_ref,
                amount: parseFloat(payment.cart_amount),
                currency: payment.cart_currency,
                paymentStatus: payment.payment_result?.response_status,
                responseCode: payment.payment_result?.response_code,
                responseMessage: payment.payment_result?.response_message
            };
        } catch (error) {
            throw new Error(`Error in PayTabs callback handling: ${error.message}`);
        }
    }

    async verifyPayment(transactionRef) {
        try {
            const response = await this.client.post('/payment/query', {
                profile_id: this.profileId,
                tran_ref: transactionRef
            });

            return response.data;
        } catch (error) {
            throw new Error(`Error verifying payment: ${error.response?.data?.message || error.message}`);
        }
    }

    async refundPayment(transactionRef, options = {}) {
        try {
            const response = await this.client.post('/payment/refund', {
                profile_id: this.profileId,
                tran_ref: transactionRef,
                cart_amount: options.amount,
                cart_description: options.description || 'Refund',
                cart_id: options.orderId
            });

            return response.data;
        } catch (error) {
            throw new Error(`Error processing refund: ${error.response?.data?.message || error.message}`);
        }
    }
}

module.exports = PayTabsClient;
