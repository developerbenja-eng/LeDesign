/**
 * Hydraulic Equations Module
 *
 * LaTeX representations of common hydraulic and civil engineering equations
 * used in Chilean infrastructure design documents.
 *
 * Each equation includes:
 * - LaTeX formula
 * - Variable definitions with units
 * - NCh or standard reference
 * - Calculation function
 */

import type { CalculationContent, CalculationValue, CalculationResult, CalculationStep } from '@/types/documents';

// ============================================================================
// Open Channel Flow Equations
// ============================================================================

/**
 * Manning Equation for open channel flow
 *
 * Q = (1/n) * A * R^(2/3) * S^(1/2)
 */
export const manningEquation = {
  name: 'Ecuación de Manning',
  latex: 'Q = \\frac{1}{n} \\cdot A \\cdot R^{2/3} \\cdot S^{1/2}',
  latexAlternate: 'V = \\frac{1}{n} \\cdot R^{2/3} \\cdot S^{1/2}',
  description: 'Ecuación de Manning para flujo uniforme en canales abiertos y tuberías parcialmente llenas.',
  reference: 'NCh 1105 Of.2008',
  variables: {
    Q: { label: 'Caudal', unit: 'm³/s', description: 'Caudal volumétrico' },
    n: { label: 'Coeficiente de Manning', unit: '-', description: 'Coeficiente de rugosidad' },
    A: { label: 'Área', unit: 'm²', description: 'Área de la sección transversal mojada' },
    R: { label: 'Radio hidráulico', unit: 'm', description: 'R = A / Pm' },
    S: { label: 'Pendiente', unit: 'm/m', description: 'Pendiente del fondo del canal' },
    V: { label: 'Velocidad', unit: 'm/s', description: 'Velocidad media del flujo' },
  },

  calculate: (inputs: {
    n: number;
    A: number;
    R: number;
    S: number;
  }): { Q: number; V: number } => {
    const V = (1 / inputs.n) * Math.pow(inputs.R, 2 / 3) * Math.pow(inputs.S, 0.5);
    const Q = V * inputs.A;
    return { Q, V };
  },

  toCalculationContent: (inputs: {
    n: number;
    A: number;
    R: number;
    S: number;
  }): CalculationContent => {
    const results = manningEquation.calculate(inputs);
    return {
      type: 'calculation',
      calculationType: 'manning_flow',
      inputs: {
        n: { label: 'Coeficiente de Manning', value: inputs.n, unit: '-' },
        A: { label: 'Área mojada', value: inputs.A, unit: 'm²' },
        R: { label: 'Radio hidráulico', value: inputs.R, unit: 'm' },
        S: { label: 'Pendiente', value: inputs.S, unit: 'm/m' },
      },
      results: {
        V: {
          label: 'Velocidad',
          value: results.V,
          unit: 'm/s',
          formula: 'V = \\frac{1}{n} \\cdot R^{2/3} \\cdot S^{1/2}',
        },
        Q: {
          label: 'Caudal',
          value: results.Q,
          unit: 'm³/s',
          formula: 'Q = V \\cdot A',
        },
      },
      nchReference: 'NCh 1105',
    };
  },
};

/**
 * Manning N values for common materials
 */
export const manningNValues: Record<string, { n: number; description: string }> = {
  pvc: { n: 0.010, description: 'PVC liso' },
  hdpe: { n: 0.010, description: 'HDPE liso' },
  concrete_smooth: { n: 0.013, description: 'Hormigón liso' },
  concrete_rough: { n: 0.015, description: 'Hormigón rugoso' },
  clay_vitrified: { n: 0.013, description: 'Arcilla vitrificada' },
  cast_iron: { n: 0.013, description: 'Fierro fundido' },
  corrugated_metal: { n: 0.024, description: 'Metal corrugado' },
  earth_channel: { n: 0.025, description: 'Canal en tierra' },
  grass_channel: { n: 0.035, description: 'Canal con pasto' },
};

// ============================================================================
// Pressure Flow Equations (Pipes)
// ============================================================================

/**
 * Hazen-Williams Equation
 *
 * hf = 10.67 * L * Q^1.852 / (C^1.852 * D^4.87)
 */
