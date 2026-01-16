import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, GraduationCap, BookOpen, Users, Award, Check, Sparkles, Target, TrendingUp } from 'lucide-react';

export default function AcademicPage() {
  const academicTiers = [
    {
      name: 'Student',
      price: 'GRATIS',
      period: '2 años',
      description: 'Para estudiantes de ingeniería civil',
      icon: GraduationCap,
      color: 'text-green-400',
      gradient: 'from-green-600 to-emerald-600',
      features: [
        'Acceso a todos los 5 módulos',
        '10 GB de almacenamiento',
        'Proyectos ilimitados',
        'Exportaciones con marca de agua',
        'Acceso a tutoriales y documentación',
        'Comunidad estudiantil',
        'Válido por 2 años',
        'Renovable con verificación',
      ],
      cta: 'Registrarse Gratis',
      requirements: 'Requiere email institucional válido (.cl)',
    },
    {
      name: 'Classroom',
      price: '$500',
      period: '/año',
      description: 'Para cursos y asignaturas (hasta 50 estudiantes)',
      icon: BookOpen,
      color: 'text-blue-400',
      gradient: 'from-blue-600 to-cyan-600',
      features: [
        'Todo en Student +',
        'Hasta 50 licencias de estudiante',
        '100 GB compartido',
        'Exportaciones sin marca de agua',
        'Dashboard del profesor',
        'Gestión de asignaciones',
        'Seguimiento de progreso',
        'Soporte prioritario para profesor',
      ],
      cta: 'Solicitar Licencia',
      requirements: 'Para profesores con curso activo',
      highlighted: true,
    },
    {
      name: 'Department',
      price: '$2,000',
      period: '/año',
      description: 'Para departamentos universitarios (hasta 200 estudiantes + 20 académicos)',
      icon: Users,
      color: 'text-purple-400',
      gradient: 'from-purple-600 to-pink-600',
      features: [
        'Todo en Classroom +',
        'Hasta 200 licencias de estudiante',
        'Hasta 20 licencias de académicos',
        '500 GB compartido',
        'Capacitación para profesores (4 horas)',
        'Materiales pedagógicos co-diseñados',
        'Integración con LMS (Moodle, Canvas)',
        'Co-branding en materiales',
        'Acceso a investigación con LeDesign',
      ],
      cta: 'Contactar Partnerships',
      requirements: 'Para departamentos de Ing. Civil',
    },
    {
      name: 'Research',
      price: 'GRATIS',
      period: '3 años',
      description: 'Para investigación académica',
      icon: Award,
      color: 'text-amber-400',
      gradient: 'from-amber-600 to-orange-600',
      features: [
        'Licencia Completo de por vida',
        '50 GB de almacenamiento',
        'Exportaciones sin restricciones',
        'Soporte técnico prioritario',
        'Co-branding en publicaciones',
        'Datos de validación compartidos',
        'Colaboración en casos de uso',
        'Presentación en conferencias',
      ],
      cta: 'Aplicar Research License',
      requirements: 'Profesores/investigadores con proyectos activos',
    },
  ];

  const universities = [
    {
      name: 'Universidad de Chile',
      logo: '🏛️',
      department: 'Depto. Ingeniería Civil',
    },
    {
      name: 'Pontificia Universidad Católica',
      logo: '⛪',
      department: 'Escuela de Ingeniería',
    },
    {
      name: 'Universidad Técnica Federico Santa María',
      logo: '🔧',
      department: 'Depto. Obras Civiles',
    },
    {
      name: 'Universidad de Concepción',
      logo: '🌳',
      department: 'Facultad de Ingeniería',
    },
  ];

  const benefits = [
    {
      icon: Target,
      title: 'Formar la Próxima Generación',
      description: 'Estudiantes que se gradúan dominando herramientas modernas tienen ventaja competitiva inmediata en el mercado laboral.',
    },
    {
      icon: Sparkles,
      title: 'Tecnología de Vanguardia',
      description: 'Enseña con la primera plataforma que integra IA, diseño multi-disciplinario y normativa chilena en una sola herramienta.',
    },
    {
      icon: TrendingUp,
      title: 'Investigación Validada',
      description: 'Colabora con LeDesign para validar implementaciones de NCh433, NCh430, NCh691 en proyectos reales.',
    },
    {
      icon: Users,
      title: 'Comunidad Académica',
      description: 'Acceso a red de profesores, materiales pedagógicos compartidos y casos de estudio de otras universidades.',
    },
  ];

  const partnershipBenefits = [
    'Co-diseño de cursos: "Diseño Vial con LeDesign", "Análisis Sísmico NCh433"',
    'Materiales pedagógicos: Tutoriales, ejercicios, proyectos de ejemplo',
    'Competencias estudiantiles: Premio al mejor proyecto anual',
    'Workshops gratuitos para profesores (4-8 horas/año)',
    'Research collaboration: Validación de normativa chilena',
    'Job board: Conectar estudiantes con empresas que usan LeDesign',
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
              <GraduationCap size={14} className="text-green-400 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm text-slate-300">Programa Académico</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 sm:mb-8 leading-tight px-4">
              <span className="bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                LeDesign para Educación
              </span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-slate-300 mb-8 sm:mb-12 max-w-2xl mx-auto leading-relaxed px-4">
              Forma ingenieros civiles con las herramientas que usarán en su carrera profesional.
              Gratis para estudiantes, accesible para universidades.
            </p>

            <div className="glass-card rounded-xl p-4 sm:p-6 max-w-2xl mx-auto">
              <p className="text-sm sm:text-base text-green-400 font-semibold mb-2">
                🎓 Más de 5,000 estudiantes pueden aprender con LeDesign en tu universidad
              </p>
              <p className="text-xs sm:text-sm text-slate-400">
                Por solo $2,000/año → $10/estudiante/año (vs $24,679/año herramientas tradicionales)
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Academic Tiers */}
      <section className="py-12 sm:py-16 md:py-20">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10 sm:mb-12">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 text-white px-4">
                Planes Académicos
              </h2>
              <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto px-4">
                Desde estudiantes individuales hasta departamentos completos
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              {academicTiers.map((tier, index) => {
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
                        <span className="text-xs font-semibold text-white">Más Usado</span>
                      </div>
                    )}

                    <div className="mb-5 sm:mb-6">
                      <div className={`icon-wrapper w-12 h-12 sm:w-14 sm:h-14 mb-3 sm:mb-4 rounded-xl bg-slate-800/50 ${tier.color}`}>
                        <IconComponent size={24} strokeWidth={2} className="sm:w-7 sm:h-7" />
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">{tier.name}</h3>

                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-3xl sm:text-4xl font-bold text-white">{tier.price}</span>
                        <span className="text-sm sm:text-base text-slate-400">{tier.period}</span>
                      </div>

                      <p className="text-sm text-slate-300 mb-3">{tier.description}</p>
                      <p className="text-xs text-slate-400 italic">{tier.requirements}</p>
                    </div>

                    <ul className="space-y-2.5 sm:space-y-3 mb-6 sm:mb-8">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 sm:gap-3">
                          <Check size={16} className={`${tier.color} mt-0.5 flex-shrink-0 sm:w-[18px] sm:h-[18px]`} />
                          <span className="text-xs sm:text-sm text-slate-300">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Link
                      href={tier.price === 'GRATIS' ? '/signup?plan=academic-student' : '/contact?type=academic'}
                      className={`block w-full text-center py-3 sm:py-4 rounded-xl text-base sm:text-lg font-semibold transition-all ${
                        tier.highlighted
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500'
                          : `bg-gradient-to-r ${tier.gradient} text-white hover:opacity-90`
                      }`}
                    >
                      {tier.cta}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Partner Universities */}
      <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-b from-slate-900/50 to-transparent">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10 sm:mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white px-4">
                Buscamos Universidades Partner
              </h2>
              <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto px-4">
                Únete a las primeras universidades chilenas en adoptar LeDesign
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {universities.map((uni, index) => (
                <div
                  key={uni.name}
                  className="glass-card rounded-xl p-6 text-center animate-scale-in hover:border-blue-500/30 transition-colors"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="text-5xl mb-4">{uni.logo}</div>
                  <h3 className="text-lg font-semibold text-white mb-2">{uni.name}</h3>
                  <p className="text-sm text-slate-400">{uni.department}</p>
                  <div className="mt-4 text-amber-400 text-sm font-semibold">
                    Partner Potencial
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <Link
                href="/contact?type=university"
                className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500 transition-all"
              >
                <GraduationCap size={20} />
                Convertirse en Universidad Partner
              </Link>
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
                ¿Por Qué Universidades Eligen LeDesign?
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
                    <div className="icon-wrapper w-12 h-12 sm:w-14 sm:h-14 mb-4 rounded-xl bg-green-500/10 text-green-400">
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

      {/* Partnership Benefits */}
      <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-b from-slate-900/50 to-transparent">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <div className="glass-card rounded-2xl p-6 sm:p-8 md:p-10">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 text-white text-center">
                Programa de Partnership Universitario
              </h2>

              <p className="text-base sm:text-lg text-slate-300 mb-6 text-center">
                Trabajamos estrechamente con universidades partner para:
              </p>

              <div className="space-y-4">
                {partnershipBenefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <Check size={20} className="text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm sm:text-base text-slate-300">{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 text-center">
                <Link
                  href="/contact?type=partnership"
                  className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-500 hover:to-emerald-500 transition-all"
                >
                  Solicitar Partnership
                </Link>
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
              ¿Eres Estudiante o Profesor?
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-slate-300 mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
              Comienza a usar LeDesign hoy. Gratis para estudiantes, accesible para cursos.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center">
              <Link
                href="/signup?plan=academic-student"
                className="group glass-card interactive-card px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 border-none hover:from-green-500 hover:to-emerald-500"
              >
                <GraduationCap size={20} />
                Registro Estudiante (Gratis)
              </Link>
              <Link
                href="/contact?type=professor"
                className="glass-card px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg hover:bg-slate-800/60 transition-colors text-center"
              >
                Soy Profesor
              </Link>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-4 sm:mt-6 px-4">
              Requiere email institucional válido (.edu.cl o similar)
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
