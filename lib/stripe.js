const StripeSDK = require('stripe');

class Stripe {
  constructor(config) {
    this.config = config || {};
    if (!config.secretKey) {
      throw new Error('Missing required field: secretKey');
    }

    this.stripe = StripeSDK(config.secretKey);
    this.endpointSecret = config.webhookSecret || null;
  }

  /**
   * Create a new payment (Checkout Session)
   * @param {Object} paymentData - Payment data
   * @returns {Promise<Object>} - Payment result containing payment URL
   */
  async createPayment(paymentData) {
    try {
      if (!paymentData.amount || !paymentData.currency) {
        throw new Error('Tutar (amount) ve para birimi (currency) gerekli');
      }

      const orderId = paymentData.orderId || `order-${Date.now()}`;
      const successUrl = paymentData.successUrl || paymentData.callback_link || 'http://localhost:3000/success';
      const cancelUrl = paymentData.cancelUrl || 'http://localhost:3000/cancel';

      // Ensure amount is properly formatted to cents for Stripe
      const unitAmount = Math.round(parseFloat(paymentData.amount) * 100);

      const sessionConfig = {
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: paymentData.currency.toLowerCase(),
              product_data: {
                name: paymentData.name || paymentData.description || 'QuickPos Payment',
              },
              unit_amount: unitAmount,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
        cancel_url: cancelUrl,
        client_reference_id: orderId,
      };

      if (paymentData.email) {
        sessionConfig.customer_email = paymentData.email;
      }

      const session = await this.stripe.checkout.sessions.create(sessionConfig);

      return {
        success: true,
        paymentUrl: session.url,
        transactionId: session.id,
        orderId: orderId,
        amount: paymentData.amount,
        currency: paymentData.currency
      };
    } catch (error) {
      throw new Error(`Stripe payment creation failed: ${error.message}`);
    }
  }

  /**
   * Handle callback/webhook from Stripe
   * @param {Object} callbackData - Webhook data (req.body)
   * @param {Object} req - Request object (used to verify signature if endpointSecret exists)
   * @returns {Promise<Object>} - Callback result
   */
  async handleCallback(callbackData, req) {
    try {
      let event = callbackData;

      // Verify webhook signature if endpointSecret is provided
      if (this.endpointSecret && req && req.headers && req.headers['stripe-signature']) {
        const sig = req.headers['stripe-signature'];
        try {
          // req.rawBody is needed for stripe webhook verification, assume it's available or we fallback to event
          event = this.stripe.webhooks.constructEvent(req.rawBody || JSON.stringify(callbackData), sig, this.endpointSecret);
        } catch (err) {
          throw new Error(`Webhook Error: ${err.message}`);
        }
      }

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        
        return {
          success: true,
          status: 'completed',
          transactionId: session.payment_intent || session.id,
          orderId: session.client_reference_id,
          amount: session.amount_total / 100,
          currency: (session.currency || '').toUpperCase(),
          rawData: event
        };
      }

      return {
        success: false,
        status: 'pending_or_other',
        event: event.type,
        rawData: event
      };
    } catch (error) {
      throw new Error(`Stripe callback handling failed: ${error.message}`);
    }
  }
}

module.exports = Stripe;
