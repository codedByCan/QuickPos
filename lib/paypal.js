const braintree = require('braintree');

class PayPal {
  constructor(config) {
    this.config = config || {};
    const requiredFields = ['merchantId', 'publicKey', 'privateKey'];
    for (let field of requiredFields) {
      if (!config[field]) throw new Error(`Missing required field: ${field}`);
    }

    const environment = config.environment === 'production' 
      ? braintree.Environment.Production 
      : braintree.Environment.Sandbox;

    this.gateway = new braintree.BraintreeGateway({
      environment: environment,
      merchantId: config.merchantId,
      publicKey: config.publicKey,
      privateKey: config.privateKey
    });
  }

  async generateClientToken(options = {}) {
    try {
      const response = await this.gateway.clientToken.generate(options);
      return response.clientToken;
    } catch (error) {
      throw new Error(`Client token oluşturma hatası: ${error.message}`);
    }
  }

  async processPayment(saleData) {
    try {
      if (!saleData.amount || !saleData.paymentMethodNonce) {
        throw new Error('Tutar ve payment method nonce gerekli');
      }

      const saleRequest = {
        amount: saleData.amount,
        paymentMethodNonce: saleData.paymentMethodNonce,
        orderId: saleData.orderId,
        customer: saleData.customer,
        options: {
          submitForSettlement: true,
          ...saleData.options
        }
      };

      const result = await this.gateway.transaction.sale(saleRequest);
      
      if (result.success) {
        return {
          success: true,
          transactionId: result.transaction.id,
          status: result.transaction.status,
          amount: result.transaction.amount,
          currency: result.transaction.currencyIsoCode,
          orderId: result.transaction.orderId,
          paymentType: 'paypal',
          createdAt: result.transaction.createdAt
        };
      } else {
        throw new Error(result.message || 'İşlem başarısız');
      }
    } catch (error) {
      throw new Error(`Ödeme işlemi hatası: ${error.message}`);
    }
  }

  async getTransaction(transactionId) {
    try {
      const result = await this.gateway.transaction.find(transactionId);
      return result;
    } catch (error) {
      throw new Error(`İşlem bulunamadı: ${error.message}`);
    }
  }

  async searchTransactions(searchParams = {}) {
    try {
      const stream = await this.gateway.transaction.search((search) => {
        if (searchParams.orderId) {
          search.orderId().is(searchParams.orderId);
        }
        if (searchParams.status) {
          search.status().is(searchParams.status);
        }
        if (searchParams.customerId) {
          search.customerId().is(searchParams.customerId);
        }
        if (searchParams.startDate && searchParams.endDate) {
          search.createdAt().between(searchParams.startDate, searchParams.endDate);
        }
      });

      return new Promise((resolve, reject) => {
        const transactions = [];
        stream.on('data', (transaction) => {
          transactions.push(transaction);
        });
        stream.on('end', () => {
          resolve(transactions);
        });
        stream.on('error', (err) => {
          reject(new Error(`İşlem arama hatası: ${err.message}`));
        });
      });
    } catch (error) {
      throw new Error(`İşlem arama hatası: ${error.message}`);
    }
  }

  async refundTransaction(transactionId, amount = null) {
    try {
      let result;
      
      if (amount) {
        result = await this.gateway.transaction.refund(transactionId, amount);
      } else {
        result = await this.gateway.transaction.refund(transactionId);
      }
      
      if (result.success) {
        return {
          success: true,
          refundId: result.transaction.id,
          originalTransactionId: transactionId,
          amount: result.transaction.amount,
          status: result.transaction.status
        };
      } else {
        throw new Error(result.message || 'İade işlemi başarısız');
      }
    } catch (error) {
      throw new Error(`İade işlemi hatası: ${error.message}`);
    }
  }

