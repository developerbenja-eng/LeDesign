/**
 * PayPal Integration for LeCoin Donations
 * Handles PayPal order creation and payment processing
 */

// Lazy initialization of PayPal credentials
function getPayPalConfig() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const mode = process.env.PAYPAL_MODE || 'sandbox'; // 'sandbox' or 'live'

  if (!clientId || !clientSecret) {
    throw new Error(
      'PayPal credentials are not configured. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to your .env file.'
    );
  }

  const baseURL =
    mode === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

  return { clientId, clientSecret, baseURL };
}

/**
 * Get PayPal OAuth access token
 */
async function getAccessToken(): Promise<string> {
  const { clientId, clientSecret, baseURL } = getPayPalConfig();

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(`${baseURL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${auth}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get PayPal access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Creates a PayPal order for LeCoin donation
 */
export async function createPayPalOrder(params: {
  amount: number;
  donorName: string;
  donorEmail: string;
  phone?: string;
  message?: string;
}): Promise<{ orderId: string; approvalUrl: string }> {
  const { amount, donorName, donorEmail, phone, message } = params;
  const { baseURL } = getPayPalConfig();

  // Calculate how many LeCoins will be issued
  const coinsToIssue = Math.floor(amount / 1000);

  const accessToken = await getAccessToken();

  const orderPayload = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        description: `LeCoin Founding Supporter Donation - ${coinsToIssue} LeCoin${coinsToIssue > 1 ? 's' : ''}`,
        amount: {
          currency_code: 'USD',
          value: amount.toFixed(2),
        },
        custom_id: JSON.stringify({
          donorName,
          donorEmail,
          phone: phone || '',
          message: message || '',
          coinsToIssue: coinsToIssue.toString(),
          donationAmount: amount.toString(),
        }),
      },
    ],
    application_context: {
      brand_name: 'LeDesign - LeCoin',
      landing_page: 'NO_PREFERENCE',
      user_action: 'PAY_NOW',
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/lecoin/success/paypal`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/lecoin?canceled=true`,
    },
  };

  const response = await fetch(`${baseURL}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(orderPayload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create PayPal order: ${error}`);
  }

  const order = await response.json();

  // Find the approval URL
  const approvalUrl = order.links.find((link: any) => link.rel === 'approve')?.href;

  if (!approvalUrl) {
    throw new Error('No approval URL in PayPal response');
  }

  return {
    orderId: order.id,
    approvalUrl,
  };
}

/**
 * Captures a PayPal order (after user approves payment)
 */
export async function capturePayPalOrder(orderId: string): Promise<any> {
  const { baseURL } = getPayPalConfig();
  const accessToken = await getAccessToken();

  const response = await fetch(`${baseURL}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to capture PayPal order: ${error}`);
  }

  return await response.json();
}

/**
 * Retrieves a PayPal order by ID
 */
export async function getPayPalOrder(orderId: string): Promise<any> {
  const { baseURL } = getPayPalConfig();
  const accessToken = await getAccessToken();

  const response = await fetch(`${baseURL}/v2/checkout/orders/${orderId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get PayPal order: ${error}`);
  }

  return await response.json();
}

/**
 * Processes a successful PayPal payment
 * Called after order is captured
 */
export async function processSuccessfulPayPalPayment(order: any) {
  const customId = order.purchase_units[0].custom_id;
  const metadata = customId ? JSON.parse(customId) : {};

  const { donorName, donorEmail, phone, message, coinsToIssue, donationAmount } = metadata;

  if (!donorName || !donorEmail || !coinsToIssue || !donationAmount) {
    throw new Error('Missing required metadata in PayPal order');
  }

  // TODO: Save to database
  // 1. Create or update LeCoinSupporter record
  // 2. Create LeCoinDonation record with status='completed', payment_method='paypal'
  // 3. Update LeCoinFundPot (add to total_raised and current_balance)
  // 4. Issue LeCoin(s) based on amount
  // 5. Send confirmation email with certificate and login credentials

  console.log('Processing successful PayPal payment:', {
    donorName,
    donorEmail,
    phone,
    message,
    coinsToIssue: parseInt(coinsToIssue),
    donationAmount: parseInt(donationAmount),
    orderId: order.id,
    paypalPayerId: order.payer.payer_id,
  });

  return {
    success: true,
    coinsIssued: parseInt(coinsToIssue),
  };
}
