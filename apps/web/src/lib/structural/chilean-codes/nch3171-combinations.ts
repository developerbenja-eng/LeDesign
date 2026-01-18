// ============================================================
// NCh3171:2017 - Chilean Load Combinations
// Diseño Estructural - Disposiciones Generales y Combinaciones de Carga
// ============================================================
// Reference: NCh3171:2017 (based on ASCE 7 with Chilean modifications)
// ============================================================

// ============================================================
// LOAD TYPES
// ============================================================

export type LoadSymbol = 'D' | 'L' | 'Lr' | 'S' | 'R' | 'W' | 'E' | 'H' | 'F' | 'T';

export interface LoadDescription {
  symbol: LoadSymbol;
  name: string;
  nameEs: string;
  description: string;
}

export const LOAD_DESCRIPTIONS: Record<LoadSymbol, LoadDescription> = {
  D: {
    symbol: 'D',
    name: 'Dead Load',
    nameEs: 'Carga Permanente',
    description: 'Self-weight of structural and non-structural elements',
  },
  L: {
    symbol: 'L',
    name: 'Live Load',
    nameEs: 'Sobrecarga de Uso',
    description: 'Occupancy live loads per NCh1537',
  },
  Lr: {
    symbol: 'Lr',
    name: 'Roof Live Load',
    nameEs: 'Sobrecarga de Techo',
    description: 'Roof live load for maintenance access',
  },
  S: {
    symbol: 'S',
    name: 'Snow Load',
    nameEs: 'Carga de Nieve',
    description: 'Snow load per NCh431',
  },
  R: {
    symbol: 'R',
    name: 'Rain Load',
    nameEs: 'Carga de Lluvia',
    description: 'Rain load on undeflected roof',
  },
  W: {
    symbol: 'W',
    name: 'Wind Load',
    nameEs: 'Carga de Viento',
    description: 'Wind load per NCh432',
  },
  E: {
    symbol: 'E',
    name: 'Seismic Load',
    nameEs: 'Carga Sísmica',
    description: 'Seismic load per NCh433 or NCh2369',
  },
  H: {
    symbol: 'H',
    name: 'Lateral Earth Pressure',
    nameEs: 'Empuje Lateral de Suelo',
    description: 'Lateral earth pressure, groundwater, and bulk materials',
  },
  F: {
    symbol: 'F',
    name: 'Fluid Pressure',
    nameEs: 'Presión de Fluidos',
    description: 'Loads from fluids with well-defined pressures',
  },
  T: {
    symbol: 'T',
    name: 'Self-Straining Forces',
    nameEs: 'Fuerzas Autoimpuestas',
    description: 'Temperature, creep, shrinkage, differential settlement',
  },
};

// ============================================================
// LOAD FACTORS
// ============================================================

export interface LoadFactorSet {
  D: number;
  L: number;
  Lr: number;
  S: number;
  R: number;
  W: number;
  E: number;
  H?: number;
  F?: number;
  T?: number;
}

// ============================================================
// LRFD COMBINATIONS (Strength Design)
// NCh3171:2017 Section 2.3.2
// ============================================================

export interface LoadCombination {
  id: string;
  name: string;
  nameEs: string;
  type: 'strength' | 'service' | 'seismic_special';
  factors: Partial<LoadFactorSet>;
  formula: string;
  notes?: string;
}

/**
 * LRFD Load Combinations per NCh3171:2017
 * Based on ASCE 7 with Chilean modifications
 */
