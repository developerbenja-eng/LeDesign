/**
 * Regional Stormwater Data Library
 * Biobío and Ñuble Regions, Chile
 *
 * Contains:
 * - Soil types and permeability data
 * - Runoff coefficients for different land uses
 * - Design standards and regulations
 * - SUDS techniques and recommendations
 *
 * Based on research from:
 * - MINVU Technical Guides
 * - Universidad de Talca / FONDEF D08I1054
 * - Universidad del Bío-Bío soil studies
 * - CEDEUS sustainable drainage research
 */

// ============================================
// SOIL TYPES AND PERMEABILITY
// ============================================

export type SoilGroup = 'A' | 'B' | 'C' | 'D';

export interface SoilType {
  id: string;
  name: string;
  nameEs: string;
  description: string;
  descriptionEs: string;
  group: SoilGroup;
  permeability: 'very_rapid' | 'rapid' | 'moderate' | 'slow' | 'very_slow';
  infiltrationRate: { min: number; max: number }; // mm/hr
  saturatedHydraulicConductivity: { min: number; max: number }; // mm/hr
  suitableForInfiltration: boolean;
  commonLocations: string[];
  characteristics: string[];
}

export const SOIL_TYPES: SoilType[] = [
  {
    id: 'trumao',
    name: 'Trumao (Volcanic Ash)',
    nameEs: 'Trumao (Ceniza Volcánica)',
    description: 'Volcanic ash soils with excellent drainage and high organic matter',
    descriptionEs: 'Suelos de ceniza volcánica con excelente drenaje y alta materia orgánica',
    group: 'A',
    permeability: 'very_rapid',
    infiltrationRate: { min: 25, max: 75 },
    saturatedHydraulicConductivity: { min: 50, max: 150 },
    suitableForInfiltration: true,
    commonLocations: ['Precordillera', 'Lomajes andinos', 'Ñuble oriental'],
    characteristics: [
      'Franco-arenosos muy finos o franco-limosos',
      'Alta presencia de materia orgánica',
      'Alta conductividad hidráulica por macroporos',
      'Buena a muy buena permeabilidad',
    ],
  },
  {
    id: 'franco_arenoso',
    name: 'Sandy Loam',
    nameEs: 'Franco Arenoso',
    description: 'Well-drained soils common in the longitudinal valley',
    descriptionEs: 'Suelos bien drenados comunes en el valle longitudinal',
    group: 'A',
    permeability: 'rapid',
    infiltrationRate: { min: 15, max: 40 },
    saturatedHydraulicConductivity: { min: 25, max: 75 },
    suitableForInfiltration: true,
    commonLocations: ['Valle Longitudinal', 'Depresión Intermedia', 'Chillán'],
    characteristics: [
      'Textura arena 2.00-0.05 mm dominante',
      'Baja capacidad retención agua',
      'Drenaje rápido',
      'Buena infiltración',
    ],
  },
  {
    id: 'franco_limoso',
    name: 'Silty Loam',
    nameEs: 'Franco Limoso',
    description: 'Moderate drainage soils with good water retention',
    descriptionEs: 'Suelos de drenaje moderado con buena retención de agua',
    group: 'B',
    permeability: 'moderate',
    infiltrationRate: { min: 8, max: 20 },
    saturatedHydraulicConductivity: { min: 10, max: 40 },
    suitableForInfiltration: true,
    commonLocations: ['San Carlos', 'Pinto', 'San Ignacio', 'El Carmen', 'Pemuco'],
    characteristics: [
      'Textura limo 0.05-0.002 mm',
      'Buena infiltración',
      'Retención moderada de agua',
      '31.52% de la región de Ñuble',
    ],
  },
  {
    id: 'franco_arcilloso',
    name: 'Clay Loam',
    nameEs: 'Franco Arcilloso',
    description: 'Moderate to slow drainage, mixed texture',
    descriptionEs: 'Drenaje moderado a lento, textura mixta',
    group: 'C',
    permeability: 'slow',
    infiltrationRate: { min: 2, max: 8 },
    saturatedHydraulicConductivity: { min: 2, max: 15 },
    suitableForInfiltration: false,
    commonLocations: ['Zonas bajas', 'Cercanías a ríos'],
    characteristics: [
      'Mezcla de partículas finas y medias',
      'Retención alta de humedad',
      'Infiltración limitada',
      'Requiere obras de retención',
    ],
  },
  {
    id: 'arcilloso',
    name: 'Clay',
    nameEs: 'Arcilloso',
    description: 'Poor drainage soils, high water retention',
    descriptionEs: 'Suelos de mal drenaje, alta retención de agua',
    group: 'D',
    permeability: 'very_slow',
    infiltrationRate: { min: 0, max: 2 },
    saturatedHydraulicConductivity: { min: 0.5, max: 5 },
    suitableForInfiltration: false,
    commonLocations: ['Planicies de inundación', 'Humedales', 'Zonas costeras'],
    characteristics: [
      'Textura arcilla < 0.002 mm',
      'Alta capacidad retención humedad',
      'Permeabilidad muy limitada',
      'Suelos problemáticos para infiltración',
    ],
  },
];

