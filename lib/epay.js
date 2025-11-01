const axios = require('axios');
const crypto = require('crypto');

class EpayClient {
    constructor(config) {
        const requiredFields = ['merchantId', 'secretKey'];
        for (let field of requiredFields) {
            if (!config[field]) throw new Error(`Missing required field: ${field}`);
        }

        this.merchantId = config.merchantId;
        this.secretKey = config.secretKey;
        this.baseURL = 'https://epay.bg';

        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
    }

    generateChecksum(data) {
        const fields = [
            data.MIN,
            data.INVOICE,
            data.AMOUNT,
            data.EXP_TIME,
            data.DESCR
        ];
        
        const dataString = fields.join('');
        const hmac = crypto.createHmac('sha1', this.secretKey);
        hmac.update(dataString);
        return hmac.digest('hex');
    }

    async createPayment(options) {
        try {
            const orderId = options.orderId || `ORDER-${Date.now()}`;
            const amount = parseFloat(options.amount).toFixed(2);
            const expirationTime = options.expirationTime || this.getExpirationTime(24); // 24 hours
            
            const paymentData = {
                MIN: this.merchantId,
                INVOICE: orderId,
                AMOUNT: amount,
                EXP_TIME: expirationTime,
                DESCR: options.description || options.name || 'Payment',
                ENCODING: 'UTF-8'
            };

            paymentData.CHECKSUM = this.generateChecksum(paymentData);

            // Create payment URL
            const params = new URLSearchParams(paymentData);
            const paymentUrl = `${this.baseURL}/ezp/reg_bill.php?${params.toString()}`;

            return {
                status: 'success',
                data: {
                    url: paymentUrl,
                    orderId: orderId,
                    amount: amount,
                    expirationTime: expirationTime
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
                'PAID': 'success',
                'DENIED': 'failed',
                'EXPIRED': 'failed'
            };

            return {
                status: statusMapping[callbackData.STATUS] || 'unknown',
                orderId: callbackData.INVOICE,
                transactionId: callbackData.STAN,
                amount: parseFloat(callbackData.AMOUNT),
                currency: 'BGN',
                paymentStatus: callbackData.STATUS,
                paymentDate: callbackData.PAY_TIME,
                cardBrand: callbackData.CARD
            };
        } catch (error) {
            throw new Error(`Error in ePay callback handling: ${error.message}`);
        }
    }

    async verifyCallback(data) {
        try {
            const encoded = data.encoded || data.ENCODED;
            
            if (!encoded) {
                return {
                    status: false,
                    error: {
                        code: 400,
                        message: 'Encoded data not found'
                    }
                };
            }

            // Decode base64
            const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
            
            // Parse data
            const params = {};
            decoded.split(':').forEach(pair => {
                const [key, value] = pair.split('=');
                if (key && value) {
                    params[key] = value;
                }
            });

            // Verify checksum
            const receivedChecksum = params.CHECKSUM;
            delete params.CHECKSUM;
            
            const calculatedChecksum = this.generateChecksum(params);
            
            if (receivedChecksum !== calculatedChecksum) {
                return {
                    status: false,
                    error: {
                        code: 401,
                        message: 'Invalid checksum'
                    }
                };
            }

            return {
                status: true,
                data: params
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

    getExpirationTime(hours = 24) {
        const date = new Date();
        date.setHours(date.getHours() + hours);
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hour = String(date.getHours()).padStart(2, '0');
        const minute = String(date.getMinutes()).padStart(2, '0');
        const second = String(date.getSeconds()).padStart(2, '0');
        
        return `${year}${month}${day}${hour}${minute}${second}`;
    }
}

module.exports = EpayClient;
