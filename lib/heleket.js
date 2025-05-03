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
}

module.exports = Heleket;
