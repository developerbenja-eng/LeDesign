'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Copy,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Mail,
  FileText,
  DollarSign,
} from 'lucide-react';

function TransferContent() {
  const searchParams = useSearchParams();
  const amount = searchParams.get('amount') || '1000';
  const name = searchParams.get('name') || '';
  const email = searchParams.get('email') || '';

  const [copied, setCopied] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const accountNumber = '173503873';
  const accountName = 'Benjamin Ledesma';
  const bank = 'Banco de Chile'; // You can change this to your actual bank
  const accountType = 'Cuenta Corriente'; // or 'Cuenta Vista'

  const coinsToIssue = Math.floor(parseInt(amount) / 1000);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleConfirmTransfer = async () => {
    // TODO: Send email notification to admin about pending transfer
    // TODO: Save pending donation record to database
    setConfirmed(true);
  };

  if (confirmed) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full glass-card rounded-2xl p-8 border border-green-500/30">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500 mb-6">
              <CheckCircle2 size={40} className="text-green-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">Instructions Received!</h1>
            <p className="text-lg text-slate-300 mb-6">
              Thank you! We've noted your intention to transfer <strong className="text-white">${amount}</strong>.
            </p>
            <div className="bg-slate-800/50 rounded-lg p-6 mb-8 text-left">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Mail size={20} className="text-blue-400" />
                What happens next:
              </h3>
              <ol className="space-y-3 text-sm text-slate-300">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs font-semibold">
                    1
                  </span>
                  <span>Make the transfer to the account shown above within the next 48 hours</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs font-semibold">
                    2
                  </span>
                  <span>
                    Send a photo of the transfer receipt to{' '}
                    <a href="mailto:developer.benja@gmail.com" className="text-blue-400 hover:underline">
                      developer.benja@gmail.com
                    </a>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs font-semibold">
                    3
                  </span>
                  <span>
                    Benja will verify the transfer (usually within 24 hours) and send you your LeCoin
                    certificate
                  </span>
                </li>
              </ol>
            </div>
            <Link
              href="/lecoin"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors"
            >
              <ArrowLeft size={20} />
              Back to LeCoin Portal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 sm:px-6 py-12">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/lecoin"
              className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
            >
              <ArrowLeft size={20} />
              Back to LeCoin Portal
            </Link>
            <h1 className="text-4xl font-bold text-white mb-2">Chilean Bank Transfer</h1>
            <p className="text-slate-400">Instrucciones para transferencia bancaria directa</p>
          </div>

          {/* Transfer Summary */}
          <div className="glass-card rounded-xl p-6 mb-8 border border-blue-500/30">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <DollarSign size={24} className="text-green-400" />
              Transfer Summary
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="text-sm text-slate-400 mb-1">Amount to Transfer</div>
                <div className="text-2xl font-bold text-white">${parseInt(amount).toLocaleString()}</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4 border border-blue-500/30">
                <div className="text-sm text-slate-400 mb-1">LeCoins You'll Receive</div>
                <div className="text-2xl font-bold text-blue-400">{coinsToIssue}</div>
              </div>
            </div>
          </div>

          {/* Bank Account Details */}
          <div className="glass-card rounded-xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Building2 size={28} className="text-blue-400" />
              Account Details / Datos de la Cuenta
            </h2>

            <div className="space-y-4 mb-6">
              {/* Bank */}
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm text-slate-400 mb-1">Bank / Banco</div>
                    <div className="text-lg font-semibold text-white">{bank}</div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(bank, 'bank')}
                    className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    {copied === 'bank' ? (
                      <CheckCircle2 size={20} className="text-green-400" />
                    ) : (
                      <Copy size={20} className="text-slate-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Account Type */}
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm text-slate-400 mb-1">Account Type / Tipo de Cuenta</div>
                    <div className="text-lg font-semibold text-white">{accountType}</div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(accountType, 'type')}
                    className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    {copied === 'type' ? (
                      <CheckCircle2 size={20} className="text-green-400" />
                    ) : (
                      <Copy size={20} className="text-slate-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Account Number */}
              <div className="bg-blue-500/10 rounded-lg p-4 border-2 border-blue-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm text-blue-300 mb-1">Account Number / Número de Cuenta</div>
                    <div className="text-2xl font-bold text-white tracking-wider">{accountNumber}</div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(accountNumber, 'account')}
                    className="p-2 rounded-lg hover:bg-blue-500/20 transition-colors"
                  >
                    {copied === 'account' ? (
                      <CheckCircle2 size={24} className="text-green-400" />
                    ) : (
                      <Copy size={24} className="text-blue-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Account Name */}
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm text-slate-400 mb-1">Account Name / Titular</div>
                    <div className="text-lg font-semibold text-white">{accountName}</div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(accountName, 'name')}
                    className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    {copied === 'name' ? (
                      <CheckCircle2 size={20} className="text-green-400" />
                    ) : (
                      <Copy size={20} className="text-slate-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-slate-300">
                  <p className="font-semibold text-white mb-1">Important / Importante:</p>
                  <ul className="space-y-1 text-sm">
                    <li>• Transfer exactly <strong className="text-white">${parseInt(amount).toLocaleString()}</strong></li>
                    <li>• Include your name "{name}" in the transfer description</li>
                    <li>• Save the transfer receipt to send to Benja</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="glass-card rounded-xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <FileText size={28} className="text-purple-400" />
              Next Steps / Próximos Pasos
            </h2>

            <ol className="space-y-4">
              <li className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-semibold text-lg">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Make the Transfer</h3>
                  <p className="text-sm text-slate-400">
                    Use your bank's app or website to transfer to the account above. Include your name
                    "{name}" in the description.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-semibold text-lg">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Send Proof of Transfer</h3>
                  <p className="text-sm text-slate-400 mb-2">
                    Email a screenshot or photo of your transfer receipt to:
                  </p>
                  <a
                    href={`mailto:developer.benja@gmail.com?subject=LeCoin Transfer - ${name}&body=Hi Benja,%0D%0A%0D%0AI've transferred $${amount} for ${coinsToIssue} LeCoin${coinsToIssue > 1 ? 's' : ''}. Please find the transfer receipt attached.%0D%0A%0D%0AName: ${name}%0D%0AEmail: ${email}%0D%0A%0D%0AThank you!`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 transition-colors text-sm"
                  >
                    <Mail size={16} />
                    developer.benja@gmail.com
                  </a>
                </div>
              </li>

              <li className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-semibold text-lg">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Wait for Confirmation</h3>
                  <p className="text-sm text-slate-400">
                    Benja will verify your transfer (usually within 24 hours) and send you your LeCoin
                    certificate and dashboard access.
                  </p>
                </div>
              </li>
            </ol>
          </div>

          {/* Confirm Button */}
          <div className="text-center">
            <button
              onClick={handleConfirmTransfer}
              className="px-8 py-4 rounded-xl font-semibold text-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500 transition-all inline-flex items-center gap-2"
            >
              I've Made the Transfer
              <CheckCircle2 size={20} />
            </button>
            <p className="text-xs text-slate-500 mt-4">
              Click this button after you've completed the transfer and sent the receipt to Benja
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LeCoinTransferPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
          <div className="glass-card rounded-xl p-8 max-w-md text-center">
            <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-slate-400">Loading transfer instructions...</p>
          </div>
        </div>
      }
    >
      <TransferContent />
    </Suspense>
  );
}
