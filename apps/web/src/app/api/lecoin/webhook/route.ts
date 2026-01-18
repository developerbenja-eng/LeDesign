import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature, processSuccessfulPayment } from '@/lib/lecoin/stripe';
import Stripe from 'stripe';

/**
 * Stripe Webhook Handler for LeCoin Donations
 * Processes payment events from Stripe
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('STRIPE_WEBHOOK_SECRET is not configured');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = verifyWebhookSignature(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Only process if payment was successful
        if (session.payment_status === 'paid') {
          console.log('Payment successful for session:', session.id);

          try {
            await processSuccessfulPayment(session);
            console.log('Successfully processed payment for:', session.customer_email);
          } catch (error) {
            console.error('Error processing successful payment:', error);
            // Don't return error to Stripe - we'll retry manually
          }
        } else {
          console.log('Payment not completed yet for session:', session.id);
        }
        break;
      }

      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Async payment succeeded for session:', session.id);

        try {
          await processSuccessfulPayment(session);
        } catch (error) {
          console.error('Error processing async payment:', error);
        }
        break;
      }

      case 'checkout.session.async_payment_failed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Async payment failed for session:', session.id);

        // TODO: Send email to donor about failed payment
        // TODO: Update donation record status to 'failed'
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('PaymentIntent succeeded:', paymentIntent.id);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('PaymentIntent failed:', paymentIntent.id);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Return 200 to acknowledge receipt of the event
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
