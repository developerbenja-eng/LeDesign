/**
 * IDE Chile (Infraestructura de Datos Espaciales) Service Types
 * Catalog of available geospatial data from Chilean government APIs
 */

// Service types
export type ServiceType = 'MapServer' | 'FeatureServer' | 'WMS' | 'WFS';

export interface IDEServiceLayer {
  id: number;
  name: string;
  description?: string;
  geometryType?: 'point' | 'polyline' | 'polygon' | 'multipoint';
  minScale?: number;
  maxScale?: number;
  fields?: IDEFieldInfo[];
}

export interface IDEFieldInfo {
  name: string;
  type: string;
  alias?: string;
}

export interface IDEService {
  id: string;
  name: string;
  nameEs: string; // Spanish name
  description: string;
  descriptionEs: string;
  category: IDECategory;
  provider: IDEProvider;
  baseUrl: string;
  serviceType: ServiceType;
  layers?: IDEServiceLayer[];
  tags: string[];
  lastUpdated?: string;
  spatialReference?: string;
}

export interface IDEProvider {
  id: string;
  name: string;
  nameEs: string;
  ministry: string;
  ministryEs: string;
  website?: string;
  baseUrl: string;
}

export type IDECategory =
  | 'roads'           // Vialidad
  | 'bridges'         // Puentes
  | 'hydraulic'       // Obras Hidráulicas
  | 'water'           // Recursos Hídricos
  | 'stormwater'      // Aguas Lluvias
  | 'sanitation'      // Saneamiento Rural
  | 'basemap'         // Mapas Base
  | 'boundaries'      // Límites Administrativos
  | 'infrastructure'  // Infraestructura General
  | 'emergency'       // Emergencias
  | 'environment';    // Medio Ambiente

export interface IDEQueryParams {
  bbox?: {
    west: number;
    south: number;
    east: number;
    north: number;
  };
  where?: string;
  outFields?: string[];
  returnGeometry?: boolean;
  maxRecords?: number;
  format?: 'geojson' | 'json' | 'pbf';
}

export interface IDEQueryResult {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
  metadata?: {
    totalCount?: number;
    exceededLimit?: boolean;
  };
}

export interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: string;
    coordinates: number[] | number[][] | number[][][];
  };
  properties: Record<string, unknown>;
}

// ============================================
// PROVIDER DEFINITIONS
// ============================================

export const IDE_PROVIDERS: Record<string, IDEProvider> = {
  MOP: {
    id: 'mop',
    name: 'Ministry of Public Works',
    nameEs: 'Ministerio de Obras Públicas',
    ministry: 'MOP',
    ministryEs: 'MOP',
    website: 'https://www.mop.gob.cl',
    baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services',
  },
  MINVU: {
    id: 'minvu',
    name: 'Ministry of Housing and Urbanism',
    nameEs: 'Ministerio de Vivienda y Urbanismo',
    ministry: 'MINVU',
    ministryEs: 'MINVU',
    website: 'https://ide.minvu.cl',
    baseUrl: 'https://ide.minvu.cl/geoserver',
  },
};

// ============================================
// SERVICE CATALOG
// ============================================