// ============================================
// RUNOFF COEFFICIENTS
// ============================================

export interface RunoffCoefficientEntry {
  id: string;
  category: string;
  categoryEs: string;
  description: string;
  descriptionEs: string;
  cMin: number;
  cMax: number;
  cTypical: number;
  applicableTo: string[];
}

export const RUNOFF_COEFFICIENTS: RunoffCoefficientEntry[] = [
  // Impervious surfaces
  {
    id: 'roof_metal',
    category: 'Roofs',
    categoryEs: 'Techos',
    description: 'Metal or tile roofs',
    descriptionEs: 'Techos de metal o teja',
    cMin: 0.90,
    cMax: 0.95,
    cTypical: 0.93,
    applicableTo: ['residential', 'commercial', 'industrial'],
  },
  {
    id: 'roof_flat',
    category: 'Roofs',
    categoryEs: 'Techos',
    description: 'Flat concrete roofs',
    descriptionEs: 'Techos planos de hormigón',
    cMin: 0.85,
    cMax: 0.90,
    cTypical: 0.87,
    applicableTo: ['commercial', 'industrial'],
  },
  {
    id: 'asphalt',
    category: 'Pavement',
    categoryEs: 'Pavimento',
    description: 'Asphalt pavement',
    descriptionEs: 'Pavimento asfáltico',
    cMin: 0.85,
    cMax: 0.95,
    cTypical: 0.90,
    applicableTo: ['roads', 'parking'],
  },
  {
    id: 'concrete',
    category: 'Pavement',
    categoryEs: 'Pavimento',
    description: 'Concrete pavement',
    descriptionEs: 'Pavimento de hormigón',
    cMin: 0.85,
    cMax: 0.95,
    cTypical: 0.90,
    applicableTo: ['roads', 'sidewalks', 'parking'],
  },
  {
    id: 'cobblestone',
    category: 'Pavement',
    categoryEs: 'Pavimento',
    description: 'Cobblestone or brick pavers',
    descriptionEs: 'Adoquín o ladrillo',
    cMin: 0.70,
    cMax: 0.85,
    cTypical: 0.78,
    applicableTo: ['sidewalks', 'plazas', 'parking'],
  },
  {
    id: 'gravel',
    category: 'Semi-pervious',
    categoryEs: 'Semi-permeable',
    description: 'Compacted gravel',
    descriptionEs: 'Grava compactada',
    cMin: 0.30,
    cMax: 0.50,
    cTypical: 0.40,
    applicableTo: ['roads', 'parking', 'paths'],
  },
  {
    id: 'permeable_paver',
    category: 'Permeable',
    categoryEs: 'Permeable',
    description: 'Permeable pavers',
    descriptionEs: 'Pavimento permeable',
    cMin: 0.10,
    cMax: 0.30,
    cTypical: 0.20,
    applicableTo: ['parking', 'sidewalks', 'plazas'],
  },
  // Green areas
  {
    id: 'grass_flat',
    category: 'Vegetation',
    categoryEs: 'Vegetación',
    description: 'Grass on flat terrain (< 2%)',
    descriptionEs: 'Césped en terreno plano (< 2%)',
    cMin: 0.10,
    cMax: 0.20,
    cTypical: 0.15,
    applicableTo: ['parks', 'gardens', 'lawns'],
  },
  {
    id: 'grass_slope',
    category: 'Vegetation',
    categoryEs: 'Vegetación',
    description: 'Grass on sloped terrain (2-7%)',
    descriptionEs: 'Césped en terreno inclinado (2-7%)',
    cMin: 0.20,
    cMax: 0.35,
    cTypical: 0.27,
    applicableTo: ['parks', 'slopes'],
  },
  {
    id: 'grass_steep',
    category: 'Vegetation',
    categoryEs: 'Vegetación',
    description: 'Grass on steep terrain (> 7%)',
    descriptionEs: 'Césped en terreno empinado (> 7%)',
    cMin: 0.30,
    cMax: 0.45,
    cTypical: 0.37,
    applicableTo: ['hills', 'embankments'],
  },
  {
    id: 'forest',
    category: 'Vegetation',
    categoryEs: 'Vegetación',
    description: 'Forest or dense vegetation',
    descriptionEs: 'Bosque o vegetación densa',
    cMin: 0.05,
    cMax: 0.15,
    cTypical: 0.10,
    applicableTo: ['natural_areas', 'reserves'],
  },
  {
    id: 'agricultural',
    category: 'Agricultural',
    categoryEs: 'Agrícola',
    description: 'Cultivated land',
    descriptionEs: 'Tierra cultivada',
    cMin: 0.20,
    cMax: 0.40,
    cTypical: 0.30,
    applicableTo: ['farms', 'orchards'],
  },
  // Composite urban areas
  {
    id: 'residential_low',
    category: 'Urban',
    categoryEs: 'Urbano',
    description: 'Low density residential (> 1000 m²/lot)',
    descriptionEs: 'Residencial baja densidad (> 1000 m²/lote)',
    cMin: 0.30,
    cMax: 0.50,
    cTypical: 0.40,
    applicableTo: ['residential'],
  },
  {
    id: 'residential_medium',
    category: 'Urban',
    categoryEs: 'Urbano',
    description: 'Medium density residential (500-1000 m²/lot)',
    descriptionEs: 'Residencial densidad media (500-1000 m²/lote)',
    cMin: 0.50,
    cMax: 0.70,
    cTypical: 0.60,
    applicableTo: ['residential'],
  },
  {
    id: 'residential_high',
    category: 'Urban',
    categoryEs: 'Urbano',
    description: 'High density residential (< 500 m²/lot)',
    descriptionEs: 'Residencial alta densidad (< 500 m²/lote)',
    cMin: 0.65,
    cMax: 0.80,
    cTypical: 0.72,
    applicableTo: ['residential'],
  },
  {
    id: 'commercial',
    category: 'Urban',
    categoryEs: 'Urbano',
    description: 'Commercial areas',
    descriptionEs: 'Áreas comerciales',
    cMin: 0.70,
    cMax: 0.95,
    cTypical: 0.85,
    applicableTo: ['commercial'],
  },
  {
    id: 'industrial',
    category: 'Urban',
    categoryEs: 'Urbano',
    description: 'Industrial areas',
    descriptionEs: 'Áreas industriales',
    cMin: 0.70,
    cMax: 0.90,
    cTypical: 0.80,
    applicableTo: ['industrial'],
  },
  {
    id: 'urban_weighted',
    category: 'Urban',
    categoryEs: 'Urbano',
    description: 'Typical urban weighted average',
    descriptionEs: 'Promedio ponderado urbano típico',
    cMin: 0.60,
    cMax: 0.80,
    cTypical: 0.70,
    applicableTo: ['urban_mixed'],
  },
];

