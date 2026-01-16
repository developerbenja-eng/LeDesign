import Link from 'next/link';
import Image from 'next/image';
import {
  Building2,
  Route,
  Car,
  Droplet,
  Mountain,
  Zap,
  BarChart3,
  Flag,
  Check,
  ArrowRight,
  Clock,
  Shield,
  Users,
  TrendingUp,
  FileCheck,
  Sparkles,
  ChevronRight,
  X,
  DollarSign,
  Rocket,
  GraduationCap,
} from 'lucide-react';

export default function HomePage() {
  const modules = [
    {
      name: 'Diseño Estructural',
      href: '/structural',
      description: 'Análisis FEA, diseño sísmico NCh433, diseño de hormigón, acero y fundaciones',
      icon: Building2,
      color: 'text-blue-400',
      benefits: ['Análisis sísmico automatizado', 'Cumplimiento NCh433', 'Optimización de materiales'],
    },
    {
      name: 'Diseño de Pavimentos',
      href: '/pavement',
      description: 'Pavimentos flexibles y rígidos según AASHTO y normativa chilena',
      icon: Route,
      color: 'text-purple-400',
      benefits: ['Diseño AASHTO', 'Análisis CBR', 'Cálculo de espesores'],
    },
    {
      name: 'Diseño Vial',
      href: '/road',
      description: 'Geometría de carreteras, alineamientos horizontal y vertical',
      icon: Car,
      color: 'text-green-400',
      benefits: ['Trazado automatizado', 'Peraltes y curvas', 'Distancias de visibilidad'],
    },
    {
      name: 'Diseño Hidráulico',
      href: '/hydraulics',
      description: 'Redes de agua potable, alcantarillado, canales y drenaje',
      icon: Droplet,
      color: 'text-cyan-400',
      benefits: ['Redes NCh691', 'Dimensionamiento de tuberías', 'Análisis de flujo'],
    },
    {
      name: 'Análisis de Terreno',
      href: '/terrain',
      description: 'Procesamiento de modelos digitales de elevación con IA',
      icon: Mountain,
      color: 'text-amber-400',
      benefits: ['Detección con IA', 'Curvas de nivel', 'Cubicación de movimiento de tierra'],
    },
  ];

  const pricingTiers = [
    {
      name: 'Urbanización',
      price: '$50',
      originalPrice: '$100',
      period: '/mes',
      description: 'Diseño vial, pavimentos y análisis de terreno con IA',
      modules: ['Diseño Vial', 'Diseño de Pavimentos', 'Análisis de Terreno'],
      features: [
        'Geometría de carreteras y alineamientos',
        'Pavimentos flexibles y rígidos (AASHTO)',
        'Análisis de terreno con Google Gemini AI',
        'Cubicación de movimiento de tierra',
        'Proyectos ilimitados',
        'Exportación a PDF, DWG, Excel',
        '50 GB de almacenamiento incluido',
        'Soporte técnico incluido',
      ],
      cta: 'Comenzar Prueba Gratis',
      ctaLink: '/signup?plan=urbanizacion',
      highlighted: false,
      icon: Car,
      promoText: '50% OFF primeros 3 meses',
    },
    {
      name: 'Hidráulica',
      price: '$50',
      originalPrice: '$100',
      period: '/mes',
      description: 'Redes de agua potable, alcantarillado y drenaje',
      modules: ['Diseño Hidráulico'],
      features: [
        'Redes de agua potable NCh691',
        'Sistemas de alcantarillado',
        'Dimensionamiento de tuberías',
        'Análisis de flujo y presiones',
        'Canales y drenaje',
        'Proyectos ilimitados',
        'Exportación a PDF, DWG, Excel',
        '50 GB de almacenamiento incluido',
        'Soporte técnico incluido',
      ],
      cta: 'Comenzar Prueba Gratis',
      ctaLink: '/signup?plan=hidraulica',
      highlighted: false,
      icon: Droplet,
      promoText: '50% OFF primeros 3 meses',
    },
    {
      name: 'Estructural',
      price: '$50',
      originalPrice: '$100',
      period: '/mes',
      description: 'Análisis FEA y diseño sísmico según normativa chilena',
      modules: ['Diseño Estructural'],
      features: [
        'Análisis FEA (elementos finitos)',
        'Diseño sísmico NCh433',
        'Diseño de hormigón armado NCh430',
        'Diseño de estructuras de acero',
        'Diseño de fundaciones',
        'Proyectos ilimitados',
        'Exportación a PDF, DWG, Excel',
        '50 GB de almacenamiento incluido',
        'Soporte técnico incluido',
      ],
      cta: 'Comenzar Prueba Gratis',
      ctaLink: '/signup?plan=estructural',
      highlighted: false,
      icon: Building2,
      promoText: '50% OFF primeros 3 meses',
    },
    {
      name: 'Completo',
      price: '$100',
      originalPrice: '$200',
      period: '/mes',
      description: 'Todos los módulos de ingeniería en una sola plataforma',
      modules: ['Urbanización', 'Hidráulica', 'Estructural'],
      features: [
        'Acceso completo a los 5 módulos',
        'Urbanización + Hidráulica + Estructural',
        'Análisis con IA (Google Gemini)',
        'Proyectos ilimitados',
        'Exportación a PDF, DWG, Excel',
        'Colaboración en equipo',
        'Soporte prioritario 24/7',
        '100 GB de almacenamiento incluido',
      ],
      cta: 'Comenzar Prueba Gratis',
      ctaLink: '/signup?plan=completo',
      highlighted: true,
      icon: Zap,
      badge: 'Más Popular',
      promoText: '50% OFF primeros 3 meses',
    },
  ];

  const stats = [
    { value: '10,000+', label: 'Proyectos Completados', icon: FileCheck },
    { value: '2,500+', label: 'Ingenieros Activos', icon: Users },
    { value: '99.9%', label: 'Tiempo de Actividad', icon: TrendingUp },
    { value: '40%', label: 'Ahorro de Tiempo', icon: Clock },
  ];

  const benefits = [
    {
      title: 'Cumplimiento Normativo Garantizado',
      description:
        'Todas las herramientas implementan las últimas versiones de las normas chilenas (NCh433, NCh432, NCh691, etc.) y estándares internacionales.',
      icon: Shield,
      color: 'text-blue-400',
    },
    {
      title: 'Ahorra 40% de Tiempo en Diseño',
      description:
        'Automatiza cálculos repetitivos, generación de reportes y verificaciones normativas. Enfócate en lo que importa: la ingeniería.',
      icon: Clock,
      color: 'text-purple-400',
    },
    {
      title: 'Precisión con Tecnología de IA',
      description:
        'Análisis de terreno con Google Gemini AI, detección automática de características, y optimización de diseños con machine learning.',
      icon: Sparkles,
      color: 'text-amber-400',
    },
    {
      title: 'Colaboración en Tiempo Real',
      description:
        'Trabaja en equipo en los mismos proyectos, comparte diseños, y mantén sincronizados a todos los stakeholders.',
      icon: Users,
      color: 'text-green-400',
    },
  ];

  const testimonials = [
    {
      name: 'Carlos Muñoz',
      role: 'Ingeniero Civil Estructural',
      company: 'Constructora del Sur',
      content:
        'LeDesign ha revolucionado la forma en que diseñamos estructuras. El módulo NCh433 es impecable y me ahorra horas de cálculos manuales.',
      rating: 5,
    },
    {
      name: 'María Fernández',
      role: 'Ingeniera en Obras Civiles',
      company: 'Consultora Vial Norte',
      content:
        'La integración de todos los módulos en una sola plataforma es increíble. Ya no necesito 5 software diferentes para mis proyectos viales.',
      rating: 5,
    },
    {
      name: 'Roberto Silva',
      role: 'Gerente de Ingeniería',
      company: 'Ingeniería y Proyectos Ltda.',
      content:
        'Implementamos LeDesign en toda la empresa. La colaboración en equipo y el soporte han sido excepcionales. ROI positivo en 3 meses.',
      rating: 5,
    },
  ];

  const faqs = [
    {
      question: '¿Necesito instalar software en mi computador?',
      answer:
        'No, LeDesign es una aplicación web 100% en la nube. Solo necesitas un navegador moderno y conexión a internet. Funciona en Windows, Mac y Linux.',
    },
    {
      question: '¿Los cálculos cumplen con la normativa chilena?',
      answer:
        'Sí, todos nuestros módulos están actualizados con las últimas versiones de las normas chilenas (NCh433, NCh432, NCh691, etc.) y estándares internacionales como AASHTO y AISC.',
    },
    {
      question: '¿Puedo probar LeDesign antes de pagar?',
      answer:
        'Absolutamente. Ofrecemos un plan Gratis permanente y una prueba de 14 días del plan Profesional sin necesidad de tarjeta de crédito.',
    },
    {
      question: '¿Mis datos están seguros?',
      answer:
        'Tus proyectos están encriptados en tránsito y en reposo. Usamos infraestructura de Google Cloud con certificación SOC 2 y backups automáticos diarios.',
    },
    {
      question: '¿Puedo exportar mis diseños a otros formatos?',
      answer:
        'Sí, puedes exportar a PDF, DWG (AutoCAD), Excel, y formatos de intercambio como IFC. El plan Profesional incluye todas las opciones de exportación.',
    },
    {
      question: '¿Ofrecen capacitación?',
      answer:
        'Sí. El plan Empresarial incluye capacitación dedicada. También ofrecemos documentación completa, videos tutoriales y webinars mensuales para todos los usuarios.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header with glassmorphism */}
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
            <nav className="hidden md:flex items-center gap-6 lg:gap-8">
              <Link href="#features" className="text-slate-300 hover:text-white transition-colors text-sm lg:text-base">
                Características
              </Link>
              <Link href="#pricing" className="text-slate-300 hover:text-white transition-colors text-sm lg:text-base">
                Precios
              </Link>
              <Link href="/enterprise" className="text-slate-300 hover:text-white transition-colors text-sm lg:text-base">
                Empresas
              </Link>
              <Link href="/academic" className="text-slate-300 hover:text-white transition-colors text-sm lg:text-base">
                Universidades
              </Link>
              <Link href="/sponsors" className="text-slate-300 hover:text-white transition-colors text-sm lg:text-base">
                Sponsors
              </Link>
              <Link
                href="/login"
                className="text-slate-300 hover:text-white transition-colors text-sm lg:text-base"
              >
                Ingresar
              </Link>
              <Link
                href="/signup"
                className="btn-glass px-4 lg:px-6 py-2 rounded-lg text-white font-semibold text-sm lg:text-base whitespace-nowrap"
              >
                Comenzar Gratis
              </Link>
            </nav>
            {/* Mobile CTA */}
            <Link
              href="/signup"
              className="md:hidden btn-glass px-4 py-2 rounded-lg text-white font-semibold text-sm whitespace-nowrap"
            >
              Comenzar
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-12 sm:py-16 md:py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/20 to-transparent" />
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-5xl mx-auto text-center animate-slide-up">
            <div className="inline-flex items-center gap-2 glass-panel px-3 sm:px-4 py-1.5 sm:py-2 rounded-full mb-6 sm:mb-8">
              <Flag size={14} className="text-red-400 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm text-slate-300">Diseñado para Ingeniería Chilena</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 sm:mb-8 leading-tight px-4">
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Diseña Más Rápido.
              </span>
              <br />
              <span className="text-white">Cumple la Normativa.</span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-slate-300 mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed px-4">
              La primera plataforma integral de diseño ingenieril que integra{' '}
              <span className="text-blue-400 font-semibold">estructural, pavimentos, vial, hidráulica</span> y{' '}
              <span className="text-amber-400 font-semibold">análisis de terreno con IA</span> en un solo lugar.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center mb-8 sm:mb-12 px-4">
              <Link
                href="/signup"
                className="group glass-card interactive-card px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 border-none hover:from-blue-500 hover:to-purple-500"
              >
                Comenzar Gratis
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform sm:w-5 sm:h-5" />
              </Link>
              <Link
                href="#demo"
                className="glass-card px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg hover:bg-slate-800/60 transition-colors text-center"
              >
                Ver Demo
              </Link>
            </div>

            <p className="text-xs sm:text-sm text-slate-400 px-4">
              ✓ 7 días gratis &nbsp;•&nbsp; ✓ 50% OFF primeros 3 meses &nbsp;•&nbsp; ✓ Sin tarjeta de crédito
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 sm:py-16 bg-gradient-to-b from-slate-900/50 to-transparent">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 max-w-5xl mx-auto">
            {stats.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="text-center animate-fade-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="icon-wrapper w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 rounded-full bg-blue-500/10 text-blue-400">
                    <IconComponent size={20} strokeWidth={2} className="sm:w-6 sm:h-6" />
                  </div>
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1 sm:mb-2">{stat.value}</div>
                  <div className="text-xs sm:text-sm text-slate-400">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-12 sm:py-16 md:py-20" id="features">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10 sm:mb-12 md:mb-16">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent px-4">
                ¿Por Qué Elegir LeDesign?
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-2xl mx-auto px-4">
                Diseñado específicamente para las necesidades de los ingenieros chilenos
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-12 sm:mb-16 md:mb-20">
              {benefits.map((benefit, index) => {
                const IconComponent = benefit.icon;
                return (
                  <div
                    key={benefit.title}
                    className="glass-card rounded-xl sm:rounded-2xl p-6 sm:p-8 animate-scale-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className={`icon-wrapper w-12 h-12 sm:w-16 sm:h-16 mb-4 sm:mb-6 rounded-lg sm:rounded-xl bg-slate-800/50 ${benefit.color}`}>
                      <IconComponent size={24} strokeWidth={2} className="sm:w-8 sm:h-8" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4 text-white">{benefit.title}</h3>
                    <p className="text-sm sm:text-base text-slate-300 leading-relaxed">{benefit.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-b from-slate-900/50 to-transparent">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10 sm:mb-12 md:mb-16">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 text-white px-4">
                5 Módulos de Ingeniería Integrados
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-2xl mx-auto px-4">
                Todo lo que necesitas para diseñar proyectos de ingeniería civil completos
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {modules.map((module, index) => {
                const IconComponent = module.icon;
                return (
                  <Link
                    key={module.href}
                    href={module.href}
                    className="glass-card interactive-card rounded-xl p-5 sm:p-6 group animate-scale-in hover:border-blue-500/30"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className={`icon-wrapper w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-slate-800/50 mb-3 sm:mb-4 ${module.color}`}>
                      <IconComponent size={24} strokeWidth={2} className="sm:w-7 sm:h-7" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3 group-hover:text-blue-400 transition-colors">
                      {module.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-3 sm:mb-4">{module.description}</p>
                    <ul className="space-y-1.5 sm:space-y-2">
                      {module.benefits.map((benefit) => (
                        <li key={benefit} className="flex items-start gap-2 text-xs text-slate-400">
                          <Check size={14} className="text-green-400 mt-0.5 flex-shrink-0" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 sm:mt-4 flex items-center gap-2 text-xs sm:text-sm text-blue-400 font-medium group-hover:gap-3 transition-all">
                      Explorar módulo
                      <ChevronRight size={14} className="sm:w-4 sm:h-4" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-12 sm:py-16 md:py-20" id="pricing">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10 sm:mb-12 md:mb-16">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent px-4">
                Planes Para Cada Necesidad
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-2xl mx-auto px-4">
                Desde ingenieros individuales hasta grandes empresas de consultoría
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              {pricingTiers.map((tier, index) => {
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
                    {tier.badge && (
                      <div className="absolute -top-3 sm:-top-4 left-1/2 -translate-x-1/2 glass-card px-3 sm:px-4 py-1 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 border-none">
                        <span className="text-xs font-semibold text-white">{tier.badge}</span>
                      </div>
                    )}

                    <div className="mb-5 sm:mb-6">
                      <div className={`icon-wrapper w-10 h-10 sm:w-12 sm:h-12 mb-3 sm:mb-4 rounded-lg sm:rounded-xl bg-slate-800/50 ${tier.highlighted ? 'text-blue-400' : 'text-slate-400'}`}>
                        <IconComponent size={20} strokeWidth={2} className="sm:w-6 sm:h-6" />
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">{tier.name}</h3>

                      {tier.promoText && (
                        <div className="mb-2">
                          <span className="text-xs font-semibold text-green-400 bg-green-400/10 px-2 py-1 rounded">
                            {tier.promoText}
                          </span>
                        </div>
                      )}

                      <div className="flex items-baseline gap-2 mb-2 sm:mb-3">
                        <span className="text-3xl sm:text-4xl font-bold text-white">{tier.price}</span>
                        {tier.period && <span className="text-sm sm:text-base text-slate-400">{tier.period}</span>}
                      </div>

                      {tier.originalPrice && (
                        <div className="mb-2">
                          <span className="text-sm text-slate-500 line-through">Precio regular: {tier.originalPrice}/mes</span>
                        </div>
                      )}

                      <p className="text-xs sm:text-sm text-slate-400">{tier.description}</p>
                    </div>

                    <ul className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 sm:gap-3">
                          <Check size={16} className="text-green-400 mt-0.5 flex-shrink-0 sm:w-[18px] sm:h-[18px]" />
                          <span className="text-xs sm:text-sm text-slate-300">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Link
                      href={tier.ctaLink}
                      className={`block w-full text-center py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold transition-all ${
                        tier.highlighted
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500'
                          : 'glass-card hover:bg-slate-800/60'
                      }`}
                    >
                      {tier.cta}
                    </Link>
                  </div>
                );
              })}
            </div>

            <p className="text-center text-xs sm:text-sm text-slate-400 mt-6 sm:mt-8 px-4">
              7 días de prueba gratis • Todos los planes incluyen actualizaciones de normativa y soporte en español
            </p>
          </div>
        </div>
      </section>

      {/* Competitive Comparison Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-b from-slate-900/50 to-transparent">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10 sm:mb-12 md:mb-16">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent px-4">
                95% Más Económico que la Competencia
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-3xl mx-auto px-4">
                Compara LeDesign con el stack tradicional de software de ingeniería
              </p>
            </div>

            {/* Price Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-8 sm:mb-12">
              {/* Traditional Stack */}
              <div className="glass-card rounded-xl sm:rounded-2xl p-6 sm:p-8 border-2 border-red-500/30">
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="icon-wrapper w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-red-500/10 text-red-400">
                    <X size={24} strokeWidth={2} className="sm:w-7 sm:h-7" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white">Stack Tradicional</h3>
                </div>
                <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                    <span className="text-sm sm:text-base text-slate-300">Civil 3D (diseño vial)</span>
                    <span className="text-sm sm:text-base font-semibold text-red-400">$2,430-3,660/año</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                    <span className="text-sm sm:text-base text-slate-300">ETABS (estructural)</span>
                    <span className="text-sm sm:text-base font-semibold text-red-400">$6,465/año</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                    <span className="text-sm sm:text-base text-slate-300">RAM Elements</span>
                    <span className="text-sm sm:text-base font-semibold text-red-400">$3,902/año</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                    <span className="text-sm sm:text-base text-slate-300">WaterCAD (hidráulica)</span>
                    <span className="text-sm sm:text-base font-semibold text-red-400">$2,926-8,785/año</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                    <span className="text-sm sm:text-base text-slate-300">OpenRoads Designer</span>
                    <span className="text-sm sm:text-base font-semibold text-red-400">$6,057-15,142/año</span>
                  </div>
                </div>
                <div className="bg-red-950/30 rounded-lg p-4 sm:p-6 border border-red-500/20">
                  <div className="text-xs sm:text-sm text-slate-400 mb-2">Costo total anual</div>
                  <div className="text-3xl sm:text-4xl font-bold text-red-400">$24,679 - $46,353</div>
                  <div className="text-xs text-slate-500 mt-2">+ Workstation potente requerida ($2,000+)</div>
                </div>
              </div>

              {/* LeDesign */}
              <div className="glass-card rounded-xl sm:rounded-2xl p-6 sm:p-8 border-2 border-green-500/50 shadow-2xl shadow-green-500/20">
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="icon-wrapper w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-green-500/10 text-green-400">
                    <Check size={24} strokeWidth={2} className="sm:w-7 sm:h-7" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white">LeDesign Completo</h3>
                </div>
                <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                    <span className="text-sm sm:text-base text-slate-300">Diseño vial + pavimentos</span>
                    <span className="text-sm sm:text-base font-semibold text-green-400">✓ Incluido</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                    <span className="text-sm sm:text-base text-slate-300">Análisis estructural FEA</span>
                    <span className="text-sm sm:text-base font-semibold text-green-400">✓ Incluido</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                    <span className="text-sm sm:text-base text-slate-300">Diseño sísmico NCh433</span>
                    <span className="text-sm sm:text-base font-semibold text-green-400">✓ Incluido</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                    <span className="text-sm sm:text-base text-slate-300">Redes hidráulicas NCh691</span>
                    <span className="text-sm sm:text-base font-semibold text-green-400">✓ Incluido</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                    <span className="text-sm sm:text-base text-slate-300">Análisis terreno con IA</span>
                    <span className="text-sm sm:text-base font-semibold text-cyan-400">✓ Incluido + IA</span>
                  </div>
                </div>
                <div className="bg-green-950/30 rounded-lg p-4 sm:p-6 border border-green-500/20">
                  <div className="text-xs sm:text-sm text-slate-400 mb-2">Costo total anual</div>
                  <div className="text-3xl sm:text-4xl font-bold text-green-400">$1,200</div>
                  <div className="text-xs text-green-400 mt-2 font-semibold">✓ 100% basado en la nube (cualquier laptop)</div>
                </div>
                <div className="mt-6 p-4 bg-gradient-to-r from-green-500/10 to-cyan-500/10 rounded-lg border border-green-500/20">
                  <div className="text-2xl sm:text-3xl font-bold text-green-400 text-center">
                    Ahorra 95-97%
                  </div>
                  <div className="text-xs sm:text-sm text-center text-slate-300 mt-2">
                    $23,479 - $45,153 ahorrados por año
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Comparison Table */}
            <div className="glass-card rounded-xl sm:rounded-2xl p-6 sm:p-8 mb-8 sm:mb-12">
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-6 sm:mb-8 text-center">
                Comparación de Características
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="pb-3 sm:pb-4 text-sm sm:text-base text-slate-300 font-semibold">Característica</th>
                      <th className="pb-3 sm:pb-4 text-sm sm:text-base text-center text-green-400 font-semibold">LeDesign</th>
                      <th className="pb-3 sm:pb-4 text-sm sm:text-base text-center text-slate-400 font-semibold">Tradicional</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm sm:text-base">
                    <tr className="border-b border-slate-800">
                      <td className="py-3 sm:py-4 text-slate-300">Normativa chilena integrada</td>
                      <td className="py-3 sm:py-4 text-center">
                        <Check size={20} className="mx-auto text-green-400" />
                      </td>
                      <td className="py-3 sm:py-4 text-center text-slate-500">Manual</td>
                    </tr>
                    <tr className="border-b border-slate-800">
                      <td className="py-3 sm:py-4 text-slate-300">Todos los módulos integrados</td>
                      <td className="py-3 sm:py-4 text-center">
                        <Check size={20} className="mx-auto text-green-400" />
                      </td>
                      <td className="py-3 sm:py-4 text-center">
                        <X size={20} className="mx-auto text-red-400" />
                      </td>
                    </tr>
                    <tr className="border-b border-slate-800">
                      <td className="py-3 sm:py-4 text-slate-300">Colaboración en tiempo real</td>
                      <td className="py-3 sm:py-4 text-center">
                        <Check size={20} className="mx-auto text-green-400" />
                      </td>
                      <td className="py-3 sm:py-4 text-center text-slate-500">Limitado</td>
                    </tr>
                    <tr className="border-b border-slate-800">
                      <td className="py-3 sm:py-4 text-slate-300">Análisis con IA (Gemini)</td>
                      <td className="py-3 sm:py-4 text-center">
                        <Check size={20} className="mx-auto text-cyan-400" />
                      </td>
                      <td className="py-3 sm:py-4 text-center">
                        <X size={20} className="mx-auto text-red-400" />
                      </td>
                    </tr>
                    <tr className="border-b border-slate-800">
                      <td className="py-3 sm:py-4 text-slate-300">Basado en la nube</td>
                      <td className="py-3 sm:py-4 text-center">
                        <Check size={20} className="mx-auto text-green-400" />
                      </td>
                      <td className="py-3 sm:py-4 text-center text-slate-500">Parcial</td>
                    </tr>
                    <tr className="border-b border-slate-800">
                      <td className="py-3 sm:py-4 text-slate-300">Actualizaciones automáticas</td>
                      <td className="py-3 sm:py-4 text-center">
                        <Check size={20} className="mx-auto text-green-400" />
                      </td>
                      <td className="py-3 sm:py-4 text-center text-slate-500">Manual</td>
                    </tr>
                    <tr>
                      <td className="py-3 sm:py-4 text-slate-300">Soporte en español 24/7</td>
                      <td className="py-3 sm:py-4 text-center">
                        <Check size={20} className="mx-auto text-green-400" />
                      </td>
                      <td className="py-3 sm:py-4 text-center text-slate-500">Limitado</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Additional Pricing Options CTA */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              <Link
                href="/enterprise"
                className="glass-card interactive-card rounded-xl p-6 sm:p-8 group hover:border-blue-500/30"
              >
                <div className="icon-wrapper w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-blue-500/10 text-blue-400 mb-4">
                  <DollarSign size={24} strokeWidth={2} className="sm:w-7 sm:h-7" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                  Empresas & Gobierno
                </h3>
                <p className="text-sm sm:text-base text-slate-400 mb-4">
                  Desde $60/usuario con descuentos por volumen
                </p>
                <div className="flex items-center gap-2 text-sm font-medium text-blue-400 group-hover:gap-3 transition-all">
                  Ver precios empresariales
                  <ChevronRight size={16} />
                </div>
              </Link>

              <Link
                href="/academic"
                className="glass-card interactive-card rounded-xl p-6 sm:p-8 group hover:border-purple-500/30"
              >
                <div className="icon-wrapper w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-purple-500/10 text-purple-400 mb-4">
                  <GraduationCap size={24} strokeWidth={2} className="sm:w-7 sm:h-7" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">
                  Universidades
                </h3>
                <p className="text-sm sm:text-base text-slate-400 mb-4">
                  Estudiantes GRATIS • Departamentos desde $500/año
                </p>
                <div className="flex items-center gap-2 text-sm font-medium text-purple-400 group-hover:gap-3 transition-all">
                  Ver programas académicos
                  <ChevronRight size={16} />
                </div>
              </Link>

              <Link
                href="/sponsors"
                className="glass-card interactive-card rounded-xl p-6 sm:p-8 group hover:border-cyan-500/30"
              >
                <div className="icon-wrapper w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-cyan-500/10 text-cyan-400 mb-4">
                  <Rocket size={24} strokeWidth={2} className="sm:w-7 sm:h-7" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">
                  Conviértete en Sponsor
                </h3>
                <p className="text-sm sm:text-base text-slate-400 mb-4">
                  Licencias de por vida + ROI 967% comprobado
                </p>
                <div className="flex items-center gap-2 text-sm font-medium text-cyan-400 group-hover:gap-3 transition-all">
                  Ver oportunidades de sponsorship
                  <ChevronRight size={16} />
                </div>
              </Link>
            </div>

            <div className="mt-8 sm:mt-12 text-center">
              <p className="text-xs sm:text-sm text-slate-400 mb-4">
                Fuentes: TrustRadius, G2, sitios oficiales de proveedores (2026)
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg bg-gradient-to-r from-green-600 to-cyan-600 text-white hover:from-green-500 hover:to-cyan-500 transition-all"
              >
                Comenzar a Ahorrar Ahora
                <ArrowRight size={18} className="sm:w-5 sm:h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-b from-slate-900/50 to-transparent">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10 sm:mb-12 md:mb-16">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 text-white px-4">
                Confían en LeDesign
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-2xl mx-auto px-4">
                Más de 2,500 ingenieros ya están diseñando más rápido
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {testimonials.map((testimonial, index) => (
                <div
                  key={testimonial.name}
                  className="glass-card rounded-xl p-5 sm:p-6 animate-scale-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex gap-1 mb-3 sm:mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <span key={i} className="text-yellow-400 text-sm sm:text-base">
                        ★
                      </span>
                    ))}
                  </div>
                  <p className="text-sm sm:text-base text-slate-300 leading-relaxed mb-4 sm:mb-6 italic">
                    "{testimonial.content}"
                  </p>
                  <div className="border-t border-slate-700 pt-3 sm:pt-4">
                    <div className="text-sm sm:text-base font-semibold text-white">{testimonial.name}</div>
                    <div className="text-xs sm:text-sm text-slate-400">{testimonial.role}</div>
                    <div className="text-xs text-slate-500">{testimonial.company}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 sm:py-16 md:py-20" id="faq">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10 sm:mb-12 md:mb-16">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 text-white px-4">
                Preguntas Frecuentes
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-slate-300 px-4">
                Todo lo que necesitas saber sobre LeDesign
              </p>
            </div>

            <div className="space-y-3 sm:space-y-4">
              {faqs.map((faq, index) => (
                <div
                  key={faq.question}
                  className="glass-card rounded-lg sm:rounded-xl p-5 sm:p-6 animate-fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-2 sm:mb-3">{faq.question}</h3>
                  <p className="text-sm sm:text-base text-slate-300 leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-b from-blue-950/20 to-transparent">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center glass-card rounded-xl sm:rounded-2xl p-8 sm:p-10 md:p-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 text-white px-4">
              ¿Listo Para Diseñar Más Rápido?
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-slate-300 mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
              Únete a más de 2,500 ingenieros que ya están ahorrando 40% de su tiempo con LeDesign
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center">
              <Link
                href="/signup"
                className="group glass-card interactive-card px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 border-none hover:from-blue-500 hover:to-purple-500"
              >
                Comenzar Gratis Ahora
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform sm:w-5 sm:h-5" />
              </Link>
              <Link
                href="/contact-sales"
                className="glass-card px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg hover:bg-slate-800/60 transition-colors text-center"
              >
                Hablar con Ventas
              </Link>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-4 sm:mt-6 px-4">
              Sin compromiso. Cancela cuando quieras.
            </p>
          </div>
        </div>
      </section>

      {/* Footer with glassmorphism */}
      <footer className="glass-header mt-auto border-t border-slate-800">
        <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-10 md:py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6 sm:gap-8 mb-6 sm:mb-8">
            <div>
              <Image
                src="/logo-dark.svg"
                alt="LeDesign"
                width={140}
                height={35}
                className="mb-3 sm:mb-4 w-[140px] sm:w-[160px]"
              />
              <p className="text-xs sm:text-sm text-slate-400">
                Plataforma integral de diseño ingenieril para profesionales chilenos.
              </p>
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-semibold text-white mb-3 sm:mb-4">Producto</h4>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                <li>
                  <Link href="#features" className="text-slate-400 hover:text-white transition-colors">
                    Características
                  </Link>
                </li>
                <li>
                  <Link href="#pricing" className="text-slate-400 hover:text-white transition-colors">
                    Precios
                  </Link>
                </li>
                <li>
                  <Link href="/docs" className="text-slate-400 hover:text-white transition-colors">
                    Documentación
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-semibold text-white mb-3 sm:mb-4">Soluciones</h4>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                <li>
                  <Link href="/enterprise" className="text-slate-400 hover:text-white transition-colors">
                    Empresas
                  </Link>
                </li>
                <li>
                  <Link href="/academic" className="text-slate-400 hover:text-white transition-colors">
                    Universidades
                  </Link>
                </li>
                <li>
                  <Link href="/sponsors" className="text-slate-400 hover:text-white transition-colors">
                    Sponsors
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-semibold text-white mb-3 sm:mb-4">Empresa</h4>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                <li>
                  <Link href="/about" className="text-slate-400 hover:text-white transition-colors">
                    Sobre Nosotros
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="text-slate-400 hover:text-white transition-colors">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-slate-400 hover:text-white transition-colors">
                    Contacto
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-semibold text-white mb-3 sm:mb-4">Legal</h4>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                <li>
                  <Link href="/privacy" className="text-slate-400 hover:text-white transition-colors">
                    Privacidad
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-slate-400 hover:text-white transition-colors">
                    Términos
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-6 sm:pt-8 text-center text-xs sm:text-sm text-slate-400">
            © 2026 LeDesign. Plataforma de Ingeniería Chilena. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
