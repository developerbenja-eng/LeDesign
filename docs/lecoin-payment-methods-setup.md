# LeCoin Payment Methods Setup Guide

Complete guide to setting up all 4 payment methods for LeCoin donations.

---

## Overview

The LeCoin donation system supports 4 payment methods:

1. **Stripe** - Credit/debit cards (international)
2. **PayPal** - PayPal accounts (international)
3. **Mercado Pago** - Popular in Chile and Latin America
4. **Chilean Bank Transfer** - Direct deposit to your bank account

This guide will walk you through setting up each payment method.

---

## 1. Stripe (Credit/Debit Cards)

### Setup

1. **Create Stripe Account**
   - Go to [https://stripe.com/](https://stripe.com/)
   - Sign up and complete verification

2. **Get API Keys**
   - Log in to [Stripe Dashboard](https://dashboard.stripe.com/)
   - Go to **Developers** → **API keys**
   - Copy your **Publishable key** (`pk_test_...`) and **Secret key** (`sk_test_...`)

3. **Add to .env**
   ```bash
   STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY
   STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
   ```

4. **Set Up Webhooks** (for local testing)
   ```bash
   # Install Stripe CLI
   brew install stripe/stripe-cli/stripe

   # Login
   stripe login

   # Forward webhooks
   stripe listen --forward-to localhost:4000/api/lecoin/webhook
   ```

5. **Production Webhooks**
   - Go to [Stripe Webhooks](https://dashboard.stripe.com/webhooks)
   - Click **+ Add endpoint**
   - URL: `https://yourdomain.com/api/lecoin/webhook`
   - Select events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`
   - Copy the signing secret

### Testing

Use test card: `4242 4242 4242 4242` (Expiry: any future date, CVC: any 3 digits)

Full guide: [/docs/lecoin-stripe-setup.md](lecoin-stripe-setup.md)

---

## 2. PayPal

### Setup

1. **Create PayPal Developer Account**
   - Go to [https://developer.paypal.com/](https://developer.paypal.com/)
   - Sign in with your PayPal account
   - Go to **Dashboard** → **My Apps & Credentials**

2. **Create Sandbox App** (for testing)
   - Click **Create App** under Sandbox
   - Name: "LeCoin Donations - Test"
   - Select app type: **Merchant**
   - Copy **Client ID** and **Secret**

3. **Add to .env**
   ```bash
   PAYPAL_CLIENT_ID=your_sandbox_client_id
   PAYPAL_CLIENT_SECRET=your_sandbox_client_secret
   PAYPAL_MODE=sandbox
   ```

4. **Test with Sandbox Account**
   - Go to **Sandbox** → **Accounts**
   - Use the test buyer account to make test payments
   - Login: See credentials in sandbox accounts list

### Going Live

1. **Create Live App**
   - Go to **Live** section
   - Click **Create App**
   - Copy **Live** Client ID and Secret

2. **Update .env for Production**
   ```bash
   PAYPAL_CLIENT_ID=your_live_client_id
   PAYPAL_CLIENT_SECRET=your_live_client_secret
   PAYPAL_MODE=live
   ```

### Testing

- Sandbox mode uses fake money
- Create test purchases with sandbox buyer account
- Check transactions in Sandbox Dashboard

**Resources:**
- [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
- [PayPal Sandbox Guide](https://developer.paypal.com/api/rest/sandbox/)

---

## 3. Mercado Pago (Chilean & Latin American Payments)

### Setup

1. **Create Mercado Pago Account**
   - Go to [https://www.mercadopago.cl/](https://www.mercadopago.cl/) (Chile)
   - Sign up and complete verification
   - Verify your identity (RUT required for Chile)

2. **Create Application**
   - Go to [https://www.mercadopago.cl/developers/panel/app](https://www.mercadopago.cl/developers/panel/app)
   - Click **Create Application**
   - Name: "LeCoin Donations"
   - Select: **Online payments**

3. **Get Credentials**
   - Go to **Credentials** tab
   - You'll see **Test** and **Production** credentials
   - Copy **Access Token** and **Public Key** (use Test first)

4. **Add to .env**
   ```bash
   # Test credentials (for development)
   MERCADOPAGO_ACCESS_TOKEN=TEST-your-test-access-token
   MERCADOPAGO_PUBLIC_KEY=TEST-your-test-public-key
   ```

5. **Configure Webhooks** (optional but recommended)
   - Go to your application settings
   - Add webhook URL: `https://yourdomain.com/api/lecoin/mercadopago/webhook`
   - Select events: **Payments**, **Merchant Orders**

### Going Live

1. **Complete Account Verification**
   - Verify RUT and bank account
   - Complete identity verification

2. **Get Production Credentials**
   - Switch to **Production** mode in application
   - Copy **Production Access Token**

3. **Update .env for Production**
   ```bash
   MERCADOPAGO_ACCESS_TOKEN=APP_USR-your-production-token
   MERCADOPAGO_PUBLIC_KEY=APP_USR-your-production-public-key
   ```

### Testing

- Test mode uses fake money
- Use test credit card: `5031 7557 3453 0604` (Expiry: 11/25, CVV: 123)
- Full test cards list: [Mercado Pago Test Cards](https://www.mercadopago.cl/developers/en/docs/checkout-api/testing)

**Resources:**
- [Mercado Pago Chile](https://www.mercadopago.cl/developers/)
- [Mercado Pago API Docs](https://www.mercadopago.cl/developers/en/docs)

---

## 4. Chilean Bank Transfer

This method requires **no API setup** - users transfer directly to your bank account.

### Setup

1. **Update Transfer Instructions Page**
   - Open `/apps/web/src/app/lecoin/transfer/page.tsx`
   - Update these variables:
   ```typescript
   const accountNumber = '173503873'; // Your account number
   const accountName = 'Benjamin Ledesma'; // Account holder name
   const bank = 'Banco de Chile'; // Your bank
   const accountType = 'Cuenta Corriente'; // or 'Cuenta Vista'
   ```

2. **Set Up Email Notifications**
   - When users complete transfer, they'll email you the receipt
   - Email: developer.benja@gmail.com (configured in transfer page)
   - You'll manually verify and issue LeCoins

### Workflow

1. User selects "Transferencia Bancaria" payment method
2. System shows your bank account details
3. User makes transfer via their bank
4. User sends transfer receipt to your email
5. You verify the transfer
6. You manually issue LeCoin certificate (or set up automated flow later)

### Advantages

- **No fees** (unlike Stripe, PayPal, Mercado Pago)
- **Direct to your account** (immediate access to funds)
- **Trusted in Chile** (most common payment method)

### Disadvantages

- **Manual verification** required
- **Slower** (not instant like other methods)
- **No automatic LeCoin issuance** (requires manual step)

---

## Environment Variables Summary

Add all these to your `.env` file:

```bash
# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:4000

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# PayPal
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_MODE=sandbox

# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=TEST-your-mercadopago-access-token
MERCADOPAGO_PUBLIC_KEY=TEST-your-mercadopago-public-key
```

---

## Testing All Payment Methods

### Local Testing

1. **Start dev server**
   ```bash
   npm run dev
   ```

2. **Start Stripe webhook forwarding** (separate terminal)
   ```bash
   stripe listen --forward-to localhost:4000/api/lecoin/webhook
   ```

3. **Open LeCoin Portal**
   ```
   http://localhost:4000/lecoin
   ```

4. **Enter access code**: `LEDESMA2026`

5. **Test each payment method**:
   - **Stripe**: Use card `4242 4242 4242 4242`
   - **PayPal**: Login with sandbox buyer account
   - **Mercado Pago**: Use test card `5031 7557 3453 0604`
   - **Bank Transfer**: Follow instructions, send test email

### Expected Flow

1. User selects donation amount (e.g., $1,000)
2. User fills in name, email, phone (optional)
3. User selects payment method
4. User clicks "Help Launch LeDesign"
5. User is redirected to payment processor
6. User completes payment
7. User is redirected to success page
8. System shows donation confirmation
9. (Future) Email sent with LeCoin certificate

---

## Payment Method Comparison

| Feature | Stripe | PayPal | Mercado Pago | Bank Transfer |
|---------|--------|--------|--------------|---------------|
| **Fee** | ~3% | ~3% | ~3-4% | Free |
| **Speed** | Instant | Instant | Instant | Manual (1-2 days) |
| **International** | ✅ Yes | ✅ Yes | ⚠️ Latin America | ❌ Chile only |
| **Chilean Cards** | ✅ Yes | ✅ Yes | ✅ Yes | N/A |
| **Setup Complexity** | Medium | Medium | Medium | Easy |
| **API Required** | Yes | Yes | Yes | No |
| **Automatic LeCoin** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ Manual |

---

## Recommended Setup Order

1. **Start with Stripe** - Most universal, works globally
2. **Add PayPal** - Popular alternative for users without cards
3. **Add Mercado Pago** - Essential for Chilean users (most popular in Chile)
4. **Enable Bank Transfer** - For users who prefer direct deposit

---

## Going Live Checklist

### Stripe
- [ ] Switch to live API keys
- [ ] Create production webhook endpoint
- [ ] Test with real card (small amount)
- [ ] Verify webhook events received

### PayPal
- [ ] Create live app credentials
- [ ] Update PAYPAL_MODE to 'live'
- [ ] Test with real PayPal account
- [ ] Verify payments in PayPal dashboard

### Mercado Pago
- [ ] Complete account verification (RUT)
- [ ] Switch to production credentials
- [ ] Update webhook URL
- [ ] Test with real Chilean card
- [ ] Verify payments in Mercado Pago panel

### Bank Transfer
- [ ] Verify bank account details are correct
- [ ] Test email receipt flow
- [ ] Set up manual verification process
- [ ] (Optional) Automate LeCoin issuance

---

## Troubleshooting

### Stripe Not Working

**Check:**
- STRIPE_SECRET_KEY starts with `sk_test_` (sandbox) or `sk_live_` (production)
- Webhook forwarding is running: `stripe listen`
- STRIPE_WEBHOOK_SECRET matches the one from `stripe listen` output

**Fix:**
```bash
# Restart webhook forwarding
stripe listen --forward-to localhost:4000/api/lecoin/webhook

# Check logs in terminal
```

### PayPal Errors

**Check:**
- PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are correct
- PAYPAL_MODE is set to 'sandbox' for testing
- Using sandbox buyer account for test payments

**Fix:**
```bash
# Verify credentials in PayPal Developer Dashboard
# Double-check Client ID and Secret

# Check API response in browser console
```

### Mercado Pago Not Processing

**Check:**
- MERCADOPAGO_ACCESS_TOKEN starts with `TEST-` (test mode)
- Account is verified (for production)
- Using correct test cards

**Fix:**
```bash
# Check Mercado Pago dashboard for payment status
# Verify webhook URL is correct
# Check application credentials
```

### Bank Transfer Email Not Received

**Check:**
- Email client is configured (`developer.benja@gmail.com`)
- Transfer instructions page has correct account number
- User sent email with receipt

**Manual Process:**
1. Check email for transfer receipts
2. Verify transfer in bank account
3. Manually issue LeCoin via dashboard (when implemented)

---

## Security Best Practices

### Environment Variables
- ✅ **DO**: Store all secrets in `.env` file
- ✅ **DO**: Add `.env` to `.gitignore`
- ✅ **DO**: Use different keys for test and production
- ❌ **DON'T**: Commit `.env` to Git
- ❌ **DON'T**: Share API keys publicly

### Webhook Security
- ✅ **DO**: Verify webhook signatures (Stripe, PayPal)
- ✅ **DO**: Use HTTPS in production
- ✅ **DO**: Log webhook events for debugging
- ❌ **DON'T**: Trust webhook data without verification
- ❌ **DON'T**: Process duplicate webhook events

### Payment Amounts
- ✅ **DO**: Validate amounts server-side
- ✅ **DO**: Set minimum ($500) and maximum ($10,000)
- ✅ **DO**: Calculate LeCoins server-side
- ❌ **DON'T**: Trust client-side amount calculations
- ❌ **DON'T**: Allow negative or zero amounts

---

## Next Steps

After setting up payments:

1. **Database Integration** - Save donations to Turso database
2. **Email Notifications** - Send confirmation emails via SendGrid
3. **Certificate Generation** - Auto-generate LeCoin certificates
4. **Admin Dashboard** - Track donations and manage LeCoins
5. **Analytics** - Monitor conversion rates per payment method

---

## Support & Resources

### Stripe
- [Dashboard](https://dashboard.stripe.com/)
- [Documentation](https://stripe.com/docs)
- [Support](https://support.stripe.com/)

### PayPal
- [Developer Dashboard](https://developer.paypal.com/dashboard/)
- [Documentation](https://developer.paypal.com/api/rest/)
- [Support](https://www.paypal.com/us/smarthelp/contact-us)

### Mercado Pago
- [Dashboard](https://www.mercadopago.cl/developers/panel)
- [Documentation](https://www.mercadopago.cl/developers/en/docs)
- [Support](https://www.mercadopago.cl/ayuda)

### Bank Transfers
- Contact your bank for account details
- Set up email notifications for incoming transfers

---

**Need Help?**

If you encounter issues:
1. Check error logs in terminal
2. Verify environment variables
3. Test with sandbox/test credentials first
4. Check payment processor dashboards for failed payments

---

**Last Updated**: January 2026
