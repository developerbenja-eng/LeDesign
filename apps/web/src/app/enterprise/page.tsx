import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Users, Building2, Globe, Check, Shield, Zap, HeartHandshake, TrendingUp } from 'lucide-react';

export default function EnterprisePage() {
  const enterpriseTiers = [
    {
      name: 'Team',
      price: '$80',
      period: '/usuario/mes',
      description: 'Para equipos de ingeniería de 3-10 profesionales',
      icon: Users,
      minUsers: '3-10 usuarios',
      storage: '200 GB compartido',
      features: [
        'Todos los módulos (5 módulos integrados)',
        'Proyectos colaborativos compartidos',
        'Dashboard de análisis de equipo',
        'Cola de soporte prioritario',
        'Exportación a PDF, DWG, Excel',
        'Actualizaciones de normativa incluidas',
        'Capacitación inicial incluida (2 horas)',
        'Administración de usuarios',
      ],
      savings: '20% vs plan individual',
    },
    {
      name: 'Empresa',
      price: '$60',
      period: '/usuario/mes',
      description: 'Para empresas de consultoría de 11-50 ingenieros',
      icon: Building2,
      minUsers: '11-50 usuarios',
      storage: '500 GB compartido',
      features: [
        'Todo en Team +',
        'Soporte dedicado (Slack/email)',
        'Capacitación personalizada (8 horas)',
        'Sesiones de onboarding para nuevos usuarios',
        'Reportes de uso y productividad',
        'Bibliotecas de proyectos compartidas',
        'Templates personalizados',
        'Account manager dedicado',
        'SLA de 24 horas',
      ],
      savings: '40% vs plan individual',
      highlighted: true,
    },
    {
      name: 'Corporativo',
      price: 'Personalizado',
      period: '',
      description: 'Para grandes empresas y organizaciones de 51+ profesionales',
      icon: Globe,
      minUsers: '51+ usuarios',
      storage: '1 TB+ personalizable',
      features: [
        'Todo en Empresa +',
        'Opción de implementación on-premise',
        'Integraciones personalizadas (API)',
        'SSO / Active Directory',
        'SLA de 4 horas con soporte 24/7',
        'Capacitación ilimitada',
        'Migración de datos asistida',
        'Gerente de éxito del cliente dedicado',
        'Revisiones trimestrales de negocio',
        'Desarrollo de funciones personalizadas',
      ],
      savings: 'Hasta 50% vs plan individual',
    },
  ];

  const governmentTiers = [
    {
      name: 'Municipal',
      price: '$5,000',
      period: '/año',
      scope: 'Hasta 20 usuarios',
      storage: '300 GB',
      description: 'Para municipalidades y gobiernos locales',
    },
    {
      name: 'Regional',
      price: '$15,000',
      period: '/año',
      scope: 'Hasta 100 usuarios',
      storage: '1 TB',
      description: 'Para gobiernos regionales',
    },
    {
      name: 'Nacional',
      price: '$50,000',
      period: '/año',
      scope: 'Usuarios ilimitados',
      storage: 'Ilimitado',
      description: 'Para ministerios y agencias nacionales (MOP, DOH, etc.)',
    },
  ];

  const benefits = [
    {
      icon: Shield,
      title: 'Seguridad Empresarial',
      description: 'Encriptación end-to-end, backups automáticos, cumplimiento de normativas chilenas.',
    },
    {
      icon: Zap,
      title: 'Productividad 40% Mayor',
      description: 'Workflows integrados eliminan cambios entre 4-6 herramientas. Tiempo ahorrado = dinero.',
    },
    {
      icon: HeartHandshake,
      title: 'Soporte Dedicado',
      description: 'Account manager, capacitación continua, y soporte en español con SLA garantizado.',
    },
    {
      icon: TrendingUp,
      title: 'Escalabilidad',
      description: 'Crece desde 3 usuarios hasta 500+ sin cambiar de plataforma. Paga solo por lo que usas.',
    },
  ];

  const comparison = [
    {
      feature: 'Precio anual por usuario',
      individual: '$1,200',
      team: '$960',
      empresa: '$720',
      traditional: '$24,679+',
    },
    {
      feature: 'Módulos incluidos',
      individual: '5 módulos',
      team: '5 módulos',
      empresa: '5 módulos',
      traditional: 'Separados',
    },
    {
      feature: 'Colaboración en tiempo real',
      individual: '❌',
      team: '✅',
      empresa: '✅',
      traditional: '❌',
    },
    {
      feature: 'Soporte prioritario',
      individual: 'Estándar',
      team: 'Prioritario',
      empresa: 'Dedicado',
      traditional: 'Email only',
    },
    {
      feature: 'Capacitación',
      individual: 'Docs',
      team: '2 horas',
      empresa: '8+ horas',
      traditional: '$2,000+',
    },
    {
      feature: 'Normativa chilena',
      individual: '✅ Built-in',
      team: '✅ Built-in',
      empresa: '✅ Built-in',
      traditional: '❌ Manual',
    },
  ];

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

      {/* Hero */}
      <section className="relative py-12 sm:py-16 md:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/20 to-transparent" />
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center animate-slide-up">
            <div className="inline-flex items-center gap-2 glass-panel px-3 sm:px-4 py-1.5 sm:py-2 rounded-full mb-6 sm:mb-8">
              <Building2 size={14} className="text-blue-400 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm text-slate-300">Soluciones Empresariales</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 sm:mb-8 leading-tight px-4">
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                LeDesign para Equipos y Empresas
              </span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-slate-300 mb-8 sm:mb-12 max-w-2xl mx-auto leading-relaxed px-4">
              Potencia la productividad de todo tu equipo de ingeniería con la única plataforma integrada
              que incluye diseño vial, estructural, hidráulico y análisis de terreno con IA.
            </p>

            <div className="glass-card rounded-xl p-4 sm:p-6 max-w-2xl mx-auto">
              <p className="text-sm sm:text-base text-green-400 font-semibold mb-2">
                💰 Ahorra hasta $23,679 por ingeniero al año vs herramientas tradicionales
              </p>
              <p className="text-xs sm:text-sm text-slate-400">
                Civil 3D + ETABS + WaterCAD = $24,679/año → LeDesign Team = $960/año
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise Pricing */}
      <section className="py-12 sm:py-16 md:py-20">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10 sm:mb-12">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 text-white px-4">
                Planes para Empresas
              </h2>
              <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto px-4">
                Desde pequeños equipos hasta grandes corporaciones
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
              {enterpriseTiers.map((tier, index) => {
                const IconComponent = tier.icon;
                return (
                  <div
                    key={tier.name}
                    className={`glass-card rounded-xl sm:rounded-2xl p-6 sm:p-8 relative animate-scale-in ${
                      tier.highlighted
                        ? 'border-2 border-blue-500/50 shadow-2xl shadow-blue-500/20'
                        : ''
                    }`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {tier.highlighted && (
                      <div className="absolute -top-3 sm:-top-4 left-1/2 -translate-x-1/2 glass-card px-3 sm:px-4 py-1 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 border-none">
                        <span className="text-xs font-semibold text-white">Más Popular</span>
                      </div>
                    )}

                    <div className="mb-5 sm:mb-6">
                      <div className={`icon-wrapper w-12 h-12 sm:w-14 sm:h-14 mb-3 sm:mb-4 rounded-xl bg-slate-800/50 ${tier.highlighted ? 'text-blue-400' : 'text-slate-400'}`}>
                        <IconComponent size={24} strokeWidth={2} className="sm:w-7 sm:h-7" />
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">{tier.name}</h3>

                      {tier.price !== 'Personalizado' ? (
                        <div className="flex items-baseline gap-2 mb-2">
                          <span className="text-3xl sm:text-4xl font-bold text-white">{tier.price}</span>
                          <span className="text-sm sm:text-base text-slate-400">{tier.period}</span>
                        </div>
                      ) : (
                        <div className="mb-2">
                          <span className="text-2xl sm:text-3xl font-bold text-white">{tier.price}</span>
                        </div>
                      )}

                      <div className="mb-3 space-y-1">
                        <p className="text-xs sm:text-sm text-green-400 font-semibold">{tier.savings}</p>
                        <p className="text-xs text-slate-400">{tier.minUsers}</p>
                        <p className="text-xs text-slate-400">{tier.storage}</p>
                      </div>

                      <p className="text-sm text-slate-300">{tier.description}</p>
                    </div>

                    <ul className="space-y-2.5 sm:space-y-3 mb-6 sm:mb-8">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 sm:gap-3">
                          <Check size={16} className="text-green-400 mt-0.5 flex-shrink-0 sm:w-[18px] sm:h-[18px]" />
                          <span className="text-xs sm:text-sm text-slate-300">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Link
                      href={tier.price === 'Personalizado' ? '/contact-sales' : `/signup?plan=enterprise-${tier.name.toLowerCase()}`}
                      className={`block w-full text-center py-3 sm:py-4 rounded-xl text-base sm:text-lg font-semibold transition-all ${
                        tier.highlighted
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500'
                          : 'glass-card hover:bg-slate-800/60'
                      }`}
                    >
                      {tier.price === 'Personalizado' ? 'Contactar Ventas' : 'Comenzar Prueba'}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Government Pricing */}
      <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-b from-slate-900/50 to-transparent">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10 sm:mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white px-4">
                Planes para Sector Público
              </h2>
              <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto px-4">
                Soluciones especiales para municipios, gobiernos regionales y agencias nacionales
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {governmentTiers.map((tier, index) => (
                <div
                  key={tier.name}
                  className="glass-card rounded-xl p-6 animate-scale-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">{tier.name}</h3>
                  <div className="text-3xl sm:text-4xl font-bold text-blue-400 mb-1">{tier.price}</div>
                  <div className="text-sm text-slate-400 mb-4">{tier.period}</div>
                  <div className="space-y-2 mb-4">
                    <p className="text-sm text-slate-300">📊 {tier.scope}</p>
                    <p className="text-sm text-slate-300">💾 {tier.storage}</p>
                  </div>
                  <p className="text-sm text-slate-400 mb-6">{tier.description}</p>
                  <Link
                    href="/contact-sales?type=government"
                    className="block w-full text-center py-3 rounded-lg glass-card hover:bg-slate-800/60 transition-colors font-semibold"
                  >
                    Solicitar Propuesta
                  </Link>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <p className="text-sm text-slate-400">
                Incluye: SLA garantizado, capacitación ilimitada, auditorías de cumplimiento, soporte en español
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-12 sm:py-16 md:py-20">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10 sm:mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white px-4">
                ¿Por Qué Equipos Eligen LeDesign?
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              {benefits.map((benefit, index) => {
                const IconComponent = benefit.icon;
                return (
                  <div
                    key={benefit.title}
                    className="glass-card rounded-xl p-6 sm:p-8 animate-scale-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="icon-wrapper w-12 h-12 sm:w-14 sm:h-14 mb-4 rounded-xl bg-blue-500/10 text-blue-400">
                      <IconComponent size={24} strokeWidth={2} className="sm:w-7 sm:h-7" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-semibold mb-3 text-white">{benefit.title}</h3>
                    <p className="text-sm sm:text-base text-slate-300 leading-relaxed">{benefit.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-b from-slate-900/50 to-transparent">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10 sm:mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white px-4">
                Comparación de Planes
              </h2>
            </div>

            <div className="glass-card rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left p-4 text-sm sm:text-base font-semibold text-white">Característica</th>
                      <th className="text-center p-4 text-sm sm:text-base font-semibold text-white">Individual</th>
                      <th className="text-center p-4 text-sm sm:text-base font-semibold text-white">Team</th>
                      <th className="text-center p-4 text-sm sm:text-base font-semibold text-blue-400">Empresa</th>
                      <th className="text-center p-4 text-sm sm:text-base font-semibold text-slate-500">Tradicional</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.map((row, index) => (
                      <tr key={row.feature} className={index !== comparison.length - 1 ? 'border-b border-slate-800' : ''}>
                        <td className="p-4 text-xs sm:text-sm text-slate-300">{row.feature}</td>
                        <td className="p-4 text-xs sm:text-sm text-center text-slate-300">{row.individual}</td>
                        <td className="p-4 text-xs sm:text-sm text-center text-slate-300">{row.team}</td>
                        <td className="p-4 text-xs sm:text-sm text-center text-blue-400 font-semibold">{row.empresa}</td>
                        <td className="p-4 text-xs sm:text-sm text-center text-slate-500">{row.traditional}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-b from-blue-950/20 to-transparent">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center glass-card rounded-2xl p-8 sm:p-10 md:p-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 text-white px-4">
              ¿Listo Para Transformar Tu Equipo?
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-slate-300 mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
              Prueba LeDesign gratis durante 7 días con todo tu equipo. Sin tarjeta de crédito requerida.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center">
              <Link
                href="/signup?plan=enterprise"
                className="group glass-card interactive-card px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 border-none hover:from-blue-500 hover:to-purple-500"
              >
                Comenzar Prueba Gratis
              </Link>
              <Link
                href="/contact-sales"
                className="glass-card px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg hover:bg-slate-800/60 transition-colors text-center"
              >
                Hablar con Ventas
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="glass-header mt-auto border-t border-slate-800">
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 text-center text-xs sm:text-sm text-slate-400">
          © 2026 LeDesign. Plataforma de Ingeniería Chilena.
        </div>
      </footer>
    </div>
  );
}
