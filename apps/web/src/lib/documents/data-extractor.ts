/**
 * Data Extractor
 *
 * Extracts data from infrastructure entities to generate document content.
 * Used to populate Memoria de Cálculo, Informes Técnicos, and Presupuestos
 * with actual project data.
 */

import type {
  AnyInfrastructureEntity,
  WaterPipeEntity,
  WaterJunctionEntity,
  SewerPipeEntity,
  ManholeEntity,
  StormCollectorEntity,
  StormInletEntity,
  InfrastructureCategory,
} from '@/types/infrastructure-entities';

import type {
  DocumentSection,
  CalculationContent,
  TableContent,
  InfrastructureSummary,
  BudgetItem,
} from '@/types/documents';

import {
  manningEquation,
  hazenWilliamsEquation,
  rationalMethodEquation,
  harmonEquation,
  circularPipeGeometry,
} from '@/lib/latex/equations/hydraulic-equations';

import { generateId } from '@/lib/utils';

// ============================================================================
// Infrastructure Summary Extraction
// ============================================================================

/**
 * Extract infrastructure summary from entities
 */
export function extractInfrastructureSummary(
  entities: AnyInfrastructureEntity[]
): InfrastructureSummary {
  const summary: InfrastructureSummary = {};

  // Extract pipe statistics
  const pipes = entities.filter(
    (e) =>
      e.infrastructureType === 'water_pipe' ||
      e.infrastructureType === 'sewer_pipe' ||
      e.infrastructureType === 'storm_collector'
  ) as (WaterPipeEntity | SewerPipeEntity | StormCollectorEntity)[];

  if (pipes.length > 0) {
    const byDiameter: Record<number, number> = {};
    let totalLength = 0;

    pipes.forEach((pipe) => {
      totalLength += pipe.length || 0;
      const d = pipe.diameter;
      byDiameter[d] = (byDiameter[d] || 0) + (pipe.length || 0);
    });

    summary.pipes = {
      count: pipes.length,
      totalLength,
      byDiameter,
    };
  }

  // Extract manhole statistics
  const manholes = entities.filter(
    (e) => e.infrastructureType === 'manhole'
  ) as ManholeEntity[];

  if (manholes.length > 0) {
    const byType: Record<string, number> = {};
    manholes.forEach((mh) => {
      const type = mh.manholeType || 'A';
      byType[type] = (byType[type] || 0) + 1;
    });

    summary.manholes = {
      count: manholes.length,
      byType,
    };
  }

  // Extract inlet statistics
  const inlets = entities.filter(
    (e) => e.infrastructureType === 'storm_inlet'
  ) as StormInletEntity[];

  if (inlets.length > 0) {
    const byType: Record<string, number> = {};
    inlets.forEach((inlet) => {
      const type = inlet.inletType || 'S1';
      byType[type] = (byType[type] || 0) + 1;
    });

    summary.inlets = {
      count: inlets.length,
      byType,
    };
  }

  return summary;
}

// ============================================================================
// Calculation Sections Generation
// ============================================================================

/**
 * Generate Manning calculation section from sewer pipe
 */
export function generateManningCalculation(pipe: SewerPipeEntity): DocumentSection {
  const D = pipe.diameter / 1000; // mm to m
  const fillRatio = pipe.fillRatio || 0.75;
  const S = pipe.slope;
  const n = pipe.manningN;

  const A = circularPipeGeometry.area(D, fillRatio);
  const R = circularPipeGeometry.hydraulicRadius(D, fillRatio);

  const calcContent = manningEquation.toCalculationContent({ n, A, R, S });
  calcContent.sourceEntityIds = [pipe.id];

  // Add velocity check
  const velocity = calcContent.results.V.value;
  if (velocity < 0.6) {
    calcContent.results.V.status = 'warning';
    calcContent.results.V.statusMessage = 'Velocidad inferior a mínimo autolimpiante (0.6 m/s)';
  } else if (velocity > 5.0) {
    calcContent.results.V.status = 'error';
    calcContent.results.V.statusMessage = 'Velocidad superior a máximo permitido (5.0 m/s)';
  } else {
    calcContent.results.V.status = 'ok';
  }

  return {
    id: generateId(),
    title: `Cálculo Hidráulico - Tramo ${pipe.name || pipe.id}`,
    number: '',
    type: 'calculation',
    content: calcContent,
  };
}

/**
 * Generate Hazen-Williams calculation section from water pipe
 */
