import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Mail, User, Building, CheckCircle } from 'lucide-react';

export default function SignupPage() {
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
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="text-xs sm:text-sm text-slate-400 hidden sm:inline">¿Ya tienes cuenta?</span>
              <Link
                href="/login"
                className="text-blue-400 hover:text-blue-300 transition-colors font-semibold text-sm sm:text-base"
              >
                Ingresar
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Signup Form */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <div className="w-full max-w-md">
          <div className="text-center mb-6 sm:mb-8 animate-slide-up px-4">
            <h1 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Comienza Gratis
            </h1>
            <p className="text-sm sm:text-base text-slate-300">
              Únete a más de 2,500 ingenieros que diseñan más rápido con LeDesign
            </p>
          </div>

          <div className="glass-card rounded-xl sm:rounded-2xl p-6 sm:p-8 animate-scale-in" style={{ animationDelay: '0.1s' }}>
            <form className="space-y-5 sm:space-y-6">
              <div>
                <label htmlFor="name" className="block text-xs sm:text-sm font-medium text-slate-300 mb-2">
                  Nombre Completo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User size={16} className="text-slate-400 sm:w-[18px] sm:h-[18px]" />
                  </div>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    className="glass-panel w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-500 text-sm sm:text-base"
                    placeholder="Juan Pérez"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-slate-300 mb-2">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail size={16} className="text-slate-400 sm:w-[18px] sm:h-[18px]" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className="glass-panel w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-500 text-sm sm:text-base"
                    placeholder="juan@ejemplo.cl"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="company" className="block text-xs sm:text-sm font-medium text-slate-300 mb-2">
                  Empresa (Opcional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building size={16} className="text-slate-400 sm:w-[18px] sm:h-[18px]" />
                  </div>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    className="glass-panel w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-500 text-sm sm:text-base"
                    placeholder="Consultora de Ingeniería"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500 transition-all"
              >
                Unirse a la Lista de Espera
              </button>
            </form>

            <p className="text-xs text-slate-400 text-center mt-5 sm:mt-6">
              Al registrarte, aceptas nuestros{' '}
              <Link href="/terms" className="text-blue-400 hover:underline">
                Términos de Servicio
              </Link>{' '}
              y{' '}
              <Link href="/privacy" className="text-blue-400 hover:underline">
                Política de Privacidad
              </Link>
            </p>
          </div>

          {/* Benefits */}
          <div className="mt-6 sm:mt-8 space-y-2.5 sm:space-y-3 animate-fade-in px-4" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center gap-2.5 sm:gap-3 text-slate-300">
              <CheckCircle size={18} className="text-green-400 flex-shrink-0 sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm">7 días de prueba gratis</span>
            </div>
            <div className="flex items-center gap-2.5 sm:gap-3 text-slate-300">
              <CheckCircle size={18} className="text-green-400 flex-shrink-0 sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm">50% OFF primeros 3 meses</span>
            </div>
            <div className="flex items-center gap-2.5 sm:gap-3 text-slate-300">
              <CheckCircle size={18} className="text-green-400 flex-shrink-0 sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm">Sin tarjeta de crédito requerida</span>
            </div>
          </div>

          <div className="mt-6 sm:mt-8 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs sm:text-sm text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={14} className="sm:w-4 sm:h-4" />
              Volver al inicio
            </Link>
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