  async handleWebhook(signature, payload) {
    try {
      const webhookNotification = await this.gateway.webhookNotification.parse(signature, payload);
      
      const kind = webhookNotification.kind;
      const timestamp = webhookNotification.timestamp;
      
      switch (kind) {
        case 'subscription_went_active':
        case 'subscription_charged_successfully':
          return {
            event: 'subscription_payment',
            status: 'success',
            subscriptionId: webhookNotification.subscription.id,
            transactionId: webhookNotification.subscription.transactions[0]?.id,
            planId: webhookNotification.subscription.planId,
            amount: webhookNotification.subscription.transactions[0]?.amount,
            timestamp: timestamp
          };
          
        case 'subscription_charged_unsuccessfully':
          return {
            event: 'subscription_payment',
            status: 'failed',
            subscriptionId: webhookNotification.subscription.id,
            planId: webhookNotification.subscription.planId,
            timestamp: timestamp
          };
          
        case 'subscription_canceled':
          return {
            event: 'subscription_canceled',
            subscriptionId: webhookNotification.subscription.id,
            planId: webhookNotification.subscription.planId,
            timestamp: timestamp
          };
          
        case 'transaction_settled':
          return {
            event: 'payment_settled',
            status: 'success',
            transactionId: webhookNotification.transaction.id,
            amount: webhookNotification.transaction.amount,
            orderId: webhookNotification.transaction.orderId,
            timestamp: timestamp
          };
          
        case 'transaction_settlement_declined':
          return {
            event: 'payment_settlement_declined',
            status: 'failed',
            transactionId: webhookNotification.transaction.id,
            amount: webhookNotification.transaction.amount,
            orderId: webhookNotification.transaction.orderId,
            timestamp: timestamp
          };
          
        default:
          return {
            event: kind,
            raw: webhookNotification
          };
      }
    } catch (error) {
      throw new Error(`Webhook işleme hatası: ${error.message}`);
    }
  }

  async testWebhook(kind, id) {
    try {
      const result = await this.gateway.webhookTesting.sampleNotification(kind, id);
      return {
        btSignature: result.bt_signature,
        btPayload: result.bt_payload
      };
    } catch (error) {
      throw new Error(`Test webhook oluşturma hatası: ${error.message}`);
    }
  }

  async createPaymentLink(linkData) {
    try {
      if (!linkData.amount || !linkData.currency) {
        throw new Error('Tutar ve para birimi gerekli');
      }

      const orderId = linkData.orderId || `order-${Date.now()}`;
      
      const returnUrl = linkData.successUrl || 'http://localhost:3000/success';
      const cancelUrl = linkData.cancelUrl || 'http://localhost:3000/cancel';
      const clientToken = await this.generateClientToken();

      return {
        success: true,
        clientToken: clientToken,
        amount: linkData.amount,
        currency: linkData.currency,
        orderId: orderId,
        description: linkData.description || `Payment: ${linkData.amount} ${linkData.currency}`,
        successUrl: returnUrl,
        cancelUrl: cancelUrl,
        paypalCheckoutDetails: {
          clientToken: clientToken,
          amount: linkData.amount,
          currency: linkData.currency,
          orderId: orderId,
          description: linkData.description || `Payment: ${linkData.amount} ${linkData.currency}`,
          successUrl: returnUrl,
          cancelUrl: cancelUrl
        }
      };
    } catch (error) {
      throw new Error(`Ödeme bağlantısı oluşturma hatası: ${error.message}`);
    }
  }