export function generateHazenWilliamsCalculation(pipe: WaterPipeEntity): DocumentSection {
  const D = pipe.diameter / 1000; // mm to m
  const L = pipe.length;
  const C = pipe.hazenWilliamsC;
  const Q = (pipe.flow || 0) / 1000; // L/s to m³/s

  const calcContent = hazenWilliamsEquation.toCalculationContent({ L, Q, C, D });
  calcContent.sourceEntityIds = [pipe.id];

  return {
    id: generateId(),
    title: `Pérdida de Carga - Tramo ${pipe.name || pipe.id}`,
    number: '',
    type: 'calculation',
    content: calcContent,
  };
}

/**
 * Generate Rational Method calculation section from storm collector
 */
export function generateRationalCalculation(collector: StormCollectorEntity): DocumentSection {
  const C = collector.runoffCoeff;
  const i = collector.designIntensity;
  const A = collector.catchmentArea;

  const calcContent = rationalMethodEquation.toCalculationContent({ C, i, A });
  calcContent.sourceEntityIds = [collector.id];

  // Add capacity check
  if (collector.capacity) {
    const Q = calcContent.results.Q.value;
    if (Q > collector.capacity) {
      calcContent.results.Q.status = 'error';
      calcContent.results.Q.statusMessage = `Caudal supera capacidad del colector (${collector.capacity.toFixed(1)} L/s)`;
    } else {
      calcContent.results.Q.status = 'ok';
    }
  }

  return {
    id: generateId(),
    title: `Cálculo de Escorrentía - ${collector.name || collector.id}`,
    number: '',
    type: 'calculation',
    content: calcContent,
  };
}

/**
 * Generate Harmon factor calculation from population data
 */
export function generateHarmonCalculation(populationThousands: number): DocumentSection {
  const calcContent = harmonEquation.toCalculationContent({ P: populationThousands });

  return {
    id: generateId(),
    title: 'Factor de Mayoración de Harmon',
    number: '',
    type: 'calculation',
    content: calcContent,
  };
}

// ============================================================================
// Table Sections Generation
// ============================================================================

/**
 * Generate pipe inventory table
 */
export function generatePipeInventoryTable(
  pipes: (WaterPipeEntity | SewerPipeEntity | StormCollectorEntity)[]
): DocumentSection {
  const rows: (string | number)[][] = pipes.map((pipe, index) => [
    index + 1,
    pipe.name || `Tramo ${index + 1}`,
    pipe.diameter,
    pipe.length.toFixed(2),
    pipe.material.toUpperCase(),
    ('slope' in pipe ? (pipe.slope * 100).toFixed(2) : '-'),
    pipe.designStatus,
  ]);

  const totalLength = pipes.reduce((sum, p) => sum + p.length, 0);
  rows.push(['', 'TOTAL', '', totalLength.toFixed(2), '', '', '']);

  const content: TableContent = {
    type: 'table',
    headers: ['N°', 'Tramo', 'DN (mm)', 'Longitud (m)', 'Material', 'Pendiente (%)', 'Estado'],
    rows,
    caption: 'Inventario de tuberías del proyecto',
    alignment: ['center', 'left', 'center', 'right', 'center', 'right', 'center'],
    highlightRows: [rows.length - 1],
  };

  return {
    id: generateId(),
    title: 'Inventario de Tuberías',
    number: '',
    type: 'table',
    content,
  };
}

/**
 * Generate manhole inventory table
 */
export function generateManholeInventoryTable(manholes: ManholeEntity[]): DocumentSection {
  const rows: (string | number)[][] = manholes.map((mh, index) => [
    index + 1,
    mh.name || `C-${index + 1}`,
    mh.manholeType,
    mh.rimElevation.toFixed(2),
    mh.invertElevation.toFixed(2),
    mh.depth.toFixed(2),
    mh.coverClass,
  ]);

  const content: TableContent = {
    type: 'table',
    headers: ['N°', 'Cámara', 'Tipo', 'Cota Tapa (m)', 'Cota Radier (m)', 'Profundidad (m)', 'Tapa'],
    rows,
    caption: 'Inventario de cámaras de inspección',
    alignment: ['center', 'left', 'center', 'right', 'right', 'right', 'center'],
  };

  return {
    id: generateId(),
    title: 'Inventario de Cámaras',
    number: '',
    type: 'table',
    content,
  };
}

/**
 * Generate hydraulic results table
 */
