'use client';

import { useState, useEffect } from 'react';
import { Lock, Shield, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface FounderGateProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

const STORAGE_KEY = 'ledesign_founder_access';
const CORRECT_PASSWORD = 'ledesignfounders';

export default function FounderGate({
  children,
  title = 'Área de Co-Fundadores',
  subtitle = 'Este contenido es exclusivo para el equipo fundador de LeDesign.'
}: FounderGateProps) {
  const [password, setPassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Check if already authenticated
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') {
      setIsUnlocked(true);
    }
    setIsLoading(false);
  }, []);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.toLowerCase() === CORRECT_PASSWORD) {
      setIsUnlocked(true);
      localStorage.setItem(STORAGE_KEY, 'true');
      setError('');
    } else {
      setError('Contraseña incorrecta');
      setPassword('');
    }
  };

  // Show loading state while checking localStorage
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Cargando...</div>
      </div>
    );
  }

  // If unlocked, show the content
  if (isUnlocked) {
    return <>{children}</>;
  }

  // Show password gate
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800/50 py-4">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between">
            <Link href="/">
              <Image
                src="/logo-dark.svg"
                alt="LeDesign"
                width={150}
                height={38}
                priority
                className="w-[120px] sm:w-[150px]"
              />
            </Link>
            <Link
              href="/"
              className="text-slate-400 hover:text-white transition-colors text-sm"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </header>

      {/* Gate Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="glass-card rounded-2xl p-8 border border-slate-700/50">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Shield size={32} className="text-blue-400" />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-white text-center mb-2">
              {title}
            </h1>
            <p className="text-slate-400 text-center mb-8">
              {subtitle}
            </p>

            {/* Form */}
            <form onSubmit={handleUnlock} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                  Contraseña de Acceso
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ingresa la contraseña"
                    className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    autoFocus
                  />
                </div>
                {error && (
                  <p className="mt-2 text-sm text-red-400">{error}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all"
              >
                Acceder
                <ArrowRight size={18} />
              </button>
            </form>

            {/* Note */}
            <p className="mt-6 text-xs text-slate-500 text-center">
              Si eres parte del equipo fundador y no tienes la contraseña, contacta a Benja.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
