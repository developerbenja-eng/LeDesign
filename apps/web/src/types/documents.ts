/**
 * Document Generation Types
 *
 * Types for generating Chilean engineering documents:
 * - Memoria de Cálculo (calculation reports)
 * - Especificaciones Técnicas (EETT - technical specifications)
 * - Informe Técnico (technical reports)
 * - Presupuesto (budgets/cost estimates)
 *
 * Uses LaTeX rendering via latex.js for equation display
 * and PDF generation with jspdf + html2canvas
 */

// ============================================================================
// Document Types
// ============================================================================

export type DocumentType =
  | 'memoria_calculo'
  | 'especificaciones'
  | 'informe_tecnico'
  | 'presupuesto';

export type DocumentStatus =
  | 'draft'
  | 'review'
  | 'approved'
  | 'final';

export type SectionType =
  | 'text'
  | 'equation'
  | 'table'
  | 'calculation'
  | 'image'
  | 'reference'
  | 'list'
  | 'study_area'
  | 'design_criteria'
  | 'population_demand'
  | 'infrastructure_summary';

// ============================================================================
// Document Carátula (Cover Page / Header)
// ============================================================================

export interface DocumentCaratula {
  // Project identification
  projectName: string;
  projectCode?: string;
  clientName: string;

  // Location
  location: {
    region: string;
    comuna: string;
    address?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };

  // Professional responsible
  designer: {
    name: string;
    title: string; // "Ingeniero Civil", "Constructor Civil", etc.
    registration?: string; // Professional registration number
    firma?: string; // Base64 signature image
  };

  // Additional professionals
  reviewer?: {
    name: string;
    title: string;
    registration?: string;
  };

  approver?: {
    name: string;
    title: string;
    registration?: string;
  };

  // Document info
  date: string; // ISO date
  revisionNumber: number;
  revisionHistory?: RevisionEntry[];
}

export interface RevisionEntry {
  number: number;
  date: string;
  description: string;
  author: string;
}

// ============================================================================
// Section Content Types
// ============================================================================

export interface TextContent {
  type: 'text';
  html: string; // Rich text content
  latex?: string; // Optional inline LaTeX
}

export interface EquationContent {
  type: 'equation';
  latex: string; // LaTeX equation
  label?: string; // Reference label (e.g., "eq:manning")
  description?: string; // Description of the equation
  numbering?: boolean; // Show equation number
}

export interface TableContent {
  type: 'table';
  headers: string[];
  rows: (string | number)[][];
  caption?: string;
  alignment?: ('left' | 'center' | 'right')[];
  highlightRows?: number[]; // Row indices to highlight
}

export interface CalculationContent {
  type: 'calculation';
  calculationType: CalculationType;
  inputs: Record<string, CalculationValue>;
  results: Record<string, CalculationResult>;
  steps?: CalculationStep[]; // Intermediate calculation steps
  sourceEntityIds?: string[]; // Infrastructure entity IDs used
  nchReference?: string; // Chilean standard reference (e.g., "NCh 1105")
}

export interface CalculationValue {
  label: string;
  value: number;
  unit: string;
  description?: string;
}

export interface CalculationResult {
  label: string;
  value: number;
  unit: string;
  formula?: string; // LaTeX formula used
  status?: 'ok' | 'warning' | 'error';
  statusMessage?: string;
}

export interface CalculationStep {
  description: string;
  formula: string; // LaTeX
  result: string;
}

export interface ImageContent {
  type: 'image';
  url: string; // Image URL or base64
  caption?: string;
  width?: number; // percentage 0-100
  alt?: string;
}

export interface ReferenceContent {
  type: 'reference';
  references: NormativeReference[];
}

export interface NormativeReference {
  code: string; // "NCh 1105", "RIDAA Art. 48", etc.
  title: string;
  description?: string;
  url?: string;
}

export interface ListContent {
  type: 'list';
  ordered: boolean;
  items: string[];
}

// ============================================================================
// Study Area & Project Data Content Types
// ============================================================================

/**
 * Study Area Content - Describes the project's geographical and physical context
 * Auto-populated from project data, editable by user
 */
export interface StudyAreaContent {
  type: 'study_area';

  // General description
  description: string;

  // Geographic boundaries
  boundaries: {
    north: string;
    south: string;
    east: string;
    west: string;
  };

