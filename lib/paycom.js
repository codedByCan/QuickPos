const axios = require('axios');

class PaycomClient {
    constructor(config) {
        const requiredFields = ['merchantId', 'secretKey'];
        for (let field of requiredFields) {
            if (!config[field]) throw new Error(`Missing required field: ${field}`);
        }

        this.merchantId = config.merchantId;
        this.secretKey = config.secretKey;
        this.URL = 'https://checkout.paycom.uz/api';

        this.client = axios.create({
            baseURL: this.URL,
            headers: {
                'Content-Type': 'application/json',
                'X-Auth': this.merchantId + ':' + this.secretKey
            }
        });

        this.client.interceptors.response.use(response => {
            return response;
        }, error => {
            if (error.response) {
                throw new Error(`Paycom API error: ${error.response.data.error?.message || error.message}`);
            }
            throw new Error(`Paycom API error: ${error.message}`);
        });
    }

    async createPayment(options) {
        try {
            const orderId = options.orderId || `ORDER-${Date.now()}`;
            const amount = Math.round(parseFloat(options.amount) * 100); // Convert to tiyin

            // Paycom uses a unique link generation system
            const params = {
                m: this.merchantId,
                ac: {
                    order_id: orderId
                },
                a: amount,
                c: options.callbackUrl || options.callback_link,
                l: options.lang || 'ru'
            };

            // Generate payment URL
            const encodedParams = Buffer.from(JSON.stringify(params)).toString('base64');
            const paymentUrl = `https://checkout.paycom.uz/${encodedParams}`;

            return {
                status: 'success',
                data: {
                    url: paymentUrl,
                    orderId: orderId,
                    amount: options.amount,
                    params: encodedParams
                }
            };
        } catch (error) {
            throw new Error(`Payment creation error: ${error.message}`);
        }
    }

    async handleCallback(callbackData) {
        try {
            // Paycom uses JSON-RPC 2.0 protocol
            const method = callbackData.method;
            const params = callbackData.params;
            const id = callbackData.id;

            switch (method) {
                case 'CheckPerformTransaction':
                    return await this.checkPerformTransaction(params, id);
                
                case 'CreateTransaction':
                    return await this.createTransaction(params, id);
                
                case 'PerformTransaction':
                    return await this.performTransaction(params, id);
                
                case 'CancelTransaction':
                    return await this.cancelTransaction(params, id);
                
                case 'CheckTransaction':
                    return await this.checkTransaction(params, id);
                
                default:
                    throw new Error(`Unknown method: ${method}`);
            }
        } catch (error) {
            throw new Error(`Error in Paycom callback handling: ${error.message}`);
        }
    }

    async checkPerformTransaction(params, id) {
        // Verify that transaction can be performed
        const orderId = params.account.order_id;
        const amount = params.amount;

        // You should check if order exists and amount is correct
        // Return success response
        return {
            jsonrpc: '2.0',
            id: id,
            result: {
                allow: true
            }
        };
    }

    async createTransaction(params, id) {
        // Create transaction in your database
        const transactionId = params.id;
        const time = params.time;
        const amount = params.amount;
        const orderId = params.account.order_id;

        // Save transaction with state 1 (created)
        return {
            jsonrpc: '2.0',
            id: id,
            result: {
                create_time: time,
                transaction: transactionId.toString(),
                state: 1
            }
        };
    }

    async performTransaction(params, id) {
        // Perform the transaction (complete payment)
        const transactionId = params.id;

        // Update transaction state to 2 (completed)
        return {
            jsonrpc: '2.0',
            id: id,
            result: {
                transaction: transactionId.toString(),
                perform_time: Date.now(),
                state: 2
            }
        };
    }

    async cancelTransaction(params, id) {
        // Cancel transaction
        const transactionId = params.id;
        const reason = params.reason;

        // Update transaction state to -1 (cancelled) or -2 (cancelled after complete)
        return {
            jsonrpc: '2.0',
            id: id,
            result: {
                transaction: transactionId.toString(),
                cancel_time: Date.now(),
                state: -1
            }
        };
    }

    async checkTransaction(params, id) {
        // Check transaction status
        const transactionId = params.id;

        // Return transaction info from your database
        return {
            jsonrpc: '2.0',
            id: id,
            result: {
                create_time: 0,
                perform_time: 0,
                cancel_time: 0,
                transaction: transactionId.toString(),
                state: 1,
                reason: null
            }
        };
    }

    async verifyCallback(data) {
        try {
            // Verify authorization header
            const authHeader = data.headers?.['x-auth'];
            const expectedAuth = this.merchantId + ':' + this.secretKey;

            if (authHeader !== expectedAuth) {
                return {
                    status: false,
                    error: {
                        code: -32504,
                        message: 'Insufficient privilege to perform this method'
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

module.exports = PaycomClient;