// ============================================
// DESIGN STANDARDS (CHILEAN REGULATIONS)
// ============================================

export interface DesignStandard {
  id: string;
  name: string;
  nameEs: string;
  category: 'stormwater' | 'sewerage' | 'hydraulic' | 'roads';
  returnPeriod: number;
  description: string;
  descriptionEs: string;
  source: string;
  notes?: string;
}

export const DESIGN_STANDARDS_CHILE: DesignStandard[] = [
  // Stormwater - Minor System
  {
    id: 'minor_drainage_local',
    name: 'Local streets - Minor drainage',
    nameEs: 'Calles locales - Drenaje menor',
    category: 'stormwater',
    returnPeriod: 2,
    description: 'Minor drainage for local residential streets',
    descriptionEs: 'Drenaje menor para calles residenciales locales',
    source: 'MOP - Manual de Carreteras',
  },
  {
    id: 'minor_drainage_collector',
    name: 'Collector streets - Minor drainage',
    nameEs: 'Calles colectoras - Drenaje menor',
    category: 'stormwater',
    returnPeriod: 5,
    description: 'Minor drainage for collector streets',
    descriptionEs: 'Drenaje menor para calles colectoras',
    source: 'MOP - Manual de Carreteras',
  },
  // Stormwater - Major System
  {
    id: 'major_drainage_secondary',
    name: 'Secondary collectors',
    nameEs: 'Colectores secundarios',
    category: 'stormwater',
    returnPeriod: 10,
    description: 'Major drainage system - secondary network',
    descriptionEs: 'Sistema de drenaje mayor - red secundaria',
    source: 'Ley 19.525 / SERVIU',
  },
  {
    id: 'major_drainage_primary',
    name: 'Primary collectors',
    nameEs: 'Colectores primarios',
    category: 'stormwater',
    returnPeriod: 25,
    description: 'Major drainage system - primary network',
    descriptionEs: 'Sistema de drenaje mayor - red primaria',
    source: 'Ley 19.525 / DOH',
  },
  {
    id: 'flood_control',
    name: 'Flood control infrastructure',
    nameEs: 'Infraestructura control inundaciones',
    category: 'stormwater',
    returnPeriod: 100,
    description: 'Critical flood control structures',
    descriptionEs: 'Estructuras críticas de control de inundaciones',
    source: 'DOH - Planes Maestros',
  },
  // Sewerage
  {
    id: 'sewer_secondary',
    name: 'Secondary sewer network',
    nameEs: 'Red de alcantarillado secundaria',
    category: 'sewerage',
    returnPeriod: 5,
    description: 'Secondary sewerage collection',
    descriptionEs: 'Recolección de alcantarillado secundaria',
    source: 'SISS Normas',
  },
  {
    id: 'sewer_primary',
    name: 'Primary sewer network',
    nameEs: 'Red de alcantarillado primaria',
    category: 'sewerage',
    returnPeriod: 10,
    description: 'Primary sewerage collection',
    descriptionEs: 'Recolección de alcantarillado primaria',
    source: 'SISS Normas',
  },
  {
    id: 'sewer_trunk',
    name: 'Trunk sewer collectors',
    nameEs: 'Colectores troncales',
    category: 'sewerage',
    returnPeriod: 25,
    description: 'Main trunk sewer lines',
    descriptionEs: 'Líneas troncales principales de alcantarillado',
    source: 'SISS Normas',
  },
  // Hydraulic structures
  {
    id: 'culvert_minor',
    name: 'Minor culverts',
    nameEs: 'Alcantarillas menores',
    category: 'hydraulic',
    returnPeriod: 25,
    description: 'Small road culverts',
    descriptionEs: 'Alcantarillas pequeñas de caminos',
    source: 'MOP - Manual de Carreteras Vol. 3',
  },
  {
    id: 'bridge_minor',
    name: 'Minor bridges',
    nameEs: 'Puentes menores',
    category: 'hydraulic',
    returnPeriod: 50,
    description: 'Bridges on secondary roads',
    descriptionEs: 'Puentes en caminos secundarios',
    source: 'MOP - Manual de Carreteras',
  },
  {
    id: 'bridge_major',
    name: 'Major bridges',
    nameEs: 'Puentes mayores',
    category: 'hydraulic',
    returnPeriod: 100,
    description: 'Bridges on primary roads and highways',
    descriptionEs: 'Puentes en rutas principales y autopistas',
    source: 'MOP - Manual de Carreteras',
  },
  {
    id: 'dam_spillway',
    name: 'Dam spillways',
    nameEs: 'Vertederos de presas',
    category: 'hydraulic',
    returnPeriod: 1000,
    description: 'Dam spillway design (PMF)',
    descriptionEs: 'Diseño de vertederos de presas (CMP)',
    source: 'DGA - Normas de Presas',
    notes: 'May require PMF analysis',
  },
];

