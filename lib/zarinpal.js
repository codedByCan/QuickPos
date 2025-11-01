const axios = require('axios');

class ZarinpalClient {
    constructor(config) {
        const requiredFields = ['merchantId'];
        for (let field of requiredFields) {
            if (!config[field]) throw new Error(`Missing required field: ${field}`);
        }

        this.merchantId = config.merchantId;
        this.isSandbox = config.sandbox || false;
        
        this.URL = this.isSandbox 
            ? 'https://sandbox.zarinpal.com/pg/v4/payment'
            : 'https://api.zarinpal.com/pg/v4/payment';

        this.paymentURL = this.isSandbox
            ? 'https://sandbox.zarinpal.com/pg/StartPay'
            : 'https://www.zarinpal.com/pg/StartPay';

        this.client = axios.create({
            baseURL: this.URL,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        this.client.interceptors.response.use(response => {
            return response;
        }, error => {
            if (error.response) {
                throw new Error(`Zarinpal API error: ${error.response.data.errors || error.message}`);
            }
            throw new Error(`Zarinpal API error: ${error.message}`);
        });
    }

    async createPayment(options) {
        try {
            const requestData = {
                merchant_id: this.merchantId,
                amount: parseInt(options.amount) * 10, // Convert to Rials
                currency: options.currency || 'IRT', // IRT or IRR
                description: options.description || options.name || 'Payment',
                callback_url: options.callbackUrl || options.callback_link,
                metadata: {
                    email: options.email || '',
                    mobile: options.mobile || options.phone || '',
                    order_id: options.orderId || `ORDER-${Date.now()}`
                }
            };

            const response = await this.client.post('/request.json', requestData);

            if (response.data.data && response.data.data.code === 100) {
                const authority = response.data.data.authority;
                
                return {
                    status: 'success',
                    data: {
                        authority: authority,
                        url: `${this.paymentURL}/${authority}`,
                        orderId: requestData.metadata.order_id
                    }
                };
            } else {
                throw new Error(response.data.errors || 'Payment creation failed');
            }
        } catch (error) {
            throw new Error(`Payment creation error: ${error.message}`);
        }
    }

    async verifyPayment(authority, amount) {
        try {
            const requestData = {
                merchant_id: this.merchantId,
                authority: authority,
                amount: parseInt(amount) * 10 // Convert to Rials
            };

            const response = await this.client.post('/verify.json', requestData);

            if (response.data.data && response.data.data.code === 100) {
                return {
                    status: 'success',
                    data: {
                        refId: response.data.data.ref_id,
                        cardPan: response.data.data.card_pan,
                        cardHash: response.data.data.card_hash,
                        feeType: response.data.data.fee_type,
                        fee: response.data.data.fee
                    }
                };
            } else if (response.data.data && response.data.data.code === 101) {
                return {
                    status: 'success',
                    data: {
                        message: 'Transaction already verified',
                        refId: response.data.data.ref_id
                    }
                };
            } else {
                throw new Error(response.data.errors || 'Verification failed');
            }
        } catch (error) {
            throw new Error(`Payment verification error: ${error.message}`);
        }
    }

    async handleCallback(callbackData) {
        try {
            const authority = callbackData.Authority;
            const status = callbackData.Status;

            if (status !== 'OK') {
                return {
                    status: 'failed',
                    authority: authority,
                    message: 'Payment cancelled or failed'
                };
            }

            // You need to verify the payment with the amount
            // The amount should be stored in your database with the authority
            // For now, we return the authority for manual verification
            return {
                status: 'pending_verification',
                authority: authority,
                message: 'Payment needs verification'
            };
        } catch (error) {
            throw new Error(`Error in Zarinpal callback handling: ${error.message}`);
        }
    }

    async unverifiedTransactions() {
        try {
            const requestData = {
                merchant_id: this.merchantId
            };

            const response = await this.client.post('/unVerified.json', requestData);

            if (response.data.data && response.data.data.code === 100) {
                return response.data.data.authorities;
            } else {
                throw new Error(response.data.errors || 'Failed to get unverified transactions');
            }
        } catch (error) {
            throw new Error(`Unverified transactions error: ${error.message}`);
        }
    }
}

module.exports = ZarinpalClient;
