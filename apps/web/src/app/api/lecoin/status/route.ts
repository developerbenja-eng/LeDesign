import { NextResponse } from 'next/server';

// Mock data for now - in production, fetch from database
export async function GET() {
  try {
    // TODO: Fetch from database
    const status = {
      totalRaised: 0,
      currentBalance: 0,
      minimumReserve: 10000,
      coinsIssued: 0,
      coinsAvailable: 25,
      totalCoins: 100,
      exitsAllowed: false,
      subscribers: 0,
      monthlyRevenue: 0,
      daysUntilLaunch: Math.ceil(
        (new Date('2026-05-04').getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      ),
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error('Error fetching LeCoin status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch status' },
      { status: 500 }
    );
  }
}
