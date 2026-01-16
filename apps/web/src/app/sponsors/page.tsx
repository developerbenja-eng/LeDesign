import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Crown, Award, Star, Heart, Check, Zap, Users, TrendingUp, Shield } from 'lucide-react';

export default function SponsorsPage() {
  const sponsorTiers = [
    {
      name: 'Diamond Founder',
      price: '$2,500',
      period: '/mes',
      description: 'Fundadores exclusivos que impulsan el futuro de la ingeniería chilena',
      icon: Crown,
      color: 'text-cyan-400',
      gradient: 'from-cyan-600 to-blue-600',
      badge: 'Solo 10 Disponibles',
      badgeColor: 'bg-cyan-500/20 text-cyan-400',
      features: [
        '10 licencias Completo de por VIDA ($24,000/año de valor)',
        'Logo en pantalla de inicio de sesión',
        'Co-marketing exclusivo "Powered by LeDesign"',
        'Línea directa con equipo de ingeniería',
        'Privilegios de beta testing',
        'Oportunidades de presentación en eventos',
        'Consideración de equity (negociable)',
        'Canal dedicado de soporte (Slack/WhatsApp)',
        'Briefings ejecutivos trimestrales',
        'Membresía en consejo asesor',
      ],
      cta: 'Convertirse en Diamond Founder',
      highlighted: true,
    },
    {
      name: 'Platinum Patron',
      price: '$1,000',
      period: '/mes',
      description: 'Patrocinadores estratégicos con impacto directo en el producto',
      icon: Award,
      color: 'text-purple-400',
      gradient: 'from-purple-600 to-pink-600',
      badge: 'Solo 20 Disponibles',
      badgeColor: 'bg-purple-500/20 text-purple-400',
      features: [
        'Licencia Completo de por VIDA ($2,400/año de valor)',
        'Canal dedicado de soporte (Slack/WhatsApp)',
        'Tu empresa destacada en casos de estudio',
        'Integraciones personalizadas (prioridad API)',
        'Briefings ejecutivos trimestrales',
        'Membresía en consejo asesor',
        'Todo en Champion +',
        'Logo en página "Platinum Patrons"',
        'Acceso a roadmap privado',
      ],
      cta: 'Convertirse en Platinum Patron',
      highlighted: false,
    },
    {
      name: 'Champion',
      price: '$500',
      period: '/mes',
      description: 'Campeones que reciben beneficios VIP y acceso anticipado',
      icon: Star,
      color: 'text-amber-400',
      gradient: 'from-amber-600 to-orange-600',
      badge: 'Solo 50 Disponibles',
      badgeColor: 'bg-amber-500/20 text-amber-400',
      features: [
        'Plan Completo GRATIS por 3 años ($7,200 de valor)',
        'Reunión trimestral 1-on-1 con fundadores',
        'Solicitudes de funciones personalizadas (prioridad)',
        'Logo en "Champion Sponsors"',
        'Invitación a LeDesign Summit anual',
        'Todo en Supporter +',
        'Menciones en redes sociales',
        'Acceso a beta features (2 semanas antes)',
      ],
      cta: 'Convertirse en Champion',
      highlighted: false,
    },
    {
      name: 'Supporter',
      price: '$250',
      period: '/mes',
      description: 'Supporters que creen en el futuro de LeDesign',
      icon: Heart,
      color: 'text-blue-400',
      gradient: 'from-blue-600 to-indigo-600',
      badge: 'Cupos Ilimitados',
      badgeColor: 'bg-blue-500/20 text-blue-400',
      features: [
        'Membresía VIP de por vida (cuando lancemos)',
        'Nombre en página "Founding Supporters"',
        'Acceso anticipado a nuevas funciones (2 semanas)',
        'Actualizaciones mensuales exclusivas de desarrollo',
        'Voto en roadmap de funcionalidades',
        'Insignia especial "Founding Supporter"',
        'Soporte prioritario en comunidad',
        'Descuentos exclusivos en eventos',
      ],
      cta: 'Convertirse en Supporter',
      highlighted: false,
    },
  ];

  const benefits = [
    {
      icon: Zap,
      title: 'Impulsa la Innovación',
      description: 'Tu apoyo financia el desarrollo de la primera plataforma integrada de ingeniería chilena con IA.',
    },
    {
      icon: Users,
      title: 'Moldea el Producto',
      description: 'Influencia directa en el roadmap. Tus necesidades se convierten en prioridades de desarrollo.',
    },
    {
      icon: TrendingUp,
      title: 'ROI Excepcional',
      description: 'Licencias de por vida valen 10-40x tu inversión total. Además del impacto estratégico.',
    },
    {
      icon: Shield,
      title: 'Posicionamiento Estratégico',
      description: 'Reconocimiento como pionero y líder de pensamiento en transformación digital de ingeniería.',
    },
  ];

  const stats = [
    { value: '$1.09M', label: 'Proyección Año 1', description: 'Con solo 35 sponsors' },
    { value: '99%', label: 'Margen Bruto', description: 'Infraestructura <$10k/año' },
    { value: '95%', label: 'Ahorro vs Competencia', description: 'Civil 3D + ETABS = $24k+/año' },
    { value: '10', label: 'Diamond Spots', description: 'Exclusividad garantizada' },
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

      {/* Hero Section */}
      <section className="relative py-12 sm:py-16 md:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/20 to-transparent" />
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center animate-slide-up">
            <div className="inline-flex items-center gap-2 glass-panel px-3 sm:px-4 py-1.5 sm:py-2 rounded-full mb-6 sm:mb-8">
              <Crown size={14} className="text-amber-400 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm text-slate-300">Programa de Fundadores</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 sm:mb-8 leading-tight px-4">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                Conviértete en Founding Sponsor
              </span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-slate-300 mb-8 sm:mb-12 max-w-2xl mx-auto leading-relaxed px-4">
              Únete a los pioneros que están financiando la revolución de la ingeniería chilena.
              Obtén licencias de por vida, influencia en el producto y reconocimiento como fundador.
            </p>

            <div className="glass-card rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 max-w-2xl mx-auto">
              <p className="text-sm sm:text-base text-amber-400 font-semibold mb-2">
                ⚡ Oferta Limitada - Solo Primeros 85 Sponsors
              </p>
              <p className="text-xs sm:text-sm text-slate-400">
                10 Diamond • 20 Platinum • 50 Champion • Unlimited Supporter
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-8 sm:py-12 bg-gradient-to-b from-slate-900/50 to-transparent">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-5xl mx-auto">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className="glass-card rounded-xl p-4 sm:p-6 text-center animate-scale-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1 sm:mb-2">{stat.value}</div>
                <div className="text-xs sm:text-sm font-semibold text-slate-300 mb-1">{stat.label}</div>
                <div className="text-xs text-slate-500">{stat.description}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sponsor Tiers */}
      <section className="py-12 sm:py-16 md:py-20">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10 sm:mb-12 md:mb-16">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 text-white px-4">
                Niveles de Patrocinio
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-2xl mx-auto px-4">
                Elige el nivel que se alinea con tu visión y compromiso
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              {sponsorTiers.map((tier, index) => {
                const IconComponent = tier.icon;
                return (
                  <div
                    key={tier.name}
                    className={`glass-card rounded-xl sm:rounded-2xl p-6 sm:p-8 relative animate-scale-in ${
                      tier.highlighted
                        ? 'border-2 border-cyan-500/50 shadow-2xl shadow-cyan-500/20 lg:col-span-2'
                        : ''
                    }`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {tier.badge && (
                      <div className={`absolute -top-3 sm:-top-4 left-1/2 -translate-x-1/2 ${tier.badgeColor} px-3 sm:px-4 py-1 rounded-full border border-slate-700`}>
                        <span className="text-xs font-semibold">{tier.badge}</span>
                      </div>
                    )}

                    <div className={tier.highlighted ? 'lg:flex lg:gap-8' : ''}>
                      <div className={tier.highlighted ? 'lg:w-1/3' : ''}>
                        <div className="mb-5 sm:mb-6">
                          <div className={`icon-wrapper w-12 h-12 sm:w-14 sm:h-14 mb-3 sm:mb-4 rounded-xl bg-slate-800/50 ${tier.color}`}>
                            <IconComponent size={24} strokeWidth={2} className="sm:w-7 sm:h-7" />
                          </div>
                          <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">{tier.name}</h3>

                          <div className="flex items-baseline gap-2 mb-3 sm:mb-4">
                            <span className="text-4xl sm:text-5xl font-bold text-white">{tier.price}</span>
                            <span className="text-base sm:text-lg text-slate-400">{tier.period}</span>
                          </div>

                          <p className="text-sm sm:text-base text-slate-300 mb-4">{tier.description}</p>
                        </div>

                        <Link
                          href={`/signup?sponsor=${tier.name.toLowerCase().replace(' ', '-')}`}
                          className={`block w-full text-center py-3 sm:py-4 rounded-xl text-base sm:text-lg font-semibold transition-all bg-gradient-to-r ${tier.gradient} text-white hover:opacity-90`}
                        >
                          {tier.cta}
                        </Link>
                      </div>

                      <div className={tier.highlighted ? 'lg:w-2/3 mt-6 lg:mt-0' : 'mt-6'}>
                        <ul className={`space-y-2.5 sm:space-y-3 ${tier.highlighted ? 'lg:grid lg:grid-cols-2 lg:gap-x-6' : ''}`}>
                          {tier.features.map((feature) => (
                            <li key={feature} className="flex items-start gap-2 sm:gap-3">
                              <Check size={18} className={`${tier.color} mt-0.5 flex-shrink-0 sm:w-5 sm:h-5`} />
                              <span className="text-sm sm:text-base text-slate-300">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 sm:mt-12 text-center">
              <p className="text-xs sm:text-sm text-slate-400 mb-4">
                💡 Todos los niveles incluyen reconocimiento público y acceso al programa de fundadores
              </p>
              <p className="text-xs sm:text-sm text-slate-500">
                Los pagos se procesan mensualmente. Cancela cuando quieras, pero los beneficios de por vida permanecen.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Sponsor */}
      <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-b from-slate-900/50 to-transparent">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10 sm:mb-12">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 text-white px-4">
                ¿Por Qué Patrocinar LeDesign?
              </h2>
              <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto px-4">
                Más allá del ROI financiero, estás invirtiendo en el futuro de la ingeniería chilena
              </p>
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
                    <div className="icon-wrapper w-12 h-12 sm:w-14 sm:h-14 mb-4 sm:mb-6 rounded-xl bg-blue-500/10 text-blue-400">
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

      {/* ROI Breakdown */}
      <section className="py-12 sm:py-16 md:py-20">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <div className="glass-card rounded-2xl p-6 sm:p-8 md:p-10">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 text-white text-center">
                Análisis de ROI: Diamond Founder
              </h2>

              <div className="space-y-4 sm:space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-slate-700">
                  <span className="text-sm sm:text-base text-slate-300">Inversión total (12 meses)</span>
                  <span className="text-lg sm:text-xl font-bold text-white">$30,000</span>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm sm:text-base text-slate-300">10 licencias Completo (valor de por vida)</span>
                    <span className="text-base sm:text-lg font-semibold text-green-400">$240,000+</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm sm:text-base text-slate-300">Visibilidad de marca y co-marketing</span>
                    <span className="text-base sm:text-lg font-semibold text-green-400">$50,000+</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm sm:text-base text-slate-300">Influencia en producto (intangible)</span>
                    <span className="text-base sm:text-lg font-semibold text-green-400">Invaluable</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t-2 border-cyan-500/50">
                  <span className="text-base sm:text-lg font-bold text-white">Retorno total estimado</span>
                  <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
                    $290,000+
                  </span>
                </div>

                <div className="text-center pt-4">
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold text-cyan-400">
                    ROI: 967%
                  </p>
                  <p className="text-xs sm:text-sm text-slate-400 mt-2">
                    Casi 10x tu inversión, sin contar beneficios intangibles
                  </p>
                </div>
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
              ¿Listo Para Ser Fundador?
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-slate-300 mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
              Únete ahora y asegura tu lugar entre los pioneros que están transformando la ingeniería chilena
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center">
              <Link
                href="/signup?sponsor=true"
                className="group glass-card interactive-card px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 border-none hover:from-cyan-500 hover:to-blue-500"
              >
                <Crown size={20} className="sm:w-5 sm:h-5" />
                Aplicar Ahora
              </Link>
              <Link
                href="/contact"
                className="glass-card px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg hover:bg-slate-800/60 transition-colors text-center"
              >
                Hablar con Fundadores
              </Link>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-4 sm:mt-6 px-4">
              Proceso de selección. Priorizamos sponsors alineados con nuestra visión.
            </p>
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
