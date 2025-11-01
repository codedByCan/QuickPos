const axios = require('axios');
const crypto = require('crypto');

class SenangPayClient {
    constructor(config) {
        const requiredFields = ['merchantId', 'secretKey'];
        for (let field of requiredFields) {
            if (!config[field]) throw new Error(`Missing required field: ${field}`);
        }

        this.merchantId = config.merchantId;
        this.secretKey = config.secretKey;
        this.baseURL = config.sandbox 
            ? 'https://sandbox.senangpay.my/payment' 
            : 'https://app.senangpay.my/payment';
    }

    generateHash(detail, amount, orderId) {
        const hashString = this.secretKey + detail + amount + orderId;
        return crypto.createHash('md5').update(hashString).digest('hex');
    }

    async createPayment(options) {
        try {
            const orderId = options.orderId || `ORDER-${Date.now()}`;
            const amount = parseFloat(options.amount).toFixed(2);
            const detail = options.description || options.name || 'Payment';
            
            const hash = this.generateHash(detail, amount, orderId);

            const paymentData = {
                detail: detail,
                amount: amount,
                order_id: orderId,
                name: options.name || options.customerName || '',
                email: options.email || '',
                phone: options.phone || '',
                hash: hash
            };

            // Create payment URL
            const params = new URLSearchParams(paymentData);
            const paymentUrl = `${this.baseURL}/${this.merchantId}?${params.toString()}`;

            return {
                status: 'success',
                data: {
                    url: paymentUrl,
                    orderId: orderId,
                    amount: amount,
                    currency: 'MYR',
                    hash: hash
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
                '1': 'success',  // Success
                '0': 'failed'    // Failed
            };

            return {
                status: statusMapping[callbackData.status_id] || 'unknown',
                orderId: callbackData.order_id,
                transactionId: callbackData.transaction_id,
                amount: parseFloat(callbackData.amount),
                currency: 'MYR',
                paymentStatus: callbackData.status_id === '1' ? 'completed' : 'failed',
                message: callbackData.msg
            };
        } catch (error) {
            throw new Error(`Error in SenangPay callback handling: ${error.message}`);
        }
    }

    async verifyCallback(data) {
        try {
            const receivedHash = data.hash;
            const hashString = this.secretKey + data.status_id + data.order_id + data.transaction_id + data.msg;
            const expectedHash = crypto.createHash('md5').update(hashString).digest('hex');

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

    async getTransactionStatus(orderId) {
        try {
            // SenangPay doesn't have a standard API for checking transaction status
            // This would need to be implemented based on their specific API if available
            throw new Error('Transaction status check not available in standard SenangPay integration');
        } catch (error) {
            throw new Error(`Error getting transaction status: ${error.message}`);
        }
    }
}

module.exports = SenangPayClient;