  // Area metrics
  totalArea: number; // hectares
  imperviousArea?: number; // hectares
  perviousArea?: number; // hectares

  // Topography
  topography: {
    minElevation?: number; // m.s.n.m.
    maxElevation?: number;
    averageSlope?: number; // percentage
    slopeClassification?: 'plano' | 'suave' | 'moderado' | 'fuerte' | 'muy_fuerte';
    terrainDescription?: string;
  };

  // Soil characteristics
  soils: {
    predominantType?: string; // "Arcilloso", "Arenoso", "Limoso", etc.
    hydrologicGroup?: 'A' | 'B' | 'C' | 'D';
    infiltrationRate?: number; // mm/h
    description?: string;
  };

  // Climate & rainfall
  climate: {
    climaticZone?: string; // "Templado mediterráneo", etc.
    annualRainfall?: number; // mm
    rainyMonths?: string; // "Mayo a Agosto"
    idfSource?: string; // "DGA", "DMC", etc.
    idfStation?: string;
  };

  // Land use
  landUse: {
    residential?: number; // percentage
    commercial?: number;
    industrial?: number;
    greenAreas?: number;
    roads?: number;
    other?: number;
    description?: string;
  };

  // Optional map/image reference
  mapImageUrl?: string;

  // Source entity IDs (for traceability)
  sourceProjectId?: string;
  autoGenerated?: boolean;
  lastUpdated?: string;
}

/**
 * Design Criteria Content - Engineering design parameters
 */
export interface DesignCriteriaContent {
  type: 'design_criteria';

  // Project type specific criteria
  projectType: 'alcantarillado' | 'agua_potable' | 'aguas_lluvias' | 'pavimentacion' | 'mixto';

  // Design period
  designPeriod: number; // years
  designHorizon: string; // "2024-2044"

  // Hydraulic criteria
  hydraulicCriteria?: {
    // Sewer
    minVelocity?: number; // m/s
    maxVelocity?: number;
    minSlope?: number; // %
    maxFillRatio?: number; // 0-1
    manningN?: number;

    // Water
    minPressure?: number; // m.c.a.
    maxPressure?: number;
    hazenWilliamsC?: number;

    // Stormwater
    returnPeriod?: number; // years
    runoffCoefficient?: number;
    timeOfConcentration?: number; // minutes
  };

  // Material specifications
  materials?: {
    pipeMaterial?: string; // "PVC", "HDPE", "Hormigón"
    pipeClass?: string;
    minDiameter?: number; // mm
    jointType?: string;
  };

  // Normative references
  applicableNorms: string[]; // ["NCh 1105", "RIDAA", etc.]

  // Custom criteria (key-value pairs for flexibility)
  customCriteria?: Record<string, { label: string; value: string | number; unit?: string }>;

  autoGenerated?: boolean;
}

/**
 * Population & Demand Content - Demographics and flow calculations
 */
export interface PopulationDemandContent {
  type: 'population_demand';

  // Current population
  currentPopulation: number;
  currentYear: number;

  // Projected population
  projectedPopulation: number;
  projectedYear: number;
  growthRate: number; // percentage per year

  // Housing data
  currentHouseholds?: number;
  projectedHouseholds?: number;
  averageOccupancy?: number; // persons per household

  // Density
  populationDensity?: number; // hab/ha
  housingDensity?: number; // viv/ha

  // Water demand (for AP projects)
  waterDemand?: {
    dotation: number; // L/hab/día
    averageDailyDemand: number; // L/s
    maxDailyDemand: number; // L/s (Kd factor)
    maxHourlyDemand: number; // L/s (Kh factor)
    kdFactor: number;
    khFactor: number;
  };

  // Sewer flow (for alcantarillado)
  sewerFlow?: {
    returnFactor: number; // typically 0.8
    averageFlow: number; // L/s
    peakFlow: number; // L/s (with Harmon)
    harmonFactor: number;
    infiltration?: number; // L/s (aguas parásitas)
  };

  // Stormwater (for aguas lluvias)
  stormwaterFlow?: {
    designIntensity: number; // mm/h
    runoffCoefficient: number;
    contributingArea: number; // ha
    peakFlow: number; // L/s or m³/s
  };

  autoGenerated?: boolean;
  sourceEntityIds?: string[];
}

/**
 * Infrastructure Summary Content - Inventory of project elements
 */
