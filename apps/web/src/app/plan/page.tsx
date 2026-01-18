'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Users,
  Calendar,
  DollarSign,
  Target,
  Rocket,
  CheckCircle2,
  Clock,
  TrendingUp,
  Shield,
  Heart,
  Building2,
  User,
  Crown,
  Briefcase,
  Code2,
  Handshake,
  ChevronRight,
  AlertCircle,
  BarChart3,
  ExternalLink,
  AlertTriangle,
  Check,
  X,
  Coins,
  Sparkles,
  Zap,
  Gift,
  Key,
  Cpu,
} from 'lucide-react';

export default function PlanPage() {
  const [activeCompetitorTab, setActiveCompetitorTab] = useState<'structural' | 'civil' | 'hydraulic' | 'terrain' | 'total'>('total');
  const [investmentAmount, setInvestmentAmount] = useState(5000);
  const [selectedMRR, setSelectedMRR] = useState<6000 | 12000 | 25000>(12000);

  // Competitor pricing data (researched January 2026)
  const competitorPricing = {
    structural: [
      { name: 'SAP2000/ETABS', vendor: 'CSI', priceRange: '$6,000 - $15,000+', type: 'Perpetual + maintenance', notes: 'No public pricing, varies by tier (Basic/Plus/Ultimate)', source: 'https://www.csiamerica.com/sales' },
      { name: 'STAAD.Pro', vendor: 'Bentley', priceRange: '$3,000 - $5,000/año', type: 'Annual subscription', notes: 'Advanced version adds ~$1,500', source: 'https://www.g2.com/products/staad-pro/pricing' },
      { name: 'RISA-3D', vendor: 'RISA', priceRange: '~$2,070/año', type: 'Annual subscription', notes: '~$172/proyecto para firma con 12 proyectos/año', source: 'https://blog.risa.com/post/how-much-does-risa-3d-really-cost' },
      { name: 'Robot Structural', vendor: 'Autodesk', priceRange: 'Incluido en AEC Collection', type: 'Subscription', notes: '~$3,675/año como parte de la colección', source: 'https://www.autodesk.com/collections/architecture-engineering-construction/overview' },
    ],
    civil: [
      { name: 'Civil 3D', vendor: 'Autodesk', priceRange: '$2,825 - $3,660/año', type: 'Annual subscription', notes: '$305/mes si mensual. 3 años: ~$7,630', source: 'https://www.autodesk.com/products/civil-3d/overview' },
      { name: 'AEC Collection', vendor: 'Autodesk', priceRange: '~$3,675/año', type: 'Annual subscription', notes: 'Incluye Civil 3D, Robot, Revit, InfraWorks, etc.', source: 'https://www.autodesk.com/collections/architecture-engineering-construction/overview' },
      { name: 'OpenRoads Designer', vendor: 'Bentley', priceRange: '$6,057 - $15,142/año', type: '12-month practitioner', notes: 'Reemplaza InRoads, GEOPAK, MX, PowerCivil', source: 'https://en.virtuosity.com/openroads-designer' },
    ],
    hydraulic: [
      { name: 'WaterGEMS/SewerGEMS', vendor: 'Bentley', priceRange: '$5,859 - $14,644/año', type: 'Practitioner license', notes: 'Precio depende del número de tuberías', source: 'https://virtuosity.bentley.com/product/openflows-sewergems-2000-pipes/' },
      { name: 'OpenFlows WorkSuite', vendor: 'Bentley', priceRange: 'Varía por tier', type: 'Subscription', notes: '1,000 / 5,000 / ilimitado tuberías', source: 'https://www.bentley.com/software/openflows-worksuite/' },
      { name: 'EPANET', vendor: 'US EPA', priceRange: 'GRATIS', type: 'Public domain', notes: 'Excelente motor pero UI básica, sin GIS', source: 'https://www.epa.gov/water-research/epanet' },
      { name: 'HEC-RAS', vendor: 'US Army Corps', priceRange: 'GRATIS', type: 'Public domain', notes: 'Estándar para canales abiertos, curva de aprendizaje alta', source: 'https://www.hec.usace.army.mil/software/hec-ras/' },
    ],
    terrain: [
      { name: 'ArcGIS Pro Standard', vendor: 'Esri', priceRange: '~$3,025/usuario/año', type: 'Annual subscription', notes: 'Creator license: ~$760/año', source: 'https://www.esri.com/en-us/arcgis/products/arcgis-pro/buy' },
      { name: 'ArcGIS Pro Advanced', vendor: 'Esri', priceRange: '~$4,150/usuario/año', type: 'Annual subscription', notes: 'Capacidades completas de análisis', source: 'https://www.esri.com/en-us/arcgis/products/arcgis-pro/buy' },
      { name: 'Global Mapper', vendor: 'Blue Marble', priceRange: '~$700 one-time', type: 'Perpetual', notes: 'Pro version costo adicional', source: 'https://www.capterra.com/p/235583/Global-Mapper/pricing/' },
    ],
  };

  const totalCostScenarios = [
    {
      name: 'Mínimo Viable',
      description: 'Herramientas gratuitas + 1 comercial',
      annual: '$3,000 - $5,000',
      tools: 'EPANET + HEC-RAS + Civil 3D básico'
    },
    {
      name: 'Setup Profesional',
      description: 'Civil 3D + SAP2000 + WaterGEMS',
      annual: '$15,000 - $25,000',
      tools: 'Autodesk + CSI + Bentley'
    },
    {
      name: 'Enterprise Completo',
      description: 'Bentley suite + Autodesk suite',
      annual: '$25,000 - $40,000+',
      tools: 'Todas las herramientas comerciales'
    },
  ];

  const ledesignAdvantages = [
    { advantage: 'Normas chilenas integradas', competitor: 'Add-ons costosos o workarounds manuales', icon: Check },
    { advantage: '5 módulos en 1 plataforma', competitor: '5+ suscripciones separadas', icon: Check },
    { advantage: '100% cloud, sin instalación', competitor: 'Mayormente desktop-first', icon: Check },
    { advantage: 'IA para terreno (Gemini)', competitor: 'Sin capacidades AI nativas', icon: Check },
    { advantage: 'Precios transparentes', competitor: '"Contactar ventas" para cotización', icon: Check },
    { advantage: 'Español nativo chileno', competitor: 'Traducciones genéricas', icon: Check },
  ];

  const team = [
    {
      name: 'Benja Ledesma',
      role: 'Founder & CEO',
      location: 'Estados Unidos',
      equity: '70%',
      salary: '$2,000/mes',
      responsibility: 'Desarrollo de producto, visión, arquitectura técnica',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      name: 'Waldo Ledesma',
      role: 'Chief Connections Officer',
      location: 'Biobío, Chile',
      equity: '10%',
      salary: '$1,000/mes (desde marzo)',
      responsibility: 'Ventas, relaciones con SERVIU/MOP/ESSBIO, búsqueda de Socios Fundadores',
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      name: 'Waldo Ledesma V.',
      role: 'CTO',
      location: 'Chile',
      equity: '10%',
      salary: '$1,000/mes (desde marzo)',
      responsibility: 'Desarrollo técnico, documentación, capacitación de usuarios',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
    {
      name: 'Pichi',
      role: 'Engineering Lead',
      location: 'Chile',
      equity: '10%',
      salary: '$1,000/mes (desde marzo)',
      responsibility: 'Validación de producto, bases de datos, perspectiva de usuario',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
  ];

  const timeline = [
    {
      month: 'ENERO',
      date: '16-31 Enero 2026',
      status: 'current',
      goal: 'Encontrar 2 Socios Fundadores',
      revenue: '$10,000',
      tasks: [
        'Waldo busca y negocia con potenciales Socios Fundadores',
        'Benja desarrolla la app a tiempo completo',
        'Cerrar 2 donaciones de $5,000+ cada una',
      ],
      expenses: '$0 (sin salarios aún)',
    },
    {
      month: 'FEBRERO',
      date: '1-28 Febrero 2026',
      status: 'upcoming',
      goal: 'Primeras donaciones individuales y equipos',
      revenue: '$6,000',
      tasks: [
        'Socios empiezan a involucrarse (sin pago)',
        'Buscar donaciones individuales ($250+) y equipos ($1,000+)',
        'Continuar desarrollo de la plataforma',
      ],
      expenses: '$3,000 (Benja $2,000 + servicios $1,000)',
    },
    {
      month: 'MARZO',
      date: '1-31 Marzo 2026',
      status: 'upcoming',
      goal: 'Socios Fundadores tienen acceso temprano',
      revenue: '$5,000',
      tasks: [
        'Primer pago a socios ($1,000 cada uno)',
        'Socios Fundadores prueban la plataforma',
        '3 semanas trabajando juntos, feedback directo',
        'Adaptaciones personalizadas para Socios',
      ],
      expenses: '$6,000 (equipo completo)',
    },
    {
      month: 'ABRIL',
      date: '1-30 Abril 2026',
      status: 'upcoming',
      goal: 'Early Access para donantes',
      revenue: '$5,000',
      tasks: [
        'Donantes individuales y equipos obtienen acceso',
        'Testing masivo antes del lanzamiento',
        'Corrección de bugs, pulido de UI',
      ],
      expenses: '$6,000',
    },
    {
      month: 'MAYO',
      date: '1-31 Mayo 2026',
      status: 'upcoming',
      goal: '🚀 LANZAMIENTO PÚBLICO',
      revenue: '$4,000 + suscripciones',
      tasks: [
        'Lanzamiento oficial al público',
        'Suscripciones mensuales comienzan',
        'Marketing y difusión',
        'Donaciones lifetime terminan o suben de precio',
      ],
      expenses: '$6,000',
    },
    {
      month: 'JUNIO',
      date: '1-30 Junio 2026',
      status: 'upcoming',
      goal: 'Crecimiento de suscripciones',
      revenue: '$3,000 donaciones + MRR creciente',
      tasks: [
        'Últimas donaciones lifetime',
        'Enfoque en conversión a suscripciones',
        'Pipeline de empresas grandes (contactos de Waldo)',
      ],
      expenses: '$6,000',
    },
    {
      month: 'JULIO+',
      date: 'Julio 2026 en adelante',
      status: 'future',
      goal: 'Autosustentable con suscripciones',
      revenue: 'MRR cubre gastos',
      tasks: [
        'Suscripciones cubren salarios',
        'Salarios pueden aumentar según ingresos',
        'Expansión a empresas más grandes',
        'Posible aumento de salarios',
      ],
      expenses: '$6,000+ (puede crecer)',
    },
  ];

  const donationTiers = [
    {
      name: 'Usuario Pionero',
      price: '$250+',
      priceCLP: '~250,000 CLP',
      users: '1 usuario',
      icon: User,
      color: 'text-blue-400',
      gradient: 'from-blue-600 to-cyan-600',
      features: [
        '1 usuario de por vida',
        'Acceso completo a los 3 módulos',
        'Actualizaciones para siempre',
        'Acceso anticipado (abril)',
      ],
      extraUsers: 'N/A',
      target: '50 donaciones',
      totalRevenue: '$12,500',
    },
    {
      name: 'Equipo Pionero',
      price: '$1,000+',
      priceCLP: '~1,000,000 CLP',
      users: '3 usuarios',
      icon: Users,
      color: 'text-purple-400',
      gradient: 'from-purple-600 to-pink-600',
      features: [
        '3 usuarios de por vida',
        'Acceso completo a los 3 módulos',
        'Actualizaciones para siempre',
        'Acceso anticipado (abril)',
        'Usuarios adicionales: $250/usuario',
      ],
      extraUsers: '$250/usuario',
      target: '10 donaciones',
      totalRevenue: '$10,000',
    },
    {
      name: 'Patrocinador Premium',
      price: '$5,000+',
      priceCLP: '~5,000,000 CLP',
      users: '5 usuarios',
      icon: Crown,
      color: 'text-amber-400',
      gradient: 'from-amber-600 to-orange-600',
      highlighted: true,
      features: [
        '5 usuarios de por vida (máximo incluido)',
        'Acceso completo a los 3 módulos',
        'Acceso exclusivo desde marzo',
        'Adaptaciones personalizadas',
        'Soporte prioritario de por vida',
        'Usuarios adicionales: $200/usuario',
      ],
      extraUsers: '$200/usuario',
      target: '2 donaciones',
      totalRevenue: '$10,000',
    },
  ];

  const fundingMath = {
    sources: [
      { name: '2 Patrocinadores Premium', amount: 10000 },
      { name: '50 Usuarios Pionero', amount: 12500 },
      { name: '10 Equipos Pionero', amount: 10000 },
      { name: 'Usuarios extra (potencial)', amount: 3500 },
    ],
    expenses: [
      { month: 'Febrero', amount: 3000, detail: 'Benja $2,000 + servicios $1,000' },
      { month: 'Marzo', amount: 6000, detail: 'Equipo completo' },
      { month: 'Abril', amount: 6000, detail: 'Equipo completo' },
      { month: 'Mayo', amount: 6000, detail: 'Equipo completo' },
      { month: 'Junio', amount: 6000, detail: 'Equipo completo' },
      { month: 'Julio', amount: 6000, detail: 'Equipo completo' },
    ],
  };

  const totalRevenue = fundingMath.sources.reduce((sum, s) => sum + s.amount, 0);
  const totalExpenses = fundingMath.expenses.reduce((sum, e) => sum + e.amount, 0);

  const products = [
    {
      name: 'Diseño Estructural',
      description: 'FEA, NCh433 sísmico, diseño de acero/hormigón',
      price: '$100/mes',
      icon: Building2,
    },
    {
      name: 'Diseño de Pavimentos',
      description: 'AASHTO, CBR, alineamientos, perfiles, terreno',
      price: '$100/mes',
      icon: Briefcase,
    },
    {
      name: 'Diseño Hidráulico',
      description: 'Redes NCh691, alcantarillado, aguas lluvia',
      price: '$100/mes',
      icon: Code2,
    },
  ];

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
              className="text-slate-300 hover:text-white transition-colors text-sm flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Volver al inicio
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-16 pb-12">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 mb-6">
              <Shield size={16} className="text-blue-400" />
              <span className="text-sm font-medium text-slate-300">
                Documento Interno - Co-Fundadores
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-bold mb-6 text-white">
              Plan de{' '}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                LeDesign 2026
              </span>
            </h1>

            <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto">
              <strong>LE</strong>desma + Chi<strong>LE</strong> + <strong>LE</strong> Diseño
              <br />
              <span className="text-slate-400">
                Tres Ledesma construyendo el futuro de la ingeniería chilena
              </span>
            </p>

            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <div className="glass-card px-4 py-2 rounded-lg">
                <span className="text-slate-400">Meta:</span>{' '}
                <span className="text-green-400 font-semibold">$33,000 USD</span>
              </div>
              <div className="glass-card px-4 py-2 rounded-lg">
                <span className="text-slate-400">Lanzamiento:</span>{' '}
                <span className="text-blue-400 font-semibold">Mayo 2026</span>
              </div>
              <div className="glass-card px-4 py-2 rounded-lg">
                <span className="text-slate-400">Autosustentable:</span>{' '}
                <span className="text-purple-400 font-semibold">Julio 2026</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-12 bg-gradient-to-b from-slate-900/50 to-transparent">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <Users size={24} className="text-blue-400" />
              <h2 className="text-2xl font-bold text-white">Equipo Fundador</h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {team.map((member) => (
                <div key={member.name} className="glass-card rounded-xl p-5">
                  <div className={`icon-wrapper w-10 h-10 rounded-lg ${member.bgColor} ${member.color} mb-3`}>
                    <User size={20} />
                  </div>
                  <h3 className="font-bold text-white mb-1">{member.name}</h3>
                  <p className={`text-sm ${member.color} font-medium mb-2`}>{member.role}</p>
                  <p className="text-xs text-slate-400 mb-3">{member.location}</p>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Equity:</span>
                      <span className="text-white font-semibold">{member.equity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Salario:</span>
                      <span className="text-green-400 font-semibold">{member.salary}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-700">
                    <p className="text-xs text-slate-400">{member.responsibility}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 glass-card rounded-xl p-4 border border-blue-500/20">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="text-slate-300">
                    <strong className="text-white">Equity con vesting:</strong> Los socios reciben su equity gradualmente.
                    Waldo (papá): 2 años. Waldo chico y Pichi: 4 años con 1 año de cliff.
                  </p>
                </div>
              </div>
            </div>

            {/* Co-Founder Commitment Fee */}
            <div className="mt-6 glass-card rounded-xl p-6 bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-red-500/10 border border-amber-500/30">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle size={24} className="text-amber-400" />
                <h3 className="text-xl font-bold text-white">Compromiso de Co-Fundador: $1,000</h3>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <X size={18} className="text-red-400" />
                    <h4 className="font-semibold text-red-400">El Riesgo</h4>
                  </div>
                  <p className="text-sm text-slate-300 mb-2">
                    Si <strong className="text-red-400">NO</strong> encontramos 2 Socios Fundadores:
                  </p>
                  <p className="text-2xl font-bold text-red-400">Pierdes $1,000</p>
                  <p className="text-xs text-slate-500 mt-2">
                    Ese es tu máximo downside. Solo $1,000 si el fundraising falla.
                  </p>
                </div>

                <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Check size={18} className="text-green-400" />
                    <h4 className="font-semibold text-green-400">La Recompensa</h4>
                  </div>
                  <p className="text-sm text-slate-300 mb-2">
                    Si <strong className="text-green-400">SÍ</strong> encontramos 2 Socios Fundadores:
                  </p>
                  <p className="text-2xl font-bold text-green-400">Recuperas $1,000</p>
                  <p className="text-xs text-slate-500 mt-2">
                    El dinero vuelve en marzo + 10% equity + $1,000/mes desde marzo.
                  </p>
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-400">$3,000</div>
                    <div className="text-xs text-slate-400">3 co-fundadores × $1,000</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-amber-400">$5,000</div>
                    <div className="text-xs text-slate-400">Meta de enero</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-400">60%</div>
                    <div className="text-xs text-slate-400">Cubierto con ustedes</div>
                  </div>
                </div>
              </div>

              <p className="mt-4 text-sm text-slate-400 text-center">
                Tu $1,000 cuenta hacia la meta de enero. Esto es <strong className="text-amber-400">piel en el juego</strong>, no solo palabras.
              </p>
            </div>

            {/* Bonus Progression Model */}
            <div className="mt-6 glass-card rounded-xl p-6 border border-purple-500/20">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp size={24} className="text-purple-400" />
                <h3 className="text-xl font-bold text-white">Modelo de Progresión de Bonos</h3>
              </div>

              <p className="text-sm text-slate-400 mb-4">
                Los bonos crecen con la empresa. Benja se queda en $2,000 hasta que los co-fundadores lleguen a $2,000. Luego todos crecen juntos al tope de $2,500.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-slate-700">
                      <th className="py-2 px-3 text-slate-400">Etapa</th>
                      <th className="py-2 px-3 text-slate-400">Benja</th>
                      <th className="py-2 px-3 text-slate-400">Co-fundadores</th>
                      <th className="py-2 px-3 text-slate-400">+ Infra</th>
                      <th className="py-2 px-3 text-slate-400">Total/Mes</th>
                      <th className="py-2 px-3 text-slate-400">MRR Requerido</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-800">
                      <td className="py-2 px-3 text-white font-medium">Supervivencia</td>
                      <td className="py-2 px-3 text-blue-400">$2,000</td>
                      <td className="py-2 px-3 text-green-400">$1,000 c/u</td>
                      <td className="py-2 px-3 text-slate-400">$1,000</td>
                      <td className="py-2 px-3 text-white font-bold">$6,000</td>
                      <td className="py-2 px-3 text-amber-400">45 clientes</td>
                    </tr>
                    <tr className="border-b border-slate-800">
                      <td className="py-2 px-3 text-white font-medium">Creciendo</td>
                      <td className="py-2 px-3 text-blue-400">$2,000</td>
                      <td className="py-2 px-3 text-green-400">$2,000 c/u</td>
                      <td className="py-2 px-3 text-slate-400">$1,000</td>
                      <td className="py-2 px-3 text-white font-bold">$9,000</td>
                      <td className="py-2 px-3 text-amber-400">68 clientes</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-white font-medium">Doing Good</td>
                      <td className="py-2 px-3 text-blue-400">$2,500</td>
                      <td className="py-2 px-3 text-green-400">$2,500 c/u</td>
                      <td className="py-2 px-3 text-slate-400">$1,000</td>
                      <td className="py-2 px-3 text-white font-bold">$11,000</td>
                      <td className="py-2 px-3 text-amber-400">83 clientes</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="mt-4 text-xs text-slate-500 text-center">
                Tope de bonus: $2,500/mes. Infraestructura siempre $1,000/mes (Vercel, Turso, APIs).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="py-12">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <Code2 size={24} className="text-purple-400" />
              <h2 className="text-2xl font-bold text-white">Los 3 Módulos</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {products.map((product) => {
                const IconComponent = product.icon;
                return (
                  <div key={product.name} className="glass-card rounded-xl p-6">
                    <IconComponent size={32} className="text-blue-400 mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">{product.name}</h3>
                    <p className="text-sm text-slate-400 mb-4">{product.description}</p>
                    <div className="text-lg font-bold text-green-400">{product.price}</div>
                    <p className="text-xs text-slate-500">después del lanzamiento</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 text-center">
              <p className="text-slate-400">
                <span className="text-white font-semibold">Plan Completo:</span>{' '}
                <span className="text-green-400 font-bold">$200/mes</span> por los 3 módulos
              </p>
              <p className="text-sm text-slate-500 mt-1">
                7 días gratis • 50% descuento primeros 3 meses
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Competitor Analysis Section */}
      <section className="py-12 bg-gradient-to-b from-slate-900/50 to-transparent">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 size={24} className="text-cyan-400" />
              <h2 className="text-2xl font-bold text-white">Análisis de Competencia</h2>
            </div>
            <p className="text-slate-400 mb-8">
              Precios reales de software comercial de ingeniería (investigado Enero 2026)
            </p>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-8">
              {[
                { id: 'total' as const, label: 'Costo Total', icon: DollarSign },
                { id: 'structural' as const, label: 'Estructural', icon: Building2 },
                { id: 'civil' as const, label: 'Vial/Pavimentos', icon: Briefcase },
                { id: 'hydraulic' as const, label: 'Hidráulico', icon: Code2 },
                { id: 'terrain' as const, label: 'Terreno/GIS', icon: Target },
              ].map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveCompetitorTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeCompetitorTab === tab.id
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <IconComponent size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            {activeCompetitorTab === 'total' && (
              <div className="space-y-6">
                {/* Cost Scenarios */}
                <div className="grid md:grid-cols-3 gap-6">
                  {totalCostScenarios.map((scenario, idx) => (
                    <div
                      key={scenario.name}
                      className={`glass-card rounded-xl p-6 ${
                        idx === 1 ? 'border-2 border-red-500/30' : ''
                      }`}
                    >
                      <h3 className="text-lg font-bold text-white mb-2">{scenario.name}</h3>
                      <p className="text-sm text-slate-400 mb-4">{scenario.description}</p>
                      <div className="text-3xl font-bold text-red-400 mb-2">{scenario.annual}</div>
                      <p className="text-xs text-slate-500">/año por ingeniero</p>
                      <div className="mt-4 pt-4 border-t border-slate-700">
                        <p className="text-xs text-slate-500">{scenario.tools}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 5-Engineer Team Cost */}
                <div className="glass-card rounded-xl p-6 border border-amber-500/30">
                  <div className="flex items-start gap-4">
                    <AlertTriangle size={24} className="text-amber-400 flex-shrink-0" />
                    <div>
                      <h3 className="text-lg font-bold text-white mb-2">
                        Para una consultora de 5 ingenieros:
                      </h3>
                      <p className="text-slate-300 mb-4">
                        Setup profesional = <span className="text-red-400 font-bold">$75,000 - $200,000/año</span> en software
                      </p>
                      <p className="text-sm text-slate-400">
                        Con LeDesign: <span className="text-green-400 font-bold">$12,000/año</span> (5 usuarios × $200/mes × 12)
                        = <span className="text-green-400 font-bold">84% de ahorro</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* LeDesign Advantages */}
                <div className="glass-card rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-6">LeDesign vs Competencia</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {ledesignAdvantages.map((item) => (
                      <div key={item.advantage} className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/30">
                        <Check size={20} className="text-green-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-white text-sm font-medium">{item.advantage}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                            <X size={12} className="text-red-400" />
                            Competencia: {item.competitor}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Value Proposition */}
                <div className="glass-card rounded-xl p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
                  <h3 className="text-lg font-bold text-white mb-4">Propuesta de Valor Honesta</h3>
                  <div className="text-slate-300 space-y-2">
                    <p>
                      <span className="text-slate-400">El software comercial equivalente cuesta:</span>
                    </p>
                    <ul className="space-y-1 ml-4 text-sm">
                      <li>• Análisis estructural (SAP2000): <span className="text-red-400">$6,000+/año</span></li>
                      <li>• Diseño hidráulico (WaterGEMS): <span className="text-red-400">$8,000+/año</span></li>
                      <li>• Diseño vial (Civil 3D): <span className="text-red-400">$3,000+/año</span></li>
                      <li>• Total: <span className="text-red-400 font-bold">$17,000+/año</span> por ingeniero</li>
                    </ul>
                    <p className="pt-4 text-lg">
                      LeDesign: <span className="text-green-400 font-bold">$2,000/año</span> - Todo integrado, 100% normas chilenas
                    </p>
                  </div>
                </div>

                {/* Why Now Section */}
                <div className="mt-8 glass-card rounded-xl p-8 bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-cyan-500/10 border border-purple-500/20">
                  <div className="flex items-center gap-3 mb-6">
                    <Rocket size={28} className="text-purple-400" />
                    <h3 className="text-2xl font-bold text-white">¿Por Qué Ahora? La Convergencia 2022-2026</h3>
                  </div>

                  <div className="space-y-6 text-slate-300">
                    <p className="text-lg leading-relaxed">
                      <strong className="text-white">Construir LeDesign hace 5 años habría costado $5-15 millones.</strong> Autodesk gasta $1.5 mil millones anuales en I+D con 6,700 ingenieros. Bentley reinvierte 20% de sus ingresos en desarrollo.
                    </p>

                    <p className="leading-relaxed">
                      En 2026, un fundador técnico con experiencia en ingeniería puede construir lo que antes requería edificios llenos de servidores, equipos de IT, y años de desarrollo. No es porque "ChatGPT escribe código" — es porque <strong className="text-white">cinco cosas convergieron entre 2022-2026</strong> que nunca habían existido juntas:
                    </p>

                    {/* The 5 Convergences */}
                    <div className="grid md:grid-cols-2 gap-4 mt-6">
                      {/* 1. Claude Code */}
                      <div className="bg-slate-800/30 rounded-lg p-5 border border-purple-500/20">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold flex-shrink-0">
                            1
                          </div>
                          <div>
                            <h4 className="font-bold text-white mb-1">Agentes Autónomos de Código</h4>
                            <p className="text-xs text-purple-400 mb-2">Claude Code (Feb 2025), Cursor (2023), GitHub Copilot (2021)</p>
                          </div>
                        </div>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-start gap-2">
                            <span className="text-purple-400 flex-shrink-0">→</span>
                            <span><strong className="text-white">1 ingeniero = 4-5 ingenieros</strong> de capacidad (Claude Code)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-purple-400 flex-shrink-0">→</span>
                            <span><strong className="text-white">90% del código</strong> de nuevas funciones de Claude es escrito por IA (CEO Anthropic, Enero 2026)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-purple-400 flex-shrink-0">→</span>
                            <span>Y Combinator W25: <strong className="text-white">25% de startups</strong> tienen 95% de código generado por IA</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-purple-400 flex-shrink-0">→</span>
                            <span className="text-slate-400 italic">Pero esto solo funciona con experiencia técnica real — IA "aplasta el 90% tedioso, no toca el 10% que toma el 90% del tiempo"</span>
                          </li>
                        </ul>
                      </div>

                      {/* 2. Edge Databases */}
                      <div className="bg-slate-800/30 rounded-lg p-5 border border-cyan-500/20">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold flex-shrink-0">
                            2
                          </div>
                          <div>
                            <h4 className="font-bold text-white mb-1">Bases de Datos Edge</h4>
                            <p className="text-xs text-cyan-400 mb-2">Turso (2023), Neon (2022), Supabase (2020)</p>
                          </div>
                        </div>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-start gap-2">
                            <span className="text-cyan-400 flex-shrink-0">→</span>
                            <span>Turso: <strong className="text-white">$4.99/mes</strong> por 26 regiones edge</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-cyan-400 flex-shrink-0">→</span>
                            <span>AWS RDS tradicional: <strong className="text-white">$144/mes</strong> (instancia pequeña)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-cyan-400 flex-shrink-0">→</span>
                            <span><strong className="text-green-400">96% de ahorro</strong> vs infraestructura tradicional</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-cyan-400 flex-shrink-0">→</span>
                            <span className="text-slate-400 italic">Antes: equipos de DBAs, data centers, contratos anuales de $100K-500K</span>
                          </li>
                        </ul>
                      </div>

                      {/* 3. AI API Price War */}
                      <div className="bg-slate-800/30 rounded-lg p-5 border border-blue-500/20">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold flex-shrink-0">
                            3
                          </div>
                          <div>
                            <h4 className="font-bold text-white mb-1">Guerra de Precios de IA</h4>
                            <p className="text-xs text-blue-400 mb-2">Gemini 2.0 Flash, GPT-4o, Claude 3.7 (2023-2025)</p>
                          </div>
                        </div>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-start gap-2">
                            <span className="text-blue-400 flex-shrink-0">→</span>
                            <span><strong className="text-white">99.9% reducción</strong> en costos de inferencia LLM (3 años)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-blue-400 flex-shrink-0">→</span>
                            <span>GPT-4 (Mar 2023): <strong className="text-red-400">$60/M tokens</strong> → GPT-4o Mini (Jul 2024): <strong className="text-green-400">$0.60/M tokens</strong></span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-blue-400 flex-shrink-0">→</span>
                            <span>Gemini 2.0 Flash: <strong className="text-white">$1.25/M tokens</strong> para análisis de terreno con IA</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-blue-400 flex-shrink-0">→</span>
                            <span className="text-slate-400 italic">Análisis de imágenes satelitales que antes costaba $100K+ ahora es $5-50 por proyecto</span>
                          </li>
                        </ul>
                      </div>

                      {/* 4. Zero-DevOps Deployment */}
                      <div className="bg-slate-800/30 rounded-lg p-5 border border-green-500/20">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center font-bold flex-shrink-0">
                            4
                          </div>
                          <div>
                            <h4 className="font-bold text-white mb-1">Deployment Sin DevOps</h4>
                            <p className="text-xs text-green-400 mb-2">Vercel (2020+), Cloudflare Workers (2023), Deno Deploy (2022)</p>
                          </div>
                        </div>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-start gap-2">
                            <span className="text-green-400 flex-shrink-0">→</span>
                            <span>Vercel: <strong className="text-white">$20/mes</strong> por deployment global automático</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-green-400 flex-shrink-0">→</span>
                            <span>Antes: Ingeniero DevOps (<strong className="text-white">$100K+/año</strong>) + semanas de setup</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-green-400 flex-shrink-0">→</span>
                            <span>Deploy en <strong className="text-white">minutos</strong> vs días/semanas</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-green-400 flex-shrink-0">→</span>
                            <span className="text-slate-400 italic">Data centers propios costaban $6-12M solo para construir (2010s)</span>
                          </li>
                        </ul>
                      </div>

                      {/* 5. Open Format Liberation */}
                      <div className="bg-slate-800/30 rounded-lg p-5 border border-amber-500/20 md:col-span-2">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold flex-shrink-0">
                            5
                          </div>
                          <div>
                            <h4 className="font-bold text-white mb-1">Liberación de Formatos Propietarios</h4>
                            <p className="text-xs text-amber-400 mb-2">Open Design Alliance (2010+), LibreDWG (2020+)</p>
                          </div>
                        </div>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-start gap-2">
                            <span className="text-amber-400 flex-shrink-0">→</span>
                            <span>Ex-CEO de Autodesk llamó a Open Design Alliance <strong className="text-white">"el mercader de armas para mis enemigos"</strong></span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-amber-400 flex-shrink-0">→</span>
                            <span>Autodesk demandó en 2006, se resolvió en 2010, ahora Autodesk es miembro platinum de ODA (2020)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-amber-400 flex-shrink-0">→</span>
                            <span>Antes: Licencia RealDWG de Autodesk costaba <strong className="text-white">$50-100K/año</strong></span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-amber-400 flex-shrink-0">→</span>
                            <span>Ahora: Librerías open-source (ODA, LibreDWG) permiten parsing sin vendor lock-in</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-amber-400 flex-shrink-0">→</span>
                            <span className="text-slate-400 italic">¿Qué es un archivo DWG? Datos estructurados. ¿XML? Un texto comprimido. Los gatekeepers construyeron estructuras rígidas y cobraron a todos por acceder sus propios datos</span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    {/* The Bottom Line */}
                    <div className="mt-8 p-6 rounded-lg bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30">
                      <h4 className="text-xl font-bold text-white mb-4">El Resultado</h4>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <p className="text-sm text-slate-400 mb-2">ANTES (2015-2018):</p>
                          <ul className="space-y-1 text-sm text-slate-300">
                            <li>• Equipo de 10-20 ingenieros: <strong className="text-red-400">$3-8M</strong></li>
                            <li>• Data center / hosting: <strong className="text-red-400">$100-500K/año</strong></li>
                            <li>• DBA / IT ops: <strong className="text-red-400">$150-300K/año</strong></li>
                            <li>• Licencias RealDWG: <strong className="text-red-400">$50-100K/año</strong></li>
                            <li>• <strong className="text-red-400">Total: $5-15 millones</strong> (3 años)</li>
                          </ul>
                        </div>
                        <div>
                          <p className="text-sm text-slate-400 mb-2">AHORA (2025-2026):</p>
                          <ul className="space-y-1 text-sm text-slate-300">
                            <li>• Fundador técnico + Claude Code: <strong className="text-green-400">$50-200K</strong></li>
                            <li>• Vercel Pro hosting: <strong className="text-green-400">$240/año</strong></li>
                            <li>• Turso database: <strong className="text-green-400">$60-350/año</strong></li>
                            <li>• Gemini API (terreno): <strong className="text-green-400">~$100-500/mes</strong></li>
                            <li>• <strong className="text-green-400">Total: $100-500K</strong> (2 años)</li>
                          </ul>
                        </div>
                      </div>
                      <p className="mt-6 text-center text-lg">
                        <strong className="text-purple-400 text-2xl">90-97% de reducción en capital requerido</strong>
                      </p>
                    </div>

                    {/* The Expertise Multiplier */}
                    <div className="p-5 rounded-lg bg-slate-800/50 border border-slate-700">
                      <h4 className="font-semibold text-white mb-3">El Multiplicador de Experiencia</h4>
                      <p className="text-sm leading-relaxed mb-3">
                        Esto no es "vibe coding" ni fundadores no-técnicos usando ChatGPT. El CEO de Y Combinator lo explicó: <em className="text-slate-400">"Cada uno de ellos es altamente técnico, completamente capaz de construir sus productos desde cero. Hace un año, habrían construido su producto desde cero — pero ahora 95% es construido por IA."</em>
                      </p>
                      <p className="text-sm leading-relaxed">
                        La clave: <strong className="text-white">años de experiencia en ingeniería académica</strong> — desde GUIs en MATLAB hasta Python y plataformas web — ahora amplificada por infraestructura que simplemente no existía. <strong className="text-white">La IA aplasta el 90% tedioso del código, pero apenas toca el 10% que toma el 90% del tiempo.</strong> Ese 10% es la experiencia en análisis sísmico NCh433, diseño hidráulico, normativa chilena — el conocimiento de dominio que la IA no puede inventar.
                      </p>
                    </div>

                    {/* Solo Founder Stats */}
                    <div className="grid md:grid-cols-3 gap-4 mt-6">
                      <div className="text-center p-4 rounded-lg bg-slate-800/30">
                        <div className="text-3xl font-bold text-purple-400 mb-1">38%</div>
                        <p className="text-xs text-slate-400">de startups son solo founders (2024) vs 22% en 2015</p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-slate-800/30">
                        <div className="text-3xl font-bold text-blue-400 mb-1">44%</div>
                        <p className="text-xs text-slate-400">de SaaS rentables son solo founders (Stripe, 2024)</p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-slate-800/30">
                        <div className="text-3xl font-bold text-green-400 mb-1">$10K+</div>
                        <p className="text-xs text-slate-400">MRR en el primer año sin empleados (tendencia 2024-2025)</p>
                      </div>
                    </div>

                    {/* Final Statement */}
                    <p className="text-lg leading-relaxed pt-6 border-t border-slate-700">
                      <strong className="text-white">La pregunta no es "¿vale la pena hacer esto?"</strong> La pregunta es "¿por qué no todos están haciendo esto?" La respuesta: la mayoría tiene las habilidades técnicas <em>o</em> la experiencia de dominio. <strong className="text-purple-400">Tener ambas es el foso defensivo.</strong>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeCompetitorTab !== 'total' && (
              <div className="space-y-4">
                {competitorPricing[activeCompetitorTab].map((product) => (
                  <div key={product.name} className="glass-card rounded-xl p-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-white">{product.name}</h3>
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-400">
                            {product.vendor}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400">{product.notes}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className={`text-xl font-bold ${
                          product.priceRange === 'GRATIS' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {product.priceRange}
                        </div>
                        <p className="text-xs text-slate-500">{product.type}</p>
                        <a
                          href={product.source}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 mt-1"
                        >
                          <ExternalLink size={10} />
                          Fuente
                        </a>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Category Summary */}
                <div className="glass-card rounded-xl p-5 border border-green-500/20 mt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-semibold">LeDesign - Módulo equivalente</h4>
                      <p className="text-sm text-slate-400">
                        {activeCompetitorTab === 'structural' && 'Diseño Estructural con NCh433, FEA, acero/hormigón'}
                        {activeCompetitorTab === 'civil' && 'Diseño Vial y Pavimentos con AASHTO, perfiles, alineamientos'}
                        {activeCompetitorTab === 'hydraulic' && 'Diseño Hidráulico con NCh691, alcantarillado, aguas lluvia'}
                        {activeCompetitorTab === 'terrain' && 'Análisis de Terreno con IA Google Gemini, DEM processing'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-400">$100/mes</div>
                      <p className="text-xs text-slate-500">$1,000/año</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Research Note */}
            <div className="mt-8 p-4 rounded-lg bg-slate-800/30 border border-slate-700">
              <div className="flex items-start gap-3">
                <AlertCircle size={16} className="text-slate-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-500">
                  <strong className="text-slate-400">Nota:</strong> Precios investigados en Enero 2026 de fuentes públicas.
                  Muchos vendors (CSI, Bentley) no publican precios directamente - requieren contactar ventas.
                  Los precios pueden variar por región, volumen, y tipo de licencia.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Development Status - Technical Assessment */}
      <section className="py-12">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <Cpu size={24} className="text-cyan-400" />
              <h2 className="text-2xl font-bold text-white">Estado del Desarrollo</h2>
              <span className="text-sm text-slate-500 ml-2">Evaluación técnica por Claude Code (Opus 4.5)</span>
            </div>

            {/* Capability Matrix */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              {[
                { name: 'CAD 2D', status: '✅', tech: 'Canvas 2D', detail: '19 herramientas', color: 'text-blue-400' },
                { name: '3D Estructural', status: '✅', tech: 'Three.js', detail: 'PBR Materials', color: 'text-purple-400' },
                { name: 'Geoespacial', status: '✅', tech: 'Leaflet + R-tree', detail: '10,000+ entidades', color: 'text-green-400' },
                { name: 'Hidráulica', status: '✅', tech: 'Network Solvers', detail: 'Normas NCh', color: 'text-cyan-400' },
                { name: 'Infraestructura', status: '✅', tech: '40+ tipos', detail: 'Domain-specific', color: 'text-amber-400' },
                { name: 'Rendimiento', status: '✅', tech: 'LOD + Caching', detail: 'Profesional', color: 'text-pink-400' },
              ].map((cap) => (
                <div key={cap.name} className="glass-card rounded-lg p-4 text-center">
                  <div className={`text-lg font-bold ${cap.color} mb-1`}>{cap.name}</div>
                  <div className="text-2xl mb-1">{cap.status}</div>
                  <div className="text-xs text-slate-400">{cap.tech}</div>
                  <div className="text-xs text-slate-500">{cap.detail}</div>
                </div>
              ))}
            </div>

            {/* Technical Verdict */}
            <div className="glass-card rounded-xl p-6 border border-green-500/30 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 size={24} className="text-green-400" />
                <h3 className="text-xl font-bold text-green-400">Veredicto: Web PUEDE igualar Desktop CAD</h3>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-semibold text-white mb-2">RAM Elements = Tecnología Antigua</h4>
                  <p className="text-sm text-slate-400">
                    Construido en los 90s con DirectX/OpenGL 1.x. WebGL 2.0 ya tiene mejores shaders,
                    PBR, y shadow mapping. LeDesign ya implementa esto.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-2">Cálculos Pesados = Resuelto</h4>
                  <p className="text-sm text-slate-400">
                    WASM para velocidad nativa, Web Workers para multi-threading, WebGPU para cálculos en GPU.
                    CFD corre en browser - FEA es más simple.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-2">Nicho Correcto = Ventaja</h4>
                  <p className="text-sm text-slate-400">
                    No replicamos todo AutoCAD/Civil 3D. Solo lo que ingenieros chilenos necesitan.
                    Esto hace el problema alcanzable y la solución superior.
                  </p>
                </div>
              </div>
            </div>

            {/* Web vs Desktop Comparison */}
            <div className="glass-card rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Donde Web SUPERA a Desktop</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-slate-700">
                      <th className="py-2 text-slate-400">Capacidad</th>
                      <th className="py-2 text-slate-400">Desktop (AutoCAD, SAP2000)</th>
                      <th className="py-2 text-slate-400">Web (LeDesign)</th>
                      <th className="py-2 text-slate-400">Ganador</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300">
                    <tr className="border-b border-slate-800">
                      <td className="py-2">Integración AI</td>
                      <td className="py-2 text-red-400">Retrofit imposible</td>
                      <td className="py-2 text-green-400">Nativo (Gemini API)</td>
                      <td className="py-2">✅ Web</td>
                    </tr>
                    <tr className="border-b border-slate-800">
                      <td className="py-2">Colaboración</td>
                      <td className="py-2 text-red-400">Add-ons torpes</td>
                      <td className="py-2 text-green-400">Real-time, nativo</td>
                      <td className="py-2">✅ Web</td>
                    </tr>
                    <tr className="border-b border-slate-800">
                      <td className="py-2">Actualizaciones</td>
                      <td className="py-2 text-red-400">Releases anuales</td>
                      <td className="py-2 text-green-400">Diarias si necesario</td>
                      <td className="py-2">✅ Web</td>
                    </tr>
                    <tr className="border-b border-slate-800">
                      <td className="py-2">Multiplataforma</td>
                      <td className="py-2 text-red-400">Builds separados</td>
                      <td className="py-2 text-green-400">Funciona en todo</td>
                      <td className="py-2">✅ Web</td>
                    </tr>
                    <tr className="border-b border-slate-800">
                      <td className="py-2">Instalación</td>
                      <td className="py-2 text-red-400">Horas de setup</td>
                      <td className="py-2 text-green-400">Cero</td>
                      <td className="py-2">✅ Web</td>
                    </tr>
                    <tr>
                      <td className="py-2">Normas Chilenas</td>
                      <td className="py-2 text-red-400">Add-ons costosos</td>
                      <td className="py-2 text-green-400">Ciudadanos de primera clase</td>
                      <td className="py-2">✅ Web</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-700 flex items-center justify-between">
                <div className="text-slate-400">
                  <span className="text-green-400 font-bold">+15,000 líneas</span> de código CAD profesional implementado
                </div>
                <div className="text-sm text-slate-500">
                  Los ingenieros de Bentley, Autodesk, y Trimble ya migran a web. LeDesign ya está ahí.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Donation Tiers */}
      <section className="py-12 bg-gradient-to-b from-slate-900/50 to-transparent">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <Heart size={24} className="text-pink-400" />
              <h2 className="text-2xl font-bold text-white">Niveles de Donación (Pre-Lanzamiento)</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {donationTiers.map((tier) => {
                const IconComponent = tier.icon;
                return (
                  <div
                    key={tier.name}
                    className={`glass-card rounded-xl p-6 ${
                      tier.highlighted ? 'border-2 border-amber-500/50 shadow-lg shadow-amber-500/10' : ''
                    }`}
                  >
                    {tier.highlighted && (
                      <div className="text-xs font-semibold text-amber-400 mb-3">
                        ⭐ PRIORIDAD ENERO
                      </div>
                    )}

                    <div className={`icon-wrapper w-12 h-12 rounded-lg bg-slate-800/50 ${tier.color} mb-4`}>
                      <IconComponent size={24} />
                    </div>

                    <h3 className="text-xl font-bold text-white mb-1">Donación {tier.name}</h3>
                    <p className="text-sm text-slate-400 mb-4">{tier.users} incluidos</p>

                    <div className="mb-4">
                      <div className="text-3xl font-bold text-white">{tier.price}</div>
                      <div className="text-sm text-slate-500">{tier.priceCLP}</div>
                    </div>

                    <ul className="space-y-2 mb-6">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 size={16} className={`${tier.color} flex-shrink-0 mt-0.5`} />
                          <span className="text-slate-300">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="pt-4 border-t border-slate-700 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Meta:</span>
                        <span className="text-white">{tier.target}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total:</span>
                        <span className="text-green-400 font-semibold">{tier.totalRevenue}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* LeCoin Model */}
      <section className="py-12">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="glass-card rounded-xl p-8 bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-pink-500/10 border border-amber-500/20">
              <div className="flex items-center gap-3 mb-6">
                <Coins size={28} className="text-amber-400" />
                <h2 className="text-2xl font-bold text-white">Modelo LeCoin: Apoyo Fraternal</h2>
              </div>

              <div className="space-y-6">
                {/* What is LeCoin */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Sparkles size={20} className="text-amber-400" />
                    ¿Qué es LeCoin?
                  </h3>
                  <p className="text-slate-300 leading-relaxed">
                    LeCoin es un <strong className="text-amber-400">token simbólico de fraternidad</strong>, no un producto ni inversión.
                    Representa el apoyo de amigos y familia que creen en el proyecto antes del lanzamiento público.
                  </p>
                </div>

                {/* How it works */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="glass-panel rounded-lg p-6">
                    <h4 className="text-md font-semibold text-white mb-3 flex items-center gap-2">
                      <DollarSign size={18} className="text-green-400" />
                      Cómo Funciona
                    </h4>
                    <ul className="space-y-2 text-sm text-slate-300">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                        <span><strong>1 LeCoin = $1,000 donados</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                        <span>Máximo 10 LeCoins por amigo</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                        <span>Cierra el 4 de mayo 2026</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                        <span>Transferible entre la familia LeDesign</span>
                      </li>
                    </ul>
                  </div>

                  <div className="glass-panel rounded-lg p-6">
                    <h4 className="text-md font-semibold text-white mb-3 flex items-center gap-2">
                      <TrendingUp size={18} className="text-blue-400" />
                      Valor Simbólico
                    </h4>
                    <ul className="space-y-2 text-sm text-slate-300">
                      <li className="flex items-start gap-2">
                        <Zap size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                        <span><strong>1 LeCoin = 1% de ingresos por suscripciones</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Zap size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                        <span>Dashboard privado muestra valor en tiempo real</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Zap size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                        <span>Transparencia total de números</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Zap size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                        <span>Sin obligación de redención formal</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Redemption & Access */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="glass-panel rounded-lg p-6 border-l-4 border-green-500">
                    <h4 className="text-md font-semibold text-white mb-3 flex items-center gap-2">
                      <Gift size={18} className="text-green-400" />
                      Mecánica de "Redención"
                    </h4>
                    <ul className="space-y-2 text-sm text-slate-300">
                      <li className="flex items-start gap-2">
                        <ChevronRight size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                        <span>Amigos pueden <strong>pedir el favor de vuelta</strong> cuando LeDesign supere $6K/mes (punto de supervivencia)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ChevronRight size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                        <span>Sistema basado en <strong>confianza</strong>, no contrato formal</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ChevronRight size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                        <span>Benja decide cuándo y cómo devolver según capacidad</span>
                      </li>
                    </ul>
                  </div>

                  <div className="glass-panel rounded-lg p-6 border-l-4 border-blue-500">
                    <h4 className="text-md font-semibold text-white mb-3 flex items-center gap-2">
                      <Key size={18} className="text-blue-400" />
                      Acceso al Producto
                    </h4>
                    <ul className="space-y-2 text-sm text-slate-300">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                        <span><strong>Amigos:</strong> Acceso de explorador únicamente</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                        <span><strong>Para uso profesional/lucro:</strong> Deben pagar suscripción separada</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                        <span>Amigos pueden SER usuarios pagando aparte</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertCircle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                        <span>LeCoin ≠ Acceso al producto</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Friends vs Users */}
                <div className="bg-slate-800/30 rounded-lg p-6 border border-slate-700">
                  <h4 className="text-md font-semibold text-white mb-4 flex items-center gap-2">
                    <Users size={18} className="text-purple-400" />
                    Taxonomía de Participantes
                  </h4>
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="font-semibold text-blue-400 mb-2">👥 Fundadores</div>
                      <p className="text-slate-400">Equity holders (Benja 70%, Waldo/Waldo V/Pichi 10% c/u)</p>
                    </div>
                    <div>
                      <div className="font-semibold text-amber-400 mb-2">🤝 Amigos (LeCoin)</div>
                      <p className="text-slate-400">Apoyo fraternal, valor simbólico, acceso explorador</p>
                    </div>
                    <div>
                      <div className="font-semibold text-green-400 mb-2">💼 Usuarios</div>
                      <p className="text-slate-400">Compradores de producto (Tiers Pionero + suscripciones)</p>
                    </div>
                  </div>
                </div>

                {/* 25% Friends Market Note */}
                <div className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 rounded-lg p-6 border border-pink-500/20">
                  <div className="flex items-start gap-3">
                    <Heart size={20} className="text-pink-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-md font-semibold text-white mb-2">El Sacrificio del 25%</h4>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        Benja dedica el <strong className="text-pink-400">25% de su red fraternal</strong> al fundraising en lugar de usuarios pagos.
                        Cualquier dinero de amigos es <strong>BONUS</strong> - no está contado en el plan mínimo de $32,500.
                        Este es el apoyo personal de Benja al proyecto, su forma de contribuir al runway sin esperar retorno.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-12">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <Calendar size={24} className="text-cyan-400" />
              <h2 className="text-2xl font-bold text-white">Timeline: Enero - Julio 2026</h2>
            </div>

            <div className="space-y-4">
              {timeline.map((month, index) => (
                <div
                  key={month.month}
                  className={`glass-card rounded-xl p-6 ${
                    month.status === 'current'
                      ? 'border-2 border-green-500/50 shadow-lg shadow-green-500/10'
                      : ''
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                    {/* Month Header */}
                    <div className="lg:w-48 flex-shrink-0">
                      <div className="flex items-center gap-2 mb-2">
                        {month.status === 'current' ? (
                          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                        ) : month.status === 'upcoming' ? (
                          <div className="w-3 h-3 bg-blue-500 rounded-full" />
                        ) : (
                          <div className="w-3 h-3 bg-slate-500 rounded-full" />
                        )}
                        <span className="text-lg font-bold text-white">{month.month}</span>
                      </div>
                      <p className="text-sm text-slate-400">{month.date}</p>
                      {month.status === 'current' && (
                        <span className="inline-block mt-2 px-2 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded">
                          AHORA
                        </span>
                      )}
                    </div>

                    {/* Goal */}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-3">{month.goal}</h3>
                      <ul className="space-y-2">
                        {month.tasks.map((task, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <ChevronRight size={16} className="text-slate-500 flex-shrink-0 mt-0.5" />
                            <span className="text-slate-300">{task}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Financials */}
                    <div className="lg:w-48 flex-shrink-0 lg:text-right">
                      <div className="mb-2">
                        <span className="text-sm text-slate-400">Recaudar:</span>
                        <div className="text-xl font-bold text-green-400">{month.revenue}</div>
                      </div>
                      <div>
                        <span className="text-sm text-slate-400">Gastos:</span>
                        <div className="text-lg font-semibold text-red-400">{month.expenses}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Funding Math */}
      <section className="py-12 bg-gradient-to-b from-slate-900/50 to-transparent">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <DollarSign size={24} className="text-green-400" />
              <h2 className="text-2xl font-bold text-white">Las Matemáticas</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Revenue */}
              <div className="glass-card rounded-xl p-6">
                <h3 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2">
                  <TrendingUp size={20} />
                  Ingresos (Donaciones)
                </h3>
                <div className="space-y-3">
                  {fundingMath.sources.map((source) => (
                    <div key={source.name} className="flex justify-between items-center">
                      <span className="text-slate-300 text-sm">{source.name}</span>
                      <span className="text-white font-semibold">
                        ${source.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <div className="pt-3 border-t border-slate-700 flex justify-between items-center">
                    <span className="text-white font-bold">TOTAL INGRESOS</span>
                    <span className="text-green-400 font-bold text-xl">
                      ${totalRevenue.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Expenses */}
              <div className="glass-card rounded-xl p-6">
                <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
                  <Target size={20} />
                  Gastos (Feb - Jul)
                </h3>
                <div className="space-y-3">
                  {fundingMath.expenses.map((expense) => (
                    <div key={expense.month} className="flex justify-between items-center">
                      <div>
                        <span className="text-slate-300 text-sm">{expense.month}</span>
                        <span className="text-slate-500 text-xs ml-2">({expense.detail})</span>
                      </div>
                      <span className="text-white font-semibold">
                        ${expense.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <div className="pt-3 border-t border-slate-700 flex justify-between items-center">
                    <span className="text-white font-bold">TOTAL GASTOS</span>
                    <span className="text-red-400 font-bold text-xl">
                      ${totalExpenses.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Balance */}
            <div className="mt-6 glass-card rounded-xl p-6 border border-green-500/30">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-center sm:text-left">
                  <h3 className="text-xl font-bold text-white mb-1">Balance</h3>
                  <p className="text-sm text-slate-400">Ingresos - Gastos</p>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-400">
                    +${(totalRevenue - totalExpenses).toLocaleString()}
                  </div>
                  <p className="text-sm text-slate-400">buffer de seguridad</p>
                </div>
              </div>
            </div>

            {/* The Pot Explanation */}
            <div className="mt-6 p-6 rounded-xl bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 border border-blue-500/20">
              <div className="flex items-start gap-3 mb-4">
                <Target size={24} className="text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Entendiendo "La Olla" (The Pot)</h3>
                  <div className="space-y-3 text-sm text-slate-300">
                    <p>
                      <strong className="text-blue-400">Todo el dinero pre-lanzamiento va a "la olla"</strong> - un fondo unificado que incluye:
                    </p>
                    <ul className="space-y-2 ml-4">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                        <span><strong>Usuarios Pionero:</strong> Pagan por acceso lifetime al producto</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 size={16} className="text-purple-400 flex-shrink-0 mt-0.5" />
                        <span><strong>Equipos Pionero:</strong> Pagan por acceso lifetime para equipos</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                        <span><strong>Patrocinadores Premium:</strong> Pagan por acceso + influencia + prioridad</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Coins size={16} className="text-pink-400 flex-shrink-0 mt-0.5" />
                        <span><strong>Amigos (LeCoin):</strong> BONUS - apoyo fraternal no contado en mínimo</span>
                      </li>
                    </ul>
                    <div className="pt-3 border-t border-slate-700/50">
                      <p className="mb-2">
                        <strong className="text-white">Meta Mínima:</strong> $32,500 de usuarios/patrocinadores (sin contar amigos)
                      </p>
                      <p className="text-slate-400">
                        <strong>Después del lanzamiento (Mayo 4):</strong> La olla se convierte en fondo de reserva/inversión.
                        Solo suscripciones mensuales cuentan como ingresos recurrentes.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* January Priority */}
      <section className="py-12">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <div className="glass-card rounded-xl p-8 border-2 border-amber-500/30">
              <div className="flex items-center gap-3 mb-6">
                <Rocket size={28} className="text-amber-400" />
                <h2 className="text-2xl font-bold text-white">Prioridad Enero: $10,000</h2>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-semibold text-white mb-3">Lo que necesitamos:</h3>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-slate-300">
                      <CheckCircle2 size={16} className="text-amber-400" />
                      2 Patrocinadores Premium
                    </li>
                    <li className="flex items-center gap-2 text-slate-300">
                      <CheckCircle2 size={16} className="text-amber-400" />
                      $5,000+ cada uno
                    </li>
                    <li className="flex items-center gap-2 text-slate-300">
                      <CheckCircle2 size={16} className="text-amber-400" />
                      Cerrado antes del 31 de enero
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-white mb-3">Quién puede ser:</h3>
                  <ul className="space-y-2 text-sm text-slate-300">
                    <li>• Consultora pequeña (5-10 ingenieros)</li>
                    <li>• Ingeniero independiente establecido</li>
                    <li>• Oficina municipal de ingeniería</li>
                    <li>• Departamento universitario</li>
                    <li>• Cualquiera que confíe en Waldo</li>
                  </ul>
                </div>
              </div>

              <div className="p-4 bg-slate-800/50 rounded-lg">
                <h3 className="font-semibold text-white mb-2">El pitch:</h3>
                <p className="text-slate-300 italic">
                  "Por 5 millones, tienes acceso de por vida a LeDesign, trabajamos contigo 3 meses
                  para adaptar la plataforma a TU flujo de trabajo, y tienes soporte prioritario
                  para siempre. Solo 2 cupos. ¿Te interesa una reunión de 30 minutos?"
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* After July */}
      <section className="py-12 bg-gradient-to-b from-slate-900/50 to-transparent">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <TrendingUp size={24} className="text-blue-400" />
              <h2 className="text-2xl font-bold text-white">Después de Julio: Crecimiento</h2>
            </div>

            <div className="glass-card rounded-xl p-6">
              <p className="text-slate-300 mb-6">
                Después de julio, las <strong className="text-white">suscripciones mensuales</strong> cubren
                los salarios. Las donaciones lifetime ya no son necesarias.
              </p>

              <h3 className="font-semibold text-white mb-4">Para cubrir $6,000/mes necesitamos:</h3>

              <div className="grid sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-blue-400">60</div>
                  <p className="text-sm text-slate-400">suscriptores a $100/mes</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-purple-400">30</div>
                  <p className="text-sm text-slate-400">suscriptores a $200/mes</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-green-400">~45</div>
                  <p className="text-sm text-slate-400">mix realista</p>
                </div>
              </div>

              <p className="text-slate-400 text-sm">
                Con 90+ usuarios lifetime probando y recomendando, conseguir 45 suscriptores
                en los primeros 3 meses post-lanzamiento es alcanzable.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Investor Calculator */}
      <section className="py-20 bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <DollarSign size={48} className="text-green-400 mx-auto mb-4" />
              <h2 className="text-4xl font-bold text-white mb-4">
                Calculadora de Inversión
              </h2>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                Modelo de inversión con retorno pasivo mensual.
                <strong className="text-white"> Riesgo alto, retorno potencial excepcional.</strong>
              </p>
            </div>

            {/* Investment Tiers */}
            <div className="glass-card rounded-2xl p-8 mb-8">
              <h3 className="text-2xl font-bold text-white mb-6 text-center">
                Niveles de Inversión Disponibles
              </h3>

              <div className="grid md:grid-cols-4 gap-4 mb-8">
                {[
                  { amount: 5000, equity: 7, label: 'Fundador', color: 'blue' },
                  { amount: 10000, equity: 12, label: 'Estratégico', color: 'purple' },
                  { amount: 15000, equity: 16, label: 'Principal', color: 'cyan' },
                  { amount: 20000, equity: 20, label: 'Máximo', color: 'green' },
                ].map((tier) => (
                  <button
                    key={tier.amount}
                    onClick={() => setInvestmentAmount(tier.amount)}
                    className={`p-6 rounded-xl border-2 transition-all ${
                      investmentAmount === tier.amount
                        ? `border-${tier.color}-500 bg-${tier.color}-500/10`
                        : 'border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className={`text-sm font-semibold mb-2 ${
                      investmentAmount === tier.amount ? `text-${tier.color}-400` : 'text-slate-400'
                    }`}>
                      {tier.label}
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">
                      ${tier.amount.toLocaleString()}
                    </div>
                    <div className={`text-3xl font-bold ${
                      investmentAmount === tier.amount ? `text-${tier.color}-400` : 'text-slate-500'
                    }`}>
                      {tier.equity}%
                    </div>
                    <div className="text-xs text-slate-500 mt-1">equity</div>
                  </button>
                ))}
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-slate-300">
                    <strong className="text-white">Límite de inversión:</strong> Máximo $20,000 por 20% equity.
                    Se reserva 70% para fundadores y 10% para equity pool futuro.
                  </div>
                </div>
              </div>
            </div>

            {/* MRR Scenario Selector */}
            <div className="glass-card rounded-2xl p-8 mb-8">
              <h3 className="text-xl font-bold text-white mb-6 text-center">
                Selecciona Escenario de Ingresos (MRR)
              </h3>

              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { mrr: 6000, label: 'Conservador', users: '45 usuarios', color: 'yellow' },
                  { mrr: 12000, label: 'Objetivo', users: '90 usuarios', color: 'blue' },
                  { mrr: 25000, label: 'Éxito', users: '200 usuarios', color: 'green' },
                ].map((scenario) => (
                  <button
                    key={scenario.mrr}
                    onClick={() => setSelectedMRR(scenario.mrr as 6000 | 12000 | 25000)}
                    className={`p-6 rounded-xl border-2 transition-all ${
                      selectedMRR === scenario.mrr
                        ? `border-${scenario.color}-500 bg-${scenario.color}-500/10`
                        : 'border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className={`text-sm font-semibold mb-2 ${
                      selectedMRR === scenario.mrr ? `text-${scenario.color}-400` : 'text-slate-400'
                    }`}>
                      {scenario.label}
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">
                      ${scenario.mrr.toLocaleString()}/mes
                    </div>
                    <div className="text-xs text-slate-500">{scenario.users}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Return Projections */}
            {(() => {
              const equity = investmentAmount === 5000 ? 7 :
                            investmentAmount === 10000 ? 12 :
                            investmentAmount === 15000 ? 16 : 20;

              const infraCost = selectedMRR === 6000 ? 42 :
                                selectedMRR === 12000 ? 82 : 155;

              const netProfit = selectedMRR - infraCost;
              const monthlyReturn = (netProfit * equity) / 100;
              const paybackMonths = Math.ceil(investmentAmount / monthlyReturn);

              const returns = {
                month6: monthlyReturn * 6,
                month12: monthlyReturn * 12,
                month24: monthlyReturn * 24,
                year5: monthlyReturn * 60,
              };

              const roi = {
                month6: ((returns.month6 / investmentAmount) * 100).toFixed(0),
                month12: ((returns.month12 / investmentAmount) * 100).toFixed(0),
                month24: ((returns.month24 / investmentAmount) * 100).toFixed(0),
                year5: ((returns.year5 / investmentAmount) * 100).toFixed(0),
              };

              return (
                <div className="glass-card rounded-2xl p-8">
                  <div className="grid md:grid-cols-2 gap-8 mb-8">
                    {/* Investment Summary */}
                    <div>
                      <h4 className="text-lg font-bold text-white mb-4">Tu Inversión</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                          <span className="text-slate-400">Monto</span>
                          <span className="text-2xl font-bold text-white">
                            ${investmentAmount.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                          <span className="text-slate-400">Equity</span>
                          <span className="text-2xl font-bold text-purple-400">
                            {equity}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                          <span className="text-slate-400">Ingreso mensual</span>
                          <span className="text-2xl font-bold text-green-400">
                            ${Math.round(monthlyReturn).toLocaleString()}/mes
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg border border-green-500/30">
                          <span className="text-slate-400">Recuperación total</span>
                          <span className="text-xl font-bold text-green-400">
                            {paybackMonths} meses
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Returns Timeline */}
                    <div>
                      <h4 className="text-lg font-bold text-white mb-4">Proyección de Retorno</h4>
                      <div className="space-y-3">
                        {[
                          { label: '6 meses', amount: returns.month6, roi: roi.month6 },
                          { label: '12 meses', amount: returns.month12, roi: roi.month12, highlight: true },
                          { label: '24 meses', amount: returns.month24, roi: roi.month24 },
                          { label: '5 años', amount: returns.year5, roi: roi.year5 },
                        ].map((period) => (
                          <div
                            key={period.label}
                            className={`flex justify-between items-center p-3 rounded-lg ${
                              period.highlight
                                ? 'bg-green-500/10 border border-green-500/30'
                                : 'bg-slate-800/50'
                            }`}
                          >
                            <span className="text-slate-400">{period.label}</span>
                            <div className="text-right">
                              <div className="text-lg font-bold text-white">
                                ${Math.round(period.amount).toLocaleString()}
                              </div>
                              <div className={`text-xs ${
                                period.highlight ? 'text-green-400' : 'text-slate-500'
                              }`}>
                                ROI: {period.roi}%
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Visual Breakdown */}
                  <div className="border-t border-slate-700 pt-8">
                    <h4 className="text-lg font-bold text-white mb-6 text-center">
                      Desglose Mensual (Escenario: ${selectedMRR.toLocaleString()} MRR)
                    </h4>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="text-center p-6 rounded-xl bg-blue-500/10 border border-blue-500/30">
                        <div className="text-3xl font-bold text-blue-400 mb-2">
                          ${selectedMRR.toLocaleString()}
                        </div>
                        <div className="text-sm text-slate-400">Ingresos totales</div>
                      </div>

                      <div className="text-center p-6 rounded-xl bg-red-500/10 border border-red-500/30">
                        <div className="text-3xl font-bold text-red-400 mb-2">
                          -${infraCost}
                        </div>
                        <div className="text-sm text-slate-400">Costos infraestructura</div>
                        <div className="text-xs text-slate-500 mt-1">
                          ({((infraCost / selectedMRR) * 100).toFixed(1)}% de ingresos)
                        </div>
                      </div>

                      <div className="text-center p-6 rounded-xl bg-green-500/10 border border-green-500/30">
                        <div className="text-3xl font-bold text-green-400 mb-2">
                          ${netProfit.toLocaleString()}
                        </div>
                        <div className="text-sm text-slate-400">Ganancia neta</div>
                        <div className="text-xs text-slate-500 mt-1">
                          Margen: {((netProfit / selectedMRR) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 p-6 rounded-xl bg-slate-800/50 border border-slate-700">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <div className="text-sm text-slate-400 mb-2">Tu parte ({equity}%)</div>
                          <div className="text-2xl font-bold text-green-400">
                            ${Math.round(monthlyReturn).toLocaleString()}/mes
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            Ingreso pasivo sin trabajo
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-slate-400 mb-2">Fundadores (70%)</div>
                          <div className="text-2xl font-bold text-white">
                            ${Math.round(netProfit * 0.7).toLocaleString()}/mes
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            Para desarrollo y operaciones
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Risk Warning */}
                  <div className="mt-8 p-6 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={24} className="text-amber-400 flex-shrink-0" />
                      <div className="text-sm text-slate-300">
                        <strong className="text-white block mb-2">Advertencia de Riesgo</strong>
                        Esta es una inversión de altísimo riesgo en startup pre-revenue. Estadística de la industria:
                        <strong className="text-amber-400"> 95% de startups fallan.</strong> Solo invierte dinero que puedas
                        permitirte perder completamente. Los retornos proyectados asumen éxito del producto y crecimiento
                        sostenido - ninguna garantía de que esto ocurra. Considera esto como una apuesta de alto riesgo/alto retorno.
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Comparison Table */}
            <div className="mt-8 glass-card rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-white mb-6 text-center">
                Comparación: LeDesign vs Inversiones Tradicionales
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4 text-slate-400 font-semibold">Inversión</th>
                      <th className="text-right py-3 px-4 text-slate-400 font-semibold">Retorno Anual</th>
                      <th className="text-right py-3 px-4 text-slate-400 font-semibold">5 Años (${investmentAmount.toLocaleString()})</th>
                      <th className="text-center py-3 px-4 text-slate-400 font-semibold">Riesgo</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {[
                      { name: 'Cuenta de Ahorro', annual: '1-2%', fiveYear: '$5,250', risk: 'Ninguno', color: 'slate' },
                      { name: 'S&P 500 (promedio)', annual: '~10%', fiveYear: '$8,053', risk: 'Medio', color: 'slate' },
                      { name: 'Acciones de Alto Riesgo', annual: '15-20%', fiveYear: '$10,114', risk: 'Alto', color: 'slate' },
                      { name: 'Crypto', annual: 'Variable', fiveYear: '$0 - $50k+', risk: 'Muy Alto', color: 'slate' },
                      {
                        name: 'LeDesign (Conservador, $6k MRR)',
                        annual: '100%',
                        fiveYear: `$${Math.round((investmentAmount === 5000 ? 7 : investmentAmount === 10000 ? 12 : investmentAmount === 15000 ? 16 : 20) * (6000 - 42) * 60 / 100).toLocaleString()}`,
                        risk: 'Muy Alto',
                        color: 'blue'
                      },
                      {
                        name: 'LeDesign (Objetivo, $12k MRR)',
                        annual: '200%',
                        fiveYear: `$${Math.round((investmentAmount === 5000 ? 7 : investmentAmount === 10000 ? 12 : investmentAmount === 15000 ? 16 : 20) * (12000 - 82) * 60 / 100).toLocaleString()}`,
                        risk: 'Muy Alto',
                        color: 'purple'
                      },
                      {
                        name: 'LeDesign (Éxito, $25k MRR)',
                        annual: '400%+',
                        fiveYear: `$${Math.round((investmentAmount === 5000 ? 7 : investmentAmount === 10000 ? 12 : investmentAmount === 15000 ? 16 : 20) * (25000 - 155) * 60 / 100).toLocaleString()}`,
                        risk: 'Muy Alto',
                        color: 'green'
                      },
                    ].map((investment) => (
                      <tr
                        key={investment.name}
                        className={`border-b border-slate-800 ${
                          investment.color !== 'slate' ? `bg-${investment.color}-500/5` : ''
                        }`}
                      >
                        <td className="py-4 px-4">
                          <span className={`font-semibold ${
                            investment.color !== 'slate' ? `text-${investment.color}-400` : 'text-white'
                          }`}>
                            {investment.name}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right text-slate-300">{investment.annual}</td>
                        <td className={`py-4 px-4 text-right font-bold ${
                          investment.color !== 'slate' ? `text-${investment.color}-400` : 'text-white'
                        }`}>
                          {investment.fiveYear}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`px-2 py-1 rounded text-xs ${
                            investment.risk === 'Ninguno' ? 'bg-green-500/20 text-green-400' :
                            investment.risk === 'Medio' ? 'bg-yellow-500/20 text-yellow-400' :
                            investment.risk === 'Alto' ? 'bg-orange-500/20 text-orange-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {investment.risk}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-sm text-slate-400 mt-6 text-center">
                <strong className="text-white">Diferencia clave:</strong> Inversiones tradicionales retornan capital.
                LeDesign retorna capital <span className="text-green-400">+ equity ownership</span>
                {' '}+ participación en crecimiento internacional + potencial exit.
              </p>
            </div>

            {/* Why This Works */}
            <div className="mt-8 grid md:grid-cols-2 gap-6">
              <div className="glass-card rounded-xl p-6">
                <Check size={24} className="text-green-400 mb-3" />
                <h4 className="text-lg font-bold text-white mb-3">Por qué funciona para ti</h4>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Ingreso pasivo mensual desde día 1 que alcance rentabilidad</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Recuperación completa en 6-12 meses (escenario objetivo)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Equity ownership permanente - ingresos continúan para siempre</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Participación en expansión internacional (México, LATAM)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Potencial exit: 7-20% del precio de adquisición si vendemos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Trabajo cero - 100% pasivo</span>
                  </li>
                </ul>
              </div>

              <div className="glass-card rounded-xl p-6">
                <Rocket size={24} className="text-blue-400 mb-3" />
                <h4 className="text-lg font-bold text-white mb-3">Por qué funciona para nosotros</h4>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                    <span>Capital inicial sin deuda - financiamiento limpio</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                    <span>Mantenemos 70% para fundadores - control total</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                    <span>Inversor alineado con éxito (su ingreso depende de nuestro MRR)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                    <span>Validación de mercado - alguien pone dinero real</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                    <span>Red en México - potencial para expansión internacional</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                    <span>Sin presión de VCs - crecemos a nuestro ritmo</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Executive Summary - The Final Pitch */}
      <section className="py-20 bg-gradient-to-b from-slate-900/50 via-slate-950 to-slate-900/50">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 mb-6">
                <Target size={16} className="text-purple-400" />
                <span className="text-sm font-medium text-slate-300">
                  Resumen Ejecutivo
                </span>
              </div>
              <h2 className="text-4xl font-bold mb-4">
                <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  El Argumento Completo
                </span>
              </h2>
              <p className="text-lg text-slate-400 max-w-3xl mx-auto">
                Por qué LeDesign es posible ahora, por qué funcionará, y por qué necesitamos actuar en enero
              </p>
            </div>

            {/* The Core Thesis */}
            <div className="glass-card rounded-2xl p-8 mb-8 border-2 border-purple-500/30">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0">
                  <Rocket size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">La Tesis Central</h3>
                  <p className="text-slate-400">Por primera vez en la historia, un fundador técnico puede competir con Autodesk</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* The Problem */}
                  <div className="p-5 rounded-xl bg-red-500/5 border border-red-500/20">
                    <h4 className="font-bold text-white mb-3 flex items-center gap-2">
                      <AlertTriangle size={18} className="text-red-400" />
                      El Problema
                    </h4>
                    <ul className="space-y-2 text-sm text-slate-300">
                      <li>• Ingenieros chilenos pagan <strong className="text-red-400">$15-40K/año</strong> en software</li>
                      <li>• Autodesk, Bentley, CSI: <strong>oligopolio</strong> sin competencia real</li>
                      <li>• <strong>Cero</strong> plataformas con normas chilenas integradas</li>
                      <li>• 5+ suscripciones separadas para trabajo completo</li>
                      <li>• Modelo perpetuo de vendor lock-in (archivos DWG)</li>
                    </ul>
                  </div>

                  {/* Why Now */}
                  <div className="p-5 rounded-xl bg-purple-500/5 border border-purple-500/20">
                    <h4 className="font-bold text-white mb-3 flex items-center gap-2">
                      <Clock size={18} className="text-purple-400" />
                      Por Qué Ahora (2026)
                    </h4>
                    <ul className="space-y-2 text-sm text-slate-300">
                      <li>• Claude Code: <strong className="text-purple-400">1 = 4-5 ingenieros</strong> de capacidad</li>
                      <li>• Edge DB: <strong className="text-cyan-400">96% más barato</strong> ($5 vs $144/mes)</li>
                      <li>• AI APIs: <strong className="text-blue-400">99.9% reducción</strong> de costos</li>
                      <li>• Zero-DevOps: <strong className="text-green-400">$20/mes</strong> vs $100K/año</li>
                      <li>• DWG abierto: <strong className="text-amber-400">Sin licencia</strong> de $50-100K/año</li>
                    </ul>
                  </div>
                </div>

                {/* The Math */}
                <div className="p-6 rounded-xl bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20">
                  <h4 className="font-bold text-white mb-4 text-center">La Matemática</h4>
                  <div className="grid md:grid-cols-3 gap-6 text-center">
                    <div>
                      <p className="text-sm text-slate-400 mb-2">Construir esto en 2018:</p>
                      <p className="text-3xl font-bold text-red-400">$5-15M</p>
                      <p className="text-xs text-slate-500">10-20 ingenieros, 3-5 años</p>
                    </div>
                    <div className="flex items-center justify-center">
                      <ChevronRight size={32} className="text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-400 mb-2">Construir esto en 2026:</p>
                      <p className="text-3xl font-bold text-green-400">$100-500K</p>
                      <p className="text-xs text-slate-500">Fundador técnico, 1-2 años</p>
                    </div>
                  </div>
                  <p className="text-center mt-4 text-lg">
                    <strong className="text-purple-400">Reducción: 90-97%</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Competitive Moat */}
            <div className="glass-card rounded-2xl p-8 mb-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0">
                  <Shield size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">El Foso Competitivo</h3>
                  <p className="text-slate-400">Por qué otros no pueden replicar esto fácilmente</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={20} className="text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-white mb-1">Experiencia de Dominio</h4>
                      <p className="text-sm text-slate-400">
                        Años de ingeniería académica (MATLAB → Python → Web). NCh433, NCh691, normativa chilena.
                        <strong className="text-white"> La IA no puede inventar esto.</strong>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={20} className="text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-white mb-1">Timing Perfecto</h4>
                      <p className="text-sm text-slate-400">
                        2022-2026 convergencia. Hace 2 años era muy caro. En 2 años habrá 100 competidores.
                        <strong className="text-white"> Ventana de 18 meses.</strong>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={20} className="text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-white mb-1">Mercado Específico</h4>
                      <p className="text-sm text-slate-400">
                        Chile es demasiado pequeño para Autodesk, demasiado grande para ignorar.
                        <strong className="text-white"> Mercado protegido por geografía y normas.</strong>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={20} className="text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-white mb-1">Conexiones Locales</h4>
                      <p className="text-sm text-slate-400">
                        Waldo (papá) con SERVIU, MOP, ESSBIO. Redes de 30+ años en Biobío.
                        <strong className="text-white"> No replicable por extranjeros.</strong>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Projections */}
            <div className="glass-card rounded-2xl p-8 mb-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-green-500/20 text-green-400 flex items-center justify-center flex-shrink-0">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Proyecciones Financieras</h3>
                  <p className="text-slate-400">Camino conservador a autosustentabilidad en 6 meses</p>
                </div>
              </div>

              {/* Timeline Milestones */}
              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-4 p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                  <div className="w-24 flex-shrink-0">
                    <span className="text-sm font-semibold text-green-400">ENERO</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium">2 Socios Fundadores × $5,000</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold text-green-400">$10,000</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
                  <div className="w-24 flex-shrink-0">
                    <span className="text-sm font-semibold text-blue-400">FEB-ABR</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium">50 individuales ($250) + 10 equipos ($1,000)</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold text-blue-400">$22,500</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-lg bg-purple-500/5 border border-purple-500/20">
                  <div className="w-24 flex-shrink-0">
                    <span className="text-sm font-semibold text-purple-400">MAYO</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium">Lanzamiento público - Suscripciones comienzan</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold text-purple-400">MRR ↑</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
                  <div className="w-24 flex-shrink-0">
                    <span className="text-sm font-semibold text-cyan-400">JULIO</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium">45 suscriptores mix ($100-200/mes) = Autosustentable</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold text-cyan-400">$6K/mes</span>
                  </div>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid md:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-lg bg-slate-800/30">
                  <p className="text-xs text-slate-400 mb-1">Total Ingresos</p>
                  <p className="text-2xl font-bold text-green-400">$36,000</p>
                  <p className="text-xs text-slate-500">Donaciones pre-launch</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-slate-800/30">
                  <p className="text-xs text-slate-400 mb-1">Total Gastos</p>
                  <p className="text-2xl font-bold text-red-400">$33,000</p>
                  <p className="text-xs text-slate-500">Feb-Jul (salarios)</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-slate-800/30">
                  <p className="text-xs text-slate-400 mb-1">Buffer</p>
                  <p className="text-2xl font-bold text-blue-400">$3,000</p>
                  <p className="text-xs text-slate-500">Margen de seguridad</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-slate-800/30">
                  <p className="text-xs text-slate-400 mb-1">Break-even</p>
                  <p className="text-2xl font-bold text-purple-400">Mes 6</p>
                  <p className="text-xs text-slate-500">Julio 2026</p>
                </div>
              </div>
            </div>

            {/* Growth Trajectory */}
            <div className="glass-card rounded-2xl p-8 mb-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                  <BarChart3 size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Trayectoria Post-Lanzamiento</h3>
                  <p className="text-slate-400">Escenarios conservador, realista, y optimista (12 meses)</p>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {/* Conservative */}
                <div className="p-5 rounded-xl bg-slate-800/30 border border-slate-700">
                  <h4 className="font-bold text-white mb-4">Conservador</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Mes 6:</span>
                      <span className="text-white font-semibold">45 subs</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Mes 12:</span>
                      <span className="text-white font-semibold">80 subs</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-700 pt-3">
                      <span className="text-slate-400">MRR Año 1:</span>
                      <span className="text-green-400 font-bold">$12K/mes</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">ARR:</span>
                      <span className="text-green-400 font-bold">$144K</span>
                    </div>
                  </div>
                </div>

                {/* Realistic */}
                <div className="p-5 rounded-xl bg-blue-500/5 border-2 border-blue-500/30">
                  <div className="text-xs font-semibold text-blue-400 mb-2">⭐ META PRINCIPAL</div>
                  <h4 className="font-bold text-white mb-4">Realista</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Mes 6:</span>
                      <span className="text-white font-semibold">60 subs</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Mes 12:</span>
                      <span className="text-white font-semibold">120 subs</span>
                    </div>
                    <div className="flex justify-between border-t border-blue-700 pt-3">
                      <span className="text-slate-400">MRR Año 1:</span>
                      <span className="text-blue-400 font-bold">$18K/mes</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">ARR:</span>
                      <span className="text-blue-400 font-bold">$216K</span>
                    </div>
                  </div>
                </div>

                {/* Optimistic */}
                <div className="p-5 rounded-xl bg-slate-800/30 border border-slate-700">
                  <h4 className="font-bold text-white mb-4">Optimista</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Mes 6:</span>
                      <span className="text-white font-semibold">90 subs</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Mes 12:</span>
                      <span className="text-white font-semibold">180 subs</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-700 pt-3">
                      <span className="text-slate-400">MRR Año 1:</span>
                      <span className="text-purple-400 font-bold">$27K/mes</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">ARR:</span>
                      <span className="text-purple-400 font-bold">$324K</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-sm text-slate-300 text-center">
                  <strong className="text-white">Suposiciones:</strong> 90+ usuarios lifetime activos, boca-a-boca,
                  competencia débil en normas chilenas, tasa de conversión 3-5% de freemium a Pro
                </p>
              </div>
            </div>

            {/* The Ask */}
            <div className="glass-card rounded-2xl p-8 bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-red-500/10 border-2 border-amber-500/30">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                  <Rocket size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Lo Que Necesitamos Ahora</h3>
                  <p className="text-slate-400">Prioridad crítica: Enero 2026</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-5 rounded-xl bg-slate-900/50 border border-amber-500/20">
                  <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                    <Crown size={18} className="text-amber-400" />
                    2 Socios Fundadores
                  </h4>
                  <ul className="space-y-2 text-sm text-slate-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-amber-400" />
                      $5,000 cada uno = $10,000 total
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-amber-400" />
                      Cerrado antes del 31 de enero
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-amber-400" />
                      Waldo lidera búsqueda (contactos en Biobío)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-amber-400" />
                      5 usuarios lifetime + 3 meses personalizados
                    </li>
                  </ul>
                </div>

                <div className="p-5 rounded-xl bg-slate-900/50 border border-blue-500/20">
                  <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                    <Users size={18} className="text-blue-400" />
                    Pipeline Feb-Abr
                  </h4>
                  <ul className="space-y-2 text-sm text-slate-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-blue-400" />
                      50 donaciones individuales ($250)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-blue-400" />
                      10 donaciones equipo ($1,000)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-blue-400" />
                      Early access abril para todos
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-blue-400" />
                      Testing masivo pre-lanzamiento
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 p-5 rounded-xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30">
                <p className="text-center text-lg leading-relaxed text-slate-300">
                  <strong className="text-white text-xl">Si cerramos $10K en enero,</strong> el resto del plan se
                  desbloquea. Equipo cobra desde febrero, desarrollo acelerado, 90+ usuarios lifetime probando
                  antes del lanzamiento público. <strong className="text-purple-400">Enero es el cuello de botella.</strong>
                </p>
              </div>
            </div>

            {/* Final Statement */}
            <div className="mt-8 p-8 rounded-2xl bg-gradient-to-r from-slate-900 via-purple-900/20 to-slate-900 border border-purple-500/20">
              <h3 className="text-2xl font-bold text-white mb-4 text-center">¿Por Qué Esto Funciona?</h3>
              <div className="grid md:grid-cols-3 gap-6 text-center mb-6">
                <div>
                  <div className="text-4xl mb-2">🎯</div>
                  <h4 className="font-bold text-white mb-2">Timing Perfecto</h4>
                  <p className="text-sm text-slate-400">
                    Convergencia 2022-2026. Ventana de 18 meses antes de saturación.
                  </p>
                </div>
                <div>
                  <div className="text-4xl mb-2">🛡️</div>
                  <h4 className="font-bold text-white mb-2">Foso Defensivo</h4>
                  <p className="text-sm text-slate-400">
                    Experiencia técnica + dominio ingenieril + mercado geográfico protegido.
                  </p>
                </div>
                <div>
                  <div className="text-4xl mb-2">💰</div>
                  <h4 className="font-bold text-white mb-2">Matemáticas Sólidas</h4>
                  <p className="text-sm text-slate-400">
                    45 suscriptores = autosustentable. 90+ lifetime users = pipeline garantizado.
                  </p>
                </div>
              </div>

              <p className="text-center text-lg text-slate-300 leading-relaxed">
                La mayoría de las startups tienen habilidades técnicas <em className="text-slate-400">o</em> experiencia
                de dominio. <strong className="text-white">Tener ambas + timing perfecto + matemáticas conservadoras</strong>
                = altísima probabilidad de éxito. <strong className="text-purple-400">No es una apuesta, es una ejecución.</strong>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center glass-card rounded-2xl p-10 border border-blue-500/30">
            <Handshake size={48} className="text-blue-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-white mb-4">
              ¿Estamos todos adentro?
            </h2>
            <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto">
              Tres Ledesma + Pichi. 70/10/10/10. Construyendo LeDesign juntos.
              <br />
              <span className="text-slate-400">Enero es el mes crítico.</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/early-access"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500 transition-all"
              >
                Ver Página de Early Access
                <ChevronRight size={20} />
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg glass-card text-white hover:bg-white/10 transition-all"
              >
                Ver Landing Principal
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="glass-header border-t border-slate-800">
        <div className="container mx-auto px-4 sm:px-6 py-8">
          <div className="text-center text-sm text-slate-400">
            <p className="mb-2">
              Documento interno - Plan de negocio LeDesign 2026
            </p>
            <p className="text-slate-500">
              Última actualización: Enero 16, 2026
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