// ============================================
// SUDS TECHNIQUES
// ============================================

export interface SUDSTechnique {
  id: string;
  name: string;
  nameEs: string;
  category: 'source_control' | 'infiltration' | 'detention' | 'conveyance' | 'treatment';
  description: string;
  descriptionEs: string;
  primaryFunction: string[];
  suitableSoilGroups: SoilGroup[];
  minPermeability: number; // mm/hr
  typicalArea: { min: number; max: number }; // m²
  typicalDepth: { min: number; max: number }; // m
  maintenanceLevel: 'low' | 'medium' | 'high';
  costLevel: 'low' | 'medium' | 'high';
  advantages: string[];
  disadvantages: string[];
  applicableContexts: string[];
  designParameters?: Record<string, { min: number; max: number; unit: string }>;
}

export const SUDS_TECHNIQUES: SUDSTechnique[] = [
  {
    id: 'infiltration_trench',
    name: 'Infiltration Trench',
    nameEs: 'Zanja de Infiltración',
    category: 'infiltration',
    description: 'Shallow excavation filled with gravel for temporary storage and infiltration',
    descriptionEs: 'Excavación poco profunda rellena de grava para almacenamiento temporal e infiltración',
    primaryFunction: ['peak_reduction', 'volume_reduction', 'groundwater_recharge'],
    suitableSoilGroups: ['A', 'B'],
    minPermeability: 13,
    typicalArea: { min: 10, max: 500 },
    typicalDepth: { min: 0.3, max: 1.5 },
    maintenanceLevel: 'medium',
    costLevel: 'low',
    advantages: [
      'Reduces runoff volume',
      'Recharges groundwater',
      'Low visual impact',
      'Can be integrated under parking/paths',
    ],
    disadvantages: [
      'Requires permeable soil',
      'Risk of clogging',
      'Not suitable for contaminated runoff',
    ],
    applicableContexts: ['residential', 'commercial', 'parking', 'roads'],
    designParameters: {
      width: { min: 0.2, max: 1.0, unit: 'm' },
      depth: { min: 0.3, max: 1.5, unit: 'm' },
      porosity: { min: 0.3, max: 0.4, unit: '' },
      percolationRate: { min: 13, max: 150, unit: 'mm/hr' },
    },
  },
  {
    id: 'infiltration_well',
    name: 'Infiltration Well (Soakaway)',
    nameEs: 'Pozo de Infiltración',
    category: 'infiltration',
    description: 'Vertical structure for point infiltration of roof/lot runoff',
    descriptionEs: 'Estructura vertical para infiltración puntual de escorrentía de techos/lotes',
    primaryFunction: ['peak_reduction', 'volume_reduction', 'groundwater_recharge'],
    suitableSoilGroups: ['A', 'B'],
    minPermeability: 13,
    typicalArea: { min: 1, max: 10 },
    typicalDepth: { min: 1.0, max: 3.0 },
    maintenanceLevel: 'low',
    costLevel: 'low',
    advantages: [
      'Small footprint',
      'Good for individual lots',
      'Easy construction',
    ],
    disadvantages: [
      'Limited capacity',
      'Risk of clogging',
      'Needs pretreatment',
    ],
    applicableContexts: ['residential_lot', 'roof_drainage'],
    designParameters: {
      diameter: { min: 0.6, max: 2.0, unit: 'm' },
      depth: { min: 1.0, max: 3.0, unit: 'm' },
    },
  },
  {
    id: 'permeable_pavement',
    name: 'Permeable Pavement',
    nameEs: 'Pavimento Permeable',
    category: 'infiltration',
    description: 'Paving system that allows water to infiltrate through surface',
    descriptionEs: 'Sistema de pavimento que permite la infiltración de agua a través de la superficie',
    primaryFunction: ['peak_reduction', 'volume_reduction', 'treatment'],
    suitableSoilGroups: ['A', 'B', 'C'],
    minPermeability: 5,
    typicalArea: { min: 50, max: 5000 },
    typicalDepth: { min: 0.3, max: 0.8 },
    maintenanceLevel: 'medium',
    costLevel: 'medium',
    advantages: [
      'Multi-functional (parking + drainage)',
      'Reduces heat island effect',
      'Good aesthetics',
    ],
    disadvantages: [
      'Higher initial cost',
      'Requires regular maintenance',
      'Not for heavy traffic',
    ],
    applicableContexts: ['parking', 'sidewalks', 'plazas', 'low_traffic_roads'],
    designParameters: {
      surfacePermeability: { min: 100, max: 500, unit: 'mm/hr' },
      baseDepth: { min: 0.2, max: 0.5, unit: 'm' },
      subbaseDepth: { min: 0.1, max: 0.3, unit: 'm' },
    },
  },
  {
    id: 'bioretention',
    name: 'Bioretention / Rain Garden',
    nameEs: 'Bioretención / Jardín de Lluvia',
    category: 'treatment',
    description: 'Vegetated depression that treats and infiltrates runoff',
    descriptionEs: 'Depresión vegetada que trata e infiltra la escorrentía',
    primaryFunction: ['treatment', 'peak_reduction', 'volume_reduction', 'aesthetics'],
    suitableSoilGroups: ['A', 'B', 'C'],
    minPermeability: 5,
    typicalArea: { min: 20, max: 1000 },
    typicalDepth: { min: 0.15, max: 0.30 },
    maintenanceLevel: 'medium',
    costLevel: 'medium',
    advantages: [
      'Excellent water quality treatment',
      'Aesthetic value',
      'Habitat creation',
      'Can work on less permeable soils with underdrain',
    ],
    disadvantages: [
      'Requires landscaping maintenance',
      'Larger footprint than trenches',
      'Plant selection important',
    ],
    applicableContexts: ['residential', 'commercial', 'parks', 'roads'],
    designParameters: {
      pondingDepth: { min: 0.15, max: 0.30, unit: 'm' },
      filterMediaDepth: { min: 0.5, max: 1.2, unit: 'm' },
      drainageLayerDepth: { min: 0.2, max: 0.3, unit: 'm' },
    },
  },
  {
    id: 'swale',
    name: 'Vegetated Swale',
    nameEs: 'Cuneta Verde / Zanja Vegetada',
    category: 'conveyance',
    description: 'Vegetated channel for slow conveyance with infiltration',
    descriptionEs: 'Canal vegetado para conducción lenta con infiltración',
    primaryFunction: ['conveyance', 'treatment', 'volume_reduction'],
    suitableSoilGroups: ['A', 'B', 'C'],
    minPermeability: 3,
    typicalArea: { min: 50, max: 2000 },
    typicalDepth: { min: 0.3, max: 0.6 },
    maintenanceLevel: 'low',
    costLevel: 'low',
    advantages: [
      'Low cost',
      'Easy construction',
      'Natural appearance',
      'Combines conveyance + treatment',
    ],
    disadvantages: [
      'Requires linear space',
      'Limited capacity',
      'Vegetation maintenance',
    ],
    applicableContexts: ['roads', 'parking', 'residential', 'parks'],
    designParameters: {
      bottomWidth: { min: 0.5, max: 2.0, unit: 'm' },
      sideSlope: { min: 3, max: 5, unit: ':1' },
      longitudinalSlope: { min: 0.5, max: 4, unit: '%' },
      maxVelocity: { min: 0.3, max: 0.6, unit: 'm/s' },
    },
  },
  {
    id: 'filter_strip',
    name: 'Filter Strip',
    nameEs: 'Franja Filtrante',
    category: 'treatment',
    description: 'Vegetated strip for sheet flow treatment',
    descriptionEs: 'Franja vegetada para tratamiento de flujo laminar',
    primaryFunction: ['treatment', 'volume_reduction'],
    suitableSoilGroups: ['A', 'B', 'C', 'D'],
    minPermeability: 0,
    typicalArea: { min: 30, max: 500 },
    typicalDepth: { min: 0, max: 0.1 },
    maintenanceLevel: 'low',
    costLevel: 'low',
    advantages: [
      'Very low cost',
      'Simple design',
      'Works on any soil',
      'Good sediment removal',
    ],
    disadvantages: [
      'Requires sheet flow',
      'Large area needed',
      'Limited pollutant removal',
    ],
    applicableContexts: ['roads', 'parking', 'agriculture'],
    designParameters: {
      width: { min: 5, max: 30, unit: 'm' },
      slope: { min: 1, max: 6, unit: '%' },
      grassHeight: { min: 0.05, max: 0.15, unit: 'm' },
    },
  },
  {
    id: 'detention_basin',
    name: 'Detention Basin (Dry)',
    nameEs: 'Laguna de Detención (Seca)',
    category: 'detention',
    description: 'Basin that temporarily stores runoff and releases slowly',
    descriptionEs: 'Laguna que almacena temporalmente la escorrentía y la libera lentamente',
    primaryFunction: ['peak_reduction'],
    suitableSoilGroups: ['A', 'B', 'C', 'D'],
    minPermeability: 0,
    typicalArea: { min: 500, max: 50000 },
    typicalDepth: { min: 1.0, max: 3.0 },
    maintenanceLevel: 'medium',
    costLevel: 'medium',
    advantages: [
      'Large capacity',
      'Works on any soil',
      'Can be multi-use (recreation)',
      'Effective peak reduction',
    ],
    disadvantages: [
      'Large footprint',
      'Safety concerns (fencing)',
      'Sediment accumulation',
    ],
    applicableContexts: ['neighborhood', 'catchment', 'parks'],
    designParameters: {
      storagevolume: { min: 100, max: 50000, unit: 'm³' },
      outletSize: { min: 0.1, max: 1.0, unit: 'm' },
      emptyingTime: { min: 24, max: 72, unit: 'hr' },
    },
  },
  {
    id: 'retention_pond',
    name: 'Retention Pond (Wet)',
    nameEs: 'Laguna de Retención (Húmeda)',
    category: 'detention',
    description: 'Permanent pool with additional storage for storm events',
    descriptionEs: 'Piscina permanente con almacenamiento adicional para tormentas',
    primaryFunction: ['peak_reduction', 'treatment', 'aesthetics'],
    suitableSoilGroups: ['C', 'D'],
    minPermeability: 0,
    typicalArea: { min: 1000, max: 100000 },
    typicalDepth: { min: 1.5, max: 4.0 },
    maintenanceLevel: 'medium',
    costLevel: 'high',
    advantages: [
      'Excellent treatment',
      'Aesthetic/recreational value',
      'Habitat creation',
      'Large capacity',
    ],
    disadvantages: [
      'Large footprint',
      'Requires permanent water source',
      'Algae/mosquito concerns',
      'Safety requirements',
    ],
    applicableContexts: ['parks', 'large_developments', 'catchment'],
    designParameters: {
      permanentPoolDepth: { min: 1.0, max: 2.5, unit: 'm' },
      floodStorageDepth: { min: 0.5, max: 1.5, unit: 'm' },
      residenceTime: { min: 14, max: 30, unit: 'days' },
    },
  },
  {
    id: 'green_roof',
    name: 'Green Roof',
    nameEs: 'Techo Verde',
    category: 'source_control',
    description: 'Vegetated roof system for source control',
    descriptionEs: 'Sistema de techo vegetado para control en origen',
    primaryFunction: ['peak_reduction', 'volume_reduction', 'treatment'],
    suitableSoilGroups: ['A', 'B', 'C', 'D'],
    minPermeability: 0,
    typicalArea: { min: 20, max: 5000 },
    typicalDepth: { min: 0.08, max: 0.30 },
    maintenanceLevel: 'medium',
    costLevel: 'high',
    advantages: [
      'No additional land needed',
      'Insulation benefits',
      'Urban heat reduction',
      'Aesthetic value',
    ],
    disadvantages: [
      'High initial cost',
      'Structural requirements',
      'Irrigation may be needed',
    ],
    applicableContexts: ['commercial', 'industrial', 'residential'],
    designParameters: {
      substrateDepth: { min: 0.08, max: 0.30, unit: 'm' },
      drainageLayerDepth: { min: 0.02, max: 0.05, unit: 'm' },
      retentionCapacity: { min: 10, max: 50, unit: 'mm' },
    },
  },
  {
    id: 'rainwater_tank',
    name: 'Rainwater Harvesting Tank',
    nameEs: 'Estanque de Cosecha de Agua Lluvia',
    category: 'source_control',
    description: 'Tank for storing rainwater for reuse',
    descriptionEs: 'Estanque para almacenar agua lluvia para reutilización',
    primaryFunction: ['volume_reduction', 'water_reuse'],
    suitableSoilGroups: ['A', 'B', 'C', 'D'],
    minPermeability: 0,
    typicalArea: { min: 1, max: 50 },
    typicalDepth: { min: 1, max: 3 },
    maintenanceLevel: 'low',
    costLevel: 'medium',
    advantages: [
      'Water reuse (irrigation, toilet)',
      'Reduces demand on supply',
      'Volume reduction',
    ],
    disadvantages: [
      'Requires pump for pressure',
      'Limited peak reduction unless managed',
      'Maintenance of filters',
    ],
    applicableContexts: ['residential', 'commercial', 'industrial'],
    designParameters: {
      tankVolume: { min: 0.5, max: 100, unit: 'm³' },
      roofArea: { min: 20, max: 2000, unit: 'm²' },
    },
  },
];

