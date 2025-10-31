/**
 * PrimePayments - JavaScript client for PrimePayments payment service
 */
class PrimePayments {
  /**
   * Create a new PrimePayments client
   * @param {Object} config - Configuration options
   * @param {string} config.projectId - Project ID
   * @param {string} config.secretWord1 - Secret word 1 for signing requests
   * @param {string} config.secretWord2 - Secret word 2 for verifying notifications
   * @param {string} config.payoutKey - Key for payout operations
   */
  constructor(config) {
    this.config = config;
    this.apiUrl = 'https://pay.primepayments.io/API/v2/';
  }

  /**
   * Calculate MD5 hash
   * @param {string} str - Input string
   * @returns {string} - MD5 hash
   */
  md5(str) {
    return require('crypto').createHash('md5').update(str).digest('hex');
  }

  /**
   * Make an API request to PrimePayments
   * @param {Object} data - Request data
   * @returns {Promise<Object>} - Response data
   */
  async makeRequest(data) {
    const queryString = Object.entries(data)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: queryString
      });

      const result = await response.json();
      return result;
    } catch (error) {
      throw new Error(`PrimePayments API request failed: ${error.message}`);
    }
  }

  /**
   * Initialize a payment and get payment form URL
   * @param {Object} options - Payment options
   * @param {number} options.sum - Payment amount
   * @param {string} options.currency - Payment currency (RUB, UAH, USD, EUR)
   * @param {string} options.innerID - Internal ID in your system
   * @param {string} options.email - Customer email
   * @param {string} [options.payWay] - Preferred payment method (1-cards, 2-Yandex, etc.)
   * @param {string} [options.comment] - Payment description
   * @param {boolean} [options.needFailNotice] - Send notification on payment failure
   * @param {string} [options.lang] - Form language
   * @param {boolean} [options.strict_payWay] - Force specified payment method
   * @param {boolean} [options.block_payWay] - Block other payment methods
   * @param {boolean} [options.directPay] - Direct payment without intermediate page
   * @returns {Promise<Object>} - Response with payment URL
   */
  async initPayment(options) {
    const data = {
      action: 'initPayment',
      project: this.config.projectId,
      sum: options.sum,
      currency: options.currency,
      innerID: options.innerID,
      email: options.email,
    };

    if (options.payWay) data.payWay = options.payWay;
    if (options.comment) data.comment = options.comment;
    if (options.needFailNotice) data.needFailNotice = options.needFailNotice;
    if (options.lang) data.lang = options.lang;
    if (options.strict_payWay) data.strict_payWay = options.strict_payWay;
    if (options.block_payWay) data.block_payWay = options.block_payWay;
    if (options.directPay) data.directPay = options.directPay;

    // Calculate signature
    let signString = this.config.secretWord1 + data.action + data.project + 
                     data.sum + data.currency + data.innerID + data.email;
    
    if (data.payWay) signString += data.payWay;
    
    data.sign = this.md5(signString);

    return this.makeRequest(data);
  }

  /**
   * Initialize a payout
   * @param {Object} options - Payout options
   * @param {number} options.sum - Payout amount
   * @param {string} options.currency - Payout currency
   * @param {string} options.payWay - Payout method
   * @param {string} options.email - Recipient email
   * @param {string} options.purse - Card number or wallet
   * @param {string} [options.comment] - Payout description
   * @param {string} [options.cardholder] - Card holder name
   * @param {string} [options.SBP_id] - SBP bank identifier
   * @param {string} [options.needUnique] - Unique identifier for the payout
   * @returns {Promise<Object>} - Response with payout ID
   */
  async initPayout(options) {
    const data = {
      action: 'initPayout',
      project: this.config.projectId,
      sum: options.sum,
      currency: options.currency,
      payWay: options.payWay,
      email: options.email,
      purse: options.purse
    };

    if (options.comment) data.comment = options.comment;
    if (options.cardholder) data.cardholder = options.cardholder;
    if (options.SBP_id) data.SBP_id = options.SBP_id;
    if (options.needUnique) data.needUnique = options.needUnique;

    // Calculate signature
    const signString = this.config.payoutKey + data.action + data.project + 
                       data.sum + data.currency + data.payWay + data.email + data.purse;
    
    data.sign = this.md5(signString);

    return this.makeRequest(data);
  }

  /**
   * Get order information
   * @param {string} orderID - Order ID
   * @returns {Promise<Object>} - Order information
   */
  async getOrderInfo(orderID) {
    const data = {
      action: 'getOrderInfo',
      project: this.config.projectId,
      orderID: orderID
    };

    // Calculate signature
    data.sign = this.md5(this.config.secretWord1 + data.action + data.project + data.orderID);

    return this.makeRequest(data);
  }

  /**
   * Refund a payment
   * @param {string} orderID - Order ID to refund
   * @returns {Promise<Object>} - Refund result
   */
  async refund(orderID) {
    const data = {
      action: 'refund',
      orderID: orderID
    };

    // Calculate signature
    data.sign = this.md5(this.config.secretWord1 + data.action + data.orderID);

    return this.makeRequest(data);
  }

  /**
   * Get project balance
   * @returns {Promise<Object>} - Project balance information
   */
  async getProjectBalance() {
    const data = {
      action: 'getProjectBalance',
      project: this.config.projectId
    };

    // Calculate signature
    data.sign = this.md5(this.config.secretWord1 + data.action + data.project);

    return this.makeRequest(data);
  }

  /**
   * Get payout information
   * @param {string} payoutID - Payout ID
   * @returns {Promise<Object>} - Payout information
   */
  async getPayoutInfo(payoutID) {
    const data = {
      action: 'getPayoutInfo',
      project: this.config.projectId,
      payoutID: payoutID
    };

    // Calculate signature
    data.sign = this.md5(this.config.secretWord1 + data.action + data.project + data.payoutID);

    return this.makeRequest(data);
  }

  /**
   * Get project information
   * @returns {Promise<Object>} - Project information and available payment methods
   */
  async getProjectInfo() {
    const data = {
      action: 'getProjectInfo',
      project: this.config.projectId
    };

    // Calculate signature
    data.sign = this.md5(this.config.secretWord1 + data.action + data.project);

    return this.makeRequest(data);
  }

  /**
   * Get exchange rates
   * @returns {Promise<Object>} - Exchange rates information
   */
  async getExchangeRates() {
    const data = {
      action: 'getExchangeRates'
    };

    return this.makeRequest(data);
  }

  /**
   * Verify payment notification
   * @param {Object} postData - POST data from notification
   * @returns {boolean} - True if signature is valid
   */
  verifyPaymentNotification(postData) {
    if (postData.action === 'order_payed') {
      const hash = this.md5(this.config.secretWord2 + postData.orderID + 
                          postData.payWay + postData.innerID + 
                          postData.sum + postData.webmaster_profit);
      
      return hash === postData.sign;
    } else if (postData.action === 'order_cancel') {
      const hash = this.md5(this.config.secretWord2 + postData.orderID + postData.innerID);
      
      return hash === postData.sign;
    }
    
    return false;
  }
}

module.exports = PrimePayments;