export interface InfrastructureSummaryContent {
  type: 'infrastructure_summary';

  // Pipe network summary
  pipes?: {
    totalLength: number; // m
    byDiameter: Record<number, number>; // diameter (mm) -> length (m)
    byMaterial: Record<string, number>; // material -> length (m)
    minDiameter: number;
    maxDiameter: number;
  };

  // Node summary (manholes, chambers)
  nodes?: {
    manholes: number;
    chambers: number;
    dropStructures: number;
    byType: Record<string, number>;
  };

  // Stormwater elements
  stormwater?: {
    inlets: number;
    byType: Record<string, number>; // type -> count
    channels: number;
    channelLength: number; // m
    detentionPonds: number;
    totalDetentionVolume: number; // m³
  };

  // Water network elements
  waterNetwork?: {
    connections: number;
    valves: number;
    hydrants: number;
    tanks: number;
    pumps: number;
  };

  // Pavement (if applicable)
  pavement?: {
    totalArea: number; // m²
    byType: Record<string, number>; // type -> area
  };

  // Quantities summary table
  quantitiesSummary?: Array<{
    item: string;
    description: string;
    quantity: number;
    unit: string;
  }>;

  autoGenerated?: boolean;
  sourceEntityIds?: string[];
}

export type SectionContent =
  | TextContent
  | EquationContent
  | TableContent
  | CalculationContent
  | ImageContent
  | ReferenceContent
  | ListContent
  | StudyAreaContent
  | DesignCriteriaContent
  | PopulationDemandContent
  | InfrastructureSummaryContent;

// ============================================================================
// Calculation Types
// ============================================================================

export type CalculationType =
  // Hydraulic calculations
  | 'manning_flow'
  | 'hazen_williams'
  | 'darcy_weisbach'
  | 'colebrook_white'
  | 'chezy'

  // Sewer-specific
  | 'harmon_factor'
  | 'sewer_capacity'
  | 'sewer_velocity'
  | 'drop_structure'

  // Stormwater
  | 'rational_method'
  | 'intensity_duration'
  | 'time_concentration'
  | 'gutter_flow'
  | 'inlet_capacity'

  // Water network
  | 'pipe_sizing'
  | 'head_loss'
  | 'pressure_drop'
  | 'pump_selection'
  | 'tank_sizing'

  // Structural
  | 'pipe_burial'
  | 'trench_design'
  | 'bedding_design'

  // Pavement (AASHTO 93)
  | 'aashto_flexible'
  | 'aashto_rigid'
  | 'cbr_analysis'
  | 'traffic_load'

  // General
  | 'custom';

// ============================================================================
// Document Section
// ============================================================================

export interface DocumentSection {
  id: string;
  title: string;
  number: string; // Hierarchical number: "1", "1.1", "1.1.1"
  type: SectionType;
  content: SectionContent;
  subsections?: DocumentSection[];
  pageBreakBefore?: boolean;
  pageBreakAfter?: boolean;
}

// ============================================================================
// Base Document Interface
// ============================================================================

export interface BaseDocument {
  id: string;
  projectId: string;
  type: DocumentType;
  title: string;
  version: string;
  status: DocumentStatus;

  // Document header
  caratula: DocumentCaratula;

  // Document body
  sections: DocumentSection[];

  // Generated content
  latexContent?: string; // Compiled LaTeX document
  pdfUrl?: string; // Generated PDF URL

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  approvedBy?: string;
  approvalDate?: string;
}

// ============================================================================
// Specific Document Types
// ============================================================================

/**
 * Memoria de Cálculo - Calculation Report
 *
 * Contains all hydraulic and structural calculations
 * with step-by-step derivations and NCh standard compliance
 */
export interface MemoriaCalculoDocument extends BaseDocument {
  type: 'memoria_calculo';
  calculationSummary?: {
    totalCalculations: number;
    byType: Record<CalculationType, number>;
    passedChecks: number;
    warnings: number;
    errors: number;
  };
}

/**
 * Especificaciones Técnicas (EETT) - Technical Specifications
 *
 * Material specifications, construction methods,
 * quality control requirements
 */
export interface EspecificacionesTecnicasDocument extends BaseDocument {
  type: 'especificaciones';
  materialSpecs?: MaterialSpecification[];
  constructionMethods?: ConstructionMethod[];
}

