import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession } from '@/lib/lecoin/stripe';

interface DonationRequest {
  name: string;
  email: string;
  phone?: string;
  amount: number;
  message?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: DonationRequest = await request.json();

    // Validation
    if (!body.name || !body.email || !body.amount) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, and amount are required' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Amount validation
    if (body.amount < 500) {
      return NextResponse.json({ error: 'Minimum donation is $500' }, { status: 400 });
    }

    if (body.amount > 10000) {
      return NextResponse.json(
        { error: 'Maximum donation is $10,000. Please contact us for larger donations.' },
        { status: 400 }
      );
    }

    // Create Stripe Checkout session
    const session = await createCheckoutSession({
      amount: body.amount,
      donorName: body.name,
      donorEmail: body.email,
      phone: body.phone,
      message: body.message,
    });

    // Return the Checkout session URL
    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
      coinsToIssue: Math.floor(body.amount / 1000),
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);

    // Check if it's a Stripe error
    if (error && typeof error === 'object' && 'type' in error) {
      return NextResponse.json(
        { error: `Payment processing error: ${(error as any).message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process donation. Please try again.' },
      { status: 500 }
    );
  }
}
