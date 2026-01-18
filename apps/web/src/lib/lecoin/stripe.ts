/**
 * Stripe Payment Integration for LeCoin Donations
 * Handles Stripe Checkout sessions and payment processing
 */

import Stripe from 'stripe';

// Lazy initialization of Stripe - only throws if actually used without key
function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error(
      'STRIPE_SECRET_KEY is not set in environment variables. Please add it to your .env file.'
    );
  }

  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-11-20.acacia',
    typescript: true,
  });
}

/**
 * Creates a Stripe Checkout session for LeCoin donation
 */
export async function createCheckoutSession(params: {
  amount: number;
  donorName: string;
  donorEmail: string;
  phone?: string;
  message?: string;
}): Promise<Stripe.Checkout.Session> {
  const { amount, donorName, donorEmail, phone, message } = params;
  const stripe = getStripe();

  // Calculate how many LeCoins will be issued
  const coinsToIssue = Math.floor(amount / 1000);

  // Create Checkout Session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'LeCoin Founding Supporter Donation',
            description: `Support LeDesign's development and receive ${coinsToIssue} LeCoin${coinsToIssue > 1 ? 's' : ''}`,
            images: ['https://ledesign.com/lecoin-logo.png'], // TODO: Add actual logo URL
          },
          unit_amount: amount * 100, // Stripe uses cents
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/lecoin/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/lecoin?canceled=true`,
    customer_email: donorEmail,
    metadata: {
      donorName,
      donorEmail,
      phone: phone || '',
      message: message || '',
      coinsToIssue: coinsToIssue.toString(),
      donationAmount: amount.toString(),
    },
  });

  return session;
}

/**
 * Retrieves a Checkout Session by ID
 */
export async function getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  return await stripe.checkout.sessions.retrieve(sessionId);
}

/**
 * Verifies a webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event {
  const stripe = getStripe();
  return stripe.webhooks.constructEvent(payload, signature, secret);
}

/**
 * Processes a successful payment
 * Called by webhook handler after payment is confirmed
 */
export async function processSuccessfulPayment(session: Stripe.Checkout.Session) {
  const { donorName, donorEmail, phone, message, coinsToIssue, donationAmount } =
    session.metadata || {};

  if (!donorName || !donorEmail || !coinsToIssue || !donationAmount) {
    throw new Error('Missing required metadata in Stripe session');
  }

  // TODO: Save to database
  // 1. Create or update LeCoinSupporter record
  // 2. Create LeCoinDonation record with status='completed'
  // 3. Update LeCoinFundPot (add to total_raised and current_balance)
  // 4. Issue LeCoin(s) based on amount
  // 5. Send confirmation email with certificate and login credentials

  console.log('Processing successful payment:', {
    donorName,
    donorEmail,
    phone,
    message,
    coinsToIssue: parseInt(coinsToIssue),
    donationAmount: parseInt(donationAmount),
    sessionId: session.id,
    paymentIntentId: session.payment_intent,
  });

  return {
    success: true,
    coinsIssued: parseInt(coinsToIssue),
  };
}