export interface MaterialSpecification {
  id: string;
  category: 'pipe' | 'fitting' | 'chamber' | 'pavement' | 'concrete' | 'other';
  name: string;
  nchReference?: string;
  requirements: Record<string, string | number>;
}

export interface ConstructionMethod {
  id: string;
  activity: string;
  description: string;
  qualityChecks: string[];
  equipment?: string[];
}

/**
 * Informe Técnico - Technical Report
 *
 * Project description, infrastructure inventory,
 * design summary, recommendations
 */
export interface InformeTecnicoDocument extends BaseDocument {
  type: 'informe_tecnico';
  infrastructure?: InfrastructureSummary;
  recommendations?: string[];
}

export interface InfrastructureSummary {
  pipes?: { count: number; totalLength: number; byDiameter: Record<number, number> };
  manholes?: { count: number; byType: Record<string, number> };
  inlets?: { count: number; byType: Record<string, number> };
  other?: Record<string, number>;
}

/**
 * Presupuesto - Budget/Cost Estimate
 *
 * Quantities from project entities with unit prices
 * from SERVIU itemizado
 */
export interface PresupuestoDocument extends BaseDocument {
  type: 'presupuesto';
  items: BudgetItem[];
  subtotals: BudgetSubtotal[];
  grandTotal: number;
  currency: 'CLP' | 'UF' | 'USD';
  priceDate?: string; // Date of price reference
}

export interface BudgetItem {
  id: string;
  itemCode: string; // SERVIU item code
  description: string;
  unit: string; // "m", "m2", "m3", "un", "gl"
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category: string;
  sourceEntityIds?: string[]; // Infrastructure entities this quantity came from
}

export interface BudgetSubtotal {
  category: string;
  total: number;
  percentage: number;
}

export type AnyDocument =
  | MemoriaCalculoDocument
  | EspecificacionesTecnicasDocument
  | InformeTecnicoDocument
  | PresupuestoDocument;

// ============================================================================
// Document Template
// ============================================================================

export interface DocumentTemplate {
  id: string;
  name: string;
  type: DocumentType;
  description?: string;
  sections: DocumentSection[];
  defaultCaratula?: Partial<DocumentCaratula>;
  isSystem: boolean; // System templates cannot be deleted
  createdAt: string;
}

// ============================================================================
// LaTeX Rendering Types
// ============================================================================

export interface LaTeXRenderOptions {
  displayMode?: boolean; // Block vs inline
  throwOnError?: boolean;
  errorColor?: string;
  macros?: Record<string, string>;
  colorIsTextColor?: boolean;
  maxSize?: number;
  maxExpand?: number;
}

export interface LaTeXRenderResult {
  html: string;
  mathml?: string;
  errors?: string[];
}

// ============================================================================
// PDF Generation Types
// ============================================================================

export interface PDFGenerationOptions {
  format: 'letter' | 'legal' | 'a4';
  orientation: 'portrait' | 'landscape';
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  includeTableOfContents?: boolean;
  includePageNumbers?: boolean;
  headerText?: string;
  footerText?: string;
  watermark?: string;
}

export interface PDFGenerationResult {
  success: boolean;
  pdfUrl?: string;
  pdfBlob?: Blob;
  pageCount?: number;
  error?: string;
}

// ============================================================================
// Document Store State Types
// ============================================================================

export interface DocumentStoreState {
  // Current document being edited
  document: AnyDocument | null;
  isDirty: boolean;

  // Available templates
  templates: DocumentTemplate[];

  // Preview state
  previewHtml: string;
  previewErrors: string[];
  isPreviewLoading: boolean;

  // PDF generation state
  pdfGenerationState: {
    status: 'idle' | 'generating' | 'complete' | 'error';
    progress: number;
    error?: string;
    resultUrl?: string;
  };

  // Document list (for project)
  projectDocuments: BaseDocument[];
  isLoadingDocuments: boolean;
}

// ============================================================================
// API Types
// ============================================================================

export interface CreateDocumentRequest {
  projectId: string;
  type: DocumentType;
  title: string;
  templateId?: string;
  caratula?: Partial<DocumentCaratula>;
}

export interface UpdateDocumentRequest {
  title?: string;
  status?: DocumentStatus;
  caratula?: Partial<DocumentCaratula>;
  sections?: DocumentSection[];
}

export interface DocumentListResponse {
  documents: BaseDocument[];
  total: number;
}

