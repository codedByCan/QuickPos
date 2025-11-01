const axios = require('axios');
const crypto = require('crypto');

class FreeKassaClient {
    constructor(config) {
        const requiredFields = ['shopId', 'secretKey1', 'secretKey2'];
        for (let field of requiredFields) {
            if (!config[field]) throw new Error(`Missing required field: ${field}`);
        }

        this.shopId = config.shopId;
        this.secretKey1 = config.secretKey1; // For payment form signature
        this.secretKey2 = config.secretKey2; // For callback verification
        this.baseURL = 'https://pay.freekassa.ru';
    }

    generateSignature(amount, orderId, secretKey) {
        const signatureString = `${this.shopId}:${amount}:${secretKey}:${orderId}`;
        return crypto.createHash('md5').update(signatureString).digest('hex');
    }

    async createPayment(options) {
        try {
            const orderId = options.orderId || `ORDER-${Date.now()}`;
            const amount = parseFloat(options.amount).toFixed(2);
            
            const signature = this.generateSignature(amount, orderId, this.secretKey1);

            const paymentData = {
                m: this.shopId,
                oa: amount,
                currency: options.currency || 'RUB',
                o: orderId,
                s: signature,
                email: options.email || '',
                phone: options.phone || '',
                i: options.paymentMethod || '', // Payment system ID
                us_customer_name: options.name || ''
            };

            // Create payment URL
            const params = new URLSearchParams(paymentData);
            const paymentUrl = `${this.baseURL}/?${params.toString()}`;

            return {
                status: 'success',
                data: {
                    url: paymentUrl,
                    orderId: orderId,
                    amount: amount,
                    currency: paymentData.currency,
                    signature: signature
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
                orderId: callbackData.MERCHANT_ORDER_ID,
                transactionId: callbackData.intid,
                amount: parseFloat(callbackData.AMOUNT),
                currency: callbackData.MERCHANT_CURRENCY || 'RUB',
                paymentStatus: 'completed',
                paymentMethod: callbackData.PAYMENT_ID
            };
        } catch (error) {
            throw new Error(`Error in FreeKassa callback handling: ${error.message}`);
        }
    }

    async verifyCallback(data) {
        try {
            const receivedSign = data.SIGN;
            const signatureString = `${this.shopId}:${data.AMOUNT}:${this.secretKey2}:${data.MERCHANT_ORDER_ID}`;
            const expectedSign = crypto.createHash('md5').update(signatureString).digest('hex');

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

    async getBalance() {
        try {
            // FreeKassa API for balance check
            const response = await axios.post('https://api.freekassa.ru/v1/balance', {
                shopId: this.shopId,
                nonce: Date.now()
            });

            return response.data;
        } catch (error) {
            throw new Error(`Error getting balance: ${error.message}`);
        }
    }
}

module.exports = FreeKassaClient;