export function generateHydraulicResultsTable(
  pipes: (SewerPipeEntity | StormCollectorEntity)[]
): DocumentSection {
  const rows: (string | number)[][] = pipes.map((pipe, index) => {
    const velocity = pipe.velocity?.toFixed(2) || '-';
    const flow = 'actualFlow' in pipe ? pipe.actualFlow?.toFixed(2) || '-' : '-';
    const capacity = 'fullFlowCapacity' in pipe
      ? pipe.fullFlowCapacity?.toFixed(2) || '-'
      : 'capacity' in pipe
        ? pipe.capacity?.toFixed(2) || '-'
        : '-';
    const fillRatio = pipe.fillRatio ? (pipe.fillRatio * 100).toFixed(1) : '-';

    return [
      index + 1,
      pipe.name || `Tramo ${index + 1}`,
      flow,
      capacity,
      velocity,
      fillRatio,
      pipe.velocity && pipe.velocity >= 0.6 && pipe.velocity <= 5.0 ? 'OK' : 'REVISAR',
    ];
  });

  const content: TableContent = {
    type: 'table',
    headers: ['N°', 'Tramo', 'Q (L/s)', 'Qll (L/s)', 'V (m/s)', 'y/D (%)', 'Estado'],
    rows,
    caption: 'Resultados del análisis hidráulico',
    alignment: ['center', 'left', 'right', 'right', 'right', 'right', 'center'],
  };

  return {
    id: generateId(),
    title: 'Resultados Hidráulicos',
    number: '',
    type: 'table',
    content,
  };
}

// ============================================================================
// Budget Items Generation
// ============================================================================

/**
 * SERVIU item codes for common infrastructure elements
 */
const SERVIU_ITEMS = {
  // Excavation
  excavation_manual: { code: '1.1.1', description: 'Excavación manual en zanja', unit: 'm³', price: 18500 },
  excavation_mechanical: { code: '1.1.2', description: 'Excavación mecánica en zanja', unit: 'm³', price: 8500 },

  // Bedding
  bedding_sand: { code: '1.2.1', description: 'Cama de arena e = 0.10 m', unit: 'm³', price: 35000 },
  bedding_gravel: { code: '1.2.2', description: 'Cama de grava e = 0.10 m', unit: 'm³', price: 28000 },

  // Backfill
  backfill_selected: { code: '1.3.1', description: 'Relleno seleccionado compactado', unit: 'm³', price: 12500 },
  backfill_structural: { code: '1.3.2', description: 'Relleno estructural compactado', unit: 'm³', price: 22000 },

  // PVC Pipes
  pvc_110: { code: '2.1.1', description: 'Tubería PVC DN 110 mm clase 6', unit: 'm', price: 8500 },
  pvc_160: { code: '2.1.2', description: 'Tubería PVC DN 160 mm clase 6', unit: 'm', price: 14200 },
  pvc_200: { code: '2.1.3', description: 'Tubería PVC DN 200 mm clase 6', unit: 'm', price: 22800 },
  pvc_250: { code: '2.1.4', description: 'Tubería PVC DN 250 mm clase 6', unit: 'm', price: 35500 },
  pvc_315: { code: '2.1.5', description: 'Tubería PVC DN 315 mm clase 6', unit: 'm', price: 52000 },
  pvc_400: { code: '2.1.6', description: 'Tubería PVC DN 400 mm clase 6', unit: 'm', price: 78000 },

  // HDPE Pipes
  hdpe_110: { code: '2.2.1', description: 'Tubería HDPE DN 110 mm PN10', unit: 'm', price: 9200 },
  hdpe_160: { code: '2.2.2', description: 'Tubería HDPE DN 160 mm PN10', unit: 'm', price: 15800 },

  // Manholes
  manhole_a_1_5: { code: '3.1.1', description: 'Cámara Tipo A prof. 1.0-1.5 m', unit: 'un', price: 850000 },
  manhole_a_2_0: { code: '3.1.2', description: 'Cámara Tipo A prof. 1.5-2.0 m', unit: 'un', price: 1050000 },
  manhole_a_2_5: { code: '3.1.3', description: 'Cámara Tipo A prof. 2.0-2.5 m', unit: 'un', price: 1280000 },
  manhole_a_3_0: { code: '3.1.4', description: 'Cámara Tipo A prof. 2.5-3.0 m', unit: 'un', price: 1520000 },
  manhole_b_1_5: { code: '3.2.1', description: 'Cámara Tipo B prof. 1.0-1.5 m', unit: 'un', price: 720000 },
  manhole_b_2_0: { code: '3.2.2', description: 'Cámara Tipo B prof. 1.5-2.0 m', unit: 'un', price: 920000 },

  // Storm inlets
  inlet_s1: { code: '4.1.1', description: 'Sumidero Tipo S1 SERVIU', unit: 'un', price: 380000 },
  inlet_s2: { code: '4.1.2', description: 'Sumidero Tipo S2 SERVIU', unit: 'un', price: 420000 },

  // Connections
  house_connection: { code: '5.1.1', description: 'Unión domiciliaria completa', unit: 'un', price: 185000 },
};

