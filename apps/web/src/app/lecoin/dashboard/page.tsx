'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Coins,
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  Heart,
  Download,
  MessageSquare,
  BarChart3,
  Clock,
  CheckCircle2,
  ArrowLeft,
  X,
  Printer,
  Image as ImageIcon,
} from 'lucide-react';
import { LeCoinCertificate } from '@/components/lecoin/LeCoinCertificate';
import { downloadCertificateAsPNG, printCertificate } from '@/lib/lecoin/certificate-download';

export default function LeCoinDashboard() {
  const [status, setStatus] = useState({
    totalRaised: 0,
    currentBalance: 0,
    minimumReserve: 10000,
    coinsIssued: 0,
    subscribers: 0,
    monthlyRevenue: 0,
    daysUntilLaunch: 0,
  });

  const [selectedCoin, setSelectedCoin] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    // Fetch status from API
    fetch('/api/lecoin/status')
      .then((res) => res.json())
      .then((data) => setStatus(data))
      .catch((err) => console.error('Error fetching status:', err));
  }, []);

  const handleDownloadCertificate = async (coinNumber: number, supporterName: string) => {
    setIsDownloading(true);
    try {
      await downloadCertificateAsPNG(coinNumber, supporterName);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download certificate. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrintCertificate = (coinNumber: number) => {
    try {
      printCertificate(coinNumber);
    } catch (error) {
      console.error('Print failed:', error);
      alert('Failed to print certificate. Please try again.');
    }
  };

  // Mock user data - in production, fetch from session
  const userData = {
    name: 'Juan Pérez',
    email: 'juan@example.com',
    totalDonated: 1000,
    donationDate: 'February 15, 2026',
    coins: [
      {
        coinNumber: 17,
        issuedDate: 'February 15, 2026',
        donationAmount: 1000,
      },
    ],
  };

  const exitsAllowed = status.currentBalance > status.minimumReserve;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="glass-header sticky top-0 z-50 border-b border-slate-800">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Coins size={32} className="text-blue-400" />
              <div>
                <h1 className="text-xl font-bold text-white">LeCoin Supporter Dashboard</h1>
                <p className="text-xs text-slate-400">Welcome back, {userData.name}</p>
              </div>
            </div>
            <Link
              href="/lecoin"
              className="flex items-center gap-2 px-4 py-2 rounded-lg glass-card hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={16} />
              <span className="text-sm">Back to Portal</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 py-12">
        {/* Your Coins */}
        <section className="max-w-6xl mx-auto mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <Coins size={28} className="text-blue-400" />
            Your LeCoins
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userData.coins.map((coin) => (
              <div
                key={coin.coinNumber}
                className="glass-card rounded-xl p-6 border border-blue-500/30 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10">
                  <div className="text-center mb-4">
                    <div className="inline-block p-4 rounded-full bg-blue-500/10 mb-3">
                      <Coins size={32} className="text-blue-400" />
                    </div>
                    <div className="text-4xl font-bold text-blue-400 mb-1">
                      #{coin.coinNumber}
                    </div>
                    <p className="text-sm text-slate-400">LeCoin Founding Supporter</p>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-slate-400">
                      <span>Issued:</span>
                      <span className="text-white">{coin.issuedDate}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Original Donation:</span>
                      <span className="text-white">${coin.donationAmount.toLocaleString()}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedCoin(coin.coinNumber)}
                    className="w-full mt-4 px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <Download size={16} />
                    View & Download Certificate
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Fund Status */}
        <section className="max-w-6xl mx-auto mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <DollarSign size={28} className="text-green-400" />
            Friends Development Fund
          </h2>

          <div className="glass-card rounded-xl p-8">
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="text-center p-6 rounded-xl bg-green-500/10 border border-green-500/30">
                <div className="text-3xl font-bold text-green-400 mb-2">
                  ${status.totalRaised.toLocaleString()}
                </div>
                <div className="text-sm text-slate-400">Total Raised</div>
              </div>

              <div className="text-center p-6 rounded-xl bg-blue-500/10 border border-blue-500/30">
                <div className="text-3xl font-bold text-blue-400 mb-2">
                  ${status.currentBalance.toLocaleString()}
                </div>
                <div className="text-sm text-slate-400">Current Balance</div>
              </div>

              <div className="text-center p-6 rounded-xl bg-purple-500/10 border border-purple-500/30">
                <div className="text-3xl font-bold text-purple-400 mb-2">
                  ${status.minimumReserve.toLocaleString()}
                </div>
                <div className="text-sm text-slate-400">Minimum Reserve</div>
              </div>
            </div>

            {/* Visual Pot Indicator */}
            <div className="mb-6">
              <div className="flex justify-between text-sm text-slate-400 mb-2">
                <span>Pot Status</span>
                <span>
                  {exitsAllowed ? (
                    <span className="text-green-400">✅ Above Reserve</span>
                  ) : (
                    <span className="text-amber-400">⚠️ Below Minimum</span>
                  )}
                </span>
              </div>
              <div className="h-8 bg-slate-800/50 rounded-lg overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-500"
                  style={{
                    width: `${Math.min((status.currentBalance / status.totalRaised) * 100, 100)}%`,
                  }}
                />
                <div
                  className="absolute top-0 h-full w-0.5 bg-amber-500"
                  style={{
                    left: `${(status.minimumReserve / status.totalRaised) * 100}%`,
                  }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Yellow line marks minimum reserve. Exits allowed when balance is above this line.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
              <p className="text-sm text-slate-300">
                <strong className="text-white">Transparency Promise:</strong> You can see exactly
                where the funds are going. Benja is using this support for living costs, development,
                and infrastructure while building LeDesign. When the pot is above the minimum reserve,
                supporters can request voluntary exits.
              </p>
            </div>
          </div>
        </section>

        {/* LeDesign Progress */}
        <section className="max-w-6xl mx-auto mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <TrendingUp size={28} className="text-purple-400" />
            Watch Benja's Journey
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <Users size={24} className="text-blue-400" />
                <span className="text-sm text-slate-400">Subscribers</span>
              </div>
              <div className="text-3xl font-bold text-white">{status.subscribers}</div>
              <p className="text-xs text-slate-500 mt-1">Paying customers</p>
            </div>

            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <DollarSign size={24} className="text-green-400" />
                <span className="text-sm text-slate-400">Monthly Revenue</span>
              </div>
              <div className="text-3xl font-bold text-white">
                ${status.monthlyRevenue.toLocaleString()}
              </div>
              <p className="text-xs text-slate-500 mt-1">MRR from subscriptions</p>
            </div>

            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <Coins size={24} className="text-purple-400" />
                <span className="text-sm text-slate-400">LeCoins Issued</span>
              </div>
              <div className="text-3xl font-bold text-white">
                {status.coinsIssued} / 25
              </div>
              <p className="text-xs text-slate-500 mt-1">From Benja's allocation</p>
            </div>

            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <Calendar size={24} className="text-amber-400" />
                <span className="text-sm text-slate-400">Days to Launch</span>
              </div>
              <div className="text-3xl font-bold text-white">{status.daysUntilLaunch}</div>
              <p className="text-xs text-slate-500 mt-1">Until May 4, 2026</p>
            </div>
          </div>

          <div className="glass-card rounded-xl p-6">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <MessageSquare size={20} className="text-blue-400" />
              Latest Update from Benja
            </h3>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <p className="text-sm text-slate-400 mb-2">January 17, 2026</p>
              <p className="text-slate-300 leading-relaxed">
                Thank you all for believing in this vision. I'm working hard every day to make
                LeDesign a reality. The structural module is coming together beautifully with
                full NCh433 seismic analysis. Can't wait to show you what we're building! 🚀
              </p>
            </div>
          </div>
        </section>

        {/* How Funds Are Being Used */}
        <section className="max-w-6xl mx-auto mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <BarChart3 size={28} className="text-cyan-400" />
            How Your Support Is Being Used
          </h2>

          <div className="glass-card rounded-xl p-8">
            <div className="space-y-4">
              {[
                { category: 'Living Costs (Founders)', amount: 0, percent: 0, color: 'blue' },
                { category: 'Development Tools & Services', amount: 0, percent: 0, color: 'purple' },
                { category: 'Infrastructure (Servers, etc.)', amount: 0, percent: 0, color: 'green' },
                { category: 'Remaining (Reserved)', amount: 0, percent: 0, color: 'slate' },
              ].map((item) => (
                <div key={item.category}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-300">{item.category}</span>
                    <span className="text-white font-semibold">
                      ${item.amount.toLocaleString()} ({item.percent}%)
                    </span>
                  </div>
                  <div className="h-2 bg-slate-800/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-${item.color}-500 transition-all duration-500`}
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
              <p className="text-sm text-slate-300">
                <strong className="text-white">Full Transparency:</strong> Every dollar is tracked.
                Benja updates this breakdown weekly so you can see exactly where your support is going.
              </p>
            </div>
          </div>
        </section>

        {/* Your Support Summary */}
        <section className="max-w-6xl mx-auto">
          <div className="glass-card rounded-xl p-8 border border-green-500/20">
            <div className="text-center mb-6">
              <Heart size={48} className="text-red-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">
                Thank You for Your Support
              </h3>
              <p className="text-slate-400">
                Your belief in this vision means everything
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle2 size={24} className="text-green-400" />
                  <h4 className="font-semibold text-white">Your Contribution</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-slate-400">
                    <span>Total Donated:</span>
                    <span className="text-white font-semibold">
                      ${userData.totalDonated.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Donation Date:</span>
                    <span className="text-white">{userData.donationDate}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>LeCoins Owned:</span>
                    <span className="text-white">{userData.coins.length}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
                <div className="flex items-center gap-3 mb-4">
                  <Clock size={24} className="text-blue-400" />
                  <h4 className="font-semibold text-white">What's Next</h4>
                </div>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Watch progress in real-time on this dashboard</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Receive quarterly founder update calls</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Get early access when LeDesign launches</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                    <span>If LeDesign succeeds, Benja will reach out about voluntary repayment</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-slate-400 italic">
                "Thank you for believing in me when it was just a dream."
                <br />
                <span className="text-slate-500">- Benja & Family</span>
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Certificate Modal */}
      {selectedCoin !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative max-w-4xl w-full max-h-[90vh] overflow-y-auto bg-slate-900 rounded-xl border border-slate-700 shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Coins size={24} className="text-blue-400" />
                  LeCoin Certificate #{selectedCoin}
                </h3>
                <button
                  onClick={() => setSelectedCoin(null)}
                  className="p-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() =>
                    handleDownloadCertificate(selectedCoin, userData.name)
                  }
                  disabled={isDownloading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ImageIcon size={16} />
                  {isDownloading ? 'Downloading...' : 'Download as PNG'}
                </button>
                <button
                  onClick={() => handlePrintCertificate(selectedCoin)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors"
                >
                  <Printer size={16} />
                  Print / Save as PDF
                </button>
              </div>
            </div>

            {/* Certificate Preview */}
            <div className="p-6">
              <LeCoinCertificate
                coinNumber={selectedCoin}
                supporterName={userData.name}
                donationAmount={
                  userData.coins.find((c) => c.coinNumber === selectedCoin)
                    ?.donationAmount || 0
                }
                issuedDate={
                  userData.coins.find((c) => c.coinNumber === selectedCoin)
                    ?.issuedDate || ''
                }
              />
            </div>

            {/* Instructions */}
            <div className="border-t border-slate-700 p-4 bg-slate-800/50">
              <p className="text-sm text-slate-400 text-center">
                💡 <strong className="text-white">Tip:</strong> Download as PNG for sharing on social media,
                or use Print to save as PDF for high-quality archival.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