  async createCheckoutOptions(checkoutData) {
    try {
      if (!checkoutData.amount) {
        throw new Error('Tutar bilgisi gerekli');
      }

      const clientToken = await this.generateClientToken();
      const orderId = checkoutData.orderId || `order-${Date.now()}`;

      const setupCode = Buffer.from(JSON.stringify({
        amount: checkoutData.amount,
        currency: checkoutData.currency || 'USD',
        orderId: orderId,
        intent: 'capture',
        successUrl: checkoutData.successUrl || '',
        cancelUrl: checkoutData.cancelUrl || ''
      })).toString('base64');

      return {
        success: true,
        clientToken: clientToken,
        setupCode: setupCode,
        orderId: orderId,
        amount: checkoutData.amount,
        currency: checkoutData.currency || 'USD',
        successUrl: checkoutData.successUrl,
        cancelUrl: checkoutData.cancelUrl,
        paymentUrl: `https://your-app-domain.com/paypal-checkout?setup=${setupCode}`
      };
    } catch (error) {
      throw new Error(`Checkout seçenekleri oluşturma hatası: ${error.message}`);
    }
  }

  async completePayment(paymentNonce, setupCode) {
    try {
      const setupData = JSON.parse(Buffer.from(setupCode, 'base64').toString());
      
      const paymentResult = await this.processPayment({
        amount: setupData.amount,
        paymentMethodNonce: paymentNonce,
        orderId: setupData.orderId,
        options: {
          submitForSettlement: true
        }
      });
      
      return {
        success: true,
        transactionId: paymentResult.transactionId,
        status: paymentResult.status,
        amount: paymentResult.amount,
        orderId: paymentResult.orderId,
        redirectUrl: setupData.successUrl || null
      };
    } catch (error) {
      throw new Error(`Ödeme tamamlama hatası: ${error.message}`);
    }
  }

