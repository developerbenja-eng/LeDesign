'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Home, RefreshCw, AlertTriangle } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error boundary caught:', error);
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Error Icon */}
        <div className="mb-8 flex justify-center">
          <div className="p-4 bg-red-500/10 rounded-full">
            <AlertTriangle size={64} className="text-red-400" />
          </div>
        </div>

        {/* Error Message */}
        <h2 className="text-3xl font-bold text-white mb-4">Something Went Wrong</h2>
        <p className="text-slate-400 mb-2">
          We encountered an unexpected error. Please try again.
        </p>

        {/* Error Details (Development Only) */}
        {process.env.NODE_ENV === 'development' && error.message && (
          <div className="mt-4 p-4 bg-slate-800/50 border border-slate-700 rounded-lg text-left">
            <p className="text-xs font-mono text-red-400 break-all">
              {error.message}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <RefreshCw size={20} />
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors font-medium"
          >
            <Home size={20} />
            Go to Dashboard
          </Link>
        </div>

        {/* Help Text */}
        <p className="mt-8 text-sm text-slate-500">
          If this problem persists, please{' '}
          <a href="mailto:support@ledesign.com" className="text-blue-400 hover:underline">
            contact support
          </a>
          {error.digest && (
            <span className="block mt-2">
              Error ID: <code className="text-slate-400 font-mono">{error.digest}</code>
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