export const LRFD_COMBINATIONS: LoadCombination[] = [
  // Basic Combinations
  {
    id: 'LRFD-1',
    name: 'Dead Load Only',
    nameEs: 'Solo Carga Permanente',
    type: 'strength',
    factors: { D: 1.4 },
    formula: '1.4D',
  },
  {
    id: 'LRFD-2',
    name: 'Dead + Live',
    nameEs: 'Permanente + Uso',
    type: 'strength',
    factors: { D: 1.2, L: 1.6, Lr: 0.5, S: 0.5 },
    formula: '1.2D + 1.6L + 0.5(Lr or S or R)',
    notes: 'Use maximum of Lr, S, or R',
  },
  {
    id: 'LRFD-3',
    name: 'Dead + Roof/Snow',
    nameEs: 'Permanente + Techo/Nieve',
    type: 'strength',
    factors: { D: 1.2, L: 1.0, Lr: 1.6, S: 1.6 },
    formula: '1.2D + 1.6(Lr or S or R) + (1.0L or 0.5W)',
    notes: 'L factor is 0.5 for areas where L ≤ 4.8 kN/m²',
  },
  {
    id: 'LRFD-4',
    name: 'Dead + Wind',
    nameEs: 'Permanente + Viento',
    type: 'strength',
    factors: { D: 1.2, W: 1.0, L: 1.0, Lr: 0.5, S: 0.5 },
    formula: '1.2D + 1.0W + 1.0L + 0.5(Lr or S or R)',
  },
  {
    id: 'LRFD-5',
    name: 'Dead + Seismic',
    nameEs: 'Permanente + Sismo',
    type: 'strength',
    factors: { D: 1.2, E: 1.0, L: 1.0, S: 0.2 },
    formula: '1.2D + 1.0E + 1.0L + 0.2S',
    notes: 'Seismic per NCh433 or NCh2369',
  },
  {
    id: 'LRFD-6',
    name: 'Dead - Wind (Uplift)',
    nameEs: 'Permanente - Viento (Levante)',
    type: 'strength',
    factors: { D: 0.9, W: 1.0 },
    formula: '0.9D + 1.0W',
    notes: 'For uplift or overturning',
  },
  {
    id: 'LRFD-7',
    name: 'Dead - Seismic (Uplift)',
    nameEs: 'Permanente - Sismo (Levante)',
    type: 'strength',
    factors: { D: 0.9, E: 1.0 },
    formula: '0.9D + 1.0E',
    notes: 'For uplift or overturning',
  },
];

// ============================================================
// ASD COMBINATIONS (Allowable Stress Design)
// NCh3171:2017 Section 2.4.1
// ============================================================

export const ASD_COMBINATIONS: LoadCombination[] = [
  {
    id: 'ASD-1',
    name: 'Dead Load Only',
    nameEs: 'Solo Carga Permanente',
    type: 'strength',
    factors: { D: 1.0 },
    formula: 'D',
  },
  {
    id: 'ASD-2',
    name: 'Dead + Live',
    nameEs: 'Permanente + Uso',
    type: 'strength',
    factors: { D: 1.0, L: 1.0 },
    formula: 'D + L',
  },
  {
    id: 'ASD-3',
    name: 'Dead + Roof/Snow',
    nameEs: 'Permanente + Techo/Nieve',
    type: 'strength',
    factors: { D: 1.0, Lr: 1.0, S: 1.0 },
    formula: 'D + (Lr or S or R)',
  },
  {
    id: 'ASD-4',
    name: 'Dead + 0.75(Live + Roof)',
    nameEs: 'Permanente + 0.75(Uso + Techo)',
    type: 'strength',
    factors: { D: 1.0, L: 0.75, Lr: 0.75, S: 0.75 },
    formula: 'D + 0.75L + 0.75(Lr or S or R)',
  },
  {
    id: 'ASD-5',
    name: 'Dead + Wind',
    nameEs: 'Permanente + Viento',
    type: 'strength',
    factors: { D: 1.0, W: 0.6 },
    formula: 'D + 0.6W',
  },
  {
    id: 'ASD-6',
    name: 'Dead + 0.75(Live + Wind)',
    nameEs: 'Permanente + 0.75(Uso + Viento)',
    type: 'strength',
    factors: { D: 1.0, L: 0.75, W: 0.45, Lr: 0.75 },
    formula: 'D + 0.75L + 0.75(0.6W) + 0.75(Lr or S or R)',
  },
  {
    id: 'ASD-7',
    name: 'Dead + Seismic',
    nameEs: 'Permanente + Sismo',
    type: 'strength',
    factors: { D: 1.0, E: 0.7 },
    formula: 'D + 0.7E',
  },
  {
    id: 'ASD-8',
    name: 'Dead + 0.75(Live + Seismic)',
    nameEs: 'Permanente + 0.75(Uso + Sismo)',
    type: 'strength',
    factors: { D: 1.0, L: 0.75, E: 0.525, S: 0.75 },
    formula: 'D + 0.75L + 0.75(0.7E) + 0.75S',
  },
  {
    id: 'ASD-9',
    name: 'Dead - Wind (Uplift)',
    nameEs: 'Permanente - Viento (Levante)',
    type: 'strength',
    factors: { D: 0.6, W: 0.6 },
    formula: '0.6D + 0.6W',
  },
  {
    id: 'ASD-10',
    name: 'Dead - Seismic (Uplift)',
    nameEs: 'Permanente - Sismo (Levante)',
    type: 'strength',
    factors: { D: 0.6, E: 0.7 },
    formula: '0.6D + 0.7E',
  },
];

