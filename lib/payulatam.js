const axios = require('axios');
const crypto = require('crypto');

class PayULatamClient {
    constructor(config) {
        const requiredFields = ['apiKey', 'apiLogin', 'merchantId', 'accountId'];
        for (let field of requiredFields) {
            if (!config[field]) throw new Error(`Missing required field: ${field}`);
        }

        this.apiKey = config.apiKey;
        this.apiLogin = config.apiLogin;
        this.merchantId = config.merchantId;
        this.accountId = config.accountId;
        this.baseURL = config.sandbox 
            ? 'https://sandbox.api.payulatam.com' 
            : 'https://api.payulatam.com';

        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
    }

    generateSignature(referenceCode, amount, currency) {
        const signatureString = `${this.apiKey}~${this.merchantId}~${referenceCode}~${amount}~${currency}`;
        return crypto.createHash('md5').update(signatureString).digest('hex');
    }

    async createPayment(options) {
        try {
            const orderId = options.orderId || `ORDER-${Date.now()}`;
            const amount = parseFloat(options.amount).toFixed(2);
            const currency = options.currency || 'USD';
            
            const signature = this.generateSignature(orderId, amount, currency);

            const paymentData = {
                language: options.language || 'es',
                command: 'SUBMIT_TRANSACTION',
                merchant: {
                    apiKey: this.apiKey,
                    apiLogin: this.apiLogin
                },
                transaction: {
                    order: {
                        accountId: this.accountId,
                        referenceCode: orderId,
                        description: options.description || options.name || 'Payment',
                        language: options.language || 'es',
                        signature: signature,
                        notifyUrl: options.callbackUrl || options.callback_link,
                        additionalValues: {
                            TX_VALUE: {
                                value: amount,
                                currency: currency
                            }
                        },
                        buyer: {
                            emailAddress: options.email || '',
                            fullName: options.name || '',
                            dniNumber: options.dniNumber || '',
                            shippingAddress: {
                                street1: options.address || '',
                                city: options.city || '',
                                state: options.state || '',
                                country: options.country || 'CO',
                                postalCode: options.postalCode || ''
                            }
                        }
                    },
                    type: 'AUTHORIZATION_AND_CAPTURE',
                    paymentMethod: options.paymentMethod,
                    paymentCountry: options.country || 'CO'
                },
                test: options.sandbox || false
            };

            const response = await this.client.post('/payments-api/4.0/service.cgi', paymentData);

            if (response.data.code === 'SUCCESS') {
                return {
                    status: 'success',
                    data: {
                        orderId: orderId,
                        transactionId: response.data.transactionResponse?.transactionId,
                        state: response.data.transactionResponse?.state,
                        amount: amount,
                        currency: currency,
                        responseCode: response.data.transactionResponse?.responseCode
                    }
                };
            } else {
                throw new Error(response.data.error || 'Payment creation failed');
            }
        } catch (error) {
            throw new Error(`Payment creation error: ${error.response?.data?.error || error.message}`);
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
                '4': 'success', // APPROVED
                '6': 'success', // APPROVED
                '7': 'pending', // PENDING
                '5': 'failed',  // EXPIRED
                '104': 'failed' // ERROR
            };

            const stateMapping = {
                'APPROVED': 'success',
                'PENDING': 'pending',
                'DECLINED': 'failed',
                'ERROR': 'failed',
                'EXPIRED': 'failed'
            };

            return {
                status: statusMapping[callbackData.response_code_pol] || stateMapping[callbackData.state_pol] || 'unknown',
                orderId: callbackData.reference_sale,
                transactionId: callbackData.transaction_id,
                amount: parseFloat(callbackData.value),
                currency: callbackData.currency,
                paymentStatus: callbackData.state_pol,
                responseCode: callbackData.response_code_pol,
                paymentMethod: callbackData.payment_method_type
            };
        } catch (error) {
            throw new Error(`Error in PayU Latam callback handling: ${error.message}`);
        }
    }

    async verifyCallback(data) {
        try {
            const receivedSign = data.sign;
            const referenceCode = data.reference_sale;
            const amount = parseFloat(data.value).toFixed(1);
            const currency = data.currency;

            const expectedSign = this.generateSignature(referenceCode, amount, currency);

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
}

module.exports = PayULatamClient;