/**
 * Get SERVIU item code for pipe based on material and diameter
 */
function getPipeItemCode(material: string, diameter: number): keyof typeof SERVIU_ITEMS | null {
  const materialLower = material.toLowerCase();

  if (materialLower === 'pvc') {
    if (diameter <= 110) return 'pvc_110';
    if (diameter <= 160) return 'pvc_160';
    if (diameter <= 200) return 'pvc_200';
    if (diameter <= 250) return 'pvc_250';
    if (diameter <= 315) return 'pvc_315';
    if (diameter <= 400) return 'pvc_400';
  }

  if (materialLower === 'hdpe') {
    if (diameter <= 110) return 'hdpe_110';
    if (diameter <= 160) return 'hdpe_160';
  }

  return null;
}

/**
 * Get SERVIU item code for manhole based on type and depth
 */
function getManholeItemCode(type: string, depth: number): keyof typeof SERVIU_ITEMS | null {
  const typeLower = type.toLowerCase();

  if (typeLower === 'a') {
    if (depth <= 1.5) return 'manhole_a_1_5';
    if (depth <= 2.0) return 'manhole_a_2_0';
    if (depth <= 2.5) return 'manhole_a_2_5';
    return 'manhole_a_3_0';
  }

  if (typeLower === 'b') {
    if (depth <= 1.5) return 'manhole_b_1_5';
    return 'manhole_b_2_0';
  }

  return 'manhole_a_2_0';
}

/**
 * Generate budget items from infrastructure entities
 */