  async renderHtmlCheckout(data) {
    try {
      if (!data.amount) {
        throw new Error('Amount is required');
      }

      const amount = data.amount;
      const currency = data.currency || 'USD';
      const orderId = data.orderId || `order-${Date.now()}`;
      const description = data.description || `Payment: ${amount} ${currency}`;
      const successUrl = data.successUrl || 'http://localhost:3000/success';
      const cancelUrl = data.cancelUrl || 'http://localhost:3000/cancel';
      
      const clientToken = await this.generateClientToken();
      
      return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Secure Payment | QuickPos</title>
          <script src="https://www.paypal.com/sdk/js?client-id=test&currency=${currency}"></script>
          <style>
            :root {
              --primary-color: #0070ba;
              --secondary-color: #003087;
              --accent-color: #009cde;
              --background-color: #f7f9fa;
              --success-color: #26c281;
              --text-color: #2c3e50;
              --border-color: #e5e8ec;
            }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              background: var(--background-color);
              color: var(--text-color);
              line-height: 1.6;
              padding: 0;
              margin: 0;
            }
            .header {
              background: #fff;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              padding: 15px 0;
              position: relative;
            }
            .header-content {
              display: flex;
              justify-content: space-between;
              align-items: center;
              max-width: 1200px;
              margin: 0 auto;
              padding: 0 20px;
            }
            .logo {
              font-weight: 700;
              font-size: 1.5rem;
              color: var(--primary-color);
            }
            .secure-badge {
              display: flex;
              align-items: center;
              font-size: 14px;
              color: #718096;
            }
            .secure-badge svg {
              margin-right: 6px;
              fill: #718096;
            }
            .container {
              max-width: 500px;
              margin: 30px auto;
              background: white;
              border-radius: 8px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.05);
              overflow: hidden;
            }
            .payment-header {
              padding: 20px 25px;
              border-bottom: 1px solid var(--border-color);
            }
            .payment-title {
              font-size: 18px;
              font-weight: 600;
              color: var(--text-color);
            }
            .payment-details {
              padding: 20px 25px;
              border-bottom: 1px solid var(--border-color);
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid var(--border-color);
            }
            .detail-row:last-child {
              border-bottom: none;
            }
            .detail-label {
              color: #718096;
              font-size: 14px;
            }
            .detail-value {
              font-weight: 600;
              font-size: 14px;
            }
            .payment-methods {
              padding: 20px 25px;
            }
            .method-title {
              font-size: 16px;
              font-weight: 600;
              margin-bottom: 15px;
              color: var(--text-color);
            }
            #paypal-button-container {
              margin: 15px 0;
            }
            .cancel-btn {
              display: block;
              width: 100%;
              padding: 10px;
              text-align: center;
              background: #f1f5f9;
              color: #475569;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-weight: 500;
              text-decoration: none;
              margin-top: 15px;
              transition: background 0.2s ease;
            }
            .cancel-btn:hover {
              background: #e2e8f0;
            }
            .footer {
              text-align: center;
              padding: 20px;
              color: #94a3b8;
              font-size: 12px;
              background: #fff;
              border-top: 1px solid var(--border-color);
              margin-top: 30px;
            }
            .footer a {
              color: var(--primary-color);
              text-decoration: none;
            }
            .footer a:hover {
              text-decoration: underline;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="payment-header">
              <h1 class="payment-title">${description}</h1>
            </div>
            
            <div class="payment-details">
              <div class="detail-row">
                <span class="detail-label">Amount</span>
                <span class="detail-value">${currency} ${amount}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Order ID</span>
                <span class="detail-value">${orderId}</span>
              </div>
            </div>
            
            <div class="payment-methods">
              <h2 class="method-title">Select Payment Method</h2>
              <div id="paypal-button-container"></div>
              <a href="/" class="cancel-btn">Cancel Payment</a>
            </div>
          </div>
          
          <script>
            paypal.Buttons({
              style: {
                layout: 'vertical',
                color: 'blue',
                shape: 'rect',
                label: 'pay'
              },
              createOrder: function(data, actions) {
                return actions.order.create({
                  purchase_units: [{
                    amount: {
                      value: "${amount}",
                      currency_code: "${currency}"
                    },
                    description: "${description}",
                    invoice_id: "${orderId}"
                  }]
                });
              },
              
              onApprove: function(data, actions) {
                return actions.order.capture().then(function(details) {
                  window.location.href = "${successUrl}?order_id=${orderId}&paymentId=" + data.orderID + "&PayerID=" + details.payer.payer_id;
                });
              },
              
              onCancel: function(data) {
                window.location.href = "${cancelUrl}";
              },
              
              onError: function(err) {
                console.error('PayPal error:', err);
                alert('Payment error occurred. Please try again.');
              }
            }).render('#paypal-button-container');
          </script>
        </body>
        </html>
      `;
    } catch (error) {
      throw new Error(`Checkout rendering error: ${error.message}`);
    }
  }

  /**
   * Create payment (wrapper for processPayment)
   * @param {Object} paymentData - Payment data
   * @returns {Promise<Object>} - Payment result
   */
  async createPayment(paymentData) {
    try {
      // For PayPal, we can use processPayment or create a payment link
      // Since Braintree is used, we'll simulate a payment creation
      const clientToken = await this.generateClientToken();
      
      return {
        success: true,
        paymentUrl: `https://www.paypal.com/checkout?token=${clientToken}`, // Simplified
        transactionId: paymentData.orderId,
        amount: paymentData.amount,
        currency: paymentData.currency || 'USD',
        clientToken: clientToken
      };
    } catch (error) {
      throw new Error(`PayPal payment creation failed: ${error.message}`);
    }
  }

  /**
   * Handle callback/webhook
   * @param {Object} callbackData - Webhook data
   * @returns {Promise<Object>} - Callback result
   */
  async handleCallback(callbackData) {
    try {
      // Use existing handleWebhook method
      const result = await this.handleWebhook('', callbackData);
      
      if (result && result.success) {
        return {
          success: true,
          transactionId: result.transactionId,
          status: 'completed',
          amount: result.amount,
          rawData: callbackData
        };
      } else {
        return {
          success: false,
          status: 'failed',
          rawData: callbackData
        };
      }
    } catch (error) {
      throw new Error(`PayPal callback handling failed: ${error.message}`);
    }
  }
}

module.exports = PayPal;