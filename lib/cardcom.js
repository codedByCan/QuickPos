const axios = require('axios');

class CardcomClient {
    constructor(config) {
        const requiredFields = ['terminalNumber', 'userName'];
        for (let field of requiredFields) {
            if (!config[field]) throw new Error(`Missing required field: ${field}`);
        }

        this.terminalNumber = config.terminalNumber;
        this.userName = config.userName;
        this.apiName = config.apiName || this.userName;
        this.URL = 'https://secure.cardcom.solutions/api/v11';

        this.client = axios.create({
            baseURL: this.URL,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        this.client.interceptors.response.use(response => {
            return response;
        }, error => {
            if (error.response) {
                throw new Error(`Cardcom API error: ${error.response.data.ResponseMessage || error.message}`);
            }
            throw new Error(`Cardcom API error: ${error.message}`);
        });
    }

    async createPayment(options) {
        try {
            const requestData = {
                TerminalNumber: this.terminalNumber,
                UserName: this.userName,
                APILevel: 10,
                Operation: {
                    Type: 2, // Create Invoice
                    SumToBill: parseFloat(options.amount),
                    Currency: options.currency || 'ILS',
                    Description: options.description || options.name || 'Payment',
                    InvoiceHead: {
                        CustName: options.customerName || options.name || 'Customer',
                        SendByEmail: true,
                        CustEmail: options.email,
                        CustMobile: options.mobile || options.phone || '',
                        ExtendedInvoiceType: 1,
                        InvoiceType: options.invoiceType || 1,
                        Language: options.language || 'he'
                    }
                },
                ReturnValue: options.returnUrl || options.callback_link,
                IndicatorUrl: options.callbackUrl || options.callback_link,
                InternalDealNumber: options.internalDealNumber || options.orderId || `ORDER-${Date.now()}`
            };

            if (options.items && Array.isArray(options.items)) {
                requestData.Operation.InvoiceLines = {
                    InvoiceLine: options.items
                };
            }

            const response = await this.client.post('/LowProfile/CreateInvoice', requestData);

            if (response.data.ResponseCode === 0) {
                return {
                    status: 'success',
                    data: {
                        lowProfileId: response.data.LowProfileId,
                        lowProfileCode: response.data.LowProfileCode,
                        url: response.data.Url,
                        internalDealNumber: requestData.InternalDealNumber
                    }
                };
            } else {
                throw new Error(response.data.ResponseMessage || 'Payment creation failed');
            }
        } catch (error) {
            throw new Error(`Payment creation error: ${error.message}`);
        }
    }

    async getInvoiceDetails(lowProfileId) {
        try {
            const requestData = {
                TerminalNumber: this.terminalNumber,
                UserName: this.userName,
                LowProfileId: lowProfileId
            };

            const response = await this.client.post('/LowProfile/GetLowProfileIndicator', requestData);
            return response.data;
        } catch (error) {
            throw new Error(`Invoice details error: ${error.message}`);
        }
    }

    async handleCallback(callbackData) {
        try {
            const verification = await this.verifyCallback(callbackData);
            
            if (!verification.status) {
                throw new Error(verification.error.message);
            }

            const data = verification.data;
            
            // Status mapping based on OperationResponse
            const statusMapping = {
                '0': 'success',
                '1': 'failed'
            };

            return {
                status: statusMapping[data.OperationResponse] || 'unknown',
                lowProfileId: data.LowProfileId,
                internalDealNumber: data.InternalDealNumber,
                orderId: data.InternalDealNumber,
                operationResponse: data.OperationResponse,
                operationResponseText: data.OperationResponseText,
                extendedResponseText: data.ExtendedResponseText
            };
        } catch (error) {
            throw new Error(`Error in Cardcom callback handling: ${error.message}`);
        }
    }

    async verifyCallback(data) {
        try {
            if (data.OperationResponse !== '0') {
                return {
                    status: false,
                    error: {
                        code: 400,
                        message: data.ExtendedResponseText || 'Payment failed'
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

    async chargeCard(options) {
        try {
            const requestData = {
                TerminalNumber: this.terminalNumber,
                UserName: this.userName,
                APILevel: 10,
                CardNumber: options.cardNumber,
                DateMMYY: options.expiryDate, // MMYY format
                CVV: options.cvv,
                SumToBill: parseFloat(options.amount),
                Currency: options.currency || 'ILS',
                CustomerName: options.customerName || options.name || 'Customer',
                CustomerEmail: options.email,
                InternalDealNumber: options.internalDealNumber || options.orderId || `ORDER-${Date.now()}`,
                IndicatorUrl: options.callbackUrl || options.callback_link
            };

            const response = await this.client.post('/DealWasSuccessful', requestData);

            if (response.data.ResponseCode === 0) {
                return {
                    status: 'success',
                    data: {
                        dealResponse: response.data.DealResponse,
                        internalDealNumber: response.data.InternalDealNumber,
                        confirmationNumber: response.data.ConfirmationNumber
                    }
                };
            } else {
                throw new Error(response.data.ResponseMessage || 'Card charge failed');
            }
        } catch (error) {
            throw new Error(`Card charge error: ${error.message}`);
        }
    }
}

module.exports = CardcomClient;
