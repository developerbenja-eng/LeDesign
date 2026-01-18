import { NextRequest, NextResponse } from 'next/server';
import { capturePayPalOrder, processSuccessfulPayPalPayment } from '@/lib/lecoin/paypal';

/**
 * API route to capture PayPal order after user approval
 * Called from the PayPal success page
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId parameter' }, { status: 400 });
    }

    // Capture the PayPal order
    const capturedOrder = await capturePayPalOrder(orderId);

    // Check if payment was successful
    if (capturedOrder.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Payment was not completed' },
        { status: 400 }
      );
    }

    // Extract metadata from custom_id
    const customId = capturedOrder.purchase_units[0].custom_id;
    const metadata = customId ? JSON.parse(customId) : {};

    // Process the successful payment
    try {
      await processSuccessfulPayPalPayment(capturedOrder);
    } catch (error) {
      console.error('Error processing PayPal payment:', error);
      // Don't return error - payment was already captured
    }

    // Return order details for the success page
    return NextResponse.json({
      success: true,
      orderId: capturedOrder.id,
      amount: parseFloat(capturedOrder.purchase_units[0].amount.value),
      donorName: metadata.donorName || 'Friend',
      donorEmail: capturedOrder.payer.email_address,
      coinsIssued: parseInt(metadata.coinsToIssue || '0'),
    });
  } catch (error: any) {
    console.error('PayPal capture error:', error);

    return NextResponse.json(
      { error: error.message || 'Failed to capture PayPal payment' },
      { status: 500 }
    );
  }
}
