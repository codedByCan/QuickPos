const axios = require('axios');
const crypto = require('crypto');

class ToyyibPayClient {
    constructor(config) {
        const requiredFields = ['secretKey', 'categoryCode'];
        for (let field of requiredFields) {
            if (!config[field]) throw new Error(`Missing required field: ${field}`);
        }

        this.secretKey = config.secretKey;
        this.categoryCode = config.categoryCode;
        this.URL = 'https://dev.toyyibpay.com';

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
                throw new Error(`ToyyibPay API error: ${error.response.data.message || error.message}`);
            }
            throw new Error(`ToyyibPay API error: ${error.message}`);
        });
    }

    async createPayment(options) {
        try {
            const params = new URLSearchParams();
            params.append('userSecretKey', this.secretKey);
            params.append('categoryCode', this.categoryCode);
            params.append('billName', options.billName || options.name || 'Bill');
            params.append('billDescription', options.billDescription || options.description || 'Payment');
            params.append('billPriceSetting', '1');
            params.append('billPayorInfo', '1');
            params.append('billAmount', Math.round(parseFloat(options.amount) * 100));
            params.append('billReturnUrl', options.returnUrl || options.callback_link);
            params.append('billCallbackUrl', options.callbackUrl || options.callback_link);
            params.append('billExternalReferenceNo', options.referenceNo || options.orderId || `ORDER-${Date.now()}`);
            params.append('billTo', options.billTo || options.customerName || options.name || 'Customer');
            params.append('billEmail', options.billEmail || options.email);
            params.append('billPhone', options.billPhone || options.phone || '60123456789');
            params.append('billSplitPayment', '0');
            params.append('billSplitPaymentArgs', '');
            params.append('billPaymentChannel', options.paymentChannel || '0');
            params.append('billContentEmail', options.contentEmail || 'Thank you for your payment');
            
            if (options.billChargeToCustomer) {
                params.append('billChargeToCustomer', options.billChargeToCustomer);
            }

            const response = await this.client.post('/index.php/api/createBill', params);

            if (response.data[0].BillCode) {
                return {
                    status: 'success',
                    data: {
                        billCode: response.data[0].BillCode,
                        url: `${this.URL}/${response.data[0].BillCode}`,
                        referenceNo: options.referenceNo || options.orderId
                    }
                };
            } else {
                throw new Error(response.data[0].error || 'Payment creation failed');
            }
        } catch (error) {
            throw new Error(`Payment creation error: ${error.message}`);
        }
    }

    async getBillTransactions(billCode) {
        try {
            const params = new URLSearchParams();
            params.append('billCode', billCode);

            const response = await this.client.post('/index.php/api/getBillTransactions', params);
            return response.data;
        } catch (error) {
            throw new Error(`Bill transactions error: ${error.message}`);
        }
    }

    async handleCallback(callbackData) {
        try {
            const verification = await this.verifyCallback(callbackData);
            
            if (!verification.status) {
                throw new Error(verification.error.message);
            }

            const data = verification.data;
            
            // Status mapping: 1 = success, 2 = pending, 3 = failed
            const statusMapping = {
                '1': 'success',
                '2': 'pending',
                '3': 'failed'
            };

            return {
                status: statusMapping[data.status_id] || 'unknown',
                billCode: data.billcode,
                orderId: data.order_id || data.billExternalReferenceNo,
                amount: parseFloat(data.amount) / 100,
                transactionId: data.transaction_id,
                paymentStatus: data.status_id,
                transactionTime: data.transaction_time,
                payerName: data.billpayorname,
                payerEmail: data.billpayoremail,
                payerPhone: data.billpayorphone
            };
        } catch (error) {
            throw new Error(`Error in ToyyibPay callback handling: ${error.message}`);
        }
    }

    async verifyCallback(data) {
        try {
            // ToyyibPay uses hash verification
            if (data.status_id === '3') {
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
}

module.exports = ToyyibPayClient;
