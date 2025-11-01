const axios = require('axios');
const crypto = require('crypto');

class TripayClient {
    constructor(config) {
        const requiredFields = ['apiKey', 'privateKey', 'merchantCode'];
        for (let field of requiredFields) {
            if (!config[field]) throw new Error(`Missing required field: ${field}`);
        }

        this.apiKey = config.apiKey;
        this.privateKey = config.privateKey;
        this.merchantCode = config.merchantCode;
        this.isProduction = config.isProduction || false;

        this.URL = this.isProduction 
            ? 'https://tripay.co.id/api' 
            : 'https://tripay.co.id/api-sandbox';

        this.client = axios.create({
            baseURL: this.URL,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        this.client.interceptors.response.use(response => {
            return response;
        }, error => {
            if (error.response) {
                throw new Error(`Tripay API error: ${error.response.data.message || error.message}`);
            }
            throw new Error(`Tripay API error: ${error.message}`);
        });
    }

    async getPaymentChannels() {
        try {
            const response = await this.client.get('/merchant/payment-channel');
            return response.data;
        } catch (error) {
            throw new Error(`Payment channels error: ${error.message}`);
        }
    }

    async createPayment(options) {
        try {
            const merchantRef = options.merchantRef || options.orderId || `ORDER-${Date.now()}`;
            const amount = parseInt(options.amount);

            // Generate signature
            const signature = crypto
                .createHmac('sha256', this.privateKey)
                .update(this.merchantCode + merchantRef + amount)
                .digest('hex');

            const requestData = {
                method: options.paymentMethod || 'BRIVA',
                merchant_ref: merchantRef,
                amount: amount,
                customer_name: options.customerName || options.name || 'Customer',
                customer_email: options.customerEmail || options.email,
                customer_phone: options.customerPhone || options.phone || '08123456789',
                order_items: options.orderItems || [{
                    sku: 'ITEM-001',
                    name: options.itemName || options.name || 'Product',
                    price: amount,
                    quantity: 1
                }],
                callback_url: options.callbackUrl || options.callback_link,
                return_url: options.returnUrl || options.callbackUrl || options.callback_link,
                expired_time: options.expiredTime || (Math.floor(Date.now() / 1000) + (24 * 60 * 60)),
                signature: signature
            };

            const response = await this.client.post('/transaction/create', requestData);

            if (!response.data.success) {
                throw new Error(response.data.message || 'Payment creation failed');
            }

            return {
                status: 'success',
                data: {
                    reference: response.data.data.reference,
                    merchantRef: response.data.data.merchant_ref,
                    paymentUrl: response.data.data.checkout_url,
                    qrUrl: response.data.data.qr_url,
                    amount: response.data.data.amount,
                    fee: response.data.data.total_fee,
                    totalAmount: response.data.data.amount_received,
                    expiredTime: response.data.data.expired_time,
                    paymentMethod: response.data.data.payment_method,
                    paymentName: response.data.data.payment_name,
                    instructions: response.data.data.instructions
                }
            };
        } catch (error) {
            throw new Error(`Payment creation error: ${error.message}`);
        }
    }

    async getTransactionDetail(reference) {
        try {
            const response = await this.client.get(`/transaction/detail?reference=${reference}`);
            
            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to get transaction detail');
            }

            return response.data.data;
        } catch (error) {
            throw new Error(`Transaction detail error: ${error.message}`);
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
                'PAID': 'success',
                'UNPAID': 'pending',
                'EXPIRED': 'expired',
                'FAILED': 'failed',
                'REFUND': 'refunded'
            };

            return {
                status: statusMapping[data.status] || 'unknown',
                reference: data.reference,
                merchantRef: data.merchant_ref,
                orderId: data.merchant_ref,
                amount: parseInt(data.amount),
                totalAmount: parseInt(data.amount_received),
                fee: parseInt(data.total_fee),
                paymentMethod: data.payment_method,
                paymentName: data.payment_name,
                customerName: data.customer_name,
                customerEmail: data.customer_email,
                customerPhone: data.customer_phone,
                paymentStatus: data.status,
                paidAt: data.paid_at
            };
        } catch (error) {
            throw new Error(`Error in Tripay callback handling: ${error.message}`);
        }
    }

    async verifyCallback(data) {
        try {
            const callbackSignature = data.signature || '';
            const privateKey = this.privateKey;

            // Calculate signature
            const json = JSON.stringify(data);
            const expectedSignature = crypto
                .createHmac('sha256', privateKey)
                .update(json)
                .digest('hex');

            if (callbackSignature !== expectedSignature) {
                return {
                    status: false,
                    error: {
                        code: 401,
                        message: 'Invalid callback signature'
                    }
                };
            }

            if (data.status === 'FAILED') {
                return {
                    status: false,
                    error: {
                        code: 400,
                        message: 'Payment failed'
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

    async getFeeCalculator(amount, code) {
        try {
            const response = await this.client.get(`/merchant/fee-calculator?amount=${amount}&code=${code}`);
            
            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to calculate fee');
            }

            return response.data.data;
        } catch (error) {
            throw new Error(`Fee calculator error: ${error.message}`);
        }
    }
}

module.exports = TripayClient;
