const crypto = require('crypto');
const https = require('https');

class Heleket {
  constructor(config) {
    this.config = config || {};
    const requiredFields = ['merchantId', 'apiKey'];
    for (let field of requiredFields) {
      if (!config[field]) throw new Error(`Missing required field: ${field}`);
    }

    this.merchantId = config.merchantId;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'api.heleket.com';
  }

  /**
   * Generate signature for authentication
   * @param {object|string} data - Request data
   * @returns {string} - MD5 hash signature
   */
  generateSignature(data) {
    const jsonData = typeof data === 'string' ? data : JSON.stringify(data);
    const base64Data = Buffer.from(jsonData).toString('base64');
    return crypto.createHash('md5').update(base64Data + this.apiKey).digest('hex');
  }

  /**
   * Make a request to the Heleket API
   * @param {string} endpoint - API endpoint path
   * @param {object} data - Request data object
   * @returns {Promise} - Promise resolving to response data
   */
  request(endpoint, data = {}) {
    return new Promise((resolve, reject) => {
      const jsonData = JSON.stringify(data);
      const sign = this.generateSignature(jsonData);
      
      const options = {
        hostname: this.baseUrl,
        path: endpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(jsonData),
          'merchant': this.merchantId,
          'sign': sign
        }
      };
      
      const req = https.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            const parsedData = JSON.parse(responseData);
            resolve(parsedData);
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.write(jsonData);
      req.end();
    });
  }

  /**
   * Get payment services
   * @returns {Promise} - Promise resolving to available payment services
   */
  getPaymentServices() {
    return this.request('/v1/payment/services', {});
  }

  /**
   * Create an invoice
   * @param {object} invoiceData - Invoice data
   * @returns {Promise} - Promise resolving to created invoice
   */
  createInvoice(invoiceData) {
    return this.request('/v1/payment', invoiceData);
  }

  /**
   * Verify webhook signature
   * @param {object} webhookData - Webhook data received
   * @returns {boolean} - Whether signature is valid
   */
  verifyWebhookSignature(webhookData) {
    // Clone webhook data to avoid modifying the original
    const data = {...webhookData};
    
    // Extract signature from data
    const receivedSign = data.sign;
    delete data.sign;
    
    // Generate expected signature
    const jsonData = JSON.stringify(data);
    const expectedSign = this.generateSignature(jsonData);
    
    return receivedSign === expectedSign;
  }

  /**
   * Handle callback from Heleket webhook
   * @param {object} webhookData - Webhook data received from Heleket
   * @returns {object} - Processed payment result
   */
  async handleCallback(webhookData) {
    try {
      // Verify signature first
      const isValidSignature = this.verifyWebhookSignature(webhookData);
      
      if (!isValidSignature) {
        throw new Error("Heleket notification failed: invalid signature");
      }
      
      // Clone webhook data to avoid modifying the original
      const data = {...webhookData};
      
      // Process successful payments
      if (data.status === 'paid') {
        return {
          status: 'success',
          orderId: data.order_id,
          transactionId: data.transaction_id || data.order_id,
          amount: data.amount,
          currency: data.currency,
          network: data.network || null,
          paymentType: 'crypto'
        };
      } else {
        throw new Error(`Payment failed with status: ${data.status}`);
      }
    } catch (error) {
      throw new Error(`Error in Heleket callback handling: ${error.message}`);
    }
  }

  /**
   * Test payment webhook
   * @param {object} params - Test parameters
   * @param {string} params.url_callback - URL to which webhooks will be sent
   * @param {string} params.currency - Invoice currency code
   * @param {string} params.network - Invoice network code
   * @param {string} [params.uuid] - UUID of the invoice
   * @param {string} [params.order_id] - Order ID of the invoice
   * @param {string} [params.status=paid] - Payment status
   * @returns {Promise} - Promise resolving to test result
   */
  testPaymentWebhook(params) {
    if (!params.url_callback || !params.currency || !params.network) {
      throw new Error('Missing required parameters: url_callback, currency, network');
    }
    
    // Set default status if not provided
    params.status = params.status || 'paid';
    
    return this.request('/v1/test-webhook/payment', params);
  }

  /**
   * Test payout webhook
   * @param {object} params - Test parameters
   * @param {string} params.url_callback - URL to which webhooks will be sent
   * @param {string} params.currency - Payout currency code
   * @param {string} params.network - Payout network code
   * @param {string} [params.uuid] - UUID of the payout
   * @param {string} [params.order_id] - Order ID of the payout
   * @param {string} [params.status=paid] - Payout status
   * @returns {Promise} - Promise resolving to test result
   */
  testPayoutWebhook(params) {
    if (!params.url_callback || !params.currency || !params.network) {
      throw new Error('Missing required parameters: url_callback, currency, network');
    }
    
    // Set default status if not provided
    params.status = params.status || 'paid';
    
    return this.request('/v1/test-webhook/payout', params);
  }

  /**
   * Test wallet webhook
   * @param {object} params - Test parameters
   * @param {string} params.url_callback - URL to which webhooks will be sent
   * @param {string} params.currency - Payment currency code
   * @param {string} params.network - Payment network code
   * @param {string} [params.uuid] - UUID of business wallet
   * @param {string} [params.order_id] - Order ID of the invoice
   * @param {string} [params.status=paid] - Payment status
   * @returns {Promise} - Promise resolving to test result
   */
  testWalletWebhook(params) {
    if (!params.url_callback || !params.currency || !params.network) {
      throw new Error('Missing required parameters: url_callback, currency, network');
    }
    
    // Set default status if not provided
    params.status = params.status || 'paid';
    
    return this.request('/v1/test-webhook/wallet', params);
  }
}

module.exports = Heleket;