export const hazenWilliamsEquation = {
  name: 'Ecuación de Hazen-Williams',
  latex: 'h_f = 10.67 \\cdot \\frac{L \\cdot Q^{1.852}}{C^{1.852} \\cdot D^{4.87}}',
  latexVelocity: 'V = 0.849 \\cdot C \\cdot R^{0.63} \\cdot S^{0.54}',
  description: 'Ecuación empírica para pérdida de carga en tuberías a presión.',
  reference: 'NCh 691 Of.2015',
  variables: {
    hf: { label: 'Pérdida de carga', unit: 'm', description: 'Pérdida de carga por fricción' },
    L: { label: 'Longitud', unit: 'm', description: 'Longitud de la tubería' },
    Q: { label: 'Caudal', unit: 'm³/s', description: 'Caudal volumétrico' },
    C: { label: 'Coeficiente C', unit: '-', description: 'Coeficiente de Hazen-Williams' },
    D: { label: 'Diámetro', unit: 'm', description: 'Diámetro interno de la tubería' },
  },

  calculate: (inputs: {
    L: number;
    Q: number;
    C: number;
    D: number;
  }): { hf: number; S: number } => {
    const hf =
      10.67 *
      inputs.L *
      Math.pow(inputs.Q, 1.852) /
      (Math.pow(inputs.C, 1.852) * Math.pow(inputs.D, 4.87));
    const S = hf / inputs.L;
    return { hf, S };
  },

  toCalculationContent: (inputs: {
    L: number;
    Q: number;
    C: number;
    D: number;
  }): CalculationContent => {
    const results = hazenWilliamsEquation.calculate(inputs);
    return {
      type: 'calculation',
      calculationType: 'hazen_williams',
      inputs: {
        L: { label: 'Longitud', value: inputs.L, unit: 'm' },
        Q: { label: 'Caudal', value: inputs.Q, unit: 'm³/s' },
        C: { label: 'Coeficiente C', value: inputs.C, unit: '-' },
        D: { label: 'Diámetro', value: inputs.D, unit: 'm' },
      },
      results: {
        hf: {
          label: 'Pérdida de carga',
          value: results.hf,
          unit: 'm',
          formula: hazenWilliamsEquation.latex,
        },
        S: {
          label: 'Gradiente hidráulico',
          value: results.S,
          unit: 'm/m',
          formula: 'S = h_f / L',
        },
      },
      nchReference: 'NCh 691',
    };
  },
};

/**
 * Hazen-Williams C values for common materials
 */
export const hazenWilliamsCValues: Record<string, { C: number; description: string }> = {
  pvc_new: { C: 150, description: 'PVC nuevo' },
  hdpe_new: { C: 150, description: 'HDPE nuevo' },
  ductile_iron_new: { C: 140, description: 'Fierro dúctil nuevo' },
  ductile_iron_10yr: { C: 130, description: 'Fierro dúctil (10 años)' },
  cast_iron_new: { C: 130, description: 'Fierro fundido nuevo' },
  cast_iron_20yr: { C: 100, description: 'Fierro fundido (20 años)' },
  concrete: { C: 120, description: 'Hormigón' },
  steel_new: { C: 145, description: 'Acero nuevo' },
  galvanized: { C: 120, description: 'Galvanizado' },
};

/**
 * Darcy-Weisbach Equation
 *
 * hf = f * (L/D) * (V²/2g)
 */
export const darcyWeisbachEquation = {
  name: 'Ecuación de Darcy-Weisbach',
  latex: 'h_f = f \\cdot \\frac{L}{D} \\cdot \\frac{V^2}{2g}',
  description: 'Ecuación teórica para pérdida de carga en tuberías.',
  reference: 'NCh 691 Of.2015',
  variables: {
    hf: { label: 'Pérdida de carga', unit: 'm', description: 'Pérdida de carga por fricción' },
    f: { label: 'Factor de fricción', unit: '-', description: 'Factor de fricción de Darcy' },
    L: { label: 'Longitud', unit: 'm', description: 'Longitud de la tubería' },
    D: { label: 'Diámetro', unit: 'm', description: 'Diámetro interno' },
    V: { label: 'Velocidad', unit: 'm/s', description: 'Velocidad media' },
    g: { label: 'Gravedad', unit: 'm/s²', description: 'Aceleración de gravedad (9.81)' },
  },

  calculate: (inputs: {
    f: number;
    L: number;
    D: number;
    V: number;
  }): { hf: number } => {
    const g = 9.81;
    const hf = inputs.f * (inputs.L / inputs.D) * (Math.pow(inputs.V, 2) / (2 * g));
    return { hf };
  },
};

