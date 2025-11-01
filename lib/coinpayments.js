const axios = require('axios');
const crypto = require('crypto');

class CoinPaymentsClient {
    constructor(config) {
        const requiredFields = ['publicKey', 'privateKey'];
        for (let field of requiredFields) {
            if (!config[field]) throw new Error(`Missing required field: ${field}`);
        }

        this.publicKey = config.publicKey;
        this.privateKey = config.privateKey;
        this.URL = 'https://www.coinpayments.net/api.php';
        this.ipnSecret = config.ipnSecret || '';

        this.client = axios.create({
            baseURL: this.URL,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        this.client.interceptors.response.use(response => {
            return response;
        }, error => {
            if (error.response) {
                throw new Error(`CoinPayments API error: ${error.response.data.error || error.message}`);
            }
            throw new Error(`CoinPayments API error: ${error.message}`);
        });
    }

    generateHMAC(params) {
        const paramString = new URLSearchParams(params).toString();
        return crypto
            .createHmac('sha512', this.privateKey)
            .update(paramString)
            .digest('hex');
    }

    async apiCall(cmd, params = {}) {
        try {
            const requestParams = {
                version: 1,
                cmd: cmd,
                key: this.publicKey,
                format: 'json',
                ...params
            };

            const hmac = this.generateHMAC(requestParams);
            const formData = new URLSearchParams(requestParams);

            const response = await axios.post(this.URL, formData, {
                headers: {
                    'HMAC': hmac,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            if (response.data.error !== 'ok') {
                throw new Error(response.data.error || 'API call failed');
            }

            return response.data.result;
        } catch (error) {
            throw new Error(`API call error: ${error.message}`);
        }
    }

    async createPayment(options) {
        try {
            const params = {
                amount: parseFloat(options.amount),
                currency1: options.currency1 || options.currency || 'USD',
                currency2: options.currency2 || 'BTC',
                buyer_email: options.buyerEmail || options.email,
                buyer_name: options.buyerName || options.name || 'Customer',
                item_name: options.itemName || options.name || 'Product',
                item_number: options.itemNumber || options.orderId || `ORDER-${Date.now()}`,
                invoice: options.invoice || options.orderId || `INV-${Date.now()}`,
                custom: options.custom || '',
                ipn_url: options.ipnUrl || options.callback_link
            };

            const result = await this.apiCall('create_transaction', params);

            return {
                status: 'success',
                data: {
                    txnId: result.txn_id,
                    address: result.address,
                    amount: result.amount,
                    confirmsNeeded: result.confirms_needed,
                    timeout: result.timeout,
                    statusUrl: result.status_url,
                    qrcodeUrl: result.qrcode_url,
                    url: result.checkout_url || result.status_url
                }
            };
        } catch (error) {
            throw new Error(`Payment creation error: ${error.message}`);
        }
    }

    async getTransactionInfo(txnId) {
        try {
            const result = await this.apiCall('get_tx_info', { txid: txnId });
            return result;
        } catch (error) {
            throw new Error(`Transaction info error: ${error.message}`);
        }
    }

    async getCallbackAddress(currency) {
        try {
            const result = await this.apiCall('get_callback_address', {
                currency: currency,
                ipn_url: this.ipnUrl
            });
            return result;
        } catch (error) {
            throw new Error(`Callback address error: ${error.message}`);
        }
    }

    async handleCallback(callbackData) {
        try {
            const verification = await this.verifyIPNCallback(callbackData);
            
            if (!verification.status) {
                throw new Error(verification.error.message);
            }

            const data = verification.data;
            
            // Status mapping
            // Status >= 100 or status == 2 means payment is complete
            const status = parseInt(data.status);
            let paymentStatus = 'pending';
            
            if (status >= 100 || status === 2) {
                paymentStatus = 'success';
            } else if (status < 0) {
                paymentStatus = 'failed';
            }

            return {
                status: paymentStatus,
                txnId: data.txn_id,
                orderId: data.item_number || data.invoice,
                amount: parseFloat(data.amount1 || data.amount),
                currency: data.currency1,
                receivedAmount: parseFloat(data.amount2 || 0),
                receivedCurrency: data.currency2,
                fee: parseFloat(data.fee || 0),
                statusCode: status,
                statusText: data.status_text
            };
        } catch (error) {
            throw new Error(`Error in CoinPayments callback handling: ${error.message}`);
        }
    }

    async verifyIPNCallback(data) {
        try {
            // Verify HMAC signature if available
            if (this.ipnSecret && data.hmac) {
                const merchant = data.merchant;
                delete data.hmac;
                delete data.merchant;

                const paramString = new URLSearchParams(
                    Object.keys(data)
                        .sort()
                        .reduce((obj, key) => {
                            obj[key] = data[key];
                            return obj;
                        }, {})
                ).toString();

                const expectedHmac = crypto
                    .createHmac('sha512', this.ipnSecret)
                    .update(paramString)
                    .digest('hex');

                if (data.hmac !== expectedHmac) {
                    return {
                        status: false,
                        error: {
                            code: 401,
                            message: 'Invalid IPN HMAC signature'
                        }
                    };
                }

                data.merchant = merchant;
            }

            const status = parseInt(data.status);
            if (status < 0) {
                return {
                    status: false,
                    error: {
                        code: 400,
                        message: `Payment failed: ${data.status_text}`
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

    async getRates(short = 1, accepted = 1) {
        try {
            const result = await this.apiCall('rates', { short, accepted });
            return result;
        } catch (error) {
            throw new Error(`Get rates error: ${error.message}`);
        }
    }

    async getBasicInfo() {
        try {
            const result = await this.apiCall('get_basic_info');
            return result;
        } catch (error) {
            throw new Error(`Get basic info error: ${error.message}`);
        }
    }
}

module.exports = CoinPaymentsClient;
