const axios = require('axios');

class PaysendClient {
    constructor(config) {
        const requiredFields = ['apiKey'];
        for (let field of requiredFields) {
            if (!config[field]) throw new Error(`Missing required field: ${field}`);
        }

        this.apiKey = config.apiKey;
        this.isSandbox = config.sandbox || false;

        this.URL = this.isSandbox
            ? 'https://sandbox.paysend.com/v1'
            : 'https://api.paysend.com/v1';

        this.client = axios.create({
            baseURL: this.URL,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            }
        });

        this.client.interceptors.response.use(response => {
            return response;
        }, error => {
            if (error.response) {
                throw new Error(`Paysend API error: ${error.response.data.message || error.message}`);
            }
            throw new Error(`Paysend API error: ${error.message}`);
        });
    }

    async createPayment(options) {
        try {
            const requestData = {
                amount: parseFloat(options.amount),
                currency: options.currency || 'USD',
                recipient: {
                    type: options.recipientType || 'card',
                    card_number: options.cardNumber || '',
                    name: options.recipientName || options.name || 'Recipient'
                },
                sender: {
                    name: options.senderName || 'Sender',
                    email: options.senderEmail || options.email,
                    phone: options.senderPhone || options.phone || ''
                },
                reference: options.reference || options.orderId || `ORDER-${Date.now()}`,
                description: options.description || options.name || 'Payment',
                callback_url: options.callbackUrl || options.callback_link,
                redirect_url: options.redirectUrl || options.callback_link
            };

            const response = await this.client.post('/transfers', requestData);

            return {
                status: 'success',
                data: {
                    transferId: response.data.id,
                    status: response.data.status,
                    amount: response.data.amount,
                    currency: response.data.currency,
                    reference: response.data.reference,
                    createdAt: response.data.created_at
                }
            };
        } catch (error) {
            throw new Error(`Payment creation error: ${error.message}`);
        }
    }

    async getTransferStatus(transferId) {
        try {
            const response = await this.client.get(`/transfers/${transferId}`);
            return response.data;
        } catch (error) {
            throw new Error(`Transfer status error: ${error.message}`);
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
                'completed': 'success',
                'processing': 'pending',
                'pending': 'pending',
                'failed': 'failed',
                'cancelled': 'cancelled'
            };

            return {
                status: statusMapping[data.status] || 'unknown',
                transferId: data.id,
                orderId: data.reference,
                amount: parseFloat(data.amount),
                currency: data.currency,
                transferStatus: data.status,
                completedAt: data.completed_at,
                failureReason: data.failure_reason
            };
        } catch (error) {
            throw new Error(`Error in Paysend callback handling: ${error.message}`);
        }
    }

    async verifyCallback(data) {
        try {
            if (data.status === 'failed') {
                return {
                    status: false,
                    error: {
                        code: 400,
                        message: data.failure_reason || 'Transfer failed'
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
            const response = await this.client.get('/balance');
            return response.data;
        } catch (error) {
            throw new Error(`Balance error: ${error.message}`);
        }
    }

    async getExchangeRate(fromCurrency, toCurrency, amount) {
        try {
            const response = await this.client.get('/rates', {
                params: {
                    from: fromCurrency,
                    to: toCurrency,
                    amount: amount
                }
            });
            return response.data;
        } catch (error) {
            throw new Error(`Exchange rate error: ${error.message}`);
        }
    }

    async getSupportedCountries() {
        try {
            const response = await this.client.get('/countries');
            return response.data;
        } catch (error) {
            throw new Error(`Supported countries error: ${error.message}`);
        }
    }

    async validateCard(cardNumber) {
        try {
            const response = await this.client.post('/cards/validate', {
                card_number: cardNumber
            });
            return response.data;
        } catch (error) {
            throw new Error(`Card validation error: ${error.message}`);
        }
    }
}

module.exports = PaysendClient;