// ============================================================================
// Stormwater Equations
// ============================================================================

/**
 * Rational Method
 *
 * Q = C * i * A * 2.78 (for Q in L/s, i in mm/h, A in ha)
 */
export const rationalMethodEquation = {
  name: 'Método Racional',
  latex: 'Q = C \\cdot i \\cdot A \\cdot 2.78',
  latexMetric: 'Q = C \\cdot i \\cdot A / 360',
  description: 'Método para estimar el caudal máximo de escorrentía superficial.',
  reference: 'Manual de Aguas Lluvias MINVU',
  variables: {
    Q: { label: 'Caudal', unit: 'L/s', description: 'Caudal pico de escorrentía' },
    C: { label: 'Coeficiente de escorrentía', unit: '-', description: 'C = 0 a 1' },
    i: { label: 'Intensidad de lluvia', unit: 'mm/h', description: 'Intensidad para período de retorno' },
    A: { label: 'Área de drenaje', unit: 'ha', description: 'Área tributaria' },
  },

  calculate: (inputs: {
    C: number;
    i: number;
    A: number;
  }): { Q: number } => {
    // Q in L/s when i in mm/h and A in ha
    const Q = inputs.C * inputs.i * inputs.A * 2.78;
    return { Q };
  },

  toCalculationContent: (inputs: {
    C: number;
    i: number;
    A: number;
  }): CalculationContent => {
    const results = rationalMethodEquation.calculate(inputs);
    return {
      type: 'calculation',
      calculationType: 'rational_method',
      inputs: {
        C: { label: 'Coeficiente de escorrentía', value: inputs.C, unit: '-' },
        i: { label: 'Intensidad de lluvia', value: inputs.i, unit: 'mm/h' },
        A: { label: 'Área de drenaje', value: inputs.A, unit: 'ha' },
      },
      results: {
        Q: {
          label: 'Caudal de diseño',
          value: results.Q,
          unit: 'L/s',
          formula: rationalMethodEquation.latex,
        },
      },
      nchReference: 'Manual MINVU Aguas Lluvias',
    };
  },
};

/**
 * Runoff coefficients for different land uses
 */
export const runoffCoefficients: Record<string, { C: number; description: string }> = {
  impervious: { C: 0.95, description: 'Superficies impermeables (asfalto, hormigón)' },
  roofs: { C: 0.90, description: 'Techos' },
  gravel: { C: 0.50, description: 'Grava, maicillo' },
  lawn_flat: { C: 0.20, description: 'Césped plano (< 2%)' },
  lawn_steep: { C: 0.35, description: 'Césped pendiente (> 7%)' },
  parks: { C: 0.25, description: 'Parques y jardines' },
  industrial: { C: 0.80, description: 'Zona industrial' },
  commercial: { C: 0.85, description: 'Zona comercial' },
  residential_high: { C: 0.70, description: 'Residencial alta densidad' },
  residential_low: { C: 0.40, description: 'Residencial baja densidad' },
};

// ============================================================================
// Sewer Design Equations
// ============================================================================

/**
 * Harmon Formula for peak sewer flow
 *
 * M = 1 + 14/(4 + sqrt(P))
 */
export const harmonEquation = {
  name: 'Fórmula de Harmon',
  latex: 'M = 1 + \\frac{14}{4 + \\sqrt{P}}',
  description: 'Factor de mayoración para caudales pico en alcantarillado sanitario.',
  reference: 'RIDAA Art. 48',
  variables: {
    M: { label: 'Factor de mayoración', unit: '-', description: 'Factor Harmon (1.5 - 4.0)' },
    P: { label: 'Población', unit: 'miles hab.', description: 'Población servida en miles' },
  },

  calculate: (inputs: { P: number }): { M: number } => {
    const M = 1 + 14 / (4 + Math.sqrt(inputs.P));
    return { M };
  },

  toCalculationContent: (inputs: { P: number }): CalculationContent => {
    const results = harmonEquation.calculate(inputs);
    return {
      type: 'calculation',
      calculationType: 'harmon_factor',
      inputs: {
        P: { label: 'Población servida', value: inputs.P, unit: 'miles hab.' },
      },
      results: {
        M: {
          label: 'Factor de Harmon',
          value: results.M,
          unit: '-',
          formula: harmonEquation.latex,
          status: results.M >= 1.5 && results.M <= 4.0 ? 'ok' : 'warning',
          statusMessage: results.M < 1.5 ? 'Usar M mínimo = 1.5' : results.M > 4.0 ? 'Usar M máximo = 4.0' : undefined,
        },
      },
      nchReference: 'RIDAA Art. 48',
    };
  },
};

