import Link from 'next/link';
import Image from 'next/image';
import {
  Check,
  ArrowRight,
  Database,
  Cpu,
  FileText,
  Zap,
  Cloud,
  Layers,
  GitBranch,
  Network,
  Sparkles,
  Download,
  RefreshCw,
  Globe,
  MapPin,
  Droplets,
  Mountain,
  FileCheck,
  Calendar,
  Building2,
  X,
} from 'lucide-react';

export default function IntegrationsPage() {
  const dataIntegrations = [
    {
      category: 'IDE Chile - Infraestructura de Datos Espaciales',
      icon: MapPin,
      color: 'blue',
      integrations: [
        { name: 'SIALL Sumideros', description: 'Red de sumideros y alcantarillado urbano en tiempo real', status: 'Live' },
        { name: 'Red Vial Nacional', description: 'Geometría completa de carreteras MOP con clasificación', status: 'Live' },
        { name: 'Puentes y Estructuras', description: 'Catastro de puentes con datos estructurales', status: 'Live' },
        { name: 'Límites Administrativos', description: 'Comunas, regiones, distritos censales', status: 'Live' },
        { name: 'Catastro Minero', description: 'Concesiones mineras y áreas protegidas', status: 'Beta' },
      ],
    },
    {
      category: 'DGA - Dirección General de Aguas',
      icon: Droplets,
      color: 'cyan',
      integrations: [
        { name: 'Estaciones Fluviométricas', description: 'Caudales en tiempo real de 300+ estaciones', status: 'Live' },
        { name: 'Derechos de Agua', description: 'Catastro público de derechos constituidos', status: 'Beta' },
        { name: 'Pozos y Captaciones', description: 'Registro de pozos profundos y superficiales', status: 'Beta' },
        { name: 'Calidad de Agua', description: 'Muestreos históricos de calidad', status: 'Planned' },
      ],
    },
    {
      category: 'MINVU - Ministerio de Vivienda',
      icon: Building2,
      color: 'purple',
      integrations: [
        { name: 'Catastro ITO', description: 'Inspecciones técnicas de obra registradas', status: 'Beta' },
        { name: 'Planos Reguladores', description: 'Zonificación y normas urbanísticas', status: 'Planned' },
        { name: 'Déficit Habitacional', description: 'Estadísticas de vivienda por comuna', status: 'Planned' },
      ],
    },
    {
      category: 'Datos Meteorológicos',
      icon: Cloud,
      color: 'green',
      integrations: [
        { name: 'Open-Meteo API', description: 'Pronóstico 16 días + históricos 70 años', status: 'Live' },
        { name: 'Precipitación Horaria', description: 'Datos para diseño hidrológico', status: 'Live' },
        { name: 'Viento y Temperatura', description: 'Para análisis de cargas ambientales', status: 'Live' },
      ],
    },
    {
      category: 'Datos Geotécnicos y Sísmicos',
      icon: Mountain,
      color: 'amber',
      integrations: [
        { name: 'Sismología USGS', description: 'Registros sísmicos históricos Chile', status: 'Live' },
        { name: 'Zonificación Sísmica NCh433', description: 'Zonas sísmicas y aceleraciones de diseño', status: 'Live' },
        { name: 'Suelos CONAF/CIREN', description: 'Clasificación de suelos agrícolas y forestales', status: 'Beta' },
      ],
    },
  ];

  const automatedDocs = [
    {
      title: 'Memoria de Cálculo Estructural',
      description: 'Documento completo con ecuaciones, verificaciones NCh433, tablas de resultados, y diagramas de esfuerzos. Generado en 30 segundos.',
      icon: FileText,
      format: 'PDF + Word',
      pages: '40-120 páginas',
      time: '30s vs. 8 horas manual',
    },
    {
      title: 'EETT - Especificaciones Técnicas',
      description: 'Especificaciones técnicas detalladas por partida según SERVIU/MOP, con cubicaciones y análisis de precios unitarios.',
      icon: FileCheck,
      format: 'PDF + Excel',
      pages: '60-200 páginas',
      time: '2 min vs. 16 horas manual',
    },
    {
      title: 'Planos de Diseño',
      description: 'Plantas, cortes, elevaciones, detalles constructivos. Exportación a DWG con layers organizados según estándar BIM.',
      icon: Layers,
      format: 'DWG + PDF',
      pages: '20-50 láminas',
      time: '5 min vs. 20 horas manual',
    },
    {
      title: 'Informe Geotécnico Preliminar',
      description: 'Recopila datos de suelos CIREN, sismicidad histórica, y genera recomendaciones preliminares de fundaciones.',
      icon: Mountain,
      format: 'PDF',
      pages: '15-30 páginas',
      time: '1 min vs. 4 horas manual',
    },
    {
      title: 'Cubicación de Movimiento de Tierra',
      description: 'Cálculo automático de corte/relleno desde superficie original vs. diseñada, con tablas y visualización 3D.',
      icon: GitBranch,
      format: 'Excel + PDF',
      pages: '10-20 páginas',
      time: '2 min vs. 6 horas manual',
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
              className="text-slate-300 hover:text-white transition-colors text-sm"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-20 pb-12 sm:pt-24 sm:pb-16">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 mb-6">
              <Sparkles size={16} className="text-blue-400" />
              <span className="text-sm font-medium bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                30+ Integraciones de Datos + Documentación Automatizada
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 text-white">
              Todos tus Datos en{' '}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Un Solo Lugar
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-300 mb-8 max-w-3xl mx-auto">
              Conectamos automáticamente con IDE Chile, DGA, MINVU, datos meteorológicos y más.
              Genera memorias de cálculo y EETTs en segundos, no días.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-500 hover:to-cyan-500 transition-all shadow-lg shadow-blue-500/20"
              >
                Comenzar Gratis
                <ArrowRight size={20} />
              </Link>
              <Link
                href="#integrations"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg glass-card text-white hover:bg-white/10 transition-all"
              >
                Ver Todas las Integraciones
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              <div className="glass-card rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-blue-400 mb-1">30+</div>
                <div className="text-sm text-slate-400">Fuentes de datos</div>
              </div>
              <div className="glass-card rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-cyan-400 mb-1">95%</div>
                <div className="text-sm text-slate-400">Tiempo ahorrado</div>
              </div>
              <div className="glass-card rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-green-400 mb-1">0</div>
                <div className="text-sm text-slate-400">Sitios que visitar</div>
              </div>
              <div className="glass-card rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-purple-400 mb-1">1</div>
                <div className="text-sm text-slate-400">Plataforma unificada</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Unified Solution */}
      <section className="py-12 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">
                Todos los Módulos Que Aprendiste,{' '}
                <span className="bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
                  Pero Unificados
                </span>
              </h2>
              <p className="text-lg text-slate-300 max-w-3xl mx-auto">
                LeDesign reúne el poder de HEC-RAS, EPANET, Civil 3D, y RAM Elements en una sola plataforma programática.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="glass-card rounded-xl p-6 border border-cyan-500/30">
                <div className="text-sm text-slate-400 mb-2">Hidráulica</div>
                <div className="font-bold text-white text-lg mb-1">Tipo HEC-RAS</div>
                <div className="text-xs text-slate-500">+ EPANET</div>
                <div className="mt-3 text-xs text-cyan-400">
                  → Módulo de diseño hidráulico
                </div>
              </div>

              <div className="glass-card rounded-xl p-6 border border-blue-500/30">
                <div className="text-sm text-slate-400 mb-2">Diseño Vial</div>
                <div className="font-bold text-white text-lg mb-1">Tipo Civil 3D</div>
                <div className="text-xs text-slate-500">Autodesk</div>
                <div className="mt-3 text-xs text-blue-400">
                  → Módulo de terreno y vial
                </div>
              </div>

              <div className="glass-card rounded-xl p-6 border border-purple-500/30">
                <div className="text-sm text-slate-400 mb-2">Estructural</div>
                <div className="font-bold text-white text-lg mb-1">Tipo RAM Elements</div>
                <div className="text-xs text-slate-500">+ ETABS</div>
                <div className="mt-3 text-xs text-purple-400">
                  → Módulo estructural FEA
                </div>
              </div>

              <div className="glass-card rounded-xl p-6 border border-green-500/30">
                <div className="text-sm text-slate-400 mb-2">Documentación</div>
                <div className="font-bold text-white text-lg mb-1">Automática</div>
                <div className="text-xs text-slate-500">Word + Excel</div>
                <div className="mt-3 text-xs text-green-400">
                  → Memorias y EETTs en segundos
                </div>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-8 border-2 border-cyan-500/30">
              <h3 className="text-xl font-bold text-white mb-6 text-center">
                La Diferencia: Un Solo Formato de Datos, Programático y Versionado
              </h3>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="icon-wrapper w-14 h-14 rounded-lg bg-blue-500/10 text-blue-400 mb-3 mx-auto">
                    <Database size={28} />
                  </div>
                  <h4 className="font-semibold text-white mb-2">Un Solo Formato</h4>
                  <p className="text-sm text-slate-400">
                    No más duplicar datos entre programas. Todo sincronizado automáticamente.
                  </p>
                </div>

                <div className="text-center">
                  <div className="icon-wrapper w-14 h-14 rounded-lg bg-purple-500/10 text-purple-400 mb-3 mx-auto">
                    <GitBranch size={28} />
                  </div>
                  <h4 className="font-semibold text-white mb-2">Versionado Como Git</h4>
                  <p className="text-sm text-slate-400">
                    Cada cambio registrado. Vuelve a cualquier versión anterior del diseño.
                  </p>
                </div>

                <div className="text-center">
                  <div className="icon-wrapper w-14 h-14 rounded-lg bg-green-500/10 text-green-400 mb-3 mx-auto">
                    <FileCheck size={28} />
                  </div>
                  <h4 className="font-semibold text-white mb-2">Docs Programáticas</h4>
                  <p className="text-sm text-slate-400">
                    Memorias conectadas al diseño. Cambias un valor → memoria se actualiza sola.
                  </p>
                </div>
              </div>

              <div className="mt-8 p-6 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl border border-cyan-500/20 text-center">
                <p className="text-lg text-slate-300">
                  <strong className="text-cyan-400">Diseñado para Chile:</strong>{' '}
                  NCh433, NCh691, Manuales MOP, DGA, IDE Chile — todo integrado desde el día 1.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="py-12 sm:py-16 bg-gradient-to-b from-slate-900/50 to-transparent">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Before */}
              <div className="glass-card rounded-2xl p-8 border-2 border-red-500/30">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <X size={28} className="text-red-400" />
                  Flujo Tradicional
                </h3>
                <div className="space-y-4">
                  {[
                    'Visitar IDE Chile → buscar layers → descargar shapefiles',
                    'Abrir QGIS → importar → reprojectar coordenadas',
                    'Ir a DGA → buscar estación → copiar caudales a Excel',
                    'Abrir 5 programas diferentes: ETABS, Civil 3D, WaterCAD...',
                    'Formato diferente en cada software, sin interoperabilidad',
                    'Escribir memoria de cálculo manualmente (8 horas)',
                    'Crear EETTs a mano copiando de proyectos antiguos (16 horas)',
                    'Exportar planos de cada programa por separado',
                    'Consolidar todo en Word/Excel manualmente',
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-3 text-slate-300">
                      <span className="text-red-400 font-bold text-sm mt-0.5">{i + 1}.</span>
                      <span className="text-sm">{step}</span>
                    </div>
                  ))}
                  <div className="mt-6 p-4 bg-red-950/30 rounded-lg border border-red-500/20">
                    <div className="text-red-400 font-semibold mb-1">Tiempo total:</div>
                    <div className="text-3xl font-bold text-red-400">40+ horas</div>
                    <div className="text-xs text-slate-500 mt-1">Solo para preparar datos y documentos</div>
                  </div>
                </div>
              </div>

              {/* After */}
              <div className="glass-card rounded-2xl p-8 border-2 border-green-500/50 shadow-2xl shadow-green-500/20">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <Check size={28} className="text-green-400" />
                  Con LeDesign
                </h3>
                <div className="space-y-4">
                  {[
                    'Abrir LeDesign → seleccionar ubicación en mapa',
                    'Automáticamente carga: IDE layers, DGA, suelos, clima',
                    'Todos los datos en el mismo formato unificado',
                    'Diseñar en un solo ambiente: estructura + vial + hidráulica',
                    'Todo programático, reproducible, versionado',
                    'Click "Generar Memoria" → PDF listo en 30 segundos',
                    'Click "Generar EETT" → documento completo en 2 minutos',
                    'Exportar todo: planos DWG, Excel, PDF, IFC desde un botón',
                    'Compartir link del proyecto con equipo (colaboración real-time)',
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-3 text-slate-300">
                      <Check size={18} className="text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{step}</span>
                    </div>
                  ))}
                  <div className="mt-6 p-4 bg-green-950/30 rounded-lg border border-green-500/20">
                    <div className="text-green-400 font-semibold mb-1">Tiempo total:</div>
                    <div className="text-3xl font-bold text-green-400">2 horas</div>
                    <div className="text-xs text-green-400 mt-1 font-semibold">95% más rápido • Ahorra 38 horas</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Data Integrations */}
      <section id="integrations" className="py-12 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">
                Integraciones de Datos
              </h2>
              <p className="text-lg text-slate-300">
                Conexión directa con fuentes oficiales chilenas y globales
              </p>
            </div>

            <div className="space-y-8">
              {dataIntegrations.map((category) => (
                <div key={category.category} className="glass-card rounded-2xl p-6 sm:p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className={`icon-wrapper w-12 h-12 rounded-lg bg-${category.color}-500/10 text-${category.color}-400`}>
                      <category.icon size={24} />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-white">{category.category}</h3>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    {category.integrations.map((integration) => (
                      <div key={integration.name} className="glass-card rounded-lg p-4 hover:bg-white/5 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-white">{integration.name}</h4>
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            integration.status === 'Live'
                              ? 'bg-green-500/20 text-green-400'
                              : integration.status === 'Beta'
                              ? 'bg-cyan-500/20 text-cyan-400'
                              : 'bg-slate-500/20 text-slate-400'
                          }`}>
                            {integration.status}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400">{integration.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Automated Documentation */}
      <section className="py-12 sm:py-16 bg-gradient-to-b from-slate-900/50 to-transparent">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">
                Documentación Automatizada
              </h2>
              <p className="text-lg text-slate-300">
                Genera memorias de cálculo y EETTs en minutos, no días
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {automatedDocs.map((doc) => (
                <div key={doc.title} className="glass-card rounded-2xl p-6 hover:scale-105 transition-transform">
                  <div className="icon-wrapper w-14 h-14 rounded-lg bg-blue-500/10 text-blue-400 mb-4">
                    <doc.icon size={28} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{doc.title}</h3>
                  <p className="text-slate-400 mb-4 text-sm">{doc.description}</p>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center">
                      <div className="text-xs text-slate-500 mb-1">Formato</div>
                      <div className="text-sm font-semibold text-cyan-400">{doc.format}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-500 mb-1">Extensión</div>
                      <div className="text-sm font-semibold text-purple-400">{doc.pages}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-500 mb-1">Tiempo</div>
                      <div className="text-sm font-semibold text-green-400">{doc.time.split(' vs.')[0]}</div>
                    </div>
                  </div>

                  <div className="p-3 bg-green-950/30 rounded-lg border border-green-500/20">
                    <div className="text-xs text-slate-400">Ahorro de tiempo</div>
                    <div className="text-lg font-bold text-green-400">{doc.time.split(' vs. ')[1]}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Programmatic Workflow */}
      <section className="py-12 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">
                Todo Programático y Reproducible
              </h2>
              <p className="text-lg text-slate-300">
                Diseña con código, no con clicks
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: GitBranch,
                  title: 'Control de Versiones',
                  description: 'Cada cambio se guarda automáticamente. Retrocede a cualquier versión anterior. Git para ingeniería.',
                  color: 'purple',
                },
                {
                  icon: RefreshCw,
                  title: '100% Reproducible',
                  description: 'Cada diseño es un script. Cambia parámetros y todo se recalcula. Nunca más "diseños mágicos".',
                  color: 'cyan',
                },
                {
                  icon: Network,
                  title: 'API Completa',
                  description: 'Automatiza workflows con la API. Integra con tus herramientas existentes. Python SDK incluido.',
                  color: 'green',
                },
              ].map((feature) => (
                <div key={feature.title} className="glass-card rounded-2xl p-8 hover:scale-105 transition-transform">
                  <div className={`icon-wrapper w-14 h-14 rounded-lg bg-${feature.color}-500/10 text-${feature.color}-400 mb-4`}>
                    <feature.icon size={28} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                  <p className="text-slate-400">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-24">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center glass-card rounded-3xl p-12 border-2 border-blue-500/30">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-white">
              ¿Listo para Diseñar Más Rápido?
            </h2>
            <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto">
              Accede a todos los datos que necesitas en un solo lugar. Genera documentación
              automáticamente. Diseña de forma programática y reproducible.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-500 hover:to-cyan-500 transition-all shadow-lg shadow-blue-500/20"
            >
              Comenzar Gratis • 7 Días
              <ArrowRight size={20} />
            </Link>
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
