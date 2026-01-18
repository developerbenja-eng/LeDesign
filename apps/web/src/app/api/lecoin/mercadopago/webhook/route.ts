import { NextRequest, NextResponse } from 'next/server';
import { getMercadoPagoPayment, processSuccessfulMercadoPagoPayment } from '@/lib/lecoin/mercadopago';

/**
 * Mercado Pago Webhook Handler for LeCoin Donations
 * Processes payment notifications from Mercado Pago
 *
 * Mercado Pago sends notifications for various events:
 * - payment: When a payment is created, approved, rejected, etc.
 * - merchant_order: When an order status changes
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('Mercado Pago webhook received:', body);

    // Mercado Pago sends different types of notifications
    const { type, data } = body;

    // We're primarily interested in payment notifications
    if (type === 'payment') {
      const paymentId = data.id;

      if (!paymentId) {
        return NextResponse.json({ error: 'Missing payment ID' }, { status: 400 });
      }

      // Fetch the full payment details
      const payment = await getMercadoPagoPayment(paymentId);

      console.log('Payment status:', payment.status);

      // Only process approved payments
      if (payment.status === 'approved') {
        console.log('Payment approved for payment:', paymentId);

        try {
          await processSuccessfulMercadoPagoPayment(payment);
          console.log('Successfully processed Mercado Pago payment for:', payment.payer.email);
        } catch (error) {
          console.error('Error processing successful payment:', error);
          // Don't return error to Mercado Pago - we'll retry manually
        }
      } else if (payment.status === 'rejected') {
        console.log('Payment rejected for payment:', paymentId);
        // TODO: Send email to donor about rejected payment
        // TODO: Update donation record status to 'failed'
      } else {
        console.log('Payment status not final yet:', payment.status);
      }
    } else if (type === 'merchant_order') {
      // Handle merchant order notifications if needed
      console.log('Merchant order notification received');
    }

    // Return 200 to acknowledge receipt of the webhook
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Mercado Pago webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
