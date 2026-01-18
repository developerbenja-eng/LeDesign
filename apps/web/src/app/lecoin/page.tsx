'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Heart,
  Lock,
  Coins,
  TrendingUp,
  Users,
  Calendar,
  DollarSign,
  Shield,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  X,
  CreditCard,
  Building2,
  Globe,
  Wallet,
  BarChart,
  Languages,
} from 'lucide-react';

type Language = 'en' | 'es';

// Translations
const translations = {
  en: {
    portalName: 'LeFamily Portal',
    portalTagline: 'Help Benja Launch LeDesign',
    byInvitation: 'By invitation only',
    accessCode: 'Access Code',
    accessCodePlaceholder: 'Enter your invitation code',
    invalidCode: 'Invalid access code. Please check your invitation.',
    enterPortal: 'Enter Portal',
    invitationNote: 'This portal is for invited friends and family only.',
    checkEmail: 'If you received an invitation, check your email for the access code.',
    heroTitle: 'Help a Friend Launch a Dream',
    greeting: 'Hi friend,',
    paragraph1: 'I\'m launching LeDesign on May 4, 2026 - my grandfather\'s 101st birthday. He started our family\'s engineering tradition, and now four Ledesmas are building the future of Chilean engineering software.',
    paragraph2: 'I need help to make it to launch day.',
    paragraph3: 'I\'m asking 25 close friends if they can help me with development costs for the next few months. I\'ll work my hardest and hope to pay you back one day - but no pressure if I can\'t.',
    paragraph4: 'Will you help me?',
    signature: '- Benja',
    whatINeed: 'What I Need',
    targetAmount: '$25,000 to cover:',
    needItem1: 'My living costs while building (Feb-May)',
    needItem2: 'Basic infrastructure (servers, tools)',
    needItem3: 'Getting to first paying customers',
    important: 'Important:',
    importantNote1: 'You might never get this back.',
    importantNote2: 'Only give what you can afford to lose.',
    importantNote3: 'Think of it as helping a friend chase a dream.',
    leCoinTitle: 'Your LeCoin',
    leCoinIntro: 'As a symbol of your support, you\'ll receive a LeCoin - one of only 100 that will ever exist.',
    coinRepresents: 'This coin represents:',
    believed: 'You believed in me when it was just an idea',
    atBeginning: 'You were here at the beginning',
    yourFaith: 'Your faith in our vision',
    whatYouGet: 'What you get:',
    certificate: 'A numbered certificate (yours forever)',
    journeyAccess: 'Access to my journey (transparent updates)',
    potDashboard: 'See how we\'re doing (three-pot dashboard)',
    foundersGroup: 'Private founders group (fellow believers)',
    gratitude: 'My eternal gratitude',
    doesNotGive: 'What it does NOT give you:',
    noOwnership: 'Ownership in LeDesign',
    noGuarantee: 'Guaranteed repayment',
    noReturns: 'Business returns',
    noVoting: 'Voting rights',
    justSymbol: 'It\'s just a symbol that you helped a friend.',
    myCommitment: 'My Commitment',
    promiseTo: 'I promise to:',
    promise1: 'Work my absolute hardest',
    promise2: 'Be transparent with you (you\'ll see everything)',
    promise3: 'Use your help wisely',
    promise4: 'Keep you updated on the journey',
    promise5: 'Pay you back IF I can, WHEN I can',
    dontPromise: 'I don\'t promise:',
    noGuaranteedReturns: 'Guaranteed returns',
    noSuccess: 'That LeDesign will succeed',
    noFinancial: 'Any financial upside',
    butPromise: 'But I do promise:',
    giveEverything: 'I\'ll give this everything I have. Your support means the world to me.',
    transparencyTitle: 'Complete Transparency: See How We\'re Doing',
    transparencyIntro: 'You\'re family, not a customer. You deserve to see honest numbers.',
    pot1Title: 'Pot 1: Operations ($0-12K/month)',
    pot1Desc: 'Salaries, infrastructure, core expenses. Keep the lights on.',
    pot2Title: 'Pot 2: Growth ($12K-15K/month)',
    pot2Desc: '$3K/month for marketing, development, improvements. Once Pot 1 is full.',
    pot3Title: 'Pot 3: Family Fund (Above $15K/month)',
    pot3Desc1: 'This is for YOU.',
    pot3Desc2: 'Excess revenue after Pots 1 & 2 are full.',
    pot3Desc3: '1 LeCoin = 1% of this pot. Only grows when LeDesign is doing REALLY well.',
    dashboardTitle: 'Your Private Dashboard Will Show:',
    dashboardItem1: 'Current MRR (Monthly Recurring Revenue) - updated in real-time',
    dashboardItem2: 'All three pot values - you see EXACTLY how much is in each',
    dashboardItem3: 'Current value of your LeCoin(s) based on Pot 3 balance',
    dashboardItem4: 'Subscription growth trends - how we\'re tracking toward $15K/month',
    whyMatters: 'Why this matters:',
    whyMattersText: 'You can see if I\'m doing well, how much is in the Family Fund, and decide for yourself if you need help.',
    noAwkward: 'No awkward conversations. Just honest numbers.',
    currentProgress: 'Current Progress',
    leCoinsIssued: 'LeCoins Issued',
    friendsSupport: 'Friends\' Support',
    untilLaunch: 'Until May 4 Launch',
    days: 'days',
    progressUpdated: 'Progress updated in real-time. Supporters can log in anytime to see detailed metrics.',
    helpBenja: 'Help Benja',
    howMuch: 'How much can you help with?',
    customAmount: 'Or enter custom amount:',
    enterAmount: 'Enter amount',
    youllReceive: 'You\'ll receive:',
    receiveLeCoin: (count: number) => count > 1 ? `${count} LeCoins (1 LeCoin = $1,000 donated)` : `${count} LeCoin (1 LeCoin = $1,000 donated)`,
    supportAppreciated: 'Your support is appreciated! Donate $1,000+ to receive a LeCoin.',
    yourName: 'Your Name',
    email: 'Email',
    phone: 'Phone (Optional)',
    message: 'Message for Benja (Optional)',
    paymentMethod: 'Payment Method',
    creditCard: 'Credit/Debit Card',
    creditCardDesc: 'Visa, Mastercard, Amex via Stripe',
    paypalDesc: 'Pay with your PayPal account',
    mercadoPago: 'Mercado Pago',
    mercadoPagoDesc: 'Tarjetas chilenas y transferencias',
    bankTransfer: 'Transferencia Bancaria',
    bankTransferDesc: 'Depósito directo a cuenta chilena',
    agreement: 'I understand this is helping a friend, I might not get this back, the LeCoin is symbolic only, and Benja will try his best.',
    required: '*',
    processing: 'Processing...',
    getTransferInstructions: 'Get Transfer Instructions',
    helpLaunch: 'Help Launch LeDesign',
    secureStripe: 'Secure payment via Stripe. You\'ll receive your LeCoin certificate via email within 24 hours.',
    securePaypal: 'Secure payment via PayPal. You\'ll receive your LeCoin certificate via email within 24 hours.',
    secureMercadoPago: 'Pago seguro vía Mercado Pago. Recibirás tu certificado LeCoin por email dentro de 24 horas.',
    transferInstructions: 'Te mostraremos instrucciones para depositar a la cuenta bancaria chilena de Benja.',
    footerQuote: '"Thank you for believing in me when it was just a dream."',
    footerSignature: '- Benjamin Ledesma & Family',
  },
  es: {
    portalName: 'Portal LeFamily',
    portalTagline: 'Ayuda a Benja a Lanzar LeDesign',
    byInvitation: 'Solo por invitación',
    accessCode: 'Código de Acceso',
    accessCodePlaceholder: 'Ingresa tu código de invitación',
    invalidCode: 'Código de acceso inválido. Por favor verifica tu invitación.',
    enterPortal: 'Entrar al Portal',
    invitationNote: 'Este portal es solo para amigos y familia invitados.',
    checkEmail: 'Si recibiste una invitación, revisa tu email para el código de acceso.',
    heroTitle: 'Ayuda a un Amigo a Lanzar un Sueño',
    greeting: 'Hola amigo/a,',
    paragraph1: 'Estoy lanzando LeDesign el 4 de mayo de 2026 - el cumpleaños 101 de mi abuelo. Él inició la tradición de ingeniería de nuestra familia, y ahora cuatro Ledesmas están construyendo el futuro del software de ingeniería chileno.',
    paragraph2: 'Necesito ayuda para llegar al día del lanzamiento.',
    paragraph3: 'Estoy preguntando a 25 amigos cercanos si pueden ayudarme con los costos de desarrollo para los próximos meses. Trabajaré lo más duro posible y espero poder devolvértelo algún día - pero sin presión si no puedo.',
    paragraph4: '¿Me ayudarás?',
    signature: '- Benja',
    whatINeed: 'Lo Que Necesito',
    targetAmount: '$25,000 para cubrir:',
    needItem1: 'Mis costos de vida mientras construyo (Feb-May)',
    needItem2: 'Infraestructura básica (servidores, herramientas)',
    needItem3: 'Llegar a los primeros clientes pagando',
    important: 'Importante:',
    importantNote1: 'Puede que nunca recibas esto de vuelta.',
    importantNote2: 'Solo da lo que puedas permitirte perder.',
    importantNote3: 'Piénsalo como ayudar a un amigo a perseguir un sueño.',
    leCoinTitle: 'Tu LeCoin',
    leCoinIntro: 'Como símbolo de tu apoyo, recibirás un LeCoin - uno de solo 100 que existirán.',
    coinRepresents: 'Esta moneda representa:',
    believed: 'Creíste en mí cuando era solo una idea',
    atBeginning: 'Estuviste aquí al comienzo',
    yourFaith: 'Tu fe en nuestra visión',
    whatYouGet: 'Lo que recibes:',
    certificate: 'Un certificado numerado (tuyo para siempre)',
    journeyAccess: 'Acceso a mi viaje (actualizaciones transparentes)',
    potDashboard: 'Ver cómo nos va (panel de tres fondos)',
    foundersGroup: 'Grupo privado de fundadores (otros creyentes)',
    gratitude: 'Mi eterna gratitud',
    doesNotGive: 'Lo que NO te da:',
    noOwnership: 'Propiedad en LeDesign',
    noGuarantee: 'Devolución garantizada',
    noReturns: 'Retornos empresariales',
    noVoting: 'Derechos de voto',
    justSymbol: 'Es solo un símbolo de que ayudaste a un amigo.',
    myCommitment: 'Mi Compromiso',
    promiseTo: 'Prometo:',
    promise1: 'Trabajar lo más duro posible',
    promise2: 'Ser transparente contigo (verás todo)',
    promise3: 'Usar tu ayuda sabiamente',
    promise4: 'Mantenerte actualizado sobre el viaje',
    promise5: 'Devolvértelo SI puedo, CUANDO pueda',
    dontPromise: 'No prometo:',
    noGuaranteedReturns: 'Retornos garantizados',
    noSuccess: 'Que LeDesign tendrá éxito',
    noFinancial: 'Ninguna ganancia financiera',
    butPromise: 'Pero sí prometo:',
    giveEverything: 'Le daré todo lo que tengo. Tu apoyo significa el mundo para mí.',
    transparencyTitle: 'Transparencia Completa: Ve Cómo Nos Va',
    transparencyIntro: 'Eres familia, no un cliente. Mereces ver números honestos.',
    pot1Title: 'Fondo 1: Operaciones ($0-12K/mes)',
    pot1Desc: 'Salarios, infraestructura, gastos centrales. Mantener las luces encendidas.',
    pot2Title: 'Fondo 2: Crecimiento ($12K-15K/mes)',
    pot2Desc: '$3K/mes para marketing, desarrollo, mejoras. Una vez que el Fondo 1 esté lleno.',
    pot3Title: 'Fondo 3: Fondo Familiar (Más de $15K/mes)',
    pot3Desc1: 'Esto es para TI.',
    pot3Desc2: 'Ingresos excedentes después de que los Fondos 1 y 2 estén llenos.',
    pot3Desc3: '1 LeCoin = 1% de este fondo. Solo crece cuando a LeDesign le va MUY bien.',
    dashboardTitle: 'Tu Panel Privado Mostrará:',
    dashboardItem1: 'MRR actual (Ingresos Recurrentes Mensuales) - actualizado en tiempo real',
    dashboardItem2: 'Los tres valores de fondos - ves EXACTAMENTE cuánto hay en cada uno',
    dashboardItem3: 'Valor actual de tu(s) LeCoin(s) basado en el saldo del Fondo 3',
    dashboardItem4: 'Tendencias de crecimiento de suscripciones - cómo estamos rastreando hacia $15K/mes',
    whyMatters: 'Por qué esto importa:',
    whyMattersText: 'Puedes ver si me va bien, cuánto hay en el Fondo Familiar, y decidir por ti mismo/a si necesitas ayuda.',
    noAwkward: 'Sin conversaciones incómodas. Solo números honestos.',
    currentProgress: 'Progreso Actual',
    leCoinsIssued: 'LeCoins Emitidos',
    friendsSupport: 'Apoyo de Amigos',
    untilLaunch: 'Hasta el Lanzamiento del 4 de Mayo',
    days: 'días',
    progressUpdated: 'Progreso actualizado en tiempo real. Los partidarios pueden iniciar sesión en cualquier momento para ver métricas detalladas.',
    helpBenja: 'Ayuda a Benja',
    howMuch: '¿Con cuánto puedes ayudar?',
    customAmount: 'O ingresa un monto personalizado:',
    enterAmount: 'Ingresa monto',
    youllReceive: 'Recibirás:',
    receiveLeCoin: (count: number) => count > 1 ? `${count} LeCoins (1 LeCoin = $1,000 donados)` : `${count} LeCoin (1 LeCoin = $1,000 donados)`,
    supportAppreciated: '¡Tu apoyo es apreciado! Dona $1,000+ para recibir un LeCoin.',
    yourName: 'Tu Nombre',
    email: 'Email',
    phone: 'Teléfono (Opcional)',
    message: 'Mensaje para Benja (Opcional)',
    paymentMethod: 'Método de Pago',
    creditCard: 'Tarjeta de Crédito/Débito',
    creditCardDesc: 'Visa, Mastercard, Amex vía Stripe',
    paypalDesc: 'Paga con tu cuenta de PayPal',
    mercadoPago: 'Mercado Pago',
    mercadoPagoDesc: 'Tarjetas chilenas y transferencias',
    bankTransfer: 'Transferencia Bancaria',
    bankTransferDesc: 'Depósito directo a cuenta chilena',
    agreement: 'Entiendo que esto es ayudar a un amigo, puede que no reciba esto de vuelta, el LeCoin es solo simbólico, y Benja hará su mejor esfuerzo.',
    required: '*',
    processing: 'Procesando...',
    getTransferInstructions: 'Obtener Instrucciones de Transferencia',
    helpLaunch: 'Ayudar a Lanzar LeDesign',
    secureStripe: 'Pago seguro vía Stripe. Recibirás tu certificado LeCoin por email dentro de 24 horas.',
    securePaypal: 'Pago seguro vía PayPal. Recibirás tu certificado LeCoin por email dentro de 24 horas.',
    secureMercadoPago: 'Pago seguro vía Mercado Pago. Recibirás tu certificado LeCoin por email dentro de 24 horas.',
    transferInstructions: 'Te mostraremos instrucciones para depositar a la cuenta bancaria chilena de Benja.',
    footerQuote: '"Gracias por creer en mí cuando era solo un sueño."',
    footerSignature: '- Benjamin Ledesma y Familia',
  },
};