export const IDE_SERVICES: IDEService[] = [
  // VIALIDAD (Roads)
  {
    id: 'red-vial-chile',
    name: 'National Road Network',
    nameEs: 'Red Vial Nacional',
    description: 'Complete road network of Chile with pavement types and classifications',
    descriptionEs: 'Red vial completa de Chile con tipos de carpeta y clasificaciones',
    category: 'roads',
    provider: IDE_PROVIDERS.MOP,
    baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/VIALIDAD/Red_Vial_Chile/MapServer',
    serviceType: 'MapServer',
    tags: ['roads', 'highways', 'pavement', 'vialidad'],
    lastUpdated: '2017',
    spatialReference: 'EPSG:4326',
    layers: [
      { id: 0, name: '1:5.000.000', geometryType: 'polyline' },
      { id: 1, name: '1:1.155.600', geometryType: 'polyline' },
      { id: 2, name: '1:500.000', geometryType: 'polyline' },
      { id: 3, name: '1:1.128', geometryType: 'polyline' },
    ],
  },
  {
    id: 'catastro-vial',
    name: 'Road Cadastre',
    nameEs: 'Catastro Vial',
    description: 'Detailed road inventory and cadastre data',
    descriptionEs: 'Inventario detallado y catastro de caminos',
    category: 'roads',
    provider: IDE_PROVIDERS.MOP,
    baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/VIALIDAD/Catastro_Vial/MapServer',
    serviceType: 'MapServer',
    tags: ['cadastre', 'inventory', 'roads'],
  },
  {
    id: 'estado-red-vial',
    name: 'Paved Road Network Status',
    nameEs: 'Estado Red Vial Pavimentada',
    description: 'Current status of paved road network',
    descriptionEs: 'Estado actual de la red vial pavimentada',
    category: 'roads',
    provider: IDE_PROVIDERS.MOP,
    baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/VIALIDAD/Estado_Red_Vial_Pavimentada/MapServer',
    serviceType: 'MapServer',
    tags: ['pavement', 'condition', 'status'],
  },
  {
    id: 'red-vial-estructurante',
    name: 'Structural Road Network',
    nameEs: 'Red Vial Estructurante',
    description: 'Main structural road network',
    descriptionEs: 'Red vial estructurante principal',
    category: 'roads',
    provider: IDE_PROVIDERS.MOP,
    baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/VIALIDAD/Red_Vial_Estructurante/MapServer',
    serviceType: 'MapServer',
    tags: ['highways', 'main roads', 'structure'],
  },

  // BRIDGES
  {
    id: 'puentes',
    name: 'Bridges',
    nameEs: 'Puentes',
    description: 'Location and information of bridges, viaducts, and overpasses',
    descriptionEs: 'Ubicación e información de puentes, viaductos y pasos sobre nivel',
    category: 'bridges',
    provider: IDE_PROVIDERS.MOP,
    baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/VIALIDAD/Puentes/MapServer',
    serviceType: 'MapServer',
    tags: ['bridges', 'viaducts', 'infrastructure'],
    layers: [
      { id: 0, name: 'Puentes', geometryType: 'point' },
    ],
  },
  {
    id: 'puentes-ruta5',
    name: 'Route 5 Bridges',
    nameEs: 'Puentes Ruta 5',
    description: 'Bridges along Route 5 (Pan-American Highway)',
    descriptionEs: 'Puentes a lo largo de la Ruta 5 (Panamericana)',
    category: 'bridges',
    provider: IDE_PROVIDERS.MOP,
    baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/VIALIDAD/Puentes_Ruta5/MapServer',
    serviceType: 'MapServer',
    tags: ['bridges', 'route5', 'panamericana'],
  },

  // INFRASTRUCTURE
  {
    id: 'infraestructura-vial',
    name: 'Road Infrastructure',
    nameEs: 'Infraestructura Vial',
    description: 'Toll plazas, weighing stations, tunnels, and ferries',
    descriptionEs: 'Plazas de peaje, plazas de pesaje, túneles y balsas',
    category: 'infrastructure',
    provider: IDE_PROVIDERS.MOP,
    baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/VIALIDAD/Infraestructura_Vial/MapServer',
    serviceType: 'MapServer',
    tags: ['toll', 'tunnel', 'ferry', 'weighing'],
    layers: [
      { id: 0, name: 'Plazas de Pesaje', geometryType: 'point' },
      { id: 1, name: 'Plazas de Peaje', geometryType: 'point' },
      { id: 2, name: 'Balsa', geometryType: 'point' },
      { id: 3, name: 'Túnel', geometryType: 'point' },
    ],
  },
  {
    id: 'pasos-fronterizos',
    name: 'Border Crossings',
    nameEs: 'Pasos Fronterizos',
    description: 'International border crossing points',
    descriptionEs: 'Puntos de cruce fronterizo internacional',
    category: 'infrastructure',
    provider: IDE_PROVIDERS.MOP,
    baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/VIALIDAD/Pasos_Fronterizos/MapServer',
    serviceType: 'MapServer',
    tags: ['border', 'international', 'crossing'],
  },
  {
    id: 'zonas-descanso',
    name: 'Rest Areas',
    nameEs: 'Zonas de Descanso',
    description: 'Highway rest areas and stops',
    descriptionEs: 'Áreas de descanso y paradas en carreteras',
    category: 'infrastructure',
    provider: IDE_PROVIDERS.MOP,
    baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/VIALIDAD/Zonas_de_Descanso/MapServer',
    serviceType: 'MapServer',
    tags: ['rest', 'stop', 'highway'],
  },

  // HYDRAULIC (DOH)
  {
    id: 'embalses',
    name: 'Dams and Reservoirs',
    nameEs: 'Embalses',
    description: 'Location of dams and reservoirs',
    descriptionEs: 'Ubicación de embalses y represas',
    category: 'hydraulic',
    provider: IDE_PROVIDERS.MOP,
    baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/DOH/Embalses/MapServer',
    serviceType: 'MapServer',
    tags: ['dams', 'reservoirs', 'water'],
    layers: [
      { id: 0, name: 'Catastro de Embalses', geometryType: 'point' },
    ],
  },
  {
    id: 'canales-cnr',
    name: 'Irrigation Canals',
    nameEs: 'Canales de Riego CNR',
    description: 'Irrigation canal network',
    descriptionEs: 'Red de canales de riego',
    category: 'hydraulic',
    provider: IDE_PROVIDERS.MOP,
    baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/DOH/Canales_CNR/MapServer',
    serviceType: 'MapServer',
    tags: ['canals', 'irrigation', 'water'],
  },
  {
    id: 'apr',
    name: 'Rural Potable Water',
    nameEs: 'Agua Potable Rural (APR)',
    description: 'Rural potable water systems',
    descriptionEs: 'Sistemas de agua potable rural',
    category: 'hydraulic',
    provider: IDE_PROVIDERS.MOP,
    baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/DOH/APR/MapServer',
    serviceType: 'MapServer',
    tags: ['water', 'rural', 'potable'],
  },

  // STORM WATER (DOH - Aguas Lluvias)
  {
    id: 'siall',
    name: 'Storm Water Infrastructure',
    nameEs: 'Infraestructura Aguas Lluvias (SIALL)',
    description: 'Storm water evacuation infrastructure: collectors, chambers, catch basins, discharge points',
    descriptionEs: 'Infraestructura de evacuación de aguas lluvias: colectores, cámaras, sumideros, descargas',
    category: 'stormwater',
    provider: IDE_PROVIDERS.MOP,
    baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/DOH/SIALL/MapServer',
    serviceType: 'MapServer',
    tags: ['stormwater', 'drainage', 'collectors', 'chambers', 'catch basins'],
    layers: [
      { id: 0, name: 'Colector', geometryType: 'polyline', description: 'Storm water collectors' },
      { id: 1, name: 'Infraestructura Aguas Lluvias', description: 'Storm water infrastructure group' },
      { id: 2, name: 'Descarga', geometryType: 'point', description: 'Discharge points' },
      { id: 3, name: 'Cámaras', geometryType: 'point', description: 'Access chambers' },
      { id: 4, name: 'Otras Obras (Puntos)', geometryType: 'point', description: 'Other point works' },
      { id: 5, name: 'Sumideros', geometryType: 'point', description: 'Catch basins/inlets' },
      { id: 6, name: 'Otras Obras', geometryType: 'polyline', description: 'Other linear works' },
      { id: 7, name: 'Información Complementaria', description: 'Complementary info group' },
      { id: 8, name: 'Zonas Plan Maestro', geometryType: 'polygon', description: 'Master plan zones' },
      { id: 9, name: 'Áreas Tributarias', geometryType: 'polygon', description: 'Tributary drainage areas' },
      { id: 10, name: 'Subareas Tributarias', geometryType: 'polygon', description: 'Sub-tributary areas' },
    ],
  },
  {
    id: 'siall-sc',
    name: 'Storm Water Infrastructure (SC)',
    nameEs: 'Infraestructura Aguas Lluvias SC',
    description: 'Storm water infrastructure - alternate service',
    descriptionEs: 'Infraestructura de aguas lluvias - servicio alternativo',
    category: 'stormwater',
    provider: IDE_PROVIDERS.MOP,
    baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/DOH/SIALL_SC/MapServer',
    serviceType: 'MapServer',
    tags: ['stormwater', 'drainage'],
  },

  // RURAL SANITATION (DOH)
  {
    id: 'ssr-ley20998',
    name: 'Rural Sanitation (Law 20998)',
    nameEs: 'Saneamiento Rural Ley 20.998',
    description: 'Rural sanitation systems classified under Law 20.998',
    descriptionEs: 'Sistemas de saneamiento rural clasificados según Ley 20.998',
    category: 'sanitation',
    provider: IDE_PROVIDERS.MOP,
    baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/DOH/SSR_Clasificados_Ley_20998/MapServer',
    serviceType: 'MapServer',
    tags: ['sanitation', 'rural', 'sewage', 'wastewater'],
  },
  {
    id: 'ssr-contratos',
    name: 'Rural Sanitation Contracts',
    nameEs: 'Contratos Saneamiento Rural',
    description: 'Rural sanitation project contracts',
    descriptionEs: 'Contratos de proyectos de saneamiento rural',
    category: 'sanitation',
    provider: IDE_PROVIDERS.MOP,
    baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/DOH/SSR_Contratos/MapServer',
    serviceType: 'MapServer',
    tags: ['sanitation', 'contracts', 'projects'],
  },

  // WATER RESOURCES (DGA)
  {
    id: 'red-hidrometrica',
    name: 'Hydrometric Network',
    nameEs: 'Red Hidrométrica',
    description: 'National hydrometric stations: fluviometry, meteorology, water quality, lakes, sediments, groundwater, snow, glaciology',
    descriptionEs: 'Estaciones hidrométricas nacionales: fluviometría, meteorología, calidad de agua, lagos, sedimentos, pozos, nieve, glaciología',
    category: 'water',
    provider: IDE_PROVIDERS.MOP,
    baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/DGA/Red_Hidrometrica/MapServer',
    serviceType: 'MapServer',
    tags: ['hydrology', 'monitoring', 'stations', 'precipitation', 'flow', 'temperature'],
    layers: [
      { id: 0, name: 'Tipo de Estación', geometryType: 'point', description: 'Station types: fluviometry, meteorology, water quality, lakes, sediments, wells, snow, glaciology' },
    ],
  },
  {
    id: 'alertas-dga',
    name: 'Flood Alerts (Real-time)',
    nameEs: 'Alertas de Crecidas (Tiempo Real)',
    description: 'Real-time flood alert levels from river flow monitoring - updates every 30 minutes via satellite',
    descriptionEs: 'Niveles de alerta de crecidas en tiempo real por monitoreo de caudales - actualización cada 30 minutos vía satélite',
    category: 'water',
    provider: IDE_PROVIDERS.MOP,
    baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/DGA/ALERTAS/MapServer',
    serviceType: 'MapServer',
    tags: ['alerts', 'floods', 'real-time', 'caudales', 'rivers'],
    layers: [
      { id: 0, name: 'Red Hidrometeorologica', geometryType: 'point', description: 'Fluviometric stations with alert levels' },
    ],
  },
  {
    id: 'estaciones-embalse',
    name: 'Reservoir Monitoring Stations',
    nameEs: 'Estaciones de Embalses',
    description: 'Monitoring stations at dams and reservoirs with water levels and volumes',
    descriptionEs: 'Estaciones de monitoreo en embalses con niveles y volúmenes de agua',
    category: 'water',
    provider: IDE_PROVIDERS.MOP,
    baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/DGA/ESTACION_EMBALSE/MapServer',
    serviceType: 'MapServer',
    tags: ['reservoirs', 'dams', 'water levels', 'monitoring'],
    layers: [
      { id: 0, name: 'Estaciones de Medición DGA', geometryType: 'point' },
    ],
  },
  {
    id: 'acuiferos-protegidos',
    name: 'Protected Aquifers',
    nameEs: 'Acuíferos Protegidos',
    description: 'Protected aquifer zones',
    descriptionEs: 'Zonas de acuíferos protegidos',
    category: 'water',
    provider: IDE_PROVIDERS.MOP,
    baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/DGA/Acuiferos_Protegidos/MapServer',
    serviceType: 'MapServer',
    tags: ['aquifer', 'groundwater', 'protection'],
  },
  {
    id: 'areas-restriccion',
    name: 'Restriction and Prohibition Zones',
    nameEs: 'Áreas de Restricción y Zonas de Prohibición',
    description: 'Water extraction restriction and prohibition zones',
    descriptionEs: 'Zonas de restricción y prohibición de extracción de agua',
    category: 'water',
    provider: IDE_PROVIDERS.MOP,
    baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/DGA/Areas_de_Restriccion_y_Zonas_de_Prohibicion/MapServer',
    serviceType: 'MapServer',
    tags: ['restriction', 'prohibition', 'water rights'],
  },
  {
    id: 'escasez-hidrica',
    name: 'Water Scarcity Decrees',
    nameEs: 'Decretos de Escasez Hídrica',
    description: 'Areas under water scarcity decrees',
    descriptionEs: 'Áreas bajo decretos de escasez hídrica',
    category: 'water',
    provider: IDE_PROVIDERS.MOP,
    baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/DGA/Decretos_Escasez_Hidrica/MapServer',
    serviceType: 'MapServer',
    tags: ['drought', 'scarcity', 'emergency'],
  },
  {
    id: 'declaracion-agotamiento',
    name: 'Water Depletion Declarations',
    nameEs: 'Declaración de Agotamiento',
    description: 'Areas with declared water source depletion',
    descriptionEs: 'Áreas con declaración de agotamiento de fuentes de agua',
    category: 'water',
    provider: IDE_PROVIDERS.MOP,
    baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/DGA/Declaracion_de_Agotamiento/MapServer',
    serviceType: 'MapServer',
    tags: ['depletion', 'water rights', 'scarcity'],
  },
  {
    id: 'caudales-reserva',
    name: 'Reserved Flow Decrees',
    nameEs: 'Decretos Caudales de Reserva',
    description: 'Ecological flow reserves and minimum flow requirements',
    descriptionEs: 'Reservas de caudal ecológico y requisitos de caudal mínimo',
    category: 'water',
    provider: IDE_PROVIDERS.MOP,
    baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/DGA/Decretos_Caudales_de_Reserva/MapServer',
    serviceType: 'MapServer',
    tags: ['ecological flow', 'reserves', 'environmental'],
  },
  {
    id: 'turberas-prohibicion',
    name: 'Peatland Drainage Prohibition',
    nameEs: 'Prohibición Drenajes en Turberas',
    description: 'Areas where peatland drainage is prohibited',
    descriptionEs: 'Áreas donde está prohibido el drenaje de turberas',
    category: 'water',
    provider: IDE_PROVIDERS.MOP,
    baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/DGA/Area_prohibicion_para_drenajes_en_turberas/MapServer',
    serviceType: 'MapServer',
    tags: ['peatland', 'wetlands', 'prohibition', 'environmental'],
  },

  // BASE MAPS
  {
    id: 'limites',
    name: 'Administrative Boundaries',
    nameEs: 'Límites Administrativos',
    description: 'Regional, provincial, and communal boundaries',
    descriptionEs: 'Límites regionales, provinciales y comunales',
    category: 'boundaries',
    provider: IDE_PROVIDERS.MOP,
    baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/MAPA_BASE/LIMITES/MapServer',
    serviceType: 'MapServer',
    tags: ['boundaries', 'regions', 'communes'],
  },
  {
    id: 'asentamientos',
    name: 'Settlements',
    nameEs: 'Asentamientos',
    description: 'Cities, towns, and settlements',
    descriptionEs: 'Ciudades, pueblos y asentamientos',
    category: 'basemap',
    provider: IDE_PROVIDERS.MOP,
    baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/MAPA_BASE/ASENTAMIENTOS/MapServer',
    serviceType: 'MapServer',
    tags: ['cities', 'towns', 'settlements'],
  },
  {
    id: 'red-hidrografica',
    name: 'Hydrographic Network',
    nameEs: 'Red Hidrográfica',
    description: 'Rivers, streams, and water bodies',
    descriptionEs: 'Ríos, esteros y cuerpos de agua',
    category: 'basemap',
    provider: IDE_PROVIDERS.MOP,
    baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/MAPA_BASE/RED_HIDROGRAFICA/MapServer',
    serviceType: 'MapServer',
    tags: ['rivers', 'streams', 'hydrology'],
  },
  {
    id: 'snaspe',
    name: 'Protected Areas (SNASPE)',
    nameEs: 'Áreas Protegidas (SNASPE)',
    description: 'National parks, reserves, and monuments',
    descriptionEs: 'Parques nacionales, reservas y monumentos',
    category: 'environment',
    provider: IDE_PROVIDERS.MOP,
    baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/MAPA_BASE/SNASPE/MapServer',
    serviceType: 'MapServer',
    tags: ['parks', 'reserves', 'protected'],
  },

  // EMERGENCY
  {
    id: 'emergencias-vialidad',
    name: 'Road Emergencies',
    nameEs: 'Emergencias Vialidad',
    description: 'Road emergency events and incidents',
    descriptionEs: 'Eventos de emergencia y incidentes viales',
    category: 'emergency',
    provider: IDE_PROVIDERS.MOP,
    baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/VIALIDAD/Emergencias_Vialidad/MapServer',
    serviceType: 'MapServer',
    tags: ['emergency', 'incidents', 'alerts'],
  },
];

