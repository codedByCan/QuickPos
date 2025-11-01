const axios = require('axios');

class Billplz {
  constructor(config) {
    this.config = config || {};
    const requiredFields = ['apiKey'];
    for (let field of requiredFields) {
      if (!config[field]) throw new Error(`Missing required field: ${field}`);
    }

    this.apiKey = config.apiKey;
    this.collectionId = config.collectionId || 'your-default-collection-id'; // Kullanıcı kendi collection ID'sini vermeli
    this.baseUrl = config.sandbox ? 'https://www.billplz-sandbox.com/api/v3' : 'https://www.billplz.com/api/v3';
  }

  async createPayment(paymentData) {
    try {
      const data = {
        collection_id: this.collectionId,
        email: paymentData.email,
        name: paymentData.name,
        amount: Math.round(paymentData.amount * 100), // Billplz cents kullanır, ama MYR için sen
        description: paymentData.description || 'Payment',
        callback_url: paymentData.callback_link,
        redirect_url: paymentData.redirect_link
      };

      const response = await axios.post(`${this.baseUrl}/bills`, data, {
        auth: {
          username: this.apiKey,
          password: ''
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return {
        success: true,
        paymentUrl: response.data.url,
        billId: response.data.id,
        amount: response.data.amount,
        currency: 'MYR'
      };
    } catch (error) {
      throw new Error(`Billplz payment creation failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async handleCallback(callbackData) {
    try {
      // Billplz callback'de bill data'sı gelir
      const billId = callbackData.id;
      const paid = callbackData.paid;
      const amount = callbackData.amount;

      if (paid) {
        return {
          success: true,
          transactionId: billId,
          amount: amount / 100, // cents to MYR
          currency: 'MYR',
          status: 'completed',
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
      throw new Error(`Billplz callback handling failed: ${error.message}`);
    }
  }
}

module.exports = Billplz;