export function generateBudgetItems(entities: AnyInfrastructureEntity[]): BudgetItem[] {
  const items: BudgetItem[] = [];
  let itemIndex = 1;

  // Group pipes by type and diameter
  const pipeGroups = new Map<string, { entities: (WaterPipeEntity | SewerPipeEntity | StormCollectorEntity)[]; totalLength: number }>();

  entities.forEach((entity) => {
    if (
      entity.infrastructureType === 'water_pipe' ||
      entity.infrastructureType === 'sewer_pipe' ||
      entity.infrastructureType === 'storm_collector'
    ) {
      const pipe = entity as WaterPipeEntity | SewerPipeEntity | StormCollectorEntity;
      const key = `${pipe.material}_${pipe.diameter}`;

      if (!pipeGroups.has(key)) {
        pipeGroups.set(key, { entities: [], totalLength: 0 });
      }

      const group = pipeGroups.get(key)!;
      group.entities.push(pipe);
      group.totalLength += pipe.length;
    }
  });

  // Add pipe items
  pipeGroups.forEach((group, key) => {
    const [material, diameter] = key.split('_');
    const itemCode = getPipeItemCode(material, parseInt(diameter));

    if (itemCode && SERVIU_ITEMS[itemCode]) {
      const item = SERVIU_ITEMS[itemCode];
      items.push({
        id: generateId(),
        itemCode: item.code,
        description: item.description,
        unit: item.unit,
        quantity: Math.ceil(group.totalLength * 10) / 10, // Round up to 0.1
        unitPrice: item.price,
        totalPrice: Math.ceil(group.totalLength * item.price),
        category: 'Tuberías',
        sourceEntityIds: group.entities.map((e) => e.id),
      });
    }
  });

  // Add excavation for pipes
  const totalPipeLength = Array.from(pipeGroups.values()).reduce((sum, g) => sum + g.totalLength, 0);
  if (totalPipeLength > 0) {
    const avgTrenchWidth = 0.8; // m
    const avgTrenchDepth = 1.5; // m
    const excavationVolume = totalPipeLength * avgTrenchWidth * avgTrenchDepth;

    const excItem = SERVIU_ITEMS.excavation_mechanical;
    items.push({
      id: generateId(),
      itemCode: excItem.code,
      description: excItem.description,
      unit: excItem.unit,
      quantity: Math.ceil(excavationVolume * 10) / 10,
      unitPrice: excItem.price,
      totalPrice: Math.ceil(excavationVolume * excItem.price),
      category: 'Movimiento de Tierras',
      sourceEntityIds: [],
    });

    const beddingItem = SERVIU_ITEMS.bedding_sand;
    const beddingVolume = totalPipeLength * avgTrenchWidth * 0.1;
    items.push({
      id: generateId(),
      itemCode: beddingItem.code,
      description: beddingItem.description,
      unit: beddingItem.unit,
      quantity: Math.ceil(beddingVolume * 10) / 10,
      unitPrice: beddingItem.price,
      totalPrice: Math.ceil(beddingVolume * beddingItem.price),
      category: 'Cama y Relleno',
      sourceEntityIds: [],
    });

    const backfillItem = SERVIU_ITEMS.backfill_selected;
    const backfillVolume = excavationVolume - beddingVolume - (totalPipeLength * 0.05); // minus pipe volume approx
    items.push({
      id: generateId(),
      itemCode: backfillItem.code,
      description: backfillItem.description,
      unit: backfillItem.unit,
      quantity: Math.ceil(backfillVolume * 10) / 10,
      unitPrice: backfillItem.price,
      totalPrice: Math.ceil(backfillVolume * backfillItem.price),
      category: 'Cama y Relleno',
      sourceEntityIds: [],
    });
  }

  // Add manholes
  const manholes = entities.filter((e) => e.infrastructureType === 'manhole') as ManholeEntity[];
  const manholeGroups = new Map<string, ManholeEntity[]>();

  manholes.forEach((mh) => {
    const itemCode = getManholeItemCode(mh.manholeType, mh.depth);
    if (itemCode) {
      if (!manholeGroups.has(itemCode)) {
        manholeGroups.set(itemCode, []);
      }
      manholeGroups.get(itemCode)!.push(mh);
    }
  });

  manholeGroups.forEach((group, itemCode) => {
    const item = SERVIU_ITEMS[itemCode as keyof typeof SERVIU_ITEMS];
    if (item) {
      items.push({
        id: generateId(),
        itemCode: item.code,
        description: item.description,
        unit: item.unit,
        quantity: group.length,
        unitPrice: item.price,
        totalPrice: group.length * item.price,
        category: 'Cámaras',
        sourceEntityIds: group.map((mh) => mh.id),
      });
    }
  });

  // Add storm inlets
  const inlets = entities.filter((e) => e.infrastructureType === 'storm_inlet') as StormInletEntity[];
  const inletGroups = new Map<string, StormInletEntity[]>();

  inlets.forEach((inlet) => {
    const type = inlet.inletType.toLowerCase();
    const itemCode = type === 's1' ? 'inlet_s1' : type === 's2' ? 'inlet_s2' : 'inlet_s1';
    if (!inletGroups.has(itemCode)) {
      inletGroups.set(itemCode, []);
    }
    inletGroups.get(itemCode)!.push(inlet);
  });

  inletGroups.forEach((group, itemCode) => {
    const item = SERVIU_ITEMS[itemCode as keyof typeof SERVIU_ITEMS];
    if (item) {
      items.push({
        id: generateId(),
        itemCode: item.code,
        description: item.description,
        unit: item.unit,
        quantity: group.length,
        unitPrice: item.price,
        totalPrice: group.length * item.price,
        category: 'Sumideros',
        sourceEntityIds: group.map((i) => i.id),
      });
    }
  });

  return items;
}

/**
 * Calculate budget subtotals by category
 */
export function calculateBudgetSubtotals(items: BudgetItem[]): { category: string; total: number; percentage: number }[] {
  const byCategory = new Map<string, number>();

  items.forEach((item) => {
    const current = byCategory.get(item.category) || 0;
    byCategory.set(item.category, current + item.totalPrice);
  });

  const grandTotal = Array.from(byCategory.values()).reduce((sum, v) => sum + v, 0);

  return Array.from(byCategory.entries()).map(([category, total]) => ({
    category,
    total,
    percentage: grandTotal > 0 ? (total / grandTotal) * 100 : 0,
  }));
}

// ============================================================================
// Pavement Design Document Generation (AASHTO 93)
// ============================================================================

