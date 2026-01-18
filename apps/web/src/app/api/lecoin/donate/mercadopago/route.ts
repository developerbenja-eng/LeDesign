import { NextRequest, NextResponse } from 'next/server';
import { createMercadoPagoPreference } from '@/lib/lecoin/mercadopago';

/**
 * API route to create Mercado Pago preference for LeCoin donation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, amount, message } = body;

    // Validation
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Nombre y email son requeridos / Name and email are required' },
        { status: 400 }
      );
    }

    if (!amount || amount < 500) {
      return NextResponse.json(
        { error: 'La donación mínima es $500 / Minimum donation is $500' },
        { status: 400 }
      );
    }

    if (amount > 10000) {
      return NextResponse.json(
        { error: 'La donación máxima es $10,000 por transacción / Maximum donation is $10,000 per transaction' },
        { status: 400 }
      );
    }

    // Create Mercado Pago preference
    const { preferenceId, initPoint } = await createMercadoPagoPreference({
      amount,
      donorName: name,
      donorEmail: email,
      phone,
      message,
    });

    const coinsToIssue = Math.floor(amount / 1000);

    return NextResponse.json({
      success: true,
      checkoutUrl: initPoint,
      preferenceId,
      coinsToIssue,
    });
  } catch (error: any) {
    console.error('Mercado Pago donation error:', error);

    return NextResponse.json(
      { error: error.message || 'Failed to create Mercado Pago preference' },
      { status: 500 }
    );
  }
}
