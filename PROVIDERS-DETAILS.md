# 📊 QuickPos - Ödeme Sağlayıcıları Detaylı Rehberi

Bu dokümantasyon, QuickPos tarafından desteklenen tüm 48 ödeme sağlayıcısının detaylı bilgilerini içermektedir.

## İçindekiler
- [Asya-Pasifik Bölgesi](#asya-pasifik-bölgesi)
- [Orta Doğu ve Afrika](#orta-doğu-ve-afrika)
- [Avrupa](#avrupa)
- [Latin Amerika](#latin-amerika)
- [Global Ödeme Sistemleri](#global-ödeme-sistemleri)
- [Kripto Para Ödeme Sistemleri](#kripto-para-ödeme-sistemleri)

---

## Asya-Pasifik Bölgesi

### 🇮🇩 Midtrans (Endonezya)
- **Website**: https://midtrans.com
- **Desteklenen Ülkeler**: Endonezya
- **Para Birimleri**: IDR (Indonesian Rupiah)
- **Client Oluşturma**:
  ```javascript
  {
    serverKey: 'YOUR_SERVER_KEY',
    clientKey: 'YOUR_CLIENT_KEY',
    isProduction: false
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı (IDR)
  - `orderId`: Benzersiz sipariş ID
  - `name`: Müşteri adı
  - `email`: Müşteri email
  - `phone`: Müşteri telefon

---

### 🇮🇩 Tripay (Endonezya)
- **Website**: https://tripay.co.id
- **Desteklenen Ülkeler**: Endonezya
- **Para Birimleri**: IDR (Indonesian Rupiah)
- **Client Oluşturma**:
  ```javascript
  {
    apiKey: 'YOUR_API_KEY',
    privateKey: 'YOUR_PRIVATE_KEY',
    merchantCode: 'YOUR_MERCHANT_CODE',
    isProduction: false
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı (IDR)
  - `method`: Ödeme yöntemi kodu
  - `orderId`: Benzersiz sipariş ID
  - `name`: Müşteri adı
  - `email`: Müşteri email
  - `phone`: Müşteri telefon

---

### 🇮🇩 Doku (Endonezya)
- **Website**: https://developers.doku.com
- **Desteklenen Ülkeler**: Endonezya
- **Para Birimleri**: IDR (Indonesian Rupiah)
- **Client Oluşturma**:
  ```javascript
  {
    clientId: 'YOUR_CLIENT_ID',
    secretKey: 'YOUR_SECRET_KEY',
    sharedKey: 'YOUR_SHARED_KEY',
    sandbox: true
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı (IDR)
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Callback URL
  - `name`: Müşteri adı
  - `email`: Müşteri email

---

### 🇮🇩 PayID19 (Endonezya)
- **Website**: https://payid19.com
- **Desteklenen Ülkeler**: Endonezya
- **Para Birimleri**: IDR (Indonesian Rupiah)
- **Client Oluşturma**:
  ```javascript
  {
    merchantId: 'YOUR_MERCHANT_ID',
    secretKey: 'YOUR_SECRET_KEY'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı (IDR)
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Callback URL
  - `name`: Müşteri adı

---

### 🇮🇩 🇵🇭 Xendit (Endonezya & Filipinler)
- **Website**: https://www.xendit.co
- **Desteklenen Ülkeler**: Endonezya, Filipinler
- **Para Birimleri**: IDR (Indonesian Rupiah), PHP (Philippine Peso)
- **Client Oluşturma**:
  ```javascript
  {
    apiKey: 'YOUR_API_KEY',
    webhookToken: 'YOUR_WEBHOOK_TOKEN'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı
  - `orderId`: Benzersiz sipariş ID
  - `paymentMethod`: 'invoice', 'ewallet', 'va', 'qr'
  - `callback_link`: Callback URL
  - `name`: Müşteri adı
  - `email`: Müşteri email

---

### 🇲🇾 ToyyibPay (Malezya)
- **Website**: https://toyyibpay.com
- **Desteklenen Ülkeler**: Malezya
- **Para Birimleri**: MYR (Malaysian Ringgit)
- **Client Oluşturma**:
  ```javascript
  {
    secretKey: 'YOUR_SECRET_KEY',
    categoryCode: 'YOUR_CATEGORY_CODE'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı (MYR)
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Callback URL
  - `name`: Müşteri adı
  - `email`: Müşteri email
  - `phone`: Müşteri telefon

---

### 🇲🇾 SenangPay (Malezya)
- **Website**: https://senangpay.my
- **Desteklenen Ülkeler**: Malezya
- **Para Birimleri**: MYR (Malaysian Ringgit)
- **Client Oluşturma**:
  ```javascript
  {
    merchantId: 'YOUR_MERCHANT_ID',
    secretKey: 'YOUR_SECRET_KEY',
    sandbox: true
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı (MYR)
  - `orderId`: Benzersiz sipariş ID
  - `description`: Ödeme açıklaması
  - `name`: Müşteri adı
  - `email`: Müşteri email
  - `phone`: Müşteri telefon

---

### 🇮🇳 Paytm (Hindistan)
- **Website**: https://paytm.com
- **Desteklenen Ülkeler**: Hindistan
- **Para Birimleri**: INR (Indian Rupee)
- **Client Oluşturma**:
  ```javascript
  {
    merchantId: 'YOUR_MERCHANT_ID',
    merchantKey: 'YOUR_MERCHANT_KEY',
    website: 'YOUR_WEBSITE',
    industry: 'Retail',
    isProduction: false
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı (INR)
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Callback URL
  - `customerId`: Müşteri ID
  - `email`: Müşteri email
  - `phone`: Müşteri telefon

---

### 🇮🇳 Cashfree (Hindistan)
- **Website**: https://www.cashfree.com
- **Desteklenen Ülkeler**: Hindistan
- **Para Birimleri**: INR (Indian Rupee)
- **Client Oluşturma**:
  ```javascript
  {
    appId: 'YOUR_APP_ID',
    secretKey: 'YOUR_SECRET_KEY',
    environment: 'sandbox'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı (INR)
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Callback URL
  - `name`: Müşteri adı
  - `email`: Müşteri email
  - `phone`: Müşteri telefon

---

### 🇮🇳 PayU India (Hindistan)
- **Website**: https://payu.in
- **Desteklenen Ülkeler**: Hindistan
- **Para Birimleri**: INR (Indian Rupee)
- **Client Oluşturma**:
  ```javascript
  {
    merchantKey: 'YOUR_MERCHANT_KEY',
    salt: 'YOUR_SALT',
    sandbox: true
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı (INR)
  - `orderId`: Benzersiz sipariş ID
  - `productInfo`: Ürün bilgisi
  - `firstname`: Müşteri adı
  - `email`: Müşteri email
  - `phone`: Müşteri telefon
  - `callback_link`: Callback URL

---

### 🇮🇳 PayKun (Hindistan)
- **Website**: https://paykun.com
- **Desteklenen Ülkeler**: Hindistan
- **Para Birimleri**: INR (Indian Rupee)
- **Client Oluşturma**:
  ```javascript
  {
    merchantId: 'YOUR_MERCHANT_ID',
    accessToken: 'YOUR_ACCESS_TOKEN',
    encryptionKey: 'YOUR_ENCRYPTION_KEY',
    sandbox: true
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı (INR)
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Callback URL
  - `name`: Müşteri adı
  - `email`: Müşteri email
  - `phone`: Müşteri telefon

---

### 🇮🇳 Razorpay (Hindistan)
- **Website**: https://razorpay.com
- **Desteklenen Ülkeler**: Hindistan
- **Para Birimleri**: INR (Indian Rupee)
- **Client Oluşturma**:
  ```javascript
  {
    keyId: 'YOUR_KEY_ID',
    keySecret: 'YOUR_KEY_SECRET'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı (INR)
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Callback URL
  - `merchantName`: İşletme adı
  - `name`: Müşteri adı
  - `email`: Müşteri email
  - `phone`: Müşteri telefon

---

### 🇮🇳 Instamojo (Hindistan)
- **Website**: https://www.instamojo.com
- **Desteklenen Ülkeler**: Hindistan
- **Para Birimleri**: INR (Indian Rupee)
- **Client Oluşturma**:
  ```javascript
  {
    apiKey: 'YOUR_API_KEY',
    authToken: 'YOUR_AUTH_TOKEN',
    sandbox: true
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı (INR)
  - `purpose`: Ödeme amacı
  - `name`: Müşteri adı
  - `email`: Müşteri email
  - `phone`: Müşteri telefon
  - `callback_link`: Callback URL

---

### 🇮🇳 PhonePe (Hindistan)
- **Website**: https://www.phonepe.com
- **Desteklenen Ülkeler**: Hindistan
- **Para Birimleri**: INR (Indian Rupee)
- **Client Oluşturma**:
  ```javascript
  {
    merchantId: 'YOUR_MERCHANT_ID',
    saltKey: 'YOUR_SALT_KEY',
    saltIndex: 1,
    sandbox: true
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı (INR)
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Callback URL
  - `phone`: Müşteri telefon
  - `userId`: Müşteri ID

---

### 🇮🇷 Zarinpal (İran)
- **Website**: https://www.zarinpal.com
- **Desteklenen Ülkeler**: İran
- **Para Birimleri**: IRR (Iranian Rial), IRT (Iranian Toman)
- **Client Oluşturma**:
  ```javascript
  {
    merchantId: 'YOUR_MERCHANT_ID',
    sandbox: true
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı (IRT)
  - `callback_link`: Callback URL
  - `description`: Ödeme açıklaması
  - `email`: Müşteri email (opsiyonel)
  - `phone`: Müşteri telefon (opsiyonel)

---

### 🇮🇱 Cardcom (İsrail)
- **Website**: https://www.cardcom.co.il
- **Desteklenen Ülkeler**: İsrail
- **Para Birimleri**: ILS (Israeli Shekel)
- **Client Oluşturma**:
  ```javascript
  {
    terminalNumber: 'YOUR_TERMINAL_NUMBER',
    apiName: 'YOUR_API_NAME'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı (ILS)
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Callback URL
  - `name`: Müşteri adı
  - `email`: Müşteri email

---

### 🇺🇿 Paycom (Özbekistan)
- **Website**: https://paycom.uz
- **Desteklenen Ülkeler**: Özbekistan
- **Para Birimleri**: UZS (Uzbekistan Som)
- **Client Oluşturma**:
  ```javascript
  {
    merchantId: 'YOUR_MERCHANT_ID',
    secretKey: 'YOUR_SECRET_KEY'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı (UZS, tiyin cinsinden)
  - `orderId`: Benzersiz sipariş ID
  - `account`: Hesap bilgisi

---

### 🇵🇭 PayMaya (Filipinler)
- **Website**: https://www.paymaya.com
- **Desteklenen Ülkeler**: Filipinler
- **Para Birimleri**: PHP (Philippine Peso)
- **Client Oluşturma**:
  ```javascript
  {
    publicKey: 'YOUR_PUBLIC_KEY',
    secretKey: 'YOUR_SECRET_KEY',
    sandbox: true
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı (PHP)
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Callback URL
  - `name`: Müşteri adı
  - `email`: Müşteri email

---

### 🇻🇳 PayME (Vietnam)
- **Website**: https://payme.vn
- **Desteklenen Ülkeler**: Vietnam
- **Para Birimleri**: VND (Vietnamese Dong)
- **Client Oluşturma**:
  ```javascript
  {
    merchantId: 'YOUR_MERCHANT_ID',
    apiKey: 'YOUR_API_KEY',
    secretKey: 'YOUR_SECRET_KEY'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı (VND)
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Callback URL
  - `description`: Ödeme açıklaması

---

### 🇹🇭 Omise (Tayland)
- **Website**: https://www.omise.co
- **Desteklenen Ülkeler**: Tayland
- **Para Birimleri**: THB (Thai Baht)
- **Client Oluşturma**:
  ```javascript
  {
    publicKey: 'YOUR_PUBLIC_KEY',
    secretKey: 'YOUR_SECRET_KEY'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı (THB, satang cinsinden)
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Callback URL
  - `sourceType`: Ödeme kaynağı tipi (ör: 'promptpay')
  - `name`: Müşteri adı

---

## Orta Doğu ve Afrika

### 🇹🇷 İyzico (Türkiye)
- **Website**: https://www.iyzico.com
- **Desteklenen Ülkeler**: Türkiye
- **Para Birimleri**: TRY (Turkish Lira)
- **Client Oluşturma**:
  ```javascript
  {
    apiKey: 'YOUR_API_KEY',
    secretKey: 'YOUR_SECRET_KEY',
    uri: 'https://sandbox-api.iyzipay.com'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı (TRY)
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Callback URL
  - `name`: Müşteri adı
  - `surname`: Müşteri soyadı
  - `email`: Müşteri email
  - `phone`: Müşteri telefon
  - `address`: Müşteri adresi
  - `city`: Şehir
  - `country`: Ülke

---

### 🇹🇷 PayTR (Türkiye)
- **Website**: https://www.paytr.com
- **Desteklenen Ülkeler**: Türkiye
- **Para Birimleri**: TRY (Turkish Lira)
- **Client Oluşturma**:
  ```javascript
  {
    merchantId: 'YOUR_MERCHANT_ID',
    merchantKey: 'YOUR_MERCHANT_KEY',
    merchantSalt: 'YOUR_MERCHANT_SALT'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı (TRY, kuruş cinsinden)
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Callback URL
  - `name`: Müşteri adı
  - `email`: Müşteri email
  - `phone`: Müşteri telefon
  - `address`: Müşteri adresi

---

### 🇹🇷 Shopier (Türkiye)
- **Website**: https://www.shopier.com
- **Desteklenen Ülkeler**: Türkiye
- **Para Birimleri**: TRY (Turkish Lira)
- **Client Oluşturma**:
  ```javascript
  {
    apiKey: 'YOUR_API_KEY',
    apiSecret: 'YOUR_API_SECRET'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı (TRY)
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Callback URL
  - `name`: Ürün adı
  - `buyer_name`: Müşteri adı
  - `buyer_email`: Müşteri email
  - `buyer_phone`: Müşteri telefon

---

### 🇹🇷 Papara (Türkiye)
- **Website**: https://www.papara.com
- **Desteklenen Ülkeler**: Türkiye
- **Para Birimleri**: TRY (Turkish Lira)
- **Client Oluşturma**:
  ```javascript
  {
    apiKey: 'YOUR_API_KEY',
    merchantId: 'YOUR_MERCHANT_ID'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı (TRY)
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Callback URL
  - `description`: Ödeme açıklaması

---

### 🇹🇷 EsnekPos (Türkiye)
- **Website**: https://esnekpos.com
- **Desteklenen Ülkeler**: Türkiye
- **Para Birimleri**: TRY (Turkish Lira)
- **Client Oluşturma**:
  ```javascript
  {
    apiKey: 'YOUR_API_KEY',
    secretKey: 'YOUR_SECRET_KEY'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı (TRY)
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Callback URL
  - `name`: Müşteri adı

---

### 🇹🇷 Paydisini (Türkiye)
- **Website**: https://paydisini.com
- **Desteklenen Ülkeler**: Türkiye
- **Para Birimleri**: TRY (Turkish Lira), USD, EUR
- **Client Oluşturma**:
  ```javascript
  {
    apiKey: 'YOUR_API_KEY'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Callback URL
  - `name`: Müşteri adı
  - `email`: Müşteri email

---

### 🇹🇷 PayNetTR (PayNet Türkiye)
- **Website**: https://paynet.com.tr
- **Desteklenen Ülkeler**: Türkiye
- **Para Birimleri**: TRY (Turkish Lira)
- **Client Oluşturma**:
  ```javascript
  {
    merchantId: 'YOUR_MERCHANT_ID',
    secretKey: 'YOUR_SECRET_KEY'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı (TRY)
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Callback URL
  - `name`: Müşteri adı

---

### 🇦🇪 PrimePayments (BAE)
- **Website**: https://primepayments.io
- **Desteklenen Ülkeler**: BAE, Orta Doğu
- **Para Birimleri**: AED, USD, SAR
- **Client Oluşturma**:
  ```javascript
  {
    apiKey: 'YOUR_API_KEY',
    merchantId: 'YOUR_MERCHANT_ID'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Callback URL
  - `currency`: Para birimi

---

### 🇦🇪 YallaPay (BAE)
- **Website**: https://yallapay.com
- **Desteklenen Ülkeler**: BAE, Orta Doğu
- **Para Birimleri**: AED, USD
- **Client Oluşturma**:
  ```javascript
  {
    merchantId: 'YOUR_MERCHANT_ID',
    apiKey: 'YOUR_API_KEY',
    secretKey: 'YOUR_SECRET_KEY'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Callback URL
  - `currency`: Para birimi

---

### 🇦🇪 NoonPayments (BAE)
- **Website**: https://www.noon.com
- **Desteklenen Ülkeler**: BAE, Suudi Arabistan
- **Para Birimleri**: AED, SAR
- **Client Oluşturma**:
  ```javascript
  {
    applicationId: 'YOUR_APPLICATION_ID',
    apiKey: 'YOUR_API_KEY',
    businessId: 'YOUR_BUSINESS_ID',
    environment: 'sandbox'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Callback URL
  - `currency`: Para birimi
  - `name`: Müşteri adı
  - `email`: Müşteri email

---

### 🇦🇪 🇸🇦 🇴🇲 🇯🇴 🇪🇬 PayTabs (Orta Doğu)
- **Website**: https://www.paytabs.com
- **Desteklenen Ülkeler**: BAE, Suudi Arabistan, Umman, Ürdün, Mısır
- **Para Birimleri**: AED, SAR, OMR, JOD, EGP, USD
- **Client Oluşturma**:
  ```javascript
  {
    profileId: 'YOUR_PROFILE_ID',
    serverKey: 'YOUR_SERVER_KEY',
    region: 'ARE' // ARE, SAU, OMN, JOR, EGY
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Callback URL
  - `currency`: Para birimi
  - `name`: Müşteri adı
  - `email`: Müşteri email
  - `phone`: Müşteri telefon

---

### 🇸🇦 URWay (Suudi Arabistan)
- **Website**: https://www.urway.sa
- **Desteklenen Ülkeler**: Suudi Arabistan
- **Para Birimleri**: SAR (Saudi Riyal)
- **Client Oluşturma**:
  ```javascript
  {
    terminalId: 'YOUR_TERMINAL_ID',
    password: 'YOUR_PASSWORD',
    merchantKey: 'YOUR_MERCHANT_KEY',
    testMode: true
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı (SAR)
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Callback URL
  - `email`: Müşteri email
  - `country`: Ülke kodu
  - `merchantIp`: Merchant IP adresi

---

### 🇦🇿 Payriff (Azerbaycan)
- **Website**: https://payriff.com
- **Desteklenen Ülkeler**: Azerbaycan
- **Para Birimleri**: AZN (Azerbaijani Manat)
- **Client Oluşturma**:
  ```javascript
  {
    merchantId: 'YOUR_MERCHANT_ID',
    secretKey: 'YOUR_SECRET_KEY'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı (AZN)
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Callback URL
  - `description`: Ödeme açıklaması

---

### 🇦🇿 Epoint (Azerbaycan)
- **Website**: https://epoint.az
- **Desteklenen Ülkeler**: Azerbaycan
- **Para Birimleri**: AZN (Azerbaijani Manat)
- **Client Oluşturma**:
  ```javascript
  {
    merchantId: 'YOUR_MERCHANT_ID',
    privateKey: 'YOUR_PRIVATE_KEY'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı (AZN)
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Callback URL
  - `description`: Ödeme açıklaması

---

### 🇧🇩 ShurjoPay (Bangladeş)
- **Website**: https://shurjopay.com.bd
- **Desteklenen Ülkeler**: Bangladeş
- **Para Birimleri**: BDT (Bangladeshi Taka)
- **Client Oluşturma**:
  ```javascript
  {
    username: 'YOUR_USERNAME',
    password: 'YOUR_PASSWORD',
    prefix: 'YOUR_PREFIX',
    sandbox: true
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı (BDT)
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Callback URL
  - `name`: Müşteri adı
  - `phone`: Müşteri telefon
  - `city`: Şehir
  - `address`: Adres

---

### 🇿🇦 PaySpace (Güney Afrika)
- **Website**: https://www.payspace.com
- **Desteklenen Ülkeler**: Güney Afrika
- **Para Birimleri**: ZAR (South African Rand)
- **Client Oluşturma**:
  ```javascript
  {
    merchantId: 'YOUR_MERCHANT_ID',
    apiKey: 'YOUR_API_KEY'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı (ZAR)
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Callback URL
  - `description`: Ödeme açıklaması

---

### 🇧🇯 FedaPay (Benin)
- **Website**: https://fedapay.com
- **Desteklenen Ülkeler**: Benin, Batı Afrika
- **Para Birimleri**: XOF (West African CFA Franc)
- **Client Oluşturma**:
  ```javascript
  {
    apiKey: 'YOUR_API_KEY',
    sandbox: true
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı (XOF)
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Callback URL
  - `description`: Ödeme açıklaması
  - `name`: Müşteri adı
  - `email`: Müşteri email

---

### 🇹🇳 Konnect (Tunus)
- **Website**: https://konnect.network
- **Desteklenen Ülkeler**: Tunus
- **Para Birimleri**: TND (Tunisian Dinar)
- **Client Oluşturma**:
  ```javascript
  {
    apiKey: 'YOUR_API_KEY',
    receiverId: 'YOUR_RECEIVER_ID'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı (TND, millime cinsinden)
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Callback URL
  - `description`: Ödeme açıklaması

---

### 🇲🇦 YouCanPay (Fas)
- **Website**: https://youcanpay.com
- **Desteklenen Ülkeler**: Fas
- **Para Birimleri**: MAD (Moroccan Dirham)
- **Client Oluşturma**:
  ```javascript
  {
    privateKey: 'YOUR_PRIVATE_KEY',
    publicKey: 'YOUR_PUBLIC_KEY',
    sandbox: true
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı (MAD)
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Callback URL
  - `name`: Müşteri adı
  - `email`: Müşteri email
  - `phone`: Müşteri telefon

---

## Avrupa

### 🇧🇬 ePay (Bulgaristan)
- **Website**: https://www.epay.bg
- **Desteklenen Ülkeler**: Bulgaristan
- **Para Birimleri**: BGN (Bulgarian Lev)
- **Client Oluşturma**:
  ```javascript
  {
    merchantId: 'YOUR_MERCHANT_ID',
    secretKey: 'YOUR_SECRET_KEY'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı (BGN)
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Callback URL
  - `description`: Ödeme açıklaması

---

### 🇲🇩 PayNet (Moldova)
- **Website**: https://www.paynet.md
- **Desteklenen Ülkeler**: Moldova
- **Para Birimleri**: MDL (Moldovan Leu)
- **Client Oluşturma**:
  ```javascript
  {
    merchantId: 'YOUR_MERCHANT_ID',
    secretKey: 'YOUR_SECRET_KEY'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı (MDL)
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Callback URL
  - `description`: Ödeme açıklaması

---

### 🇷🇺 YooKassa (Rusya)
- **Website**: https://yookassa.ru
- **Desteklenen Ülkeler**: Rusya
- **Para Birimleri**: RUB (Russian Ruble)
- **Client Oluşturma**:
  ```javascript
  {
    shopId: 'YOUR_SHOP_ID',
    secretKey: 'YOUR_SECRET_KEY'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı (RUB)
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Callback URL
  - `description`: Ödeme açıklaması
  - `email`: Müşteri email
  - `phone`: Müşteri telefon

---

### 🇷🇺 FreeKassa (Rusya)
- **Website**: https://freekassa.ru
- **Desteklenen Ülkeler**: Rusya
- **Para Birimleri**: RUB (Russian Ruble)
- **Client Oluşturma**:
  ```javascript
  {
    shopId: 'YOUR_SHOP_ID',
    secretKey1: 'YOUR_SECRET_KEY_1',
    secretKey2: 'YOUR_SECRET_KEY_2'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı (RUB)
  - `orderId`: Benzersiz sipariş ID
  - `currency`: Para birimi
  - `email`: Müşteri email
  - `name`: Müşteri adı

---

### 🇷🇺 Unitpay (Rusya)
- **Website**: https://unitpay.ru
- **Desteklenen Ülkeler**: Rusya
- **Para Birimleri**: RUB (Russian Ruble)
- **Client Oluşturma**:
  ```javascript
  {
    publicKey: 'YOUR_PUBLIC_KEY',
    secretKey: 'YOUR_SECRET_KEY'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı (RUB)
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Callback URL
  - `account`: Hesap bilgisi
  - `description`: Ödeme açıklaması

---

## Latin Amerika

### 🇧🇷 PicPay (Brezilya)
- **Website**: https://www.picpay.com
- **Desteklenen Ülkeler**: Brezilya
- **Para Birimleri**: BRL (Brazilian Real)
- **Client Oluşturma**:
  ```javascript
  {
    token: 'YOUR_TOKEN',
    sellerToken: 'YOUR_SELLER_TOKEN'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı (BRL)
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Callback URL
  - `firstName`: Müşteri adı
  - `lastName`: Müşteri soyadı
  - `email`: Müşteri email
  - `document`: CPF numarası
  - `phone`: Müşteri telefon

---

### 🇲🇽 🇨🇴 🇵🇪 🇦🇷 PayU Latam (Latin Amerika)
- **Website**: https://www.payu.com
- **Desteklenen Ülkeler**: Meksika, Kolombiya, Peru, Arjantin, Şili, Panama
- **Para Birimleri**: MXN, COP, PEN, ARS, CLP, USD
- **Client Oluşturma**:
  ```javascript
  {
    apiKey: 'YOUR_API_KEY',
    apiLogin: 'YOUR_API_LOGIN',
    merchantId: 'YOUR_MERCHANT_ID',
    accountId: 'YOUR_ACCOUNT_ID',
    sandbox: true
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Callback URL
  - `currency`: Para birimi
  - `description`: Ödeme açıklaması
  - `name`: Müşteri adı
  - `email`: Müşteri email

---

## Global Ödeme Sistemleri

### 🌐 PayPal (Global)
- **Website**: https://www.paypal.com
- **Desteklenen Ülkeler**: 200+ ülke
- **Para Birimleri**: 25+ para birimi (USD, EUR, GBP, vb.)
- **Client Oluşturma**:
  ```javascript
  {
    clientId: 'YOUR_CLIENT_ID',
    clientSecret: 'YOUR_CLIENT_SECRET',
    mode: 'sandbox'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı
  - `currency`: Para birimi
  - `callback_link`: Callback URL
  - `description`: Ödeme açıklaması

---

### 🌐 Amazon Pay (Global)
- **Website**: https://pay.amazon.com
- **Desteklenen Ülkeler**: ABD, AB, Japonya, Hindistan
- **Para Birimleri**: USD, EUR, GBP, JPY, INR
- **Client Oluşturma**:
  ```javascript
  {
    merchantId: 'YOUR_MERCHANT_ID',
    accessKey: 'YOUR_ACCESS_KEY',
    secretKey: 'YOUR_SECRET_KEY',
    region: 'us', // us, eu, jp
    sandbox: true
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı
  - `currency`: Para birimi
  - `callback_link`: Callback URL
  - `chargePermissionType`: İzin tipi

---

### 🌐 Paddle (Global SaaS Billing)
- **Website**: https://www.paddle.com
- **Desteklenen Ülkeler**: 245+ ülke
- **Para Birimleri**: 20+ para birimi
- **Client Oluşturma**:
  ```javascript
  {
    vendorId: 'YOUR_VENDOR_ID',
    apiKey: 'YOUR_API_KEY',
    publicKey: 'YOUR_PUBLIC_KEY',
    sandbox: true
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı
  - `currency`: Para birimi
  - `title`: Ürün başlığı
  - `callback_link`: Webhook URL

---

### 🌐 Checkout.com (Global)
- **Website**: https://www.checkout.com
- **Desteklenen Ülkeler**: 150+ ülke
- **Para Birimleri**: 150+ para birimi
- **Client Oluşturma**:
  ```javascript
  {
    publicKey: 'YOUR_PUBLIC_KEY',
    secretKey: 'YOUR_SECRET_KEY',
    environment: 'sandbox'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı (en küçük birim cinsinden)
  - `currency`: Para birimi
  - `callback_link`: Callback URL
  - `reference`: Sipariş referansı

---

### 🌐 2Checkout (Verifone) (Global)
- **Website**: https://www.2checkout.com
- **Desteklenen Ülkeler**: 200+ ülke
- **Para Birimleri**: 87 para birimi
- **Client Oluşturma**:
  ```javascript
  {
    merchantCode: 'YOUR_MERCHANT_CODE',
    secretKey: 'YOUR_SECRET_KEY',
    sandbox: true
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı
  - `currency`: Para birimi
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Callback URL
  - `name`: Müşteri adı
  - `email`: Müşteri email

---

### 🌐 Payssion (Global)
- **Website**: https://www.payssion.com
- **Desteklenen Ülkeler**: 200+ ülke
- **Para Birimleri**: 100+ para birimi
- **Ödeme Yöntemleri**: 300+ yerel ödeme yöntemi
- **Client Oluşturma**:
  ```javascript
  {
    apiKey: 'YOUR_API_KEY',
    secretKey: 'YOUR_SECRET_KEY',
    sandbox: true
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı
  - `currency`: Para birimi
  - `orderId`: Benzersiz sipariş ID
  - `paymentMethod`: Ödeme yöntemi kodu
  - `callback_link`: Callback URL

---

### 🌐 PayOP (Global)
- **Website**: https://payop.com
- **Desteklenen Ülkeler**: 170+ ülke
- **Para Birimleri**: 150+ para birimi
- **Client Oluşturma**:
  ```javascript
  {
    publicKey: 'YOUR_PUBLIC_KEY',
    secretKey: 'YOUR_SECRET_KEY'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı
  - `currency`: Para birimi
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Callback URL
  - `description`: Ödeme açıklaması

---

### 🌐 Paymentwall (Global)
- **Website**: https://www.paymentwall.com
- **Desteklenen Ülkeler**: 200+ ülke
- **Para Birimleri**: 150+ para birimi
- **Ödeme Yöntemleri**: 150+ ödeme yöntemi
- **Client Oluşturma**:
  ```javascript
  {
    apiKey: 'YOUR_API_KEY',
    secretKey: 'YOUR_SECRET_KEY'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı
  - `currency`: Para birimi
  - `orderId`: Benzersiz sipariş ID
  - `description`: Ödeme açıklaması
  - `email`: Müşteri email

---

### 🌐 Paysend (Global)
- **Website**: https://www.paysend.com
- **Desteklenen Ülkeler**: 170+ ülke
- **Para Birimleri**: 100+ para birimi
- **Client Oluşturma**:
  ```javascript
  {
    apiKey: 'YOUR_API_KEY',
    secretKey: 'YOUR_SECRET_KEY'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı
  - `currency`: Para birimi
  - `orderId`: Benzersiz sipariş ID
  - `recipientCountry`: Alıcı ülke

---

### 🌐 Payoneer (Global)
- **Website**: https://www.payoneer.com
- **Desteklenen Ülkeler**: 200+ ülke
- **Para Birimleri**: 150+ para birimi
- **Client Oluşturma**:
  ```javascript
  {
    programId: 'YOUR_PROGRAM_ID',
    username: 'YOUR_USERNAME',
    password: 'YOUR_PASSWORD',
    sandbox: true
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı
  - `currency`: Para birimi
  - `payeeId`: Alıcı ID
  - `description`: Ödeme açıklaması

---

### 🌐 PortWallet (Global)
- **Website**: https://portwallet.com
- **Desteklenen Ülkeler**: Global
- **Para Birimleri**: USD, EUR, GBP, TRY
- **Client Oluşturma**:
  ```javascript
  {
    apiKey: 'YOUR_API_KEY',
    merchantId: 'YOUR_MERCHANT_ID',
    secretKey: 'YOUR_SECRET_KEY'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı
  - `currency`: Para birimi
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Callback URL

---

## Kripto Para Ödeme Sistemleri

### ₿ Plisio
- **Website**: https://plisio.net
- **Desteklenen Ülkeler**: Global
- **Kripto Paralar**: 20+ (Bitcoin, Ethereum, USDT, Litecoin, Monero, vb.)
- **Client Oluşturma**:
  ```javascript
  {
    apiKey: 'YOUR_API_KEY'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı
  - `currency`: Fiat para birimi (USD, EUR, vb.)
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Callback URL
  - `email`: Müşteri email (opsiyonel)

---

### ₿ CoinPayments
- **Website**: https://www.coinpayments.net
- **Desteklenen Ülkeler**: Global
- **Kripto Paralar**: 2000+ kripto para
- **Client Oluşturma**:
  ```javascript
  {
    publicKey: 'YOUR_PUBLIC_KEY',
    privateKey: 'YOUR_PRIVATE_KEY',
    ipnSecret: 'YOUR_IPN_SECRET'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı
  - `currency1`: Fiat para birimi
  - `currency2`: Kripto para (BTC, ETH, vb.)
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: IPN URL

---

### ₿ Cryptomus
- **Website**: https://cryptomus.com
- **Desteklenen Ülkeler**: Global
- **Kripto Paralar**: 20+ kripto para
- **Client Oluşturma**:
  ```javascript
  {
    merchantId: 'YOUR_MERCHANT_ID',
    apiKey: 'YOUR_API_KEY'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı (USD)
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Callback URL

---

### ₿ Payeer
- **Website**: https://payeer.com
- **Desteklenen Ülkeler**: Global
- **Para Birimleri**: USD, EUR, RUB + Kripto paralar
- **Client Oluşturma**:
  ```javascript
  {
    merchantId: 'YOUR_MERCHANT_ID',
    secretKey: 'YOUR_SECRET_KEY'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı
  - `currency`: Para birimi
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Callback URL
  - `description`: Ödeme açıklaması

---

### ₿ Anypay
- **Website**: https://anypay.io
- **Desteklenen Ülkeler**: Global
- **Kripto Paralar**: Bitcoin, Bitcoin Cash, Dash, Litecoin
- **Client Oluşturma**:
  ```javascript
  {
    apiKey: 'YOUR_API_KEY'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı
  - `currency`: Para birimi
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Webhook URL

---

### ₿ NowPayments
- **Website**: https://nowpayments.io
- **Desteklenen Ülkeler**: Global
- **Kripto Paralar**: 150+ kripto para
- **Client Oluşturma**:
  ```javascript
  {
    apiKey: 'YOUR_API_KEY'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı
  - `currency`: Fiat para birimi
  - `payCurrency`: Kripto para
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: IPN callback URL

---

### ₿ Heleket
- **Website**: https://heleket.com
- **Desteklenen Ülkeler**: Global
- **Kripto Paralar**: Bitcoin, Ethereum, USDT, vb.
- **Client Oluşturma**:
  ```javascript
  {
    apiKey: 'YOUR_API_KEY',
    merchantId: 'YOUR_MERCHANT_ID'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı
  - `currency`: Para birimi
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Callback URL

---

### ₿ BitPay
- **Website**: https://bitpay.com
- **Desteklenen Ülkeler**: Global
- **Kripto Paralar**: Bitcoin, Bitcoin Cash, Ethereum, USDC, GUSD, PAX, BUSD, Dogecoin, Litecoin
- **Client Oluşturma**:
  ```javascript
  {
    privateKey: 'YOUR_PRIVATE_KEY',
    merchantToken: 'YOUR_MERCHANT_TOKEN',
    environment: 'test'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı
  - `currency`: Fiat para birimi
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Notification URL

---

### ₿ CoinGate
- **Website**: https://coingate.com
- **Desteklenen Ülkeler**: Global
- **Kripto Paralar**: 70+ kripto para, Lightning Network
- **Client Oluşturma**:
  ```javascript
  {
    apiKey: 'YOUR_API_KEY',
    environment: 'sandbox'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı
  - `currency`: Para birimi
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Callback URL
  - `title`: Sipariş başlığı

---

### ₿ Volet
- **Website**: https://volet.com
- **Desteklenen Ülkeler**: Global
- **Para Birimleri**: Kripto + Fiat paralar
- **Client Oluşturma**:
  ```javascript
  {
    merchantId: 'YOUR_MERCHANT_ID',
    apiKey: 'YOUR_API_KEY',
    secretKey: 'YOUR_SECRET_KEY'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı
  - `currency`: Para birimi
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Callback URL

---

### ₿ Coinbase Commerce
- **Website**: https://commerce.coinbase.com
- **Desteklenen Ülkeler**: Global
- **Kripto Paralar**: Bitcoin, Bitcoin Cash, Ethereum, Litecoin, USDC, DAI
- **Client Oluşturma**:
  ```javascript
  {
    apiKey: 'YOUR_API_KEY',
    webhookSecret: 'YOUR_WEBHOOK_SECRET'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı
  - `currency`: Fiat para birimi (USD, EUR, vb.)
  - `orderId`: Benzersiz sipariş ID
  - `name`: Ödeme açıklaması
  - `pricingType`: 'fixed_price' veya 'no_price'

---

### ₿ Perfect Money
- **Website**: https://perfectmoney.com
- **Desteklenen Ülkeler**: Global
- **Para Birimleri**: USD, EUR, Altın (e-currency)
- **Client Oluşturma**:
  ```javascript
  {
    accountId: 'YOUR_ACCOUNT_ID',
    passPhrase: 'YOUR_PASSPHRASE',
    alternatePassPhrase: 'YOUR_ALTERNATE_PASSPHRASE'
  }
  ```
- **createPayment Gereken Alanlar**:
  - `amount`: Ödeme tutarı
  - `currency`: Para birimi (USD, EUR, Gold)
  - `orderId`: Benzersiz sipariş ID
  - `callback_link`: Status URL

---

## Özet İstatistikler

### Bölgesel Dağılım
- **Asya-Pasifik**: 19 provider
- **Orta Doğu & Afrika**: 17 provider
- **Avrupa**: 5 provider
- **Latin Amerika**: 2 provider
- **Global**: 13 provider
- **Kripto Para**: 12 provider

### Para Birimi Çeşitliliği
- **Toplam Desteklenen Para Birimi**: 100+
- **En Çok Kullanılan**: USD, EUR, INR, IDR, TRY

### Toplam İstatistikler
- **Toplam Provider**: 48
- **Desteklenen Ülke**: 200+
- **Kripto Para Desteği**: 2000+ coin
- **Yerel Ödeme Yöntemi**: 500+

---

## Kullanım Örnekleri

Her provider için detaylı kullanım örnekleri `examples/` klasöründe bulunmaktadır:

```javascript
// Genel Kullanım
const QuickPos = require('quickpos');

const config = {
  providers: {
    razorpay: {
      keyId: 'YOUR_KEY_ID',
      keySecret: 'YOUR_KEY_SECRET'
    }
  }
};

const quickPos = new QuickPos(config);

// Ödeme oluşturma
const payment = await quickPos.razorpay.createPayment({
  amount: 500,
  currency: 'INR',
  orderId: 'ORDER-123',
  callback_link: 'https://yoursite.com/callback',
  name: 'John Doe',
  email: 'john@example.com',
  phone: '9999999999'
});

console.log('Payment URL:', payment.data.url);

// Callback işleme
const result = await quickPos.razorpay.handleCallback(callbackData);
console.log('Payment Status:', result.status);
```

---

## Notlar

1. **API Credentials**: Tüm provider'lar için gerçek ödeme işlemleri için production API anahtarları gereklidir.
2. **Sandbox/Test Mode**: Çoğu provider sandbox/test modu desteklemektedir.
3. **Callback URL**: Tüm provider'lar için callback URL yapılandırılmalıdır.
4. **Signature Verification**: Callback'ler için signature doğrulama yapılmaktadır.
5. **Currency Format**: Para birimi formatları provider'a göre değişiklik gösterir (kuruş, satang, paise, vb.)

---

## Lisans ve Destek

Bu dokümantasyon QuickPos v1.3.0 için hazırlanmıştır.

- **GitHub**: https://github.com/fastuptime/QuickPos
- **NPM**: https://www.npmjs.com/package/quickpos
- **Destek**: fastuptime@gmail.com

---

**Son Güncelleme**: 2024
**Versiyon**: 1.3.0
**Toplam Provider**: 48
