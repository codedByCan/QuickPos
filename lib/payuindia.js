const axios = require('axios');
const crypto = require('crypto');

class PayUIndiaClient {
    constructor(config) {
        const requiredFields = ['merchantKey', 'salt'];
        for (let field of requiredFields) {
            if (!config[field]) throw new Error(`Missing required field: ${field}`);
        }

        this.merchantKey = config.merchantKey;
        this.salt = config.salt;
        this.baseURL = config.sandbox 
            ? 'https://test.payu.in' 
            : 'https://secure.payu.in';

        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
    }

    generateHash(params) {
        const hashString = `${this.merchantKey}|${params.txnid}|${params.amount}|${params.productinfo}|${params.firstname}|${params.email}|||||||||||${this.salt}`;
        return crypto.createHash('sha512').update(hashString).digest('hex');
    }

    generateVerificationHash(params) {
        const hashString = `${this.salt}|${params.status}|||||||||||${params.email}|${params.firstname}|${params.productinfo}|${params.amount}|${params.txnid}|${this.merchantKey}`;
        return crypto.createHash('sha512').update(hashString).digest('hex');
    }

    async createPayment(options) {
        try {
            const txnid = options.orderId || `TXN${Date.now()}`;
            const amount = parseFloat(options.amount).toFixed(2);
            
            const params = {
                key: this.merchantKey,
                txnid: txnid,
                amount: amount,
                productinfo: options.productInfo || options.name || 'Payment',
                firstname: options.firstname || options.name || '',
                email: options.email || '',
                phone: options.phone || '',
                surl: options.successUrl || options.callback_link,
                furl: options.failUrl || options.callback_link,
                udf1: options.udf1 || '',
                udf2: options.udf2 || '',
                udf3: options.udf3 || '',
                udf4: options.udf4 || '',
                udf5: options.udf5 || ''
            };

            params.hash = this.generateHash(params);

            // Create payment URL
            const formParams = new URLSearchParams(params);
            const paymentUrl = `${this.baseURL}/_payment`;

            return {
                status: 'success',
                data: {
                    url: paymentUrl,
                    orderId: txnid,
                    amount: amount,
                    params: params,
                    method: 'POST'
                }
            };
        } catch (error) {
            throw new Error(`Payment creation error: ${error.message}`);
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
                'success': 'success',
                'pending': 'pending',
                'failure': 'failed',
                'bounced': 'failed',
                'cancelled': 'failed'
            };

            return {
                status: statusMapping[callbackData.status] || 'unknown',
                orderId: callbackData.txnid,
                transactionId: callbackData.mihpayid,
                amount: parseFloat(callbackData.amount),
                currency: 'INR',
                paymentStatus: callbackData.status,
                paymentMode: callbackData.mode,
                bankRefNum: callbackData.bank_ref_num,
                cardNumber: callbackData.cardnum
            };
        } catch (error) {
            throw new Error(`Error in PayU India callback handling: ${error.message}`);
        }
    }

    async verifyCallback(data) {
        try {
            const receivedHash = data.hash;
            const expectedHash = this.generateVerificationHash(data);

            if (receivedHash !== expectedHash) {
                return {
                    status: false,
                    error: {
                        code: 401,
                        message: 'Invalid hash'
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

    async verifyPayment(txnid) {
        try {
            const command = 'verify_payment';
            const hashString = `${this.merchantKey}|${command}|${txnid}|${this.salt}`;
            const hash = crypto.createHash('sha512').update(hashString).digest('hex');

            const params = new URLSearchParams({
                key: this.merchantKey,
                command: command,
                var1: txnid,
                hash: hash
            });

            const response = await this.client.post('/merchant/postservice.php?form=2', params);
            return response.data;
        } catch (error) {
            throw new Error(`Error verifying payment: ${error.response?.data || error.message}`);
        }
    }
}

module.exports = PayUIndiaClient;
