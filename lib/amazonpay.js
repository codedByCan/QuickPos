const axios = require('axios');
const crypto = require('crypto');

class AmazonPayClient {
    constructor(config) {
        const requiredFields = ['merchantId', 'accessKey', 'secretKey'];
        for (let field of requiredFields) {
            if (!config[field]) throw new Error(`Missing required field: ${field}`);
        }

        this.merchantId = config.merchantId;
        this.accessKey = config.accessKey;
        this.secretKey = config.secretKey;
        this.region = config.region || 'us'; // us, eu, jp
        this.sandbox = config.sandbox || false;
        
        const regionUrls = {
            us: this.sandbox ? 'https://pay-api.amazon.com/sandbox' : 'https://pay-api.amazon.com/live',
            eu: this.sandbox ? 'https://pay-api.amazon.eu/sandbox' : 'https://pay-api.amazon.eu/live',
            jp: this.sandbox ? 'https://pay-api.amazon.jp/sandbox' : 'https://pay-api.amazon.jp/live'
        };

        this.baseURL = regionUrls[this.region];

        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    generateSignature(payload) {
        return crypto
            .createHmac('sha256', this.secretKey)
            .update(payload)
            .digest('base64');
    }

    async createPayment(options) {
        try {
            const orderId = options.orderId || `ORDER-${Date.now()}`;
            const timestamp = new Date().toISOString();
            
            const payloadData = {
                webCheckoutDetails: {
                    checkoutReviewReturnUrl: options.successUrl || options.callback_link
                },
                storeId: this.merchantId,
                chargePermissionType: 'OneTime',
                recurringMetadata: null,
                paymentDetails: {
                    paymentIntent: 'Authorize',
                    chargeAmount: {
                        amount: parseFloat(options.amount).toFixed(2),
                        currencyCode: options.currency || 'USD'
                    }
                },
                merchantMetadata: {
                    merchantReferenceId: orderId,
                    merchantStoreName: options.storeName || 'Store',
                    noteToBuyer: options.description || ''
                }
            };

            const payload = JSON.stringify(payloadData);
            const signature = this.generateSignature(payload);

            const response = await this.client.post('/v2/checkoutSessions', payloadData, {
                headers: {
                    'x-amz-pay-date': timestamp,
                    'x-amz-pay-region': this.region,
                    'Authorization': `AMZN-PAY-RSASSA-PSS ${signature}`
                }
            });

            return {
                status: 'success',
                data: {
                    checkoutSessionId: response.data.checkoutSessionId,
                    webCheckoutDetails: response.data.webCheckoutDetails,
                    url: response.data.webCheckoutDetails?.amazonPayRedirectUrl,
                    orderId: orderId,
                    amount: payloadData.paymentDetails.chargeAmount.amount,
                    currency: payloadData.paymentDetails.chargeAmount.currencyCode
                }
            };
        } catch (error) {
            throw new Error(`Payment creation error: ${error.response?.data?.message || error.message}`);
        }
    }

    async handleCallback(callbackData) {
        try {
            const checkoutSessionId = callbackData.amazonCheckoutSessionId;
            
            if (!checkoutSessionId) {
                throw new Error('Checkout session ID not found in callback data');
            }

            // Get checkout session details
            const session = await this.getCheckoutSession(checkoutSessionId);

            // Status mapping
            const statusMapping = {
                'Open': 'pending',
                'Completed': 'success',
                'Canceled': 'failed',
                'Expired': 'failed'
            };

            return {
                status: statusMapping[session.statusDetails?.state] || 'unknown',
                orderId: session.merchantMetadata?.merchantReferenceId,
                transactionId: checkoutSessionId,
                amount: parseFloat(session.chargeAmount?.amount || 0),
                currency: session.chargeAmount?.currencyCode,
                paymentStatus: session.statusDetails?.state,
                buyer: session.buyer
            };
        } catch (error) {
            throw new Error(`Error in Amazon Pay callback handling: ${error.message}`);
        }
    }

    async getCheckoutSession(checkoutSessionId) {
        try {
            const timestamp = new Date().toISOString();
            
            const response = await this.client.get(`/v2/checkoutSessions/${checkoutSessionId}`, {
                headers: {
                    'x-amz-pay-date': timestamp,
                    'x-amz-pay-region': this.region
                }
            });

            return response.data;
        } catch (error) {
            throw new Error(`Error fetching checkout session: ${error.response?.data?.message || error.message}`);
        }
    }

    async updateCheckoutSession(checkoutSessionId, updates) {
        try {
            const timestamp = new Date().toISOString();
            
            const response = await this.client.patch(`/v2/checkoutSessions/${checkoutSessionId}`, updates, {
                headers: {
                    'x-amz-pay-date': timestamp,
                    'x-amz-pay-region': this.region
                }
            });

            return response.data;
        } catch (error) {
            throw new Error(`Error updating checkout session: ${error.response?.data?.message || error.message}`);
        }
    }
}

module.exports = AmazonPayClient;
