import { NextRequest, NextResponse } from 'next/server';
import { getMercadoPagoPayment, processSuccessfulMercadoPagoPayment } from '@/lib/lecoin/mercadopago';

/**
 * API route to retrieve Mercado Pago payment details
 * Used by the success page to display payment information
 */
export async function GET(request: NextRequest) {
  try {
    const paymentId = request.nextUrl.searchParams.get('payment_id');

    if (!paymentId) {
      return NextResponse.json({ error: 'Missing payment_id parameter' }, { status: 400 });
    }

    // Retrieve payment from Mercado Pago
    const payment = await getMercadoPagoPayment(paymentId);

    // Check if payment was approved
    if (payment.status !== 'approved') {
      return NextResponse.json(
        {
          status: payment.status,
          error: payment.status === 'rejected' ? 'Payment was rejected' : 'Payment not yet approved',
        },
        { status: 400 }
      );
    }

    // Extract metadata from external_reference
    const externalReference = payment.external_reference;
    const metadata = externalReference ? JSON.parse(externalReference) : {};

    // Process the successful payment
    try {
      await processSuccessfulMercadoPagoPayment(payment);
    } catch (error) {
      console.error('Error processing Mercado Pago payment:', error);
      // Don't return error - payment was already approved
    }

    // Return payment details for the success page
    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      amount: payment.transaction_amount,
      donorName: metadata.donorName || 'Friend',
      donorEmail: payment.payer.email,
      coinsIssued: parseInt(metadata.coinsToIssue || '0'),
      status: payment.status,
    });
  } catch (error: any) {
    console.error('Error fetching Mercado Pago payment:', error);

    if (error.message.includes('404')) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    return NextResponse.json(
      { error: 'Failed to retrieve payment details' },
      { status: 500 }
    );
  }
}
