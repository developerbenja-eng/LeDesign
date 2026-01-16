import Link from 'next/link';
import Image from 'next/image';
import {
  Check,
  ArrowRight,
  Zap,
  Star,
  Clock,
  Users,
  TrendingUp,
  Shield,
  Sparkles,
  Rocket,
  Code2,
  FileCheck,
  DollarSign,
  ChevronRight,
} from 'lucide-react';

export default function EarlyAccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="glass-header sticky top-0 z-50 border-b border-slate-800">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logo-dark.svg" alt="LeDesign" width={160} height={40} />
            </Link>
            <Link
              href="/"
              className="text-slate-300 hover:text-white transition-colors text-sm"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-12 sm:pt-24 sm:pb-16">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-green-500/10 to-cyan-500/10 border border-green-500/20 mb-6">
              <Rocket size={16} className="text-green-400" />
              <span className="text-sm font-medium bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
                Programa Founder's Edition
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 text-white">
              Sé Parte de la{' '}
              <span className="bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
                Revolución de la Ingeniería Chilena
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-300 mb-8 max-w-3xl mx-auto">
              Únete como early adopter, obtén acceso de por vida con descuentos de hasta 80%,
              y ayuda a acelerar la validación de normativas chilenas NCh433, NCh691 y más.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link
                href="#pricing"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg bg-gradient-to-r from-green-600 to-cyan-600 text-white hover:from-green-500 hover:to-cyan-500 transition-all shadow-lg shadow-green-500/20"
              >
                Ver Planes Founder
                <ArrowRight size={20} />
              </Link>
              <Link
                href="#demo"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg glass-card text-white hover:bg-white/10 transition-all"
              >
                Ver Demo en Vivo
                <Sparkles size={20} />
              </Link>
            </div>

            {/* Social Proof */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-green-400" />
                <span><strong className="text-white">127</strong> ingenieros en waitlist</span>
              </div>
              <div className="flex items-center gap-2">
                <Star size={16} className="text-yellow-400" />
                <span><strong className="text-white">15</strong> founders confirmados</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-cyan-400" />
                <span>Quedan <strong className="text-white">35 cupos</strong> de 50</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Current Status - What Works Now */}
      <section className="py-12 sm:py-16 bg-gradient-to-b from-slate-900/50 to-transparent">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">
                Estado Actual del Desarrollo
              </h2>
              <p className="text-lg text-slate-300">
                Esto es lo que funciona ahora y lo que viene próximamente
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Working Now */}
              <div className="glass-card rounded-2xl p-8 border-2 border-green-500/30">
                <div className="flex items-center gap-3 mb-6">
                  <div className="icon-wrapper w-12 h-12 rounded-lg bg-green-500/10 text-green-400">
                    <Check size={24} />
                  </div>
                  <h3 className="text-2xl font-bold text-white">Disponible Ahora</h3>
                </div>
                <ul className="space-y-3">
                  {[
                    'Editor 3D estructural completo',
                    'Análisis FEA (elementos finitos)',
                    'Diseño sísmico NCh433 (en validación)',
                    'Análisis de terreno con IA (Gemini)',
                    'Procesamiento de DEM/GeoTIFF',
                    'Integración IDE Chile (datos oficiales)',
                    'Sistema de cubicación básico',
                    'Exportación a PDF y DWG',
                  ].map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check size={20} className="text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Coming Soon */}
              <div className="glass-card rounded-2xl p-8 border-2 border-cyan-500/30">
                <div className="flex items-center gap-3 mb-6">
                  <div className="icon-wrapper w-12 h-12 rounded-lg bg-cyan-500/10 text-cyan-400">
                    <Rocket size={24} />
                  </div>
                  <h3 className="text-2xl font-bold text-white">Próximamente</h3>
                </div>
                <ul className="space-y-3">
                  {[
                    { feature: 'Diseño de pavimentos AASHTO', eta: 'Febrero 2026' },
                    { feature: 'Redes hidráulicas NCh691', eta: 'Marzo 2026' },
                    { feature: 'Diseño vial completo', eta: 'Abril 2026' },
                    { feature: 'Validación oficial NCh433', eta: 'Mayo 2026' },
                    { feature: 'Colaboración en tiempo real', eta: 'Junio 2026' },
                    { feature: 'Mobile app (iOS/Android)', eta: 'Julio 2026' },
                    { feature: 'Integración BIM/IFC', eta: 'Agosto 2026' },
                    { feature: 'API pública para integraciones', eta: 'Sept 2026' },
                  ].map((item) => (
                    <li key={item.feature} className="flex items-start gap-3">
                      <Clock size={20} className="text-cyan-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <span className="text-slate-300">{item.feature}</span>
                        <span className="block text-xs text-cyan-400 mt-1">{item.eta}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Founder Benefits */}
      <section className="py-12 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">
                ¿Por Qué Ser Founder?
              </h2>
              <p className="text-lg text-slate-300">
                Tu inversión temprana acelera el desarrollo y validación
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: DollarSign,
                  title: 'Descuento de Por Vida',
                  description: 'Hasta 80% OFF en todas las funcionalidades, incluyendo features futuros. Tu precio nunca sube.',
                  color: 'text-green-400',
                  bgColor: 'bg-green-500/10',
                },
                {
                  icon: TrendingUp,
                  title: 'Acelera el Desarrollo',
                  description: 'Tu contribución financia validaciones oficiales de NCh433, contratación de ingenieros, y certificaciones.',
                  color: 'text-cyan-400',
                  bgColor: 'bg-cyan-500/10',
                },
                {
                  icon: Users,
                  title: 'Influencia Directa',
                  description: 'Canal privado de Slack, sesiones mensuales con founders, prioridad en features que necesitas.',
                  color: 'text-purple-400',
                  bgColor: 'bg-purple-500/10',
                },
                {
                  icon: Shield,
                  title: 'Garantía 100% Satisfacción',
                  description: 'Si en 6 meses no cumplimos las validaciones prometidas, reembolso completo + 20% extra.',
                  color: 'text-blue-400',
                  bgColor: 'bg-blue-500/10',
                },
                {
                  icon: Star,
                  title: 'Reconocimiento Público',
                  description: 'Tu nombre en la página de founders, badge especial en tu perfil, créditos en documentación.',
                  color: 'text-yellow-400',
                  bgColor: 'bg-yellow-500/10',
                },
                {
                  icon: Code2,
                  title: 'Acceso Beta Exclusivo',
                  description: 'Prueba nuevas features antes que nadie, participa en decisiones de diseño y arquitectura.',
                  color: 'text-pink-400',
                  bgColor: 'bg-pink-500/10',
                },
              ].map((benefit) => (
                <div key={benefit.title} className="glass-card rounded-xl p-6 hover:scale-105 transition-transform">
                  <div className={`icon-wrapper w-12 h-12 rounded-lg ${benefit.bgColor} ${benefit.color} mb-4`}>
                    <benefit.icon size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{benefit.title}</h3>
                  <p className="text-sm text-slate-400">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-12 sm:py-16 bg-gradient-to-b from-slate-900/50 to-transparent">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">
                Planes Founder's Edition
              </h2>
              <p className="text-lg text-slate-300">
                Pago único, acceso de por vida, sin costos recurrentes
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Pioneer */}
              <div className="glass-card rounded-2xl p-8">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">Pioneer</h3>
                  <p className="text-slate-400">Acceso completo individual</p>
                </div>
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-white">$299</span>
                    <span className="text-slate-400">USD</span>
                  </div>
                  <div className="text-sm text-slate-500 line-through mt-1">
                    Precio normal: $1,500/año = $15,000 en 10 años
                  </div>
                  <div className="text-green-400 font-semibold mt-2">
                    Ahorras $14,701 (98%)
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {[
                    '1 usuario',
                    'Todos los módulos de por vida',
                    'Actualizaciones gratis para siempre',
                    '100 GB almacenamiento',
                    'Soporte prioritario',
                    'Acceso beta a nuevas features',
                    'Canal Slack privado',
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <Check size={20} className="text-green-400" />
                      <span className="text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup?plan=founder-pioneer"
                  className="block w-full text-center px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-green-600 to-cyan-600 text-white hover:from-green-500 hover:to-cyan-500 transition-all"
                >
                  Reservar Cupo Pioneer
                </Link>
              </div>

              {/* Founder - Highlighted */}
              <div className="glass-card rounded-2xl p-8 border-2 border-green-500/50 shadow-2xl shadow-green-500/20 scale-105">
                <div className="mb-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-green-500/20 to-cyan-500/20 border border-green-500/30 mb-3">
                    <Star size={14} className="text-yellow-400" />
                    <span className="text-xs font-semibold text-green-400">MÁS POPULAR</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Founder</h3>
                  <p className="text-slate-400">Para equipos pequeños</p>
                </div>
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-white">$799</span>
                    <span className="text-slate-400">USD</span>
                  </div>
                  <div className="text-sm text-slate-500 line-through mt-1">
                    Precio normal: $4,500/año = $45,000 en 10 años
                  </div>
                  <div className="text-green-400 font-semibold mt-2">
                    Ahorras $44,201 (98%)
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {[
                    '5 usuarios incluidos',
                    'Todos los módulos de por vida',
                    'Actualizaciones gratis para siempre',
                    '500 GB almacenamiento',
                    'Soporte prioritario 24/7',
                    'Acceso beta exclusivo',
                    'Canal Slack privado',
                    'Sesión mensual con founders',
                    'Tu nombre en página de founders',
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <Check size={20} className="text-green-400" />
                      <span className="text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup?plan=founder-team"
                  className="block w-full text-center px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-green-600 to-cyan-600 text-white hover:from-green-500 hover:to-cyan-500 transition-all"
                >
                  Reservar Cupo Founder
                </Link>
              </div>

              {/* Enterprise Founder */}
              <div className="glass-card rounded-2xl p-8">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">Enterprise</h3>
                  <p className="text-slate-400">Para organizaciones</p>
                </div>
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-white">$2,499</span>
                    <span className="text-slate-400">USD</span>
                  </div>
                  <div className="text-sm text-slate-500 line-through mt-1">
                    Precio normal: $15,000/año = $150,000 en 10 años
                  </div>
                  <div className="text-green-400 font-semibold mt-2">
                    Ahorras $147,501 (98%)
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {[
                    '20 usuarios incluidos',
                    'Todos los módulos de por vida',
                    'Actualizaciones gratis para siempre',
                    '2 TB almacenamiento',
                    'Soporte dedicado 24/7',
                    'Acceso beta exclusivo',
                    'Canal Slack privado',
                    'Sesión quincenal con founders',
                    'Logo en página de founders',
                    'Custom branding (opcional)',
                    'Onboarding personalizado',
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <Check size={20} className="text-green-400" />
                      <span className="text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup?plan=founder-enterprise"
                  className="block w-full text-center px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-green-600 to-cyan-600 text-white hover:from-green-500 hover:to-cyan-500 transition-all"
                >
                  Reservar Cupo Enterprise
                </Link>
              </div>
            </div>

            <div className="mt-12 text-center">
              <p className="text-slate-400 text-sm mb-4">
                💳 Pago seguro con Stripe • 🔒 Garantía 60 días • 🚀 Acceso inmediato a la plataforma
              </p>
              <p className="text-slate-500 text-xs">
                Los cupos Founder se cierran el 28 de Febrero 2026 o al alcanzar 50 miembros
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Validation Roadmap */}
      <section className="py-12 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">
                Roadmap de Validación
              </h2>
              <p className="text-lg text-slate-300">
                Cómo tu inversión acelera las certificaciones oficiales
              </p>
            </div>

            <div className="space-y-6">
              {[
                {
                  milestone: 'NCh433 - Diseño Sísmico',
                  funding: '$15,000',
                  status: 'En validación',
                  progress: 60,
                  eta: 'Mayo 2026',
                  details: 'Contratación de 2 ingenieros estructurales, 50 proyectos de prueba, revisión INN',
                },
                {
                  milestone: 'NCh691 - Redes Hidráulicas',
                  funding: '$12,000',
                  status: 'Planificado',
                  progress: 20,
                  eta: 'Julio 2026',
                  details: 'Contratación de 1 ingeniero hidráulico, 30 proyectos reales, validación SISS',
                },
                {
                  milestone: 'MC 3.3 - Pavimentos AASHTO',
                  funding: '$8,000',
                  status: 'Planificado',
                  progress: 10,
                  eta: 'Septiembre 2026',
                  details: 'Validación con proyectos MOP, ensayos de laboratorio, certificación técnica',
                },
                {
                  milestone: 'NCh1537 - Diseño Vial',
                  funding: '$10,000',
                  status: 'Pendiente',
                  progress: 0,
                  eta: 'Noviembre 2026',
                  details: 'Validación geométrica completa, integración con datos viales reales, certificación',
                },
              ].map((item, index) => (
                <div key={item.milestone} className="glass-card rounded-xl p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl font-bold text-slate-600">#{index + 1}</span>
                        <h3 className="text-xl font-bold text-white">{item.milestone}</h3>
                      </div>
                      <p className="text-sm text-slate-400">{item.details}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        item.status === 'En validación'
                          ? 'bg-green-500/20 text-green-400'
                          : item.status === 'Planificado'
                          ? 'bg-cyan-500/20 text-cyan-400'
                          : 'bg-slate-500/20 text-slate-400'
                      }`}>
                        {item.status}
                      </span>
                      <span className="text-sm text-slate-500">ETA: {item.eta}</span>
                      <span className="text-lg font-bold text-white">{item.funding} USD</span>
                    </div>
                  </div>
                  <div className="relative w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 to-cyan-500 transition-all duration-500"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{item.progress}% financiado</div>
                </div>
              ))}
            </div>

            <div className="mt-8 glass-card rounded-xl p-6 border border-green-500/30">
              <div className="flex items-start gap-4">
                <FileCheck size={32} className="text-green-400 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">
                    Meta Total de Validación: $45,000 USD
                  </h3>
                  <p className="text-slate-400 mb-4">
                    Con {' '}
                    <strong className="text-green-400">50 founders</strong> a precio promedio de{' '}
                    <strong className="text-green-400">$800</strong>, recaudamos{' '}
                    <strong className="text-green-400">$40,000</strong> - suficiente para completar
                    todas las validaciones en 2026.
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-green-500 to-cyan-500" style={{ width: '33%' }} />
                    </div>
                    <span className="text-sm font-semibold text-white">$15,000 / $45,000</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 sm:py-16 bg-gradient-to-b from-slate-900/50 to-transparent">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">
                Preguntas Frecuentes
              </h2>
            </div>

            <div className="space-y-4">
              {[
                {
                  q: '¿Qué significa "acceso de por vida"?',
                  a: 'Pagas una sola vez y obtienes acceso permanente a LeDesign, incluyendo TODAS las actualizaciones futuras, nuevos módulos, y features. Sin costos recurrentes, nunca.',
                },
                {
                  q: '¿Qué pasa si el proyecto no funciona?',
                  a: 'Garantía 100% de satisfacción. Si en 6 meses no cumplimos con las validaciones prometidas, te devolvemos tu dinero + 20% extra. Sin preguntas.',
                },
                {
                  q: '¿Puedo probar antes de comprar?',
                  a: 'Sí. Tenemos una demo en vivo disponible que muestra el editor estructural, análisis FEA, y procesamiento de terreno con IA. También ofrecemos 7 días de prueba gratis.',
                },
                {
                  q: '¿Cuándo estará lista la validación NCh433?',
                  a: 'Estimamos Mayo 2026. Tu inversión como founder acelera este proceso contratando más ingenieros para validación y pruebas.',
                },
                {
                  q: '¿Puedo actualizar mi plan después?',
                  a: 'Sí. Si empiezas con Pioneer y quieres Founder, pagas la diferencia. Los precios Founder solo están disponibles hasta Febrero 2026.',
                },
                {
                  q: '¿Qué métodos de pago aceptan?',
                  a: 'Stripe (tarjeta), transferencia bancaria, y para empresas grandes, podemos facturar con términos de pago de 30 días.',
                },
              ].map((faq) => (
                <details key={faq.q} className="glass-card rounded-xl p-6 group">
                  <summary className="text-lg font-semibold text-white cursor-pointer list-none flex items-center justify-between">
                    {faq.q}
                    <ChevronRight size={20} className="text-slate-400 group-open:rotate-90 transition-transform" />
                  </summary>
                  <p className="text-slate-400 mt-4">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-24">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center glass-card rounded-3xl p-12 border-2 border-green-500/30">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-white">
              ¿Listo para Revolucionar tu Flujo de Ingeniería?
            </h2>
            <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto">
              Únete a los primeros 50 founders que están construyendo el futuro de la
              ingeniería chilena. Quedan solo 35 cupos.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="#pricing"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg bg-gradient-to-r from-green-600 to-cyan-600 text-white hover:from-green-500 hover:to-cyan-500 transition-all shadow-lg shadow-green-500/20"
              >
                Reservar Mi Cupo Ahora
                <ArrowRight size={20} />
              </Link>
              <Link
                href="mailto:founders@ledesign.cl"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg glass-card text-white hover:bg-white/10 transition-all"
              >
                Hablar con el Equipo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="glass-header border-t border-slate-800">
        <div className="container mx-auto px-4 sm:px-6 py-8">
          <div className="text-center text-sm text-slate-400">
            © 2026 LeDesign. Plataforma de Ingeniería Chilena. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
