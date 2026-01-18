# LeCoin Stripe Payment Setup Guide

Complete guide to setting up Stripe payment processing for LeCoin donations.

---

## Overview

The LeCoin donation system uses Stripe Checkout for secure payment processing. This guide covers:

1. Creating a Stripe account
2. Getting API keys
3. Configuring environment variables
4. Setting up webhooks
5. Testing payments
6. Going live

---

## Step 1: Create Stripe Account

### Sign Up

1. Go to [https://stripe.com/](https://stripe.com/)
2. Click "Start now" or "Sign in"
3. Create an account with your email
4. Complete verification (requires business details)

### Enable Test Mode

Stripe starts in **Test Mode** by default - this is perfect for development!

- Test mode uses fake card numbers
- No real money is processed
- You can test the entire flow safely

---

## Step 2: Get API Keys

### Access Dashboard

1. Log in to [https://dashboard.stripe.com/](https://dashboard.stripe.com/)
2. Make sure you're in **Test Mode** (toggle at top right)

### Get Test Keys

1. Click **Developers** in the left sidebar
2. Click **API keys**
3. You'll see two keys:
   - **Publishable key** (`pk_test_...`) - Safe to expose in frontend
   - **Secret key** (`sk_test_...`) - NEVER expose publicly

### Copy Keys

Click "Reveal test key" for the secret key, then copy both:

```
Publishable key: pk_test_51ABcd...xyz
Secret key: sk_test_51ABcd...xyz
```

---

## Step 3: Configure Environment Variables

### Add to .env

Open `/Users/benjaledesma/Benja/LeDesign/.env` and add:

```bash
# Stripe Payment Processing (for LeCoin donations)
STRIPE_SECRET_KEY=sk_test_YOUR_ACTUAL_SECRET_KEY_HERE
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_ACTUAL_PUBLISHABLE_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
```

**Replace** the placeholder values with your actual keys from Step 2.

### Verify Setup

Run this command to check if Stripe is configured:

```bash
node -e "require('dotenv').config(); console.log('Stripe Secret Key:', process.env.STRIPE_SECRET_KEY ? '✅ Configured' : '❌ Missing')"
```

You should see: `Stripe Secret Key: ✅ Configured`

---

## Step 4: Set Up Webhooks

Webhooks allow Stripe to notify your app when payments succeed or fail.

### Why Webhooks?

- Stripe sends payment confirmation to your server
- More reliable than client-side confirmation
- Handles async payments (like bank transfers)
- Required for production

### Development Setup (Local Testing)

For local development, use **Stripe CLI** to forward webhooks:

#### Install Stripe CLI

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Or download from https://stripe.com/docs/stripe-cli
```

#### Login to Stripe

```bash
stripe login
```

This opens a browser window - approve the connection.

#### Forward Webhooks Locally

```bash
stripe listen --forward-to localhost:4000/api/lecoin/webhook
```

**Important**: Copy the webhook signing secret from the output:

```
> Ready! Your webhook signing secret is whsec_abc123xyz...
```

Add this to your `.env`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_abc123xyz...
```

Keep the `stripe listen` terminal window open while testing!

### Production Setup (Vercel)

For production on Vercel:

1. Go to [https://dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
2. Click **+ Add endpoint**
3. Enter your production URL:
   ```
   https://ledesign.com/api/lecoin/webhook
   ```
4. Select events to listen for:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (`whsec_...`)
7. Add to Vercel environment variables:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_production_secret_here
   ```

---

## Step 5: Test Payments

### Test Card Numbers

Stripe provides test cards that simulate different scenarios:

#### Successful Payment

```
Card: 4242 4242 4242 4242
Expiry: Any future date (e.g., 12/34)
CVC: Any 3 digits (e.g., 123)
ZIP: Any 5 digits (e.g., 12345)
```

#### Other Test Scenarios

```
# Payment requires authentication (3D Secure)
Card: 4000 0025 0000 3155

# Card declined
Card: 4000 0000 0000 0002

# Insufficient funds
Card: 4000 0000 0000 9995
```

Full list: [https://stripe.com/docs/testing](https://stripe.com/docs/testing)

### Test the Flow

1. Start development server:
   ```bash
   npm run dev
   ```

2. Start Stripe webhook forwarding (separate terminal):
   ```bash
   stripe listen --forward-to localhost:4000/api/lecoin/webhook
   ```

3. Open LeCoin portal:
   ```
   http://localhost:4000/lecoin
   ```

4. Enter access code: `LEDESMA2026`

5. Fill out donation form:
   - Amount: $1,000 (to get 1 LeCoin)
   - Name: Test User
   - Email: test@example.com
   - Check the agreement box

6. Click "Help Launch LeDesign"

7. You'll be redirected to Stripe Checkout

8. Use test card: `4242 4242 4242 4242`

9. Complete payment

10. Check webhook terminal - you should see:
    ```
    [200] POST /api/lecoin/webhook [evt_1ABC...]
    Payment successful for session: cs_test_...
    ```

11. You'll be redirected to success page:
    ```
    http://localhost:4000/lecoin/success?session_id=cs_test_...
    ```

### Expected Behavior

✅ **Success Flow**:
1. Form submission → Stripe Checkout opens
2. Enter test card → Payment processes
3. Webhook receives `checkout.session.completed` event
4. User redirected to success page
5. Success page shows donation details
6. (Future) Email sent with certificate and login credentials

❌ **Error Scenarios to Test**:
- Missing name/email → Form validation error
- Amount < $500 → "Minimum donation is $500"
- Declined card → Stripe error message
- Checkbox not checked → "Please check the agreement box"

---

## Step 6: Going Live

### Switch to Live Mode

When ready for real payments:

1. Complete Stripe account activation:
   - Provide business information
   - Add bank account for payouts
   - Verify identity

2. Get **Live API Keys**:
   - Switch to **Live Mode** in Stripe Dashboard (toggle top right)
   - Go to **Developers** → **API keys**
   - Copy **live** keys (`pk_live_...` and `sk_live_...`)

3. Update production environment variables (Vercel):
   ```bash
   STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_PUBLISHABLE_KEY
   STRIPE_WEBHOOK_SECRET=whsec_YOUR_LIVE_WEBHOOK_SECRET
   ```

4. Create **live webhook endpoint**:
   - Go to **Developers** → **Webhooks**
   - Click **+ Add endpoint**
   - URL: `https://ledesign.com/api/lecoin/webhook`
   - Select same events as test mode
   - Copy signing secret → Add to Vercel env vars

5. Test with **live mode** (use real card!)

### Security Checklist

Before going live:

- [ ] Stripe keys are in environment variables (not hardcoded)
- [ ] `.env` file is in `.gitignore`
- [ ] Webhook signature verification is enabled
- [ ] Production webhook endpoint is HTTPS
- [ ] Test successful payment flow in live mode
- [ ] Test declined payment flow
- [ ] Verify webhook events are received
- [ ] Email notifications work (when implemented)
- [ ] Database records are created correctly (when implemented)

---

## Troubleshooting

### Payment Not Processing

**Check**:
1. Are you using test keys in test mode?
2. Is webhook forwarding running (`stripe listen`)?
3. Check browser console for errors
4. Check terminal for API errors

**Fix**:
```bash
# Restart dev server
npm run dev

# Restart webhook forwarding
stripe listen --forward-to localhost:4000/api/lecoin/webhook
```

### Webhook Not Receiving Events

**Symptoms**:
- Payment completes but webhook doesn't fire
- No console logs in webhook terminal

**Fix**:
1. Check `STRIPE_WEBHOOK_SECRET` is set in `.env`
2. Verify webhook URL matches `stripe listen` command
3. Check Stripe Dashboard → Developers → Webhooks for failed attempts

### "STRIPE_SECRET_KEY is not set" Error

**Fix**:
1. Make sure `.env` file exists in project root
2. Verify key format: `STRIPE_SECRET_KEY=sk_test_...`
3. Restart dev server after adding keys

### Checkout Session Returns 400/500 Error

**Check**:
1. Donation amount ≥ $500
2. Email is valid format
3. Name and email fields are filled
4. Agreement checkbox is checked

**Debug**:
Check browser Network tab → `POST /api/lecoin/donate` → Response

---

## API Routes Reference

### POST /api/lecoin/donate

Creates Stripe Checkout session.

**Request**:
```json
{
  "name": "Juan Pérez",
  "email": "juan@example.com",
  "phone": "+56912345678",
  "amount": 1000,
  "message": "Good luck!"
}
```

**Response**:
```json
{
  "success": true,
  "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_...",
  "sessionId": "cs_test_abc123",
  "coinsToIssue": 1
}
```

### POST /api/lecoin/webhook

Receives Stripe webhook events.

**Events Handled**:
- `checkout.session.completed` - Payment succeeded
- `checkout.session.async_payment_succeeded` - Async payment succeeded
- `checkout.session.async_payment_failed` - Async payment failed

### GET /api/lecoin/session

Retrieves checkout session details.

**Query Params**:
- `session_id`: Stripe checkout session ID

**Response**:
```json
{
  "id": "cs_test_abc123",
  "amount_total": 100000,
  "customer_email": "juan@example.com",
  "payment_status": "paid",
  "metadata": {
    "donorName": "Juan Pérez",
    "coinsToIssue": "1",
    "donationAmount": "1000"
  }
}
```

---

## Next Steps

After Stripe is working:

1. **Database Integration** - Save donations to Turso database
2. **Email Notifications** - Send confirmation emails with SendGrid
3. **Certificate Generation** - Auto-generate LeCoin certificates
4. **Admin Dashboard** - Track donations and issue coins manually
5. **Physical Coins** - Order custom coins and ship to supporters

---

## Resources

- [Stripe Dashboard](https://dashboard.stripe.com/)
- [Stripe Documentation](https://stripe.com/docs)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Test Card Numbers](https://stripe.com/docs/testing)
- [Webhook Events](https://stripe.com/docs/api/events/types)
- [Checkout Session API](https://stripe.com/docs/api/checkout/sessions)

---

**Need Help?**

- Stripe Support: [https://support.stripe.com/](https://support.stripe.com/)
- Stripe Community: [https://stripe.com/community](https://stripe.com/community)
