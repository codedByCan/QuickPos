const axios = require('axios');
const crypto = require('crypto');

class PerfectMoneyClient {
    constructor(config) {
        const requiredFields = ['accountId', 'passPhrase'];
        for (let field of requiredFields) {
            if (!config[field]) throw new Error(`Missing required field: ${field}`);
        }

        this.accountId = config.accountId;
        this.passPhrase = config.passPhrase;
        this.alternatePassPhrase = config.alternatePassPhrase || this.passPhrase;
        this.payeeAccount = config.payeeAccount || this.accountId;
        this.baseURL = 'https://perfectmoney.com/api';
    }

    generateHash(data) {
        const hashString = `${data.PAYMENT_ID}:${data.PAYEE_ACCOUNT}:${data.PAYMENT_AMOUNT}:${data.PAYMENT_UNITS}:${data.PAYMENT_BATCH_NUM}:${data.PAYER_ACCOUNT}:${this.alternatePassPhrase}:${data.TIMESTAMPGMT}`;
        
        return crypto
            .createHash('md5')
            .update(hashString)
            .digest('hex')
            .toUpperCase();
    }

    async createPayment(options) {
        try {
            const orderId = options.orderId || `ORDER-${Date.now()}`;
            
            const paymentData = {
                PAYEE_ACCOUNT: this.payeeAccount,
                PAYEE_NAME: options.payeeName || 'Merchant',
                PAYMENT_ID: orderId,
                PAYMENT_AMOUNT: parseFloat(options.amount).toFixed(2),
                PAYMENT_UNITS: options.currency || 'USD',
                STATUS_URL: options.callbackUrl || options.callback_link,
                PAYMENT_URL: options.successUrl || options.callback_link,
                PAYMENT_URL_METHOD: 'GET',
                NOPAYMENT_URL: options.failUrl || options.callback_link,
                NOPAYMENT_URL_METHOD: 'GET',
                SUGGESTED_MEMO: options.description || options.name || 'Payment',
                BAGGAGE_FIELDS: `email=${options.email || ''}&name=${options.name || ''}`
            };

            // Create payment URL
            const params = new URLSearchParams(paymentData);
            const paymentUrl = `https://perfectmoney.com/api/step1.asp?${params.toString()}`;

            return {
                status: 'success',
                data: {
                    url: paymentUrl,
                    orderId: orderId,
                    amount: paymentData.PAYMENT_AMOUNT,
                    currency: paymentData.PAYMENT_UNITS,
                    payeeAccount: this.payeeAccount
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

            return {
                status: 'success',
                orderId: callbackData.PAYMENT_ID,
                transactionId: callbackData.PAYMENT_BATCH_NUM,
                amount: parseFloat(callbackData.PAYMENT_AMOUNT),
                currency: callbackData.PAYMENT_UNITS,
                paymentStatus: 'completed',
                payerAccount: callbackData.PAYER_ACCOUNT,
                timestampGMT: callbackData.TIMESTAMPGMT
            };
        } catch (error) {
            throw new Error(`Error in Perfect Money callback handling: ${error.message}`);
        }
    }

    async verifyCallback(data) {
        try {
            const receivedHash = data.V2_HASH;
            const expectedHash = this.generateHash(data);

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

    async getBalance(accountId, password) {
        try {
            const response = await axios.get('https://perfectmoney.com/acct/balance.asp', {
                params: {
                    AccountID: accountId || this.accountId,
                    PassPhrase: password || this.passPhrase
                }
            });

            // Parse response (XML-like format)
            const balances = {};
            const matches = response.data.matchAll(/<input name='(.+?)' type='hidden' value='(.+?)'>/g);
            
            for (const match of matches) {
                balances[match[1]] = match[2];
            }

            return balances;
        } catch (error) {
            throw new Error(`Error getting balance: ${error.message}`);
        }
    }
}

module.exports = PerfectMoneyClient;