export default function LeCoinPage() {
  const router = useRouter();
  const [accessCode, setAccessCode] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [error, setError] = useState('');
  const [language, setLanguage] = useState<Language>('es'); // Default to Spanish for Chilean audience
  const [donationAmount, setDonationAmount] = useState<number>(1000);
  const [customAmount, setCustomAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal' | 'mercadopago' | 'transfer'>('stripe');

  // Donation form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    agreed: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Simple code check (in production, verify via API)
  const handleUnlock = () => {
    if (accessCode.toLowerCase() === 'lefamilydesign') {
      setIsUnlocked(true);
      setError('');
    } else {
      setError('Invalid access code. Please check your invitation.');
    }
  };

  // Translation helper
  const t = translations[language];

  // Handle donation form submission
  const handleDonateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Validation
    if (!formData.name.trim()) {
      setFormError(language === 'en' ? 'Please enter your name' : 'Por favor ingresa tu nombre');
      return;
    }

    if (!formData.email.trim()) {
      setFormError(language === 'en' ? 'Please enter your email' : 'Por favor ingresa tu email');
      return;
    }

    if (!formData.agreed) {
      setFormError(language === 'en' ? 'Please check the agreement box' : 'Por favor marca la casilla de acuerdo');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        amount: donationAmount,
        message: formData.message,
        paymentMethod,
      };

      // Route to appropriate API based on payment method
      let apiEndpoint = '/api/lecoin/donate';
      if (paymentMethod === 'paypal') {
        apiEndpoint = '/api/lecoin/donate/paypal';
      } else if (paymentMethod === 'mercadopago') {
        apiEndpoint = '/api/lecoin/donate/mercadopago';
      } else if (paymentMethod === 'transfer') {
        // For bank transfer, show instructions page
        router.push(`/lecoin/transfer?amount=${donationAmount}&name=${encodeURIComponent(formData.name)}&email=${encodeURIComponent(formData.email)}`);
        return;
      }

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process donation');
      }

      // Redirect to payment processor
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err: any) {
      console.error('Donation error:', err);
      setFormError(err.message || 'Failed to process donation. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="glass-card rounded-2xl p-8 border border-blue-500/30">
            {/* Language Toggle on Unlock Screen */}
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
                className="p-2 rounded-lg hover:bg-slate-800/50 text-slate-400 hover:text-white transition-colors flex items-center gap-2"
                title={language === 'en' ? 'Switch to Spanish' : 'Cambiar a Inglés'}
              >
                <Languages size={18} />
                <span className="text-xs font-medium">{language === 'en' ? 'ES' : 'EN'}</span>
              </button>
            </div>

            <div className="text-center mb-8">
              <Lock size={48} className="text-blue-400 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-white mb-2">
                {t.portalName}
              </h1>
              <p className="text-slate-400">{t.byInvitation}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {t.accessCode}
                </label>
                <input
                  type="text"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  placeholder={t.accessCodePlaceholder}
                  className="w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleUnlock()}
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-sm text-red-400">
                  <AlertCircle size={16} />
                  {t.invalidCode}
                </div>
              )}

              <button
                onClick={handleUnlock}
                className="w-full px-6 py-3 rounded-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500 transition-all"
              >
                {t.enterPortal}
              </button>

              <p className="text-xs text-slate-500 text-center">
                {t.invitationNote}
                <br />
                {t.checkEmail}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="glass-header sticky top-0 z-50 border-b border-slate-800">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Coins size={32} className="text-blue-400" />
              <div>
                <h1 className="text-xl font-bold text-white">{t.portalName}</h1>
                <p className="text-xs text-slate-400">{t.portalTagline}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Language Toggle */}
              <button
                onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
                className="p-2 rounded-lg hover:bg-slate-800/50 text-slate-400 hover:text-white transition-colors flex items-center gap-2"
                title={language === 'en' ? 'Switch to Spanish' : 'Cambiar a Inglés'}
              >
                <Languages size={18} />
                <span className="text-xs font-medium">{language === 'en' ? 'ES' : 'EN'}</span>
              </button>
              {/* Close Button */}
              <button
                onClick={() => setIsUnlocked(false)}
                className="p-2 rounded-lg hover:bg-slate-800/50 text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 py-12">
        {/* Hero Section */}
        <section className="max-w-4xl mx-auto mb-16">
          <div className="glass-card rounded-2xl p-8 md:p-12 border border-blue-500/20">
            <div className="text-center mb-8">
              <Heart size={48} className="text-red-400 mx-auto mb-4" />
              <h2 className="text-4xl font-bold text-white mb-4">
                {t.heroTitle}
              </h2>
            </div>

            <div className="prose prose-invert max-w-none">
              <p className="text-lg text-slate-300 leading-relaxed mb-4">
                {t.greeting}
              </p>
              <p className="text-lg text-slate-300 leading-relaxed mb-4">
                {t.paragraph1.split('May 4, 2026')[0]}
                <strong className="text-white">
                  {language === 'en' ? 'May 4, 2026' : '4 de mayo de 2026'}
                </strong>
                {language === 'en' ? t.paragraph1.split('May 4, 2026')[1] : t.paragraph1.split('4 de mayo de 2026')[1]}
              </p>
              <p className="text-lg text-slate-300 leading-relaxed mb-4">
                {t.paragraph2}
              </p>
              <p className="text-lg text-slate-300 leading-relaxed mb-4">
                {t.paragraph3.split('no pressure if I can\'t')[0] || t.paragraph3.split('sin presión si no puedo')[0]}
                <strong className="text-white">
                  {language === 'en' ? 'no pressure if I can\'t' : 'sin presión si no puedo'}
                </strong>
                {(t.paragraph3.split('no pressure if I can\'t')[1] || t.paragraph3.split('sin presión si no puedo')[1] || '.')}
              </p>
              <p className="text-lg text-slate-300 leading-relaxed">
                {t.paragraph4}
              </p>
              <p className="text-lg text-blue-400 font-semibold mt-6">
                {t.signature}
              </p>
            </div>
          </div>
        </section>

        {/* What I Need */}
        <section className="max-w-4xl mx-auto mb-16">
          <div className="glass-card rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <DollarSign size={28} className="text-green-400" />
              {t.whatINeed}
            </h3>

            <p className="text-lg text-slate-300 mb-6">
              {t.targetAmount}
            </p>

            <ul className="space-y-3 mb-8">
              {[t.needItem1, t.needItem2, t.needItem3].map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 text-slate-300">
                  <CheckCircle2 size={20} className="text-green-400 flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="bg-slate-800/50 rounded-lg p-6 border border-amber-500/30">
              <div className="flex items-start gap-3">
                <AlertCircle size={24} className="text-amber-400 flex-shrink-0" />
                <div className="text-sm text-slate-300 space-y-2">
                  <p><strong className="text-white">{t.important}</strong> {t.importantNote1}</p>
                  <p>{t.importantNote2}</p>
                  <p>{t.importantNote3}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* LeCoin Explanation */}
        <section className="max-w-4xl mx-auto mb-16">
          <div className="glass-card rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Coins size={28} className="text-blue-400" />
              {t.leCoinTitle}
            </h3>

            <p className="text-lg text-slate-300 mb-6">
              {t.leCoinIntro}
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="font-semibold text-white mb-3">{t.coinRepresents}</h4>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                    <span>{t.believed}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                    <span>{t.atBeginning}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                    <span>{t.yourFaith}</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-white mb-3">{t.whatYouGet}</h4>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                    <span>{t.certificate}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                    <span>{t.journeyAccess}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                    <span>{t.potDashboard}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                    <span>{t.foundersGroup}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                    <span>{t.gratitude}</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <h4 className="font-semibold text-white mb-3">{t.doesNotGive}</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-start gap-2">
                  <X size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <span>{t.noOwnership}</span>
                </li>
                <li className="flex items-start gap-2">
                  <X size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <span>{t.noGuarantee}</span>
                </li>
                <li className="flex items-start gap-2">
                  <X size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <span>{t.noReturns}</span>
                </li>
                <li className="flex items-start gap-2">
                  <X size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <span>{t.noVoting}</span>
                </li>
              </ul>
              <p className="text-sm text-slate-400 mt-3 italic">
                {t.justSymbol}
              </p>
            </div>
          </div>
        </section>

        {/* The Promise */}
        <section className="max-w-4xl mx-auto mb-16">
          <div className="glass-card rounded-2xl p-8 border border-green-500/20">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Shield size={28} className="text-green-400" />
              {t.myCommitment}
            </h3>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-white mb-3">{t.promiseTo}</h4>
                <ul className="space-y-2 text-sm text-slate-300">
                  {[t.promise1, t.promise2, t.promise3, t.promise4, t.promise5].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-white mb-3">{t.dontPromise}</h4>
                <ul className="space-y-2 text-sm text-slate-400">
                  {[t.noGuaranteedReturns, t.noSuccess, t.noFinancial].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <X size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                  <p className="text-sm text-green-400">
                    <strong>{t.butPromise}</strong> {t.giveEverything}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Transparency Dashboard */}
        <section className="max-w-4xl mx-auto mb-16">
          <div className="glass-card rounded-2xl p-8 border border-blue-500/20">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <BarChart size={28} className="text-blue-400" />
              {t.transparencyTitle}
            </h3>

            <p className="text-lg text-slate-300 mb-6">
              {t.transparencyIntro.split('honest numbers')[0]}
              <strong className="text-white">{language === 'en' ? 'honest numbers' : 'números honestos'}</strong>
              {t.transparencyIntro.split('honest numbers')[1] || t.transparencyIntro.split('números honestos')[1] || '.'}
            </p>

            <div className="space-y-4 mb-6">
              <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <DollarSign size={20} className="text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-white mb-1">{t.pot1Title}</h4>
                    <p className="text-sm text-slate-400">
                      {t.pot1Desc}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                    <TrendingUp size={20} className="text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-white mb-1">{t.pot2Title}</h4>
                    <p className="text-sm text-slate-400">
                      {t.pot2Desc}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-gradient-to-r from-green-500/10 to-cyan-500/10 border border-green-500/30">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <Heart size={20} className="text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-white mb-1">{t.pot3Title}</h4>
                    <p className="text-sm text-slate-400 mb-2">
                      <strong className="text-green-400">{t.pot3Desc1}</strong> {t.pot3Desc2}
                    </p>
                    <p className="text-xs text-green-400/80">
                      {t.pot3Desc3}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-500/10 rounded-lg p-5 border border-blue-500/30">
              <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                <BarChart size={20} className="text-blue-400" />
                {t.dashboardTitle}
              </h4>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                  <span>{t.dashboardItem1}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                  <span>{t.dashboardItem2}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                  <span>{t.dashboardItem3}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                  <span>{t.dashboardItem4}</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
              <p className="text-sm text-slate-300">
                <strong className="text-white">{t.whyMatters}</strong> {t.whyMattersText}{' '}
                <span className="text-blue-400">{t.noAwkward}</span>
              </p>
            </div>
          </div>
        </section>

        {/* Current Progress */}
        <section className="max-w-4xl mx-auto mb-16">
          <div className="glass-card rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <TrendingUp size={28} className="text-purple-400" />
              {t.currentProgress}
            </h3>

            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="text-center p-6 rounded-xl bg-blue-500/10 border border-blue-500/30">
                <div className="text-3xl font-bold text-blue-400 mb-2">0 {language === 'en' ? 'of' : 'de'} 25</div>
                <div className="text-sm text-slate-400">{t.leCoinsIssued}</div>
              </div>

              <div className="text-center p-6 rounded-xl bg-green-500/10 border border-green-500/30">
                <div className="text-3xl font-bold text-green-400 mb-2">$0</div>
                <div className="text-sm text-slate-400">{t.friendsSupport}</div>
              </div>

              <div className="text-center p-6 rounded-xl bg-purple-500/10 border border-purple-500/30">
                <div className="text-3xl font-bold text-purple-400 mb-2">
                  {Math.ceil((new Date('2026-05-04').getTime() - Date.now()) / (1000 * 60 * 60 * 24))} {t.days}
                </div>
                <div className="text-sm text-slate-400">{t.untilLaunch}</div>
              </div>
            </div>

            <p className="text-sm text-slate-400 text-center">
              {t.progressUpdated}
            </p>
          </div>
        </section>

        {/* Donation Form */}
        <section className="max-w-4xl mx-auto mb-16">
          <div className="glass-card rounded-2xl p-8 border border-blue-500/30">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Heart size={28} className="text-red-400" />
              {t.helpBenja}
            </h3>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-4">
                  {t.howMuch}
                </label>

                <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {[
                    { amount: 1000, label: '$1,000' },
                    { amount: 2500, label: '$2,500' },
                    { amount: 5000, label: '$5,000' },
                    { amount: 10000, label: '$10,000' },
                  ].map((option) => (
                    <button
                      key={option.amount}
                      onClick={() => {
                        setDonationAmount(option.amount);
                        setCustomAmount('');
                      }}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        donationAmount === option.amount && !customAmount
                          ? 'border-blue-500 bg-blue-500/10 text-white'
                          : 'border-slate-700 hover:border-slate-600 text-slate-400'
                      }`}
                    >
                      <div className="text-lg font-bold">{option.label}</div>
                      <div className="text-xs">
                        {Math.floor(option.amount / 1000)} LeCoin{option.amount >= 2000 ? 's' : ''}
                      </div>
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">{t.customAmount}</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                    <input
                      type="number"
                      value={customAmount}
                      onChange={(e) => {
                        setCustomAmount(e.target.value);
                        setDonationAmount(parseInt(e.target.value) || 0);
                      }}
                      placeholder={t.enterAmount}
                      className="w-full pl-8 pr-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <p className="text-sm text-slate-300">
                  <strong className="text-white">{t.youllReceive}</strong>{' '}
                  {donationAmount >= 1000
                    ? t.receiveLeCoin(Math.floor(donationAmount / 1000))
                    : t.supportAppreciated
                  }
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {t.yourName} <span className="text-red-400">{t.required}</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={language === 'en' ? 'John Smith' : 'Juan Pérez'}
                    className="w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {t.email} <span className="text-red-400">{t.required}</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder={language === 'en' ? 'john@example.com' : 'juan@example.com'}
                    className="w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {t.phone}
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+56 9 1234 5678"
                    className="w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {t.message}
                  </label>
                  <textarea
                    rows={3}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder={language === 'en' ? 'Good luck with the launch!' : '¡Buena suerte con el lanzamiento!'}
                    className="w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Payment Method Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-4">
                  {t.paymentMethod} <span className="text-red-400">{t.required}</span>
                </label>
                <div className="grid sm:grid-cols-2 gap-3">
                  {/* Stripe/Credit Card */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('stripe')}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      paymentMethod === 'stripe'
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <CreditCard size={24} className={paymentMethod === 'stripe' ? 'text-blue-400' : 'text-slate-400'} />
                      <span className={`font-semibold ${paymentMethod === 'stripe' ? 'text-white' : 'text-slate-300'}`}>
                        {t.creditCard}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {t.creditCardDesc}
                    </p>
                  </button>

                  {/* PayPal */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('paypal')}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      paymentMethod === 'paypal'
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Wallet size={24} className={paymentMethod === 'paypal' ? 'text-blue-400' : 'text-slate-400'} />
                      <span className={`font-semibold ${paymentMethod === 'paypal' ? 'text-white' : 'text-slate-300'}`}>
                        PayPal
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {t.paypalDesc}
                    </p>
                  </button>

                  {/* Mercado Pago */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('mercadopago')}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      paymentMethod === 'mercadopago'
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Globe size={24} className={paymentMethod === 'mercadopago' ? 'text-blue-400' : 'text-slate-400'} />
                      <span className={`font-semibold ${paymentMethod === 'mercadopago' ? 'text-white' : 'text-slate-300'}`}>
                        {t.mercadoPago}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {t.mercadoPagoDesc}
                    </p>
                  </button>

                  {/* Chilean Bank Transfer */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('transfer')}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      paymentMethod === 'transfer'
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Building2 size={24} className={paymentMethod === 'transfer' ? 'text-blue-400' : 'text-slate-400'} />
                      <span className={`font-semibold ${paymentMethod === 'transfer' ? 'text-white' : 'text-slate-300'}`}>
                        {t.bankTransfer}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {t.bankTransferDesc}
                    </p>
                  </button>
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={formData.agreed}
                    onChange={(e) => setFormData({ ...formData, agreed: e.target.checked })}
                  />
                  <span className="text-sm text-slate-300">
                    {t.agreement} <span className="text-red-400">{t.required}</span>
                  </span>
                </label>
              </div>

              {formError && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-3">
                  <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-400">{formError}</p>
                </div>
              )}

              <button
                type="button"
                onClick={handleDonateSubmit}
                disabled={isSubmitting}
                className="w-full px-8 py-4 rounded-xl font-semibold text-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                    {t.processing}
                  </>
                ) : (
                  <>
                    {paymentMethod === 'transfer' ? t.getTransferInstructions : t.helpLaunch}
                    <ArrowRight size={20} />
                  </>
                )}
              </button>

              <p className="text-xs text-slate-500 text-center">
                {paymentMethod === 'stripe' && t.secureStripe}
                {paymentMethod === 'paypal' && t.securePaypal}
                {paymentMethod === 'mercadopago' && t.secureMercadoPago}
                {paymentMethod === 'transfer' && t.transferInstructions}
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="max-w-4xl mx-auto text-center text-sm text-slate-500">
          <p className="mb-2">
            {t.footerQuote}
          </p>
          <p>
            {t.footerSignature}
          </p>
        </div>
      </div>
    </div>
  );
}