// ============================================================
// SERVICEABILITY COMBINATIONS
// NCh3171:2017 Appendix C
// ============================================================

export const SERVICE_COMBINATIONS: LoadCombination[] = [
  {
    id: 'SLS-1',
    name: 'Immediate Deflection - Live',
    nameEs: 'Deflexión Inmediata - Uso',
    type: 'service',
    factors: { L: 1.0 },
    formula: 'L',
    notes: 'For immediate deflection under live load only',
  },
  {
    id: 'SLS-2',
    name: 'Total Deflection',
    nameEs: 'Deflexión Total',
    type: 'service',
    factors: { D: 1.0, L: 1.0 },
    formula: 'D + L',
    notes: 'For total deflection including dead load',
  },
  {
    id: 'SLS-3',
    name: 'Long-term Deflection',
    nameEs: 'Deflexión a Largo Plazo',
    type: 'service',
    factors: { D: 1.0, L: 0.5 },
    formula: 'D + 0.5L',
    notes: 'For sustained loads (creep)',
  },
  {
    id: 'SLS-4',
    name: 'Wind Serviceability',
    nameEs: 'Servicio por Viento',
    type: 'service',
    factors: { W: 0.7 },
    formula: '0.7W',
    notes: 'For wind drift limits (10-year return period)',
  },
];

// ============================================================
// SEISMIC SPECIAL COMBINATIONS (NCh433/NCh2369)
// ============================================================

export const SEISMIC_SPECIAL_COMBINATIONS: LoadCombination[] = [
  {
    id: 'E-1',
    name: 'Seismic + 30%',
    nameEs: 'Sismo + 30%',
    type: 'seismic_special',
    factors: { E: 1.0 },
    formula: 'Ex + 0.3Ey',
    notes: 'Orthogonal combination per NCh433 6.3.6',
  },
  {
    id: 'E-2',
    name: 'Seismic with Overstrength',
    nameEs: 'Sismo con Sobrerresistencia',
    type: 'seismic_special',
    factors: { D: 1.2, E: 1.0, L: 1.0 },
    formula: '(1.2 + 0.2SDS)D + ΩoQE + L',
    notes: 'For capacity design elements',
  },
  {
    id: 'E-3',
    name: 'Seismic Uplift with Overstrength',
    nameEs: 'Sismo Levante con Sobrerresistencia',
    type: 'seismic_special',
    factors: { D: 0.9, E: 1.0 },
    formula: '(0.9 - 0.2SDS)D + ΩoQE',
    notes: 'For capacity design - uplift case',
  },
];

// ============================================================
// DEFLECTION LIMITS
// NCh3171:2017 Table C.1
// ============================================================

export interface DeflectionLimit {
  element: string;
  elementEs: string;
  loadCase: string;
  limit: string;
  limitValue: (L: number) => number;
}

export const DEFLECTION_LIMITS: DeflectionLimit[] = [
  // Roof members
  {
    element: 'Roof - supporting plaster ceiling',
    elementEs: 'Techo - soportando cielo de yeso',
    loadCase: 'L',
    limit: 'L/360',
    limitValue: (L: number) => L / 360,
  },
  {
    element: 'Roof - not supporting plaster',
    elementEs: 'Techo - sin cielo de yeso',
    loadCase: 'L',
    limit: 'L/240',
    limitValue: (L: number) => L / 240,
  },
  {
    element: 'Roof - total load',
    elementEs: 'Techo - carga total',
    loadCase: 'D + L',
    limit: 'L/180',
    limitValue: (L: number) => L / 180,
  },
  // Floor members
  {
    element: 'Floor - supporting plaster ceiling',
    elementEs: 'Piso - soportando cielo de yeso',
    loadCase: 'L',
    limit: 'L/360',
    limitValue: (L: number) => L / 360,
  },
  {
    element: 'Floor - not supporting plaster',
    elementEs: 'Piso - sin cielo de yeso',
    loadCase: 'L',
    limit: 'L/240',
    limitValue: (L: number) => L / 240,
  },
  {
    element: 'Floor - total load',
    elementEs: 'Piso - carga total',
    loadCase: 'D + L',
    limit: 'L/240',
    limitValue: (L: number) => L / 240,
  },
];

// ============================================================
// DRIFT LIMITS
// NCh433:2012 Table 5.1 / NCh3171
// ============================================================