import {
  aashtoFlexibleEquation,
  aashtoRigidEquation,
  stoppingSightDistanceEquation,
  minimumRadiusEquation,
  circularCurveEquation,
  verticalCurveEquation,
  rampSlopeEquation,
  crosswalkEquation,
} from '@/lib/latex/equations/engineering-equations';

import type { FlexiblePavementResult, FlexiblePavementInput, LayerCoefficients } from '@/lib/pavement/aashto-flexible';
import type { RigidPavementResult, RigidPavementInput } from '@/lib/pavement/aashto-rigid';
import type { StoppingSightDistanceResult, PassingSightDistanceResult } from '@/lib/road-geometry/sight-distance';
import type { PedestrianRampResult } from '@/lib/urban-road/pedestrian-ramps';

/**
 * Generate AASHTO 93 Flexible Pavement calculation section
 */
export function generateFlexiblePavementCalculation(
  input: FlexiblePavementInput,
  coefficients: LayerCoefficients,
  result: FlexiblePavementResult
): DocumentSection {
  const calcContent = aashtoFlexibleEquation.toCalculationContent({
    W18: input.W18,
    reliability: input.reliability,
    So: input.standardDeviation,
    pi: input.serviceabilityInitial,
    pt: input.serviceabilityTerminal,
    MR: input.subgradeMr,
    SN: result.SN,
    SNprovided: result.SNprovided,
    layers: result.layers,
  });

  return {
    id: generateId(),
    title: 'Diseño de Pavimento Flexible - AASHTO 93',
    number: '',
    type: 'calculation',
    content: calcContent,
  };
}

/**
 * Generate AASHTO 93 Rigid Pavement calculation section
 */
export function generateRigidPavementCalculation(
  input: RigidPavementInput,
  result: RigidPavementResult
): DocumentSection {
  const calcContent = aashtoRigidEquation.toCalculationContent({
    W18: input.W18,
    reliability: input.reliability,
    So: input.standardDeviation,
    pi: input.serviceabilityInitial,
    pt: input.serviceabilityTerminal,
    Ec: input.concreteModulus,
    Sc: input.ruptureModulus,
    k: input.subgradeK,
    J: input.loadTransfer,
    Cd: input.drainageCoeff,
    thickness: result.thickness,
    thicknessCm: result.thicknessCm,
    concreteGrade: result.concreteGrade,
  });

  return {
    id: generateId(),
    title: 'Diseño de Pavimento Rígido - AASHTO 93',
    number: '',
    type: 'calculation',
    content: calcContent,
  };
}

/**
 * Generate pavement layer structure table
 */
export function generatePavementLayerTable(
  result: FlexiblePavementResult
): DocumentSection {
  const rows: (string | number)[][] = result.layers.map((layer, index) => [
    index + 1,
    layer.name === 'Surface' ? 'Carpeta Asfáltica' :
    layer.name === 'Base' ? 'Base Granular' : 'Subbase Granular',
    layer.thicknessCm.toFixed(1),
    layer.coefficient.toFixed(3),
    layer.drainageCoeff?.toFixed(2) || '-',
    layer.contribution.toFixed(2),
  ]);

  // Add total row
  const totalContribution = result.layers.reduce((sum, l) => sum + l.contribution, 0);
  const totalThickness = result.layers.reduce((sum, l) => sum + l.thicknessCm, 0);
  rows.push(['', 'TOTAL', totalThickness.toFixed(1), '-', '-', totalContribution.toFixed(2)]);

  const content: TableContent = {
    type: 'table',
    headers: ['N°', 'Capa', 'Espesor (cm)', 'Coef. (ai)', 'Drenaje (mi)', 'Aporte SN'],
    rows,
    caption: `Estructura de Pavimento Flexible - SN requerido: ${result.SN.toFixed(2)}, SN proporcionado: ${result.SNprovided.toFixed(2)}`,
    alignment: ['center', 'left', 'right', 'right', 'right', 'right'],
    highlightRows: [rows.length - 1],
  };

  return {
    id: generateId(),
    title: 'Estructura de Pavimento',
    number: '',
    type: 'table',
    content,
  };
}

/**
 * Generate rigid pavement joint details table
 */
