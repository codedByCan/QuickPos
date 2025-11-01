const axios = require('axios');
const crypto = require('crypto');

class URWayClient {
    constructor(config) {
        const requiredFields = ['terminalId', 'password', 'merchantKey'];
        for (let field of requiredFields) {
            if (!config[field]) throw new Error(`Missing required field: ${field}`);
        }

        this.terminalId = config.terminalId;
        this.password = config.password;
        this.merchantKey = config.merchantKey;
        this.baseURL = config.testMode 
            ? 'https://payments-dev.urway-tech.com/URWAYPGService/transaction/jsonProcess/JSONrequest' 
            : 'https://payments.urway-tech.com/URWAYPGService/transaction/jsonProcess/JSONrequest';

        this.client = axios.create({
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    generateHash(trackId, amount, currency) {
        const hashString = `${trackId}|${this.terminalId}|${this.password}|${this.merchantKey}|${amount}|${currency}`;
        return crypto.createHash('sha256').update(hashString).digest('hex');
    }

    async createPayment(options) {
        try {
            const orderId = options.orderId || `ORDER-${Date.now()}`;
            const trackId = options.trackId || orderId;
            const amount = parseFloat(options.amount).toFixed(2);
            const currency = options.currency || 'SAR';
            
            const requestHash = this.generateHash(trackId, amount, currency);

            const paymentData = {
                trackid: trackId,
                terminalId: this.terminalId,
                customerEmail: options.email || '',
                action: '1', // Purchase action
                merchantIp: options.merchantIp || '',
                password: this.password,
                currency: currency,
                country: options.country || 'SA',
                amount: amount,
                requestHash: requestHash,
                udf1: options.udf1 || '',
                udf2: options.udf2 || orderId,
                udf3: options.udf3 || '',
                udf4: options.udf4 || '',
                udf5: options.udf5 || '',
                tokenizationType: options.tokenization || '0'
            };

            const response = await this.client.post(this.baseURL, paymentData);

            if (response.data.responseCode === '000') {
                return {
                    status: 'success',
                    data: {
                        url: response.data.paymentUrl || response.data.targetUrl,
                        trackId: trackId,
                        orderId: orderId,
                        amount: amount,
                        currency: currency,
                        payid: response.data.payid
                    }
                };
            } else {
                throw new Error(response.data.responseMessage || 'Payment creation failed');
            }
        } catch (error) {
            throw new Error(`Payment creation error: ${error.response?.data?.responseMessage || error.message}`);
        }
    }

    async handleCallback(callbackData) {
        try {
            const trackId = callbackData.trackid || callbackData.TrackId;
            
            if (!trackId) {
                throw new Error('Track ID not found in callback data');
            }

            // Verify transaction hash
            const verification = await this.verifyTransaction(callbackData);
            
            if (!verification.status) {
                throw new Error(verification.error.message);
            }

            // Status mapping
            const statusMapping = {
                '000': 'success', // Approved
                '001': 'pending', // In progress
                '100': 'failed',  // Declined
                '400': 'failed',  // Error
                '401': 'failed'   // Invalid
            };

            return {
                status: statusMapping[callbackData.responseCode] || 'unknown',
                orderId: callbackData.udf2 || trackId,
                trackId: trackId,
                transactionId: callbackData.TranId || callbackData.tranid,
                amount: parseFloat(callbackData.amount),
                currency: callbackData.currency || 'SAR',
                paymentStatus: callbackData.result,
                responseCode: callbackData.responseCode,
                responseMessage: callbackData.responseMessage,
                authCode: callbackData.auth,
                paymentId: callbackData.payid
            };
        } catch (error) {
            throw new Error(`Error in URWay callback handling: ${error.message}`);
        }
    }

    async verifyTransaction(data) {
        try {
            const receivedHash = data.responseHash;
            const trackId = data.trackid || data.TrackId;
            const amount = data.amount;
            const currency = data.currency || 'SAR';
            
            const expectedHash = this.generateHash(trackId, amount, currency);

            if (receivedHash && receivedHash !== expectedHash) {
                return {
                    status: false,
                    error: {
                        code: 401,
                        message: 'Invalid transaction hash'
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

    async refund(trackId, options = {}) {
        try {
            const amount = parseFloat(options.amount).toFixed(2);
            const currency = options.currency || 'SAR';
            
            const requestHash = this.generateHash(trackId, amount, currency);

            const refundData = {
                trackid: trackId,
                terminalId: this.terminalId,
                password: this.password,
                action: '2', // Refund action
                amount: amount,
                currency: currency,
                requestHash: requestHash
            };

            const response = await this.client.post(this.baseURL, refundData);

            return response.data;
        } catch (error) {
            throw new Error(`Error processing refund: ${error.response?.data?.responseMessage || error.message}`);
        }
    }
}

module.exports = URWayClient;
