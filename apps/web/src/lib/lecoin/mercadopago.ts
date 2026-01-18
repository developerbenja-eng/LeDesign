/**
 * Mercado Pago Integration for LeCoin Donations
 * Handles Mercado Pago preference creation and payment processing
 * Popular payment method in Chile and Latin America
 */

// Lazy initialization of Mercado Pago credentials
function getMercadoPagoConfig() {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error(
      'Mercado Pago credentials are not configured. Add MERCADOPAGO_ACCESS_TOKEN to your .env file.'
    );
  }

  // Mercado Pago API is the same for all countries
  const baseURL = 'https://api.mercadopago.com';

  return { accessToken, baseURL };
}

/**
 * Creates a Mercado Pago preference for LeCoin donation
 */
export async function createMercadoPagoPreference(params: {
  amount: number;
  donorName: string;
  donorEmail: string;
  phone?: string;
  message?: string;
}): Promise<{ preferenceId: string; initPoint: string }> {
  const { amount, donorName, donorEmail, phone, message } = params;
  const { accessToken, baseURL } = getMercadoPagoConfig();

  // Calculate how many LeCoins will be issued
  const coinsToIssue = Math.floor(amount / 1000);

  const preferencePayload = {
    items: [
      {
        title: `LeCoin Founding Supporter Donation`,
        description: `Apoyo para el desarrollo de LeDesign - ${coinsToIssue} LeCoin${coinsToIssue > 1 ? 's' : ''}`,
        quantity: 1,
        unit_price: amount,
        currency_id: 'USD', // Can also use 'CLP' for Chilean Pesos
      },
    ],
    payer: {
      name: donorName,
      email: donorEmail,
      phone: phone
        ? {
            area_code: '',
            number: phone,
          }
        : undefined,
    },
    back_urls: {
      success: `${process.env.NEXT_PUBLIC_APP_URL}/lecoin/success/mercadopago`,
      failure: `${process.env.NEXT_PUBLIC_APP_URL}/lecoin?canceled=true`,
      pending: `${process.env.NEXT_PUBLIC_APP_URL}/lecoin/pending`,
    },
    auto_return: 'approved',
    external_reference: JSON.stringify({
      donorName,
      donorEmail,
      phone: phone || '',
      message: message || '',
      coinsToIssue: coinsToIssue.toString(),
      donationAmount: amount.toString(),
    }),
    notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/lecoin/mercadopago/webhook`,
    statement_descriptor: 'LeDesign LeCoin',
  };

  const response = await fetch(`${baseURL}/checkout/preferences`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(preferencePayload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Mercado Pago preference: ${error}`);
  }

  const preference = await response.json();

  return {
    preferenceId: preference.id,
    initPoint: preference.init_point, // URL to redirect user to Mercado Pago checkout
  };
}

/**
 * Retrieves payment information by ID
 */
export async function getMercadoPagoPayment(paymentId: string): Promise<any> {
  const { accessToken, baseURL } = getMercadoPagoConfig();

  const response = await fetch(`${baseURL}/v1/payments/${paymentId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Mercado Pago payment: ${error}`);
  }

  return await response.json();
}

/**
 * Processes a successful Mercado Pago payment
 * Called after payment is approved
 */
export async function processSuccessfulMercadoPagoPayment(payment: any) {
  const externalReference = payment.external_reference;
  const metadata = externalReference ? JSON.parse(externalReference) : {};

  const { donorName, donorEmail, phone, message, coinsToIssue, donationAmount } = metadata;

  if (!donorName || !donorEmail || !coinsToIssue || !donationAmount) {
    throw new Error('Missing required metadata in Mercado Pago payment');
  }

  // TODO: Save to database
  // 1. Create or update LeCoinSupporter record
  // 2. Create LeCoinDonation record with status='completed', payment_method='mercadopago'
  // 3. Update LeCoinFundPot (add to total_raised and current_balance)
  // 4. Issue LeCoin(s) based on amount
  // 5. Send confirmation email with certificate and login credentials

  console.log('Processing successful Mercado Pago payment:', {
    donorName,
    donorEmail,
    phone,
    message,
    coinsToIssue: parseInt(coinsToIssue),
    donationAmount: parseInt(donationAmount),
    paymentId: payment.id,
    mercadoPagoPayerId: payment.payer.id,
  });

  return {
    success: true,
    coinsIssued: parseInt(coinsToIssue),
  };
}