// ============================================
// CATEGORY METADATA
// ============================================

export const IDE_CATEGORIES: Record<IDECategory, { name: string; nameEs: string; icon: string; color: string }> = {
  roads: { name: 'Roads', nameEs: 'Vialidad', icon: '🛣️', color: '#3B82F6' },
  bridges: { name: 'Bridges', nameEs: 'Puentes', icon: '🌉', color: '#8B5CF6' },
  hydraulic: { name: 'Hydraulic Works', nameEs: 'Obras Hidráulicas', icon: '🚰', color: '#06B6D4' },
  water: { name: 'Water Resources', nameEs: 'Recursos Hídricos', icon: '💧', color: '#0EA5E9' },
  stormwater: { name: 'Storm Water', nameEs: 'Aguas Lluvias', icon: '🌧️', color: '#64748B' },
  sanitation: { name: 'Rural Sanitation', nameEs: 'Saneamiento Rural', icon: '🚿', color: '#14B8A6' },
  basemap: { name: 'Base Maps', nameEs: 'Mapas Base', icon: '🗺️', color: '#6B7280' },
  boundaries: { name: 'Boundaries', nameEs: 'Límites', icon: '📍', color: '#F59E0B' },
  infrastructure: { name: 'Infrastructure', nameEs: 'Infraestructura', icon: '🏗️', color: '#10B981' },
  emergency: { name: 'Emergency', nameEs: 'Emergencias', icon: '🚨', color: '#EF4444' },
  environment: { name: 'Environment', nameEs: 'Medio Ambiente', icon: '🌿', color: '#22C55E' },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getServicesByCategory(category: IDECategory): IDEService[] {
  return IDE_SERVICES.filter(s => s.category === category);
}

export function getServicesByProvider(providerId: string): IDEService[] {
  return IDE_SERVICES.filter(s => s.provider.id === providerId);
}

export function searchServices(query: string): IDEService[] {
  const lowerQuery = query.toLowerCase();
  return IDE_SERVICES.filter(s =>
    s.name.toLowerCase().includes(lowerQuery) ||
    s.nameEs.toLowerCase().includes(lowerQuery) ||
    s.description.toLowerCase().includes(lowerQuery) ||
    s.descriptionEs.toLowerCase().includes(lowerQuery) ||
    s.tags.some(t => t.toLowerCase().includes(lowerQuery))
  );
}

export function buildQueryUrl(service: IDEService, layerId: number, params: IDEQueryParams): string {
  const baseUrl = `${service.baseUrl}/${layerId}/query`;
  const searchParams = new URLSearchParams();

  if (params.bbox) {
    const { west, south, east, north } = params.bbox;
    searchParams.set('geometry', `${west},${south},${east},${north}`);
    searchParams.set('geometryType', 'esriGeometryEnvelope');
    searchParams.set('spatialRel', 'esriSpatialRelIntersects');
    searchParams.set('inSR', '4326');
    searchParams.set('outSR', '4326');
  }

  searchParams.set('where', params.where || '1=1');
  searchParams.set('outFields', params.outFields?.join(',') || '*');
  searchParams.set('returnGeometry', String(params.returnGeometry ?? true));
  searchParams.set('resultRecordCount', String(params.maxRecords || 1000));
  searchParams.set('f', params.format || 'geojson');

  return `${baseUrl}?${searchParams.toString()}`;
}

export function buildWmsUrl(service: IDEService): string {
  // Convert MapServer URL to WMS URL
  return service.baseUrl.replace('/MapServer', '/MapServer/WMSServer');
}
