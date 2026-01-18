import { NextRequest, NextResponse } from 'next/server';
import { getCheckoutSession } from '@/lib/lecoin/stripe';

/**
 * API route to retrieve Stripe Checkout Session details
 * Used by the success page to display payment information
 */
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session_id parameter' }, { status: 400 });
    }

    // Retrieve session from Stripe
    const session = await getCheckoutSession(sessionId);

    // Return session details
    return NextResponse.json({
      id: session.id,
      amount_total: session.amount_total,
      customer_email: session.customer_email,
      payment_status: session.payment_status,
      metadata: session.metadata,
      created: session.created,
    });
  } catch (error: any) {
    console.error('Error fetching session:', error);

    if (error.statusCode === 404) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json(
      { error: 'Failed to retrieve session details' },
      { status: 500 }
    );
  }
}