export interface GeneratePDFRequest {
  documentId: string;
  options?: Partial<PDFGenerationOptions>;
}

// ============================================================================
// Hydraulic Equations (LaTeX)
// ============================================================================

export const HYDRAULIC_EQUATIONS = {
  // Manning equation for open channel flow
  manning: {
    name: 'Ecuación de Manning',
    latex: 'Q = \\frac{1}{n} \\cdot A \\cdot R^{2/3} \\cdot S^{1/2}',
    variables: {
      Q: { label: 'Caudal', unit: 'm³/s' },
      n: { label: 'Coeficiente de rugosidad de Manning', unit: '-' },
      A: { label: 'Área de la sección transversal', unit: 'm²' },
      R: { label: 'Radio hidráulico', unit: 'm' },
      S: { label: 'Pendiente del fondo', unit: 'm/m' },
    },
    nchReference: 'NCh 1105',
  },

  // Hazen-Williams equation
  hazenWilliams: {
    name: 'Ecuación de Hazen-Williams',
    latex: 'h_f = 10.67 \\cdot \\frac{L}{C^{1.852} \\cdot D^{4.87}} \\cdot Q^{1.852}',
    variables: {
      hf: { label: 'Pérdida de carga', unit: 'm' },
      L: { label: 'Longitud de la tubería', unit: 'm' },
      C: { label: 'Coeficiente de Hazen-Williams', unit: '-' },
      D: { label: 'Diámetro interno', unit: 'm' },
      Q: { label: 'Caudal', unit: 'm³/s' },
    },
    nchReference: 'NCh 691',
  },

  // Darcy-Weisbach equation
  darcyWeisbach: {
    name: 'Ecuación de Darcy-Weisbach',
    latex: 'h_f = f \\cdot \\frac{L}{D} \\cdot \\frac{V^2}{2g}',
    variables: {
      hf: { label: 'Pérdida de carga', unit: 'm' },
      f: { label: 'Factor de fricción de Darcy', unit: '-' },
      L: { label: 'Longitud', unit: 'm' },
      D: { label: 'Diámetro', unit: 'm' },
      V: { label: 'Velocidad', unit: 'm/s' },
      g: { label: 'Aceleración de gravedad', unit: 'm/s²' },
    },
  },

  // Rational method for stormwater
  rational: {
    name: 'Método Racional',
    latex: 'Q = C \\cdot i \\cdot A \\cdot 2.78',
    variables: {
      Q: { label: 'Caudal máximo', unit: 'L/s' },
      C: { label: 'Coeficiente de escorrentía', unit: '-' },
      i: { label: 'Intensidad de lluvia', unit: 'mm/h' },
      A: { label: 'Área de drenaje', unit: 'ha' },
    },
    nchReference: 'Manual MINVU Aguas Lluvias',
  },

  // Harmon formula for peak sewer flow
  harmon: {
    name: 'Fórmula de Harmon',
    latex: 'M = 1 + \\frac{14}{4 + \\sqrt{P}}',
    variables: {
      M: { label: 'Factor de mayoración', unit: '-' },
      P: { label: 'Población servida', unit: 'miles de hab.' },
    },
    nchReference: 'RIDAA',
  },

  // Froude number
  froude: {
    name: 'Número de Froude',
    latex: 'Fr = \\frac{V}{\\sqrt{g \\cdot y_h}}',
    variables: {
      Fr: { label: 'Número de Froude', unit: '-' },
      V: { label: 'Velocidad media', unit: 'm/s' },
      g: { label: 'Aceleración de gravedad', unit: 'm/s²' },
      yh: { label: 'Profundidad hidráulica', unit: 'm' },
    },
  },

  // Colebrook-White equation
  colebrookWhite: {
    name: 'Ecuación de Colebrook-White',
    latex: '\\frac{1}{\\sqrt{f}} = -2 \\log_{10}\\left(\\frac{\\varepsilon}{3.7D} + \\frac{2.51}{Re\\sqrt{f}}\\right)',
    variables: {
      f: { label: 'Factor de fricción', unit: '-' },
      epsilon: { label: 'Rugosidad absoluta', unit: 'm' },
      D: { label: 'Diámetro', unit: 'm' },
      Re: { label: 'Número de Reynolds', unit: '-' },
    },
  },

  // Hydraulic radius
  hydraulicRadius: {
    name: 'Radio Hidráulico',
    latex: 'R_h = \\frac{A}{P_m}',
    variables: {
      Rh: { label: 'Radio hidráulico', unit: 'm' },
      A: { label: 'Área mojada', unit: 'm²' },
      Pm: { label: 'Perímetro mojado', unit: 'm' },
    },
  },

  // Continuity equation
  continuity: {
    name: 'Ecuación de Continuidad',
    latex: 'Q = V \\cdot A',
    variables: {
      Q: { label: 'Caudal', unit: 'm³/s' },
      V: { label: 'Velocidad', unit: 'm/s' },
      A: { label: 'Área', unit: 'm²' },
    },
  },

  // AASHTO 93 flexible pavement
  aashtoFlexible: {
    name: 'AASHTO 93 - Pavimento Flexible',
    latex: '\\log_{10}(W_{18}) = Z_R \\cdot S_0 + 9.36 \\log_{10}(SN+1) - 0.20 + \\frac{\\log_{10}\\left(\\frac{\\Delta PSI}{4.2-1.5}\\right)}{0.40 + \\frac{1094}{(SN+1)^{5.19}}} + 2.32 \\log_{10}(M_R) - 8.07',
    variables: {
      W18: { label: 'Ejes equivalentes de 18 kip', unit: '-' },
      ZR: { label: 'Desviación estándar normal', unit: '-' },
      S0: { label: 'Error estándar combinado', unit: '-' },
      SN: { label: 'Número estructural', unit: '-' },
      DPSI: { label: 'Pérdida de serviciabilidad', unit: '-' },
      MR: { label: 'Módulo resiliente', unit: 'psi' },
    },
    nchReference: 'Manual de Carreteras MOP Vol. 3',
  },
} as const;

