import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Rocket, Bell } from 'lucide-react';

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="glass-header sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex-shrink-0">
              <Image
                src="/logo-dark.svg"
                alt="LeDesign"
                width={150}
                height={38}
                priority
                className="animate-fade-in w-[120px] sm:w-[150px] md:w-[180px]"
              />
            </Link>
            <Link
              href="/"
              className="btn-glass px-3 sm:px-4 md:px-6 py-2 rounded-lg text-white font-semibold flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base whitespace-nowrap"
            >
              <ArrowLeft size={14} className="sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Volver al Inicio</span>
              <span className="sm:hidden">Volver</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Coming Soon Content */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <div className="max-w-3xl mx-auto text-center">
          <div className="icon-wrapper w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 mx-auto mb-6 sm:mb-8 rounded-full bg-blue-500/10 text-blue-400 animate-scale-in">
            <Rocket size={32} strokeWidth={2} className="sm:w-10 sm:h-10 md:w-12 md:h-12" />
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 sm:mb-6 animate-slide-up px-4">
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Próximamente
            </span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-slate-300 mb-6 sm:mb-8 animate-slide-up px-4" style={{ animationDelay: '0.1s' }}>
            Estamos trabajando arduamente en esta funcionalidad. Será parte de la plataforma muy pronto.
          </p>

          <div className="glass-card rounded-xl sm:rounded-2xl p-6 sm:p-8 mb-8 sm:mb-12 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4 text-white px-4">¿Quieres ser el primero en saberlo?</h2>
            <p className="text-sm sm:text-base text-slate-300 mb-5 sm:mb-6 px-4">
              Únete a nuestra lista de espera y te notificaremos cuando esta funcionalidad esté disponible.
            </p>
            <Link
              href="/signup?source=coming-soon"
              className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500 transition-all"
            >
              <Bell size={18} className="sm:w-5 sm:h-5" />
              Unirse a la Lista de Espera
            </Link>
          </div>

          <div className="animate-fade-in px-4" style={{ animationDelay: '0.3s' }}>
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-white">Mientras tanto, explora:</h3>
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
              <Link
                href="/#features"
                className="glass-card px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-slate-800/60 transition-colors text-sm sm:text-base"
              >
                Características
              </Link>
              <Link
                href="/#pricing"
                className="glass-card px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-slate-800/60 transition-colors text-sm sm:text-base"
              >
                Precios
              </Link>
              <Link
                href="/#faq"
                className="glass-card px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-slate-800/60 transition-colors text-sm sm:text-base"
              >
                FAQ
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="glass-header mt-auto border-t border-slate-800">
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 text-center text-xs sm:text-sm text-slate-400">
          © 2026 LeDesign. Plataforma de Ingeniería Chilena.
        </div>
      </footer>
    </div>
  );
}