export function generateRigidPavementJointTable(
  result: RigidPavementResult
): DocumentSection {
  const rows: (string | number)[][] = [
    ['Espaciamiento de juntas transversales', result.jointSpacing.toFixed(1), 'm'],
    ['Barras de traspaso (pasadores)', '', ''],
    ['  - Diámetro', result.dowelDiameter, 'mm'],
    ['  - Longitud', result.dowelLength, 'mm'],
    ['  - Espaciamiento', result.dowelSpacing, 'mm'],
    ['Barras de amarre', '', ''],
    ['  - Diámetro', result.tieBarDiameter, 'mm'],
    ['  - Longitud', result.tieBarLength, 'mm'],
    ['  - Espaciamiento', result.tieBarSpacing, 'mm'],
  ];

  const content: TableContent = {
    type: 'table',
    headers: ['Elemento', 'Valor', 'Unidad'],
    rows,
    caption: `Detalles de Juntas - Espesor de losa: ${result.thicknessCm.toFixed(1)} cm, Hormigón ${result.concreteGrade}`,
    alignment: ['left', 'right', 'center'],
  };

  return {
    id: generateId(),
    title: 'Detalles de Juntas - Pavimento Rígido',
    number: '',
    type: 'table',
    content,
  };
}

// ============================================================================
// Road Geometry Document Generation
// ============================================================================

/**
 * Generate stopping sight distance calculation section
 */
export function generateStoppingSightDistanceCalculation(
  result: StoppingSightDistanceResult
): DocumentSection {
  const calcContent = stoppingSightDistanceEquation.toCalculationContent({
    designSpeed: result.designSpeed,
    reactionTime: result.reactionTime,
    frictionCoefficient: result.frictionCoefficient,
    grade: result.grade,
    reactionDistance: result.reactionDistance,
    brakingDistance: result.brakingDistance,
    totalDistance: result.totalDistance,
  });

  return {
    id: generateId(),
    title: `Distancia de Detención - V = ${result.designSpeed} km/h`,
    number: '',
    type: 'calculation',
    content: calcContent,
  };
}

/**
 * Generate minimum curve radius calculation section
 */
export function generateMinimumRadiusCalculation(
  designSpeed: number,
  superelevation: number,
  lateralFriction: number,
  minimumRadius: number
): DocumentSection {
  const calcContent = minimumRadiusEquation.toCalculationContent({
    designSpeed,
    superelevation,
    lateralFriction,
    minimumRadius,
  });

  return {
    id: generateId(),
    title: `Radio Mínimo de Curva - V = ${designSpeed} km/h`,
    number: '',
    type: 'calculation',
    content: calcContent,
  };
}

/**
 * Generate horizontal curve elements calculation section
 */
export function generateCircularCurveCalculation(
  radius: number,
  deflectionAngle: number,
  tangent: number,
  length: number,
  external: number,
  middleOrdinate: number,
  chord: number
): DocumentSection {
  const calcContent = circularCurveEquation.toCalculationContent({
    radius,
    deflectionAngle,
    tangent,
    length,
    external,
    middleOrdinate,
    chord,
  });

  return {
    id: generateId(),
    title: `Curva Circular Simple - R = ${radius} m, Δ = ${deflectionAngle}°`,
    number: '',
    type: 'calculation',
    content: calcContent,
  };
}

/**
 * Generate vertical curve calculation section
 */
export function generateVerticalCurveCalculation(
  curveType: 'crest' | 'sag',
  g1: number,
  g2: number,
  A: number,
  S: number,
  K: number,
  L: number
): DocumentSection {
  const calcContent = verticalCurveEquation.toCalculationContent({
    curveType,
    g1,
    g2,
    A,
    S,
    K,
    L,
  });

  const curveTypeName = curveType === 'crest' ? 'Convexa (Cresta)' : 'Cóncava (Columpio)';

  return {
    id: generateId(),
    title: `Curva Vertical ${curveTypeName} - A = ${A}%`,
    number: '',
    type: 'calculation',
    content: calcContent,
  };
}

/**
 * Generate road geometry summary table
 */
export function generateRoadGeometrySummaryTable(
  designSpeed: number,
  stoppingDistance: number,
  minRadius: number,
  maxSuperelevation: number,
  kCrest: number,
  kSag: number
): DocumentSection {
  const rows: (string | number)[][] = [
    ['Velocidad de diseño', designSpeed, 'km/h'],
    ['Distancia de detención', stoppingDistance.toFixed(1), 'm'],
    ['Radio mínimo', minRadius.toFixed(1), 'm'],
    ['Peralte máximo', maxSuperelevation.toFixed(1), '%'],
    ['Factor K (curva convexa)', kCrest.toFixed(1), 'm/%'],
    ['Factor K (curva cóncava)', kSag.toFixed(1), 'm/%'],
  ];

  const content: TableContent = {
    type: 'table',
    headers: ['Parámetro', 'Valor', 'Unidad'],
    rows,
    caption: 'Resumen de parámetros geométricos de diseño',
    alignment: ['left', 'right', 'center'],
  };

  return {
    id: generateId(),
    title: 'Resumen de Parámetros Geométricos',
    number: '',
    type: 'table',
    content,
  };
}