/**
 * Population density design values (RIDAA)
 */
export const populationDensity: Record<string, { density: number; dotation: number; description: string }> = {
  rural: { density: 50, dotation: 100, description: 'Rural' },
  suburban: { density: 100, dotation: 150, description: 'Suburbano' },
  low_density: { density: 150, dotation: 180, description: 'Baja densidad' },
  medium_density: { density: 250, dotation: 200, description: 'Media densidad' },
  high_density: { density: 400, dotation: 250, description: 'Alta densidad' },
  very_high: { density: 600, dotation: 300, description: 'Muy alta densidad' },
};

// ============================================================================
// Hydraulic Geometry Equations
// ============================================================================

/**
 * Circular pipe flowing partially full
 */
export const circularPipeGeometry = {
  name: 'Geometría Tubería Circular',

  /**
   * Calculate area for given fill ratio (y/D)
   */
  area: (D: number, fillRatio: number): number => {
    const theta = 2 * Math.acos(1 - 2 * fillRatio);
    return (D * D / 8) * (theta - Math.sin(theta));
  },

  /**
   * Calculate wetted perimeter for given fill ratio
   */
  wettedPerimeter: (D: number, fillRatio: number): number => {
    const theta = 2 * Math.acos(1 - 2 * fillRatio);
    return (D * theta) / 2;
  },

  /**
   * Calculate hydraulic radius for given fill ratio
   */
  hydraulicRadius: (D: number, fillRatio: number): number => {
    const A = circularPipeGeometry.area(D, fillRatio);
    const Pm = circularPipeGeometry.wettedPerimeter(D, fillRatio);
    return A / Pm;
  },

  /**
   * Calculate top width for given fill ratio
   */
  topWidth: (D: number, fillRatio: number): number => {
    const y = fillRatio * D;
    return 2 * Math.sqrt(y * (D - y));
  },

  /**
   * LaTeX for area formula
   */
  areaLatex: 'A = \\frac{D^2}{8} \\cdot (\\theta - \\sin\\theta)',
  perimeterLatex: 'P_m = \\frac{D \\cdot \\theta}{2}',
  thetaLatex: '\\theta = 2 \\cdot \\arccos(1 - 2y/D)',
};

/**
 * Froude Number
 */
export const froudeNumber = {
  name: 'Número de Froude',
  latex: 'Fr = \\frac{V}{\\sqrt{g \\cdot y_h}}',
  description: 'Relación entre fuerzas inerciales y gravitacionales. Fr < 1: subcrítico, Fr > 1: supercrítico.',
  reference: 'NCh 1105',
  variables: {
    Fr: { label: 'Número de Froude', unit: '-', description: 'Adimensional' },
    V: { label: 'Velocidad', unit: 'm/s', description: 'Velocidad media del flujo' },
    g: { label: 'Gravedad', unit: 'm/s²', description: '9.81 m/s²' },
    yh: { label: 'Profundidad hidráulica', unit: 'm', description: 'yh = A / T' },
  },

  calculate: (inputs: { V: number; yh: number }): { Fr: number; regime: string } => {
    const g = 9.81;
    const Fr = inputs.V / Math.sqrt(g * inputs.yh);
    let regime = 'crítico';
    if (Fr < 0.95) regime = 'subcrítico';
    else if (Fr > 1.05) regime = 'supercrítico';
    return { Fr, regime };
  },
};

// ============================================================================
// Export all equations
// ============================================================================

export const allEquations = {
  manning: manningEquation,
  hazenWilliams: hazenWilliamsEquation,
  darcyWeisbach: darcyWeisbachEquation,
  rational: rationalMethodEquation,
  harmon: harmonEquation,
  froude: froudeNumber,
  circularPipe: circularPipeGeometry,
};

export const materialCoefficients = {
  manningN: manningNValues,
  hazenWilliamsC: hazenWilliamsCValues,
  runoffC: runoffCoefficients,
  populationDensity,
};