export interface DriftLimit {
  structuralSystem: string;
  systemEs: string;
  limit: number;
  notes?: string;
}

export const DRIFT_LIMITS: DriftLimit[] = [
  {
    structuralSystem: 'Structures without fragile elements',
    systemEs: 'Estructuras sin elementos frágiles',
    limit: 0.015,
    notes: 'Δ/h ≤ 0.015',
  },
  {
    structuralSystem: 'Structures with fragile elements (attached)',
    systemEs: 'Estructuras con elementos frágiles (adheridos)',
    limit: 0.010,
    notes: 'Δ/h ≤ 0.010',
  },
  {
    structuralSystem: 'Structures with fragile elements (isolated)',
    systemEs: 'Estructuras con elementos frágiles (aislados)',
    limit: 0.015,
    notes: 'Δ/h ≤ 0.015 when elements are seismically isolated',
  },
  {
    structuralSystem: 'Essential facilities',
    systemEs: 'Instalaciones esenciales',
    limit: 0.010,
    notes: 'Category IV buildings per NCh433',
  },
];

// ============================================================
// LOAD COMBINATION GENERATOR
// ============================================================

export interface LoadValues {
  D: number;   // Dead load
  L?: number;  // Live load
  Lr?: number; // Roof live load
  S?: number;  // Snow load
  R?: number;  // Rain load
  W?: number;  // Wind load (positive = pressure, negative = suction)
  E?: number;  // Seismic load
  H?: number;  // Earth pressure
  F?: number;  // Fluid pressure
  T?: number;  // Self-straining
}

export interface CombinationResult {
  combination: LoadCombination;
  value: number;
  breakdown: string;
}

/**
 * Calculate all LRFD combinations for given loads
 */
export function calculateLRFDCombinations(loads: LoadValues): CombinationResult[] {
  const results: CombinationResult[] = [];

  for (const combo of LRFD_COMBINATIONS) {
    let value = 0;
    const parts: string[] = [];

    for (const [loadType, factor] of Object.entries(combo.factors)) {
      const loadValue = loads[loadType as keyof LoadValues] || 0;
      if (loadValue !== 0 && factor !== 0) {
        value += factor * loadValue;
        parts.push(`${factor}×${loadType}(${loadValue.toFixed(2)})`);
      }
    }

    // Handle Lr/S/R alternatives (use maximum)
    if (combo.formula.includes('Lr or S or R')) {
      const alternatives = [loads.Lr || 0, loads.S || 0, loads.R || 0];
      const maxAlt = Math.max(...alternatives);
      const factor = combo.factors.Lr || combo.factors.S || 0.5;
      if (maxAlt > 0) {
        value += factor * maxAlt;
        parts.push(`${factor}×max(Lr,S,R)(${maxAlt.toFixed(2)})`);
      }
    }

    results.push({
      combination: combo,
      value,
      breakdown: parts.join(' + '),
    });
  }

  return results;
}

/**
 * Calculate all ASD combinations for given loads
 */
export function calculateASDCombinations(loads: LoadValues): CombinationResult[] {
  const results: CombinationResult[] = [];

  for (const combo of ASD_COMBINATIONS) {
    let value = 0;
    const parts: string[] = [];

    for (const [loadType, factor] of Object.entries(combo.factors)) {
      const loadValue = loads[loadType as keyof LoadValues] || 0;
      if (loadValue !== 0 && factor !== 0) {
        value += factor * loadValue;
        parts.push(`${factor}×${loadType}(${loadValue.toFixed(2)})`);
      }
    }

    results.push({
      combination: combo,
      value,
      breakdown: parts.join(' + '),
    });
  }

  return results;
}

/**
 * Get the governing (maximum) combination
 */
export function getGoverningCombination(results: CombinationResult[]): CombinationResult {
  return results.reduce((max, current) =>
    Math.abs(current.value) > Math.abs(max.value) ? current : max
  );
}

/**
 * Calculate envelope of all combinations (max and min)
 */
export function calculateEnvelope(
  results: CombinationResult[]
): { max: CombinationResult; min: CombinationResult } {
  const max = results.reduce((m, c) => (c.value > m.value ? c : m));
  const min = results.reduce((m, c) => (c.value < m.value ? c : m));
  return { max, min };
}

// ============================================================
// EXPORT TYPES
// ============================================================

export interface NCh3171Parameters {
  code: 'NCh3171';
  version: '2017';
  designMethod: 'LRFD' | 'ASD';
  combinations: LoadCombination[];
  governingCombination?: CombinationResult;
}
