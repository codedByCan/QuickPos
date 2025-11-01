const axios = require('axios');
const crypto = require('crypto');

class PhonePeClient {
    constructor(config) {
        const requiredFields = ['merchantId', 'saltKey', 'saltIndex'];
        for (let field of requiredFields) {
            if (!config[field]) throw new Error(`Missing required field: ${field}`);
        }

        this.merchantId = config.merchantId;
        this.saltKey = config.saltKey;
        this.saltIndex = config.saltIndex;
        this.baseURL = config.sandbox 
            ? 'https://api-preprod.phonepe.com/apis/pg-sandbox' 
            : 'https://api.phonepe.com/apis/hermes';

        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    generateChecksum(payload) {
        const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
        const checksumString = base64Payload + '/pg/v1/pay' + this.saltKey;
        const checksum = crypto.createHash('sha256').update(checksumString).digest('hex');
        return checksum + '###' + this.saltIndex;
    }

    verifyChecksum(base64Response, checksumHeader) {
        const [receivedChecksum] = checksumHeader.split('###');
        const checksumString = base64Response + this.saltKey;
        const expectedChecksum = crypto.createHash('sha256').update(checksumString).digest('hex');
        
        return receivedChecksum === expectedChecksum;
    }

    async createPayment(options) {
        try {
            const orderId = options.orderId || `ORDER-${Date.now()}`;
            const transactionId = `TXN-${Date.now()}`;
            
            const payload = {
                merchantId: this.merchantId,
                merchantTransactionId: transactionId,
                merchantUserId: options.userId || `USER-${Date.now()}`,
                amount: Math.round(parseFloat(options.amount) * 100), // Amount in paise
                redirectUrl: options.successUrl || options.callback_link,
                redirectMode: 'POST',
                callbackUrl: options.callbackUrl || options.callback_link,
                mobileNumber: options.phone || '',
                paymentInstrument: {
                    type: options.paymentType || 'PAY_PAGE' // PAY_PAGE, UPI_COLLECT, etc.
                }
            };

            const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
            const checksum = this.generateChecksum(payload);

            const response = await this.client.post('/pg/v1/pay', {
                request: base64Payload
            }, {
                headers: {
                    'X-VERIFY': checksum
                }
            });

            if (response.data.success) {
                return {
                    status: 'success',
                    data: {
                        url: response.data.data.instrumentResponse.redirectInfo.url,
                        transactionId: transactionId,
                        orderId: orderId,
                        amount: payload.amount / 100,
                        currency: 'INR'
                    }
                };
            } else {
                throw new Error(response.data.message || 'Payment creation failed');
            }
        } catch (error) {
            throw new Error(`Payment creation error: ${error.response?.data?.message || error.message}`);
        }
    }

    async handleCallback(callbackData) {
        try {
            const base64Response = callbackData.response;
            const checksumHeader = callbackData['X-VERIFY'];
            
            // Verify checksum
            if (!this.verifyChecksum(base64Response, checksumHeader)) {
                throw new Error('Invalid checksum');
            }

            // Decode response
            const response = JSON.parse(Buffer.from(base64Response, 'base64').toString());

            // Status mapping
            const statusMapping = {
                'PAYMENT_SUCCESS': 'success',
                'PAYMENT_PENDING': 'pending',
                'PAYMENT_DECLINED': 'failed',
                'PAYMENT_ERROR': 'failed',
                'INTERNAL_SERVER_ERROR': 'failed'
            };

            return {
                status: statusMapping[response.code] || 'unknown',
                orderId: response.data.merchantOrderId,
                transactionId: response.data.merchantTransactionId,
                amount: response.data.amount / 100,
                currency: 'INR',
                paymentStatus: response.code,
                paymentMethod: response.data.paymentInstrument?.type
            };
        } catch (error) {
            throw new Error(`Error in PhonePe callback handling: ${error.message}`);
        }
    }

    async checkStatus(transactionId) {
        try {
            const checksumString = `/pg/v1/status/${this.merchantId}/${transactionId}` + this.saltKey;
            const checksum = crypto.createHash('sha256').update(checksumString).digest('hex') + '###' + this.saltIndex;

            const response = await this.client.get(`/pg/v1/status/${this.merchantId}/${transactionId}`, {
                headers: {
                    'X-VERIFY': checksum,
                    'X-MERCHANT-ID': this.merchantId
                }
            });

            return response.data;
        } catch (error) {
            throw new Error(`Error checking status: ${error.response?.data?.message || error.message}`);
        }
    }

    async refund(transactionId, options = {}) {
        try {
            const refundId = `REFUND-${Date.now()}`;
            
            const payload = {
                merchantId: this.merchantId,
                merchantTransactionId: refundId,
                originalTransactionId: transactionId,
                amount: Math.round(parseFloat(options.amount) * 100),
                callbackUrl: options.callbackUrl
            };

            const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
            const checksum = this.generateChecksum(payload);

            const response = await this.client.post('/pg/v1/refund', {
                request: base64Payload
            }, {
                headers: {
                    'X-VERIFY': checksum
                }
            });

            return response.data;
        } catch (error) {
            throw new Error(`Error processing refund: ${error.response?.data?.message || error.message}`);
        }
    }
}

module.exports = PhonePeClient;
