'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Coins, Heart, Mail, Download, ArrowRight, AlertCircle } from 'lucide-react';

function PayPalSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('token'); // PayPal returns 'token' parameter

  const [orderData, setOrderData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setError('No PayPal order ID provided');
      setLoading(false);
      return;
    }

    // Capture the PayPal order
    fetch('/api/lecoin/paypal/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setOrderData(data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error capturing PayPal order:', err);
        setError('Failed to process payment');
        setLoading(false);
      });
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="glass-card rounded-xl p-8 max-w-md text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-400">Processing your PayPal payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="glass-card rounded-xl p-8 max-w-md text-center">
          <div className="text-red-400 mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <Link
            href="/lecoin"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors"
          >
            Return to LeCoin Portal
          </Link>
        </div>
      </div>
    );
  }

  const coinsIssued = orderData?.coinsIssued || 0;
  const amount = orderData?.amount || 0;
  const donorName = orderData?.donorName || 'Friend';
  const donorEmail = orderData?.donorEmail || '';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 sm:px-6 py-12">
        <div className="max-w-3xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-12 animate-fade-in">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-500/10 border-2 border-green-500 mb-6">
              <CheckCircle2 size={48} className="text-green-400" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">
              Thank You, {donorName}! 🎉
            </h1>
            <p className="text-xl text-slate-300">
              Your support means the world to me and my family
            </p>
          </div>

          {/* Payment Summary */}
          <div className="glass-card rounded-xl p-8 mb-8 animate-slide-up">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Coins size={28} className="text-blue-400" />
              Your LeCoin{coinsIssued > 1 ? 's' : ''}
            </h2>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
                <div className="text-sm text-slate-400 mb-2">Donation Amount</div>
                <div className="text-3xl font-bold text-white">
                  ${amount.toLocaleString()}
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-6 border border-blue-500/30">
                <div className="text-sm text-slate-400 mb-2">LeCoins Issued</div>
                <div className="text-3xl font-bold text-blue-400">{coinsIssued}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {coinsIssued === 1 ? 'Coin' : 'Coins'} from the first 100
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
              <p className="text-sm text-slate-300">
                <strong className="text-white">✅ Payment Confirmed via PayPal</strong>
                <br />
                Your contribution has been successfully processed and added to the Friends
                Development Fund.
              </p>
            </div>
          </div>

          {/* Next Steps */}
          <div className="glass-card rounded-xl p-8 mb-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Heart size={28} className="text-red-400" />
              What Happens Next
            </h2>

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-semibold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1 flex items-center gap-2">
                    <Mail size={18} className="text-blue-400" />
                    Check Your Email
                  </h3>
                  <p className="text-sm text-slate-400">
                    You'll receive a confirmation email at{' '}
                    <span className="text-white">{donorEmail}</span> within the next few minutes
                    with your LeCoin certificate and dashboard login credentials.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-semibold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1 flex items-center gap-2">
                    <Download size={18} className="text-blue-400" />
                    Your Certificate
                  </h3>
                  <p className="text-sm text-slate-400">
                    Your LeCoin Founding Supporter certificate will be sent within 24 hours. You
                    can download it anytime from your dashboard.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-semibold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1 flex items-center gap-2">
                    <Coins size={18} className="text-amber-400" />
                    Physical Coin (Optional)
                  </h3>
                  <p className="text-sm text-slate-400">
                    Benja will reach out personally about sending you a physical LeCoin
                    commemorative coin with your unique number engraved.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Personal Message */}
          <div className="glass-card rounded-xl p-8 mb-8 bg-gradient-to-br from-blue-500/5 to-purple-500/5 border-blue-500/20 animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <div className="text-center">
              <div className="inline-block p-4 rounded-full bg-red-500/10 mb-4">
                <Heart size={32} className="text-red-400 fill-current" />
              </div>
              <blockquote className="text-lg text-slate-300 italic leading-relaxed mb-4">
                "Thank you for believing in me when this was just a dream. Your support gives me
                the freedom to focus on building something amazing. I promise to work my absolute
                hardest and make you proud."
              </blockquote>
              <div className="text-slate-400">
                - Benja, Waldo, Dad & Pichi
                <br />
                <span className="text-xs">The Ledesma Family</span>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <Link
              href="/lecoin/dashboard"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold transition-all transform hover:scale-105 shadow-lg"
            >
              Go to Your Supporter Dashboard
              <ArrowRight size={20} />
            </Link>
            <p className="text-sm text-slate-400 mt-4">
              Track the journey in real-time and see exactly where your support is going
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PayPalSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
          <div className="glass-card rounded-xl p-8 max-w-md text-center">
            <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-slate-400">Loading...</p>
          </div>
        </div>
      }
    >
      <PayPalSuccessContent />
    </Suspense>
  );
}
