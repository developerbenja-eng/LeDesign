import Link from 'next/link';
import Image from 'next/image';
import {
  Building2,
  Route,
  Car,
  Droplet,
  Mountain,
  Zap,
  ArrowRight,
  Clock,
  Shield,
  Users,
  Flag,
  Check,
  Sparkles,
} from 'lucide-react';

export default function HomePage() {
  const modules = [
    {
      name: 'Diseño Estructural',
      description: 'Análisis FEA, diseño sísmico NCh433, hormigón y acero',
      icon: Building2,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      name: 'Diseño de Pavimentos',
      description: 'Pavimentos flexibles y rígidos según AASHTO',
      icon: Route,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
    {
      name: 'Diseño Vial',
      description: 'Geometría de carreteras, alineamientos y curvas',
      icon: Car,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      name: 'Diseño Hidráulico',
      description: 'Redes de agua NCh691, alcantarillado y drenaje',
      icon: Droplet,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
    },
    {
      name: 'Análisis de Terreno',
      description: 'Procesamiento DEM con IA (Google Gemini)',
      icon: Mountain,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
  ];

  const benefits = [
    {
      title: 'Normativa Chilena Integrada',
      description: 'NCh433, NCh432, NCh691, NCh1105 y más implementadas',
      icon: Shield,
      color: 'text-blue-400',
    },
    {
      title: 'Ahorra Tiempo',
      description: 'Automatiza cálculos y generación de reportes',
      icon: Clock,
      color: 'text-purple-400',
    },
    {
      title: 'IA para Terreno',
      description: 'Análisis de terreno con Google Gemini AI',
      icon: Sparkles,
      color: 'text-amber-400',
    },
    {
      title: 'Colaboración',
      description: 'Trabaja en equipo en tiempo real',
      icon: Users,
      color: 'text-green-400',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="glass-header sticky top-0 z-50 border-b border-slate-800/50">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex-shrink-0">
              <Image
                src="/logo-dark.svg"
                alt="LeDesign"
                width={150}
                height={38}
                priority
                className="w-[120px] sm:w-[150px]"
              />
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/early-access" className="text-green-400 hover:text-green-300 transition-colors text-sm font-semibold">
                🚀 Early Access
              </Link>
              <Link href="#modules" className="text-slate-300 hover:text-white transition-colors text-sm">
                Módulos
              </Link>
              <Link href="#pricing" className="text-slate-300 hover:text-white transition-colors text-sm">
                Precios
              </Link>
              <Link href="/auth/signin" className="text-slate-300 hover:text-white transition-colors text-sm">
                Ingresar
              </Link>
              <Link
                href="/signup"
                className="btn-glass px-5 py-2 rounded-lg text-white font-semibold text-sm"
              >
                Comenzar Gratis
              </Link>
            </nav>
            <Link
              href="/signup"
              className="md:hidden btn-glass px-4 py-2 rounded-lg text-white font-semibold text-sm"
            >
              Comenzar
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-16 sm:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/20 to-transparent" />
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 glass-panel px-4 py-2 rounded-full mb-8">
              <Flag size={14} className="text-red-400" />
              <span className="text-sm text-slate-300">Diseñado para Ingeniería Chilena</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Diseña Más Rápido.
              </span>
              <br />
              <span className="text-white">Cumple la Normativa.</span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
              Plataforma integral de diseño ingenieril con{' '}
              <span className="text-blue-400 font-semibold">estructural, pavimentos, vial, hidráulica</span> y{' '}
              <span className="text-amber-400 font-semibold">análisis de terreno con IA</span>.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link
                href="/dashboard"
                className="group glass-card px-8 py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 border-none hover:from-blue-500 hover:to-purple-500"
              >
                Ir al Dashboard
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/early-access"
                className="glass-card px-8 py-4 rounded-xl font-semibold text-lg hover:bg-slate-800/60 transition-colors text-center"
              >
                Ver Early Access
              </Link>
            </div>

            <p className="text-sm text-slate-400">
              ✓ Gratis para comenzar &nbsp;•&nbsp; ✓ Sin tarjeta de crédito
            </p>
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section id="modules" className="py-16 bg-gradient-to-b from-slate-900/50 to-transparent">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              5 Módulos de Ingeniería
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Todo en un solo proyecto. Accede a todos los módulos desde el editor unificado.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {modules.map((module) => {
              const IconComponent = module.icon;
              return (
                <div
                  key={module.name}
                  className="glass-card rounded-xl p-6 hover:bg-slate-800/60 transition-colors"
                >
                  <div className={`icon-wrapper w-12 h-12 rounded-lg ${module.bgColor} ${module.color} mb-4`}>
                    <IconComponent size={24} strokeWidth={2} />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{module.name}</h3>
                  <p className="text-sm text-slate-400">{module.description}</p>
                </div>
              );
            })}
            {/* CTA Card */}
            <div className="glass-card rounded-xl p-6 border-2 border-dashed border-slate-700 flex flex-col items-center justify-center text-center">
              <Zap size={32} className="text-purple-400 mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Todos Integrados</h3>
              <p className="text-sm text-slate-400 mb-4">Un proyecto, todos los módulos</p>
              <Link
                href="/dashboard"
                className="text-purple-400 hover:text-purple-300 text-sm font-semibold"
              >
                Crear Proyecto →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {benefits.map((benefit) => {
              const IconComponent = benefit.icon;
              return (
                <div key={benefit.title} className="text-center">
                  <div className={`icon-wrapper w-14 h-14 mx-auto mb-4 rounded-full bg-slate-800/50 ${benefit.color}`}>
                    <IconComponent size={24} strokeWidth={2} />
                  </div>
                  <h3 className="text-white font-semibold mb-2">{benefit.title}</h3>
                  <p className="text-sm text-slate-400">{benefit.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 bg-gradient-to-b from-slate-900/50 to-transparent">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Precios Simples
            </h2>
            <p className="text-slate-400">
              Acceso a todos los módulos. Paga según tu uso.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Free Plan */}
            <div className="glass-card rounded-2xl p-8">
              <h3 className="text-xl font-bold text-white mb-2">Gratis</h3>
              <p className="text-slate-400 text-sm mb-6">Para comenzar y explorar</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">$0</span>
                <span className="text-slate-400">/mes</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['5 proyectos', 'Todos los módulos', 'Exportación PDF', 'Soporte por email'].map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-slate-300">
                    <Check size={16} className="text-green-400" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="block w-full text-center glass-card py-3 rounded-lg font-semibold hover:bg-slate-800/60 transition-colors"
              >
                Comenzar Gratis
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="glass-card rounded-2xl p-8 border-2 border-blue-500/30">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-white">Profesional</h3>
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-semibold rounded">Popular</span>
              </div>
              <p className="text-slate-400 text-sm mb-6">Para ingenieros profesionales</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">$49</span>
                <span className="text-slate-400">/mes</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['Proyectos ilimitados', 'Todos los módulos', 'Exportación DWG, Excel', 'Colaboración en equipo', 'Soporte prioritario', '100GB almacenamiento'].map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-slate-300">
                    <Check size={16} className="text-blue-400" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup?plan=pro"
                className="block w-full text-center py-3 rounded-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition-colors"
              >
                Comenzar Prueba Gratis
              </Link>
              <p className="text-xs text-slate-500 text-center mt-3">14 días gratis, sin tarjeta</p>
            </div>
          </div>

          {/* Early Access CTA */}
          <div className="mt-12 text-center">
            <p className="text-slate-400 mb-4">
              ¿Quieres acceso anticipado y beneficios exclusivos?
            </p>
            <Link
              href="/early-access"
              className="inline-flex items-center gap-2 text-green-400 hover:text-green-300 font-semibold"
            >
              Ver Programa Early Access →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center glass-card rounded-2xl p-10 border border-blue-500/20">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Comienza a Diseñar Hoy
            </h2>
            <p className="text-slate-300 mb-8">
              Accede a todos los módulos de ingeniería en una sola plataforma.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/dashboard"
                className="group px-8 py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500"
              >
                Ir al Dashboard
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/signup"
                className="glass-card px-8 py-4 rounded-xl font-semibold text-lg hover:bg-slate-800/60 transition-colors"
              >
                Crear Cuenta
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="glass-header border-t border-slate-800 mt-auto">
        <div className="container mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Image src="/logo-dark.svg" alt="LeDesign" width={100} height={25} />
              <span className="text-sm text-slate-400">Ingeniería Chilena</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-400">
              <Link href="/early-access" className="hover:text-white transition-colors">Early Access</Link>
              <Link href="/pitch" className="hover:text-white transition-colors">Pitch</Link>
              <Link href="/plan" className="hover:text-white transition-colors">Plan</Link>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-slate-800 text-center text-xs text-slate-500">
            © 2026 LeDesign. Construido en Chile 🇨🇱
          </div>
        </div>
      </footer>
    </div>
  );
}
