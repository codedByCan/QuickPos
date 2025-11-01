const axios = require('axios');
const crypto = require('crypto');

class ShurjoPayClient {
    constructor(config) {
        const requiredFields = ['username', 'password', 'prefix'];
        for (let field of requiredFields) {
            if (!config[field]) throw new Error(`Missing required field: ${field}`);
        }

        this.username = config.username;
        this.password = config.password;
        this.prefix = config.prefix;
        this.baseURL = config.sandbox 
            ? 'https://sandbox.shurjopayment.com' 
            : 'https://engine.shurjopayment.com';
        
        this.token = null;

        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    async authenticate() {
        try {
            const response = await this.client.post('/api/get_token', {
                username: this.username,
                password: this.password
            });

            if (response.data.token) {
                this.token = response.data.token;
                this.client.defaults.headers['Authorization'] = `Bearer ${this.token}`;
                return this.token;
            } else {
                throw new Error('Authentication failed');
            }
        } catch (error) {
            throw new Error(`Authentication error: ${error.response?.data?.message || error.message}`);
        }
    }

    async createPayment(options) {
        try {
            if (!this.token) {
                await this.authenticate();
            }

            const orderId = options.orderId || `${this.prefix}${Date.now()}`;
            
            const paymentData = {
                prefix: this.prefix,
                token: this.token,
                return_url: options.successUrl || options.callback_link,
                cancel_url: options.failUrl || options.callback_link,
                store_id: this.prefix,
                amount: parseFloat(options.amount),
                order_id: orderId,
                currency: options.currency || 'BDT',
                customer_name: options.name || options.customerName || '',
                customer_address: options.address || '',
                customer_city: options.city || 'Dhaka',
                customer_phone: options.phone || '',
                customer_email: options.email || '',
                client_ip: options.clientIp || '127.0.0.1',
                intent: 'sale',
                discsount_amount: options.discount || 0,
                disc_percent: options.discountPercent || 0
            };

            const response = await this.client.post('/api/secret-pay', paymentData);

            if (response.data.checkout_url) {
                return {
                    status: 'success',
                    data: {
                        url: response.data.checkout_url,
                        orderId: orderId,
                        amount: paymentData.amount,
                        currency: paymentData.currency,
                        sp_order_id: response.data.sp_order_id
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
            const orderId = callbackData.order_id;
            
            if (!orderId) {
                throw new Error('Order ID not found in callback data');
            }

            // Verify payment
            const verification = await this.verifyPayment(orderId);

            // Status mapping
            const statusMapping = {
                'success': 'success',
                'Success': 'success',
                'failed': 'failed',
                'Failed': 'failed',
                'pending': 'pending',
                'Pending': 'pending',
                'cancel': 'failed',
                'Cancel': 'failed'
            };

            return {
                status: statusMapping[verification[0].sp_status] || 'unknown',
                orderId: verification[0].order_id,
                transactionId: verification[0].bank_trx_id,
                amount: parseFloat(verification[0].amount),
                currency: verification[0].currency,
                paymentStatus: verification[0].sp_status,
                method: verification[0].method,
                bankStatus: verification[0].bank_status
            };
        } catch (error) {
            throw new Error(`Error in ShurjoPay callback handling: ${error.message}`);
        }
    }

    async verifyPayment(orderId) {
        try {
            if (!this.token) {
                await this.authenticate();
            }

            const response = await this.client.post('/api/verification', {
                order_id: orderId
            });

            return response.data;
        } catch (error) {
            throw new Error(`Error verifying payment: ${error.response?.data?.message || error.message}`);
        }
    }

    async getPaymentStatus(orderId) {
        try {
            return await this.verifyPayment(orderId);
        } catch (error) {
            throw new Error(`Error getting payment status: ${error.message}`);
        }
    }
}

module.exports = ShurjoPayClient;
