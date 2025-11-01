const axios = require('axios');
const crypto = require('crypto');

class PaytmClient {
    constructor(config) {
        const requiredFields = ['merchantId', 'merchantKey', 'websiteName'];
        for (let field of requiredFields) {
            if (!config[field]) throw new Error(`Missing required field: ${field}`);
        }

        this.merchantId = config.merchantId;
        this.merchantKey = config.merchantKey;
        this.websiteName = config.websiteName;
        this.industryType = config.industryType || 'Retail';
        this.channelId = config.channelId || 'WEB';
        this.isSandbox = config.sandbox || false;

        this.URL = this.isSandbox
            ? 'https://securegw-stage.paytm.in'
            : 'https://securegw.paytm.in';

        this.client = axios.create({
            baseURL: this.URL,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        this.client.interceptors.response.use(response => {
            return response;
        }, error => {
            if (error.response) {
                throw new Error(`Paytm API error: ${error.response.data.message || error.message}`);
            }
            throw new Error(`Paytm API error: ${error.message}`);
        });
    }

    generateChecksum(params, key) {
        const data = JSON.stringify(params);
        const salt = crypto.randomBytes(4).toString('hex');
        const checksum = crypto
            .createHash('sha256')
            .update(data + salt)
            .digest('hex');
        
        return checksum + salt;
    }

    verifyChecksum(params, key, checksumReceived) {
        const data = JSON.stringify(params);
        const salt = checksumReceived.substr(checksumReceived.length - 8);
        const checksum = crypto
            .createHash('sha256')
            .update(data + salt)
            .digest('hex');
        
        return (checksum + salt) === checksumReceived;
    }

    async createPayment(options) {
        try {
            const orderId = options.orderId || `ORDER-${Date.now()}`;
            const customerId = options.customerId || `CUST-${Date.now()}`;

            const paytmParams = {
                body: {
                    requestType: 'Payment',
                    mid: this.merchantId,
                    websiteName: this.websiteName,
                    orderId: orderId,
                    txnAmount: {
                        value: parseFloat(options.amount).toFixed(2),
                        currency: options.currency || 'INR'
                    },
                    userInfo: {
                        custId: customerId,
                        email: options.email || '',
                        mobile: options.mobile || options.phone || ''
                    },
                    callbackUrl: options.callbackUrl || options.callback_link
                }
            };

            // Generate checksum
            const checksum = this.generateChecksum(paytmParams.body, this.merchantKey);

            const requestData = {
                ...paytmParams,
                head: {
                    signature: checksum
                }
            };

            const response = await this.client.post('/theia/api/v1/initiateTransaction?mid=' + this.merchantId + '&orderId=' + orderId, requestData);

            if (response.data.body.resultInfo.resultStatus === 'S') {
                const txnToken = response.data.body.txnToken;
                
                return {
                    status: 'success',
                    data: {
                        txnToken: txnToken,
                        orderId: orderId,
                        url: `${this.URL}/theia/api/v1/showPaymentPage?mid=${this.merchantId}&orderId=${orderId}`,
                        amount: options.amount
                    }
                };
            } else {
                throw new Error(response.data.body.resultInfo.resultMsg || 'Payment creation failed');
            }
        } catch (error) {
            throw new Error(`Payment creation error: ${error.message}`);
        }
    }

    async getTransactionStatus(orderId) {
        try {
            const paytmParams = {
                body: {
                    mid: this.merchantId,
                    orderId: orderId
                }
            };

            const checksum = this.generateChecksum(paytmParams.body, this.merchantKey);

            const requestData = {
                ...paytmParams,
                head: {
                    signature: checksum
                }
            };

            const response = await this.client.post('/v3/order/status', requestData);
            return response.data;
        } catch (error) {
            throw new Error(`Transaction status error: ${error.message}`);
        }
    }

    async handleCallback(callbackData) {
        try {
            const verification = await this.verifyCallback(callbackData);
            
            if (!verification.status) {
                throw new Error(verification.error.message);
            }

            const data = verification.data;
            
            // Status mapping
            const statusMapping = {
                'TXN_SUCCESS': 'success',
                'TXN_FAILURE': 'failed',
                'PENDING': 'pending'
            };

            return {
                status: statusMapping[data.STATUS] || 'unknown',
                orderId: data.ORDERID,
                txnId: data.TXNID,
                txnAmount: parseFloat(data.TXNAMOUNT),
                currency: data.CURRENCY || 'INR',
                bankTxnId: data.BANKTXNID,
                paymentMode: data.PAYMENTMODE,
                bankName: data.BANKNAME,
                txnDate: data.TXNDATE,
                gatewayName: data.GATEWAYNAME,
                respCode: data.RESPCODE,
                respMsg: data.RESPMSG,
                paymentStatus: data.STATUS
            };
        } catch (error) {
            throw new Error(`Error in Paytm callback handling: ${error.message}`);
        }
    }

    async verifyCallback(data) {
        try {
            const checksumReceived = data.CHECKSUMHASH;
            delete data.CHECKSUMHASH;

            const isValidChecksum = this.verifyChecksum(data, this.merchantKey, checksumReceived);

            if (!isValidChecksum) {
                return {
                    status: false,
                    error: {
                        code: 401,
                        message: 'Invalid checksum'
                    }
                };
            }

            if (data.STATUS === 'TXN_FAILURE') {
                return {
                    status: false,
                    error: {
                        code: 400,
                        message: data.RESPMSG || 'Transaction failed'
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

    async refundTransaction(orderId, refundAmount, txnId) {
        try {
            const refId = `REFUND-${Date.now()}`;
            
            const paytmParams = {
                body: {
                    mid: this.merchantId,
                    orderId: orderId,
                    txnId: txnId,
                    refId: refId,
                    refundAmount: parseFloat(refundAmount).toFixed(2),
                    txnType: 'REFUND'
                }
            };

            const checksum = this.generateChecksum(paytmParams.body, this.merchantKey);

            const requestData = {
                ...paytmParams,
                head: {
                    signature: checksum
                }
            };

            const response = await this.client.post('/refund/apply', requestData);
            return response.data;
        } catch (error) {
            throw new Error(`Refund transaction error: ${error.message}`);
        }
    }
}

module.exports = PaytmClient;
