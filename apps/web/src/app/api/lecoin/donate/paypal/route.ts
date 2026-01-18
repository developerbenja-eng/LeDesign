import { NextRequest, NextResponse } from 'next/server';
import { createPayPalOrder } from '@/lib/lecoin/paypal';

/**
 * API route to create PayPal order for LeCoin donation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, amount, message } = body;

    // Validation
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    if (!amount || amount < 500) {
      return NextResponse.json(
        { error: 'Minimum donation is $500' },
        { status: 400 }
      );
    }

    if (amount > 10000) {
      return NextResponse.json(
        { error: 'Maximum donation is $10,000 per transaction' },
        { status: 400 }
      );
    }

    // Create PayPal order
    const { orderId, approvalUrl } = await createPayPalOrder({
      amount,
      donorName: name,
      donorEmail: email,
      phone,
      message,
    });

    const coinsToIssue = Math.floor(amount / 1000);

    return NextResponse.json({
      success: true,
      checkoutUrl: approvalUrl,
      orderId,
      coinsToIssue,
    });
  } catch (error: any) {
    console.error('PayPal donation error:', error);

    return NextResponse.json(
      { error: error.message || 'Failed to create PayPal order' },
      { status: 500 }
    );
  }
}
