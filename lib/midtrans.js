const axios = require('axios');
const crypto = require('crypto');

class MidtransClient {
    constructor(config) {
        const requiredFields = ['serverKey', 'clientKey'];
        for (let field of requiredFields) {
            if (!config[field]) throw new Error(`Missing required field: ${field}`);
        }

        this.serverKey = config.serverKey;
        this.clientKey = config.clientKey;
        this.isProduction = config.isProduction || false;
        
        this.snapURL = this.isProduction 
            ? 'https://app.midtrans.com/snap/v1' 
            : 'https://app.sandbox.midtrans.com/snap/v1';
        
        this.coreURL = this.isProduction 
            ? 'https://api.midtrans.com/v2' 
            : 'https://api.sandbox.midtrans.com/v2';

        this.client = axios.create({
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': 'Basic ' + Buffer.from(this.serverKey + ':').toString('base64')
            }
        });

        this.client.interceptors.response.use(response => {
            return response;
        }, error => {
            if (error.response) {
                throw new Error(`Midtrans API error: ${error.response.data.error_messages || error.response.data.status_message || error.message}`);
            }
            throw new Error(`Midtrans API error: ${error.message}`);
        });
    }

    async createPayment(options) {
        try {
            const orderId = options.orderId || `ORDER-${Date.now()}`;
            
            const transactionDetails = {
                transaction_details: {
                    order_id: orderId,
                    gross_amount: parseFloat(options.amount)
                },
                customer_details: {
                    first_name: options.firstName || options.name || 'Customer',
                    last_name: options.lastName || '',
                    email: options.email,
                    phone: options.phone || '+62812345678'
                },
                callbacks: {
                    finish: options.callbackUrl || options.callback_link
                }
            };

            // Item details ekleme
            if (options.items && Array.isArray(options.items)) {
                transactionDetails.item_details = options.items;
            } else {
                transactionDetails.item_details = [{
                    id: 'ITEM-' + orderId,
                    price: parseFloat(options.amount),
                    quantity: 1,
                    name: options.itemName || options.name || 'Product'
                }];
            }

            // Opsiyonel alanlar
            if (options.creditCard) {
                transactionDetails.credit_card = options.creditCard;
            }

            if (options.customExpiry) {
                transactionDetails.custom_expiry = options.customExpiry;
            }

            const response = await this.client.post(`${this.snapURL}/transactions`, transactionDetails);

            return {
                status: 'success',
                data: {
                    token: response.data.token,
                    url: response.data.redirect_url,
                    orderId: orderId
                }
            };
        } catch (error) {
            throw new Error(`Payment creation error: ${error.message}`);
        }
    }

    async getTransactionStatus(orderId) {
        try {
            const response = await this.client.get(`${this.coreURL}/${orderId}/status`);
            return response.data;
        } catch (error) {
            throw new Error(`Transaction status error: ${error.message}`);
        }
    }

    async handleCallback(callbackData) {
        try {
            const verification = await this.verifyNotification(callbackData);
            
            if (!verification.status) {
                throw new Error(verification.error.message);
            }

            const data = verification.data;
            
            // Transaction status mapping
            const statusMapping = {
                'capture': 'success',
                'settlement': 'success',
                'pending': 'pending',
                'deny': 'failed',
                'cancel': 'cancelled',
                'expire': 'expired',
                'failure': 'failed'
            };

            return {
                status: statusMapping[data.transaction_status] || 'unknown',
                orderId: data.order_id,
                transactionId: data.transaction_id,
                amount: parseFloat(data.gross_amount),
                currency: data.currency || 'IDR',
                paymentType: data.payment_type,
                transactionStatus: data.transaction_status,
                fraudStatus: data.fraud_status,
                transactionTime: data.transaction_time
            };
        } catch (error) {
            throw new Error(`Error in Midtrans callback handling: ${error.message}`);
        }
    }

    async verifyNotification(data) {
        try {
            const orderId = data.order_id;
            const statusCode = data.status_code;
            const grossAmount = data.gross_amount;
            const serverKey = this.serverKey;
            
            // Signature verification
            const signatureKey = crypto
                .createHash('sha512')
                .update(orderId + statusCode + grossAmount + serverKey)
                .digest('hex');

            if (data.signature_key !== signatureKey) {
                return {
                    status: false,
                    error: {
                        code: 401,
                        message: 'Invalid signature key'
                    }
                };
            }

            // Fraud status check
            if (data.transaction_status === 'capture') {
                if (data.fraud_status === 'challenge') {
                    return {
                        status: false,
                        error: {
                            code: 403,
                            message: 'Transaction challenged by FDS'
                        }
                    };
                } else if (data.fraud_status === 'deny') {
                    return {
                        status: false,
                        error: {
                            code: 403,
                            message: 'Transaction denied by FDS'
                        }
                    };
                }
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

    async cancelTransaction(orderId) {
        try {
            const response = await this.client.post(`${this.coreURL}/${orderId}/cancel`);
            return response.data;
        } catch (error) {
            throw new Error(`Cancel transaction error: ${error.message}`);
        }
    }

    async refundTransaction(orderId, amount, reason) {
        try {
            const refundData = {
                refund_key: `refund-${orderId}-${Date.now()}`,
                amount: amount,
                reason: reason || 'Customer request'
            };

            const response = await this.client.post(`${this.coreURL}/${orderId}/refund`, refundData);
            return response.data;
        } catch (error) {
            throw new Error(`Refund transaction error: ${error.message}`);
        }
    }
}

module.exports = MidtransClient;