// ============================================================================
// Type Guards
// ============================================================================

export function isMemoriaCalculo(doc: AnyDocument): doc is MemoriaCalculoDocument {
  return doc.type === 'memoria_calculo';
}

export function isEspecificaciones(doc: AnyDocument): doc is EspecificacionesTecnicasDocument {
  return doc.type === 'especificaciones';
}

export function isInformeTecnico(doc: AnyDocument): doc is InformeTecnicoDocument {
  return doc.type === 'informe_tecnico';
}

export function isPresupuesto(doc: AnyDocument): doc is PresupuestoDocument {
  return doc.type === 'presupuesto';
}

export function isCalculationSection(section: DocumentSection): section is DocumentSection & { content: CalculationContent } {
  return section.type === 'calculation';
}

export function isEquationSection(section: DocumentSection): section is DocumentSection & { content: EquationContent } {
  return section.type === 'equation';
}

export function isTableSection(section: DocumentSection): section is DocumentSection & { content: TableContent } {
  return section.type === 'table';
}

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_PDF_OPTIONS: PDFGenerationOptions = {
  format: 'letter',
  orientation: 'portrait',
  margins: {
    top: 25,
    right: 20,
    bottom: 25,
    left: 25,
  },
  includeTableOfContents: true,
  includePageNumbers: true,
};

export const DEFAULT_CARATULA: Partial<DocumentCaratula> = {
  location: {
    region: 'Biobío',
    comuna: '',
  },
  designer: {
    name: '',
    title: 'Ingeniero Civil',
  },
  revisionNumber: 0,
};

// ============================================================================
// Document Type Labels
// ============================================================================

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, { name: string; description: string }> = {
  memoria_calculo: {
    name: 'Memoria de Cálculo',
    description: 'Cálculos hidráulicos y estructurales con ecuaciones y verificaciones',
  },
  especificaciones: {
    name: 'Especificaciones Técnicas',
    description: 'Especificaciones de materiales, métodos constructivos y control de calidad',
  },
  informe_tecnico: {
    name: 'Informe Técnico',
    description: 'Descripción del proyecto, inventario de infraestructura y recomendaciones',
  },
  presupuesto: {
    name: 'Presupuesto',
    description: 'Cubicación de cantidades y estimación de costos según itemizado SERVIU',
  },
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, { name: string; color: string }> = {
  draft: { name: 'Borrador', color: '#6b7280' },
  review: { name: 'En Revisión', color: '#f59e0b' },
  approved: { name: 'Aprobado', color: '#10b981' },
  final: { name: 'Final', color: '#3b82f6' },
};