// ============================================
// TYPICAL DURATIONS FOR DESIGN
// ============================================

export interface TypicalDuration {
  id: string;
  areaType: string;
  areaTypeEs: string;
  areaRange: { min: number; max: number }; // hectares
  durationMinutes: number;
  description: string;
}

export const TYPICAL_DURATIONS: TypicalDuration[] = [
  {
    id: 'urban_small',
    areaType: 'Small urban area',
    areaTypeEs: 'Área urbana pequeña',
    areaRange: { min: 0, max: 5 },
    durationMinutes: 15,
    description: 'Individual lots, small blocks',
  },
  {
    id: 'suburban',
    areaType: 'Suburban area',
    areaTypeEs: 'Área suburbana',
    areaRange: { min: 5, max: 50 },
    durationMinutes: 30,
    description: 'Neighborhoods, subdivisions',
  },
  {
    id: 'catchment_small',
    areaType: 'Small catchment',
    areaTypeEs: 'Cuenca pequeña',
    areaRange: { min: 50, max: 500 },
    durationMinutes: 60,
    description: 'Local watersheds',
  },
  {
    id: 'catchment_medium',
    areaType: 'Medium catchment',
    areaTypeEs: 'Cuenca media',
    areaRange: { min: 500, max: 2000 },
    durationMinutes: 360,
    description: 'Urban streams, channels',
  },
  {
    id: 'catchment_large',
    areaType: 'Large catchment',
    areaTypeEs: 'Cuenca grande',
    areaRange: { min: 2000, max: 10000 },
    durationMinutes: 720,
    description: 'Rivers, major drainages',
  },
];

