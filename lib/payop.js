/**
 * Payop - JavaScript client for Payop payment service
 * Based on documentation: https://github.com/Payop/payop-api-doc
 */
class Payop {
  /**
   * Create a new Payop client
   * @param {Object} config - Configuration options
   * @param {string} config.publicKey - Public key for merchant identification
   * @param {string} config.secretKey - Secret key for signing requests
   * @param {string} [config.environment] - API environment ('production' or 'sandbox')
   */
  constructor(config) {
    this.config = {
      environment: 'production',
      ...config
    };
    
    this.baseUrl = this.config.environment === 'sandbox' 
      ? 'https://payop.com/api/v1' 
      : 'https://payop.com/api/v1';
  }

  /**
   * Generate a unique identifier
   * @returns {string} - Unique ID
   */
  generateUniqueId() {
    return require('crypto').randomBytes(16).toString('hex');
  }

  /**
   * Calculate a signature for Payop requests
   * @param {Object} data - Data to sign
   * @returns {string} - Signature
   */
  createSignature(data) {
    const stringToSign = this._createStringToSign(data);
    return require('crypto')
      .createHash('sha256')
      .update(stringToSign)
      .digest('hex');
  }

  /**
   * Create string to sign from data object
   * @param {Object} data - Data object
   * @returns {string} - String to sign
   * @private
   */
  _createStringToSign(data) {
    // According to Payop docs, we need to sort the data,
    // concatenate everything except the 'signature' field,
    // and then hash it
    const sortedKeys = Object.keys(data).sort();
    return sortedKeys
      .filter(key => key !== 'signature' && data[key] !== null && data[key] !== undefined)
      .map(key => data[key])
      .join(':');
  }

  /**
   * Make an authenticated API request to Payop
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request data
   * @param {string} method - HTTP method
   * @returns {Promise<Object>} - Response data
   */
  async makeRequest(endpoint, data = {}, method = 'POST') {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-API-KEY': this.config.publicKey
        }
      };

      if (method !== 'GET' && data) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(url, options);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(`Payop API error: ${JSON.stringify(result)}`);
      }
      
      return result;
    } catch (error) {
      throw new Error(`Payop API request failed: ${error.message}`);
    }
  }

  /**
   * Create a checkout invoice
   * @param {Object} options - Invoice options
   * @param {string} options.order - Order ID in your system
   * @param {number} options.amount - Payment amount
   * @param {string} options.currency - Payment currency (3-letter code)
   * @param {string} options.description - Payment description
   * @param {Object} options.customer - Customer information (email, name, etc)
   * @param {string} options.resultUrl - URL to redirect after payment
   * @param {string} options.failPath - URL to redirect after failed payment
   * @param {Object[]} [options.products] - Products information
   * @returns {Promise<Object>} - Created invoice data
   */
  async createInvoice(options) {
    const data = {
      publicKey: this.config.publicKey,
      order: {
        id: options.order,
        amount: options.amount,
        currency: options.currency,
        description: options.description,
        items: options.products || []
      },
      customer: options.customer,
      resultUrl: options.resultUrl,
      failPath: options.failPath
    };

    // Calculate and add signature
    const signature = this.createSignature({
      id: data.order.id,
      amount: data.order.amount,
      currency: data.order.currency
    });
    
    data.signature = signature;

    return this.makeRequest('/checkout/create', data);
  }

  /**
   * Get invoice status
   * @param {string} invoiceId - Invoice ID
   * @returns {Promise<Object>} - Invoice status information
   */
  async getInvoice(invoiceId) {
    return this.makeRequest(`/checkout/invoice/${invoiceId}`, null, 'GET');
  }

  /**
   * Get transaction information
   * @param {string} transactionId - Transaction ID
   * @returns {Promise<Object>} - Transaction information
   */
  async getTransaction(transactionId) {
    return this.makeRequest(`/transaction/${transactionId}`, null, 'GET');
  }

  /**
   * Get available payment methods
   * @param {string} currency - Currency code (e.g., 'USD')
   * @returns {Promise<Object>} - Available payment methods
   */
  async getPaymentMethods(currency) {
    return this.makeRequest(`/instrument-settings/payment-methods/${currency}`, null, 'GET');
  }

  /**
   * Issue a refund
   * @param {Object} options - Refund options
   * @param {string} options.transactionId - Transaction ID
   * @param {number} options.amount - Refund amount
   * @param {string} [options.currency] - Refund currency
   * @param {string} [options.description] - Refund description
   * @returns {Promise<Object>} - Refund result
   */
  async refund(options) {
    const data = {
      transactionId: options.transactionId,
      amount: options.amount
    };

    if (options.currency) data.currency = options.currency;
    if (options.description) data.description = options.description;

    return this.makeRequest('/refund/create', data);
  }

  /**
   * Verify IPN (Instant Payment Notification) from Payop
   * @param {Object} notification - Notification data received from Payop
   * @returns {boolean} - True if notification is valid
   */
  verifyNotification(notification) {
    if (!notification || !notification.signature) {
      return false;
    }

    const receivedSignature = notification.signature;
    const calculatedSignature = this.createSignature({
      id: notification.transaction.id,
      amount: notification.transaction.amount,
      currency: notification.transaction.currency
    });

    return receivedSignature === calculatedSignature;
  }

  /**
   * Create a payout
   * @param {Object} options - Payout options
   * @param {string} options.method - Payout method ID
   * @param {number} options.amount - Payout amount
   * @param {string} options.currency - Payout currency
   * @param {Object} options.recipient - Recipient information
   * @param {string} [options.metadata] - Additional payout metadata
   * @returns {Promise<Object>} - Payout result
   */
  async createPayout(options) {
    const data = {
      method: options.method,
      amount: options.amount,
      currency: options.currency,
      recipient: options.recipient
    };

    if (options.metadata) data.metadata = options.metadata;

    // Calculate and add signature
    const signature = this.createSignature({
      amount: data.amount,
      currency: data.currency
    });
    
    data.signature = signature;

    return this.makeRequest('/payouts/create', data);
  }

  /**
   * Get available payout methods
   * @returns {Promise<Object>} - Available payout methods
   */
  async getPayoutMethods() {
    return this.makeRequest('/payouts/methods', null, 'GET');
  }

  /**
   * Check payout status
   * @param {string} payoutId - Payout ID
   * @returns {Promise<Object>} - Payout status
   */
  async getPayoutStatus(payoutId) {
    return this.makeRequest(`/payouts/${payoutId}`, null, 'GET');
  }
}

module.exports = Payop;
