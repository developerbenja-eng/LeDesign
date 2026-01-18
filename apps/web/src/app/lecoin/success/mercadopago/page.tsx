'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Coins, Heart, Mail, Download, ArrowRight, AlertCircle, Clock } from 'lucide-react';

function MercadoPagoSuccessContent() {
  const searchParams = useSearchParams();
  const paymentId = searchParams.get('payment_id');
  const status = searchParams.get('status');
  const externalReference = searchParams.get('external_reference');

  const [paymentData, setPaymentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!paymentId) {
      setError('No se proporcionó ID de pago / No payment ID provided');
      setLoading(false);
      return;
    }

    // Fetch payment details
    fetch(`/api/lecoin/mercadopago/payment?payment_id=${paymentId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setPaymentData(data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching Mercado Pago payment:', err);
        setError('No se pudo cargar la información del pago / Failed to load payment information');
        setLoading(false);
      });
  }, [paymentId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="glass-card rounded-xl p-8 max-w-md text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-400">Procesando tu pago con Mercado Pago...</p>
          <p className="text-xs text-slate-500 mt-2">Processing your Mercado Pago payment...</p>
        </div>
      </div>
    );
  }

  if (error || status === 'failure') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="glass-card rounded-xl p-8 max-w-md text-center">
          <div className="text-red-400 mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-white mb-2">Algo salió mal / Something went wrong</h2>
          <p className="text-slate-400 mb-6">{error || 'El pago no pudo ser procesado'}</p>
          <Link
            href="/lecoin"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors"
          >
            Volver al Portal LeCoin / Return to LeCoin Portal
          </Link>
        </div>
      </div>
    );
  }

  // Handle pending status
  if (status === 'pending' || paymentData?.status === 'pending') {
    const metadata = externalReference ? JSON.parse(externalReference) : {};
    const donorName = metadata.donorName || 'Friend';

    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="glass-card rounded-xl p-8 max-w-2xl text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-amber-500/10 border-2 border-amber-500 mb-6">
            <Clock size={48} className="text-amber-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">
            ¡Pago Pendiente! / Payment Pending
          </h1>
          <p className="text-lg text-slate-300 mb-6">
            Gracias {donorName}! Tu pago está siendo procesado.
          </p>
          <p className="text-slate-400 mb-8">
            Thank you! Your payment is being processed. You'll receive a confirmation email once it's approved (usually within 24-48 hours).
          </p>
          <Link
            href="/lecoin"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors"
          >
            Volver al Portal / Return to Portal
          </Link>
        </div>
      </div>
    );
  }

  const coinsIssued = paymentData?.coinsIssued || 0;
  const amount = paymentData?.amount || 0;
  const donorName = paymentData?.donorName || 'Friend';
  const donorEmail = paymentData?.donorEmail || '';

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
              ¡Gracias, {donorName}! 🎉
            </h1>
            <p className="text-xl text-slate-300">
              Tu apoyo significa el mundo para mí y mi familia
            </p>
            <p className="text-lg text-slate-400 mt-2">
              Your support means the world to me and my family
            </p>
          </div>

          {/* Payment Summary */}
          <div className="glass-card rounded-xl p-8 mb-8 animate-slide-up">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Coins size={28} className="text-blue-400" />
              Tu{coinsIssued > 1 ? 's' : ''} LeCoin{coinsIssued > 1 ? 's' : ''}
            </h2>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
                <div className="text-sm text-slate-400 mb-2">Monto de Donación / Donation Amount</div>
                <div className="text-3xl font-bold text-white">
                  ${amount.toLocaleString()}
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-6 border border-blue-500/30">
                <div className="text-sm text-slate-400 mb-2">LeCoins Emitidos / LeCoins Issued</div>
                <div className="text-3xl font-bold text-blue-400">{coinsIssued}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {coinsIssued === 1 ? 'Moneda' : 'Monedas'} de las primeras 100
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
              <p className="text-sm text-slate-300">
                <strong className="text-white">✅ Pago Confirmado vía Mercado Pago</strong>
                <br />
                Tu contribución ha sido procesada exitosamente y añadida al Fondo de Desarrollo.
                <br />
                <span className="text-xs text-slate-400">
                  Your contribution has been successfully processed and added to the Friends Development Fund.
                </span>
              </p>
            </div>
          </div>

          {/* Next Steps */}
          <div className="glass-card rounded-xl p-8 mb-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Heart size={28} className="text-red-400" />
              Qué Sigue / What Happens Next
            </h2>

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-semibold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1 flex items-center gap-2">
                    <Mail size={18} className="text-blue-400" />
                    Revisa tu Email / Check Your Email
                  </h3>
                  <p className="text-sm text-slate-400">
                    Recibirás un email de confirmación en{' '}
                    <span className="text-white">{donorEmail}</span> dentro de los próximos minutos
                    con tu certificado LeCoin y credenciales de acceso.
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    You'll receive a confirmation email with your LeCoin certificate and dashboard credentials.
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
                    Tu Certificado / Your Certificate
                  </h3>
                  <p className="text-sm text-slate-400">
                    Tu certificado de Fundador LeCoin será enviado dentro de 24 horas. Puedes descargarlo
                    en cualquier momento desde tu panel.
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Your LeCoin Founding Supporter certificate will be sent within 24 hours.
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
                    Moneda Física (Opcional) / Physical Coin (Optional)
                  </h3>
                  <p className="text-sm text-slate-400">
                    Benja te contactará personalmente para enviarte una moneda física LeCoin
                    conmemorativa con tu número único grabado.
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Benja will reach out personally about sending you a physical commemorative coin.
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
                "Gracias por creer en mí cuando esto era solo un sueño. Tu apoyo me da
                la libertad de concentrarme en construir algo increíble. Prometo trabajar
                con todo mi esfuerzo y hacerte sentir orgulloso."
              </blockquote>
              <blockquote className="text-sm text-slate-400 italic leading-relaxed mb-4">
                "Thank you for believing in me when this was just a dream. Your support gives me
                the freedom to focus on building something amazing. I promise to work my absolute
                hardest and make you proud."
              </blockquote>
              <div className="text-slate-400">
                - Benja, Waldo, Dad & Pichi
                <br />
                <span className="text-xs">La Familia Ledesma / The Ledesma Family</span>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <Link
              href="/lecoin/dashboard"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold transition-all transform hover:scale-105 shadow-lg"
            >
              Ir a tu Panel de Apoyo / Go to Your Supporter Dashboard
              <ArrowRight size={20} />
            </Link>
            <p className="text-sm text-slate-400 mt-4">
              Sigue el viaje en tiempo real y ve exactamente a dónde va tu apoyo
              <br />
              <span className="text-xs">Track the journey in real-time and see where your support is going</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MercadoPagoSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
          <div className="glass-card rounded-xl p-8 max-w-md text-center">
            <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-slate-400">Cargando...</p>
          </div>
        </div>
      }
    >
      <MercadoPagoSuccessContent />
    </Suspense>
  );
}