// ============================================
// VELOCITY LIMITS
// ============================================

export interface VelocityLimit {
  channelType: string;
  channelTypeEs: string;
  maxVelocity: number; // m/s
  minVelocity: number; // m/s
  notes: string;
}

export const VELOCITY_LIMITS: VelocityLimit[] = [
  {
    channelType: 'Concrete pipe',
    channelTypeEs: 'Tubería de hormigón',
    maxVelocity: 4.0,
    minVelocity: 0.6,
    notes: 'Self-cleaning velocity at min',
  },
  {
    channelType: 'Concrete channel',
    channelTypeEs: 'Canal de hormigón',
    maxVelocity: 4.0,
    minVelocity: 0.5,
    notes: 'Avoid erosion at joints',
  },
  {
    channelType: 'Collector (urban)',
    channelTypeEs: 'Colector (urbano)',
    maxVelocity: 2.0,
    minVelocity: 0.6,
    notes: 'MINVU standard',
  },
  {
    channelType: 'Earth channel',
    channelTypeEs: 'Canal en tierra',
    maxVelocity: 1.2,
    minVelocity: 0.3,
    notes: 'Depends on soil type',
  },
  {
    channelType: 'Grass swale',
    channelTypeEs: 'Cuneta verde',
    maxVelocity: 0.6,
    minVelocity: 0.1,
    notes: 'For infiltration benefit',
  },
  {
    channelType: 'Riprap channel',
    channelTypeEs: 'Canal con enrocado',
    maxVelocity: 3.0,
    minVelocity: 0.5,
    notes: 'Depends on rock size',
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getSoilTypeById(id: string): SoilType | undefined {
  return SOIL_TYPES.find(s => s.id === id);
}

export function getRunoffCoefficient(id: string): RunoffCoefficientEntry | undefined {
  return RUNOFF_COEFFICIENTS.find(c => c.id === id);
}

export function getSUDSTechnique(id: string): SUDSTechnique | undefined {
  return SUDS_TECHNIQUES.find(t => t.id === id);
}

export function getDesignStandard(id: string): DesignStandard | undefined {
  return DESIGN_STANDARDS_CHILE.find(s => s.id === id);
}

export function getSuitableSUDS(soilGroup: SoilGroup, permeability: number): SUDSTechnique[] {
  return SUDS_TECHNIQUES.filter(t =>
    t.suitableSoilGroups.includes(soilGroup) &&
    permeability >= t.minPermeability
  );
}

export function getRunoffCoefficientsByCategory(category: string): RunoffCoefficientEntry[] {
  return RUNOFF_COEFFICIENTS.filter(c => c.category === category);
}

export function getDesignStandardsByCategory(category: DesignStandard['category']): DesignStandard[] {
  return DESIGN_STANDARDS_CHILE.filter(s => s.category === category);
}