// ============================================================================
// Urban Elements Document Generation
// ============================================================================

/**
 * Generate pedestrian ramp calculation section
 */
export function generatePedestrianRampCalculation(
  curbHeight: number,
  result: PedestrianRampResult
): DocumentSection {
  const calcContent = rampSlopeEquation.toCalculationContent({
    curbHeight,
    runLength: result.runLength,
    runningSlope: result.runningSlope,
    crossSlope: result.crossSlope,
    bottomWidth: result.bottomWidth,
    totalDepth: result.totalDepth,
    compliant: result.compliance.compliant,
    violations: result.compliance.violations,
  });

  return {
    id: generateId(),
    title: 'Diseño de Rampa Peatonal - OGUC',
    number: '',
    type: 'calculation',
    content: calcContent,
  };
}

/**
 * Generate pedestrian ramp specifications table
 */
export function generatePedestrianRampTable(
  result: PedestrianRampResult
): DocumentSection {
  const rows: (string | number)[][] = [
    ['Tipo de rampa', result.type, ''],
    ['Pendiente longitudinal', result.runningSlope.toFixed(2), '%'],
    ['Pendiente transversal', result.crossSlope.toFixed(2), '%'],
    ['Ancho de rampa', result.bottomWidth.toFixed(2), 'm'],
    ['Longitud de desarrollo', result.runLength.toFixed(2), 'm'],
    ['Profundidad total', result.totalDepth.toFixed(2), 'm'],
    ['Dimensiones descanso', `${result.landing.width.toFixed(2)} x ${result.landing.depth.toFixed(2)}`, 'm'],
    ['Superficie podotáctil', result.detectableWarning.type, ''],
    ['Profundidad podotáctil', result.detectableWarning.depth.toFixed(2), 'm'],
  ];

  const status = result.compliance.compliant ? 'CUMPLE OGUC' : 'NO CUMPLE';

  const content: TableContent = {
    type: 'table',
    headers: ['Parámetro', 'Valor', 'Unidad'],
    rows,
    caption: `Especificaciones de Rampa Peatonal - Estado: ${status}`,
    alignment: ['left', 'right', 'center'],
  };

  return {
    id: generateId(),
    title: 'Especificaciones de Rampa Peatonal',
    number: '',
    type: 'table',
    content,
  };
}

/**
 * Generate accessibility compliance summary
 */
export function generateAccessibilityComplianceSection(
  violations: string[],
  warnings: string[],
  recommendations: string[]
): DocumentSection {
  const items: string[] = [];

  if (violations.length === 0 && warnings.length === 0) {
    items.push('✓ El diseño cumple con todos los requisitos de accesibilidad OGUC.');
  } else {
    if (violations.length > 0) {
      items.push('INCUMPLIMIENTOS:');
      violations.forEach(v => items.push(`  ✗ ${v}`));
    }
    if (warnings.length > 0) {
      items.push('ADVERTENCIAS:');
      warnings.forEach(w => items.push(`  ⚠ ${w}`));
    }
  }

  if (recommendations.length > 0) {
    items.push('RECOMENDACIONES:');
    recommendations.forEach(r => items.push(`  → ${r}`));
  }

  return {
    id: generateId(),
    title: 'Verificación de Accesibilidad',
    number: '',
    type: 'text',
    content: {
      type: 'text',
      text: items.join('\n'),
    },
  };
}

/**
 * Generate crosswalk design section
 */
export function generateCrosswalkCalculation(
  crosswalkType: string,
  width: number,
  length: number,
  approach1Speed: number,
  approach2Speed: number,
  visibilityDistance: number,
  adequate: boolean,
  features: string[]
): DocumentSection {
  const calcContent = crosswalkEquation.toCalculationContent({
    crosswalkType,
    width,
    length,
    approach1Speed,
    approach2Speed,
    visibilityDistance,
    adequate,
    features,
  });

  return {
    id: generateId(),
    title: `Diseño de Cruce Peatonal - ${crosswalkType}`,
    number: '',
    type: 'calculation',
    content: calcContent,
  };
}
