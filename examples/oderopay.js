const TokenPay = require('@tokenpayeng/tokenpay');

const tokenPay = new TokenPay.Client({
  apiKey: 'EuihncTEtPHdNcsGQnctJnLYUlwUiH',
  secretKey: 'xMASVCwiXqMkJtqcUbxLvJRdYYRFuU',
  baseUrl: 'https://sandbox-api-gateway.oderopay.com.tr'
});

const request = {
  paymentId: 1
};

tokenPay.payment().complete3DSPayment(request)
  .then(result => console.info('Complete 3DS payment successful', result))
  .catch(err => console.error('Failed to complete 3DS payment', err));