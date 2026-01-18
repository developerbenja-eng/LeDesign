'use client';

import { Coins, Heart, Award } from 'lucide-react';

interface LeCoinCertificateProps {
  coinNumber: number;
  supporterName: string;
  donationAmount: number;
  issuedDate: string;
  displayOnly?: boolean;
}

export function LeCoinCertificate({
  coinNumber,
  supporterName,
  donationAmount,
  issuedDate,
  displayOnly = false,
}: LeCoinCertificateProps) {
  return (
    <div
      id={`lecoin-certificate-${coinNumber}`}
      className="relative w-full aspect-[8.5/11] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-12"
      style={{
        fontFamily: 'Georgia, serif',
      }}
    >
      {/* Decorative Border */}
      <div className="absolute inset-8 border-4 border-double border-amber-600/40" />
      <div className="absolute inset-10 border border-amber-700/30" />

      {/* Watermark Background */}
      <div className="absolute inset-0 flex items-center justify-center opacity-5">
        <Coins size={400} strokeWidth={0.5} />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-between py-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Coins size={40} className="text-amber-500" strokeWidth={1.5} />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent">
              LeCoin
            </h1>
            <Coins size={40} className="text-amber-500" strokeWidth={1.5} />
          </div>
          <div className="h-px w-64 mx-auto bg-gradient-to-r from-transparent via-amber-600 to-transparent" />
          <h2 className="text-2xl text-amber-100 tracking-wider font-light">
            FOUNDING SUPPORTER CERTIFICATE
          </h2>
        </div>

        {/* Main Content */}
        <div className="text-center space-y-8 max-w-2xl">
          <p className="text-lg text-slate-300 italic leading-relaxed">
            This certificate acknowledges that
          </p>

          <div className="py-6 border-y border-amber-700/30">
            <h3 className="text-4xl font-bold text-white mb-2">{supporterName}</h3>
            <p className="text-sm text-slate-400 tracking-widest">HONORED SUPPORTER</p>
          </div>

          <p className="text-lg text-slate-300 leading-relaxed">
            has graciously supported the LeDesign journey with a contribution of{' '}
            <span className="text-xl font-semibold text-amber-400">
              ${donationAmount.toLocaleString()}
            </span>
            , and has been issued
          </p>

          {/* Coin Badge */}
          <div className="inline-block">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-amber-600/20 blur-xl" />
              <div className="relative bg-gradient-to-br from-amber-900/50 to-amber-950/50 border-2 border-amber-600 rounded-full w-32 h-32 flex flex-col items-center justify-center">
                <Award size={32} className="text-amber-400 mb-1" strokeWidth={1.5} />
                <div className="text-3xl font-bold text-amber-300">#{coinNumber}</div>
                <div className="text-xs text-amber-500 tracking-wider">1 OF 100</div>
              </div>
            </div>
          </div>

          <p className="text-slate-400 italic text-sm max-w-xl mx-auto leading-relaxed">
            This coin represents more than support—it symbolizes belief in a dream when it was
            just an idea. Thank you for being part of the journey from the very beginning.
          </p>
        </div>

        {/* Footer */}
        <div className="space-y-6 w-full">
          <div className="flex items-center justify-center gap-8">
            {/* Signature */}
            <div className="text-center">
              <div className="mb-2 h-16 flex items-end justify-center">
                <div
                  className="text-3xl italic text-slate-300"
                  style={{ fontFamily: 'Brush Script MT, cursive' }}
                >
                  Benjamín Ledesma
                </div>
              </div>
              <div className="h-px w-48 bg-amber-700/40 mb-1" />
              <p className="text-xs text-slate-400 tracking-wider">FOUNDER, LEDESIGN</p>
            </div>
          </div>

          {/* Date & Details */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-4 text-sm text-slate-400">
              <span>Issued: {issuedDate}</span>
              <span>•</span>
              <span>Launch: May 4, 2026</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-amber-600">
              <Heart size={12} className="fill-current" />
              <span className="tracking-wider">THE LEDESMA FAMILY</span>
              <Heart size={12} className="fill-current" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
