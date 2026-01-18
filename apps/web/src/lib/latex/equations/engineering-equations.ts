/**
 * Engineering Equations Module
 *
 * LaTeX representations of pavement design, road geometry, and urban infrastructure
 * equations used in Chilean civil engineering documents.
 *
 * Each equation includes:
 * - LaTeX formula
 * - Variable definitions with units
 * - Standard reference
 * - Calculation function
 */

import type { CalculationContent, CalculationResult } from '@/types/documents';

// ============================================================================
// AASHTO 93 Flexible Pavement Equations
// ============================================================================

/**
 * AASHTO 93 Flexible Pavement Design Equation
 *
 * Iterative solution for Structural Number (SN)
 */
export const aashtoFlexibleEquation = {
  name: 'Ecuación AASHTO 93 - Pavimento Flexible',
  latex: '\\log_{10}(W_{18}) = Z_R \\cdot S_o + 9.36 \\cdot \\log_{10}(SN+1) - 0.20 + \\frac{\\log_{10}\\left(\\frac{\\Delta PSI}{4.2-1.5}\\right)}{0.40 + \\frac{1094}{(SN+1)^{5.19}}} + 2.32 \\cdot \\log_{10}(M_R) - 8.07',
  latexStructuralNumber: 'SN = a_1 \\cdot D_1 + a_2 \\cdot m_2 \\cdot D_2 + a_3 \\cdot m_3 \\cdot D_3',
  description: 'Ecuación de diseño de pavimentos flexibles AASHTO Guide 1993.',
  reference: 'AASHTO Guide for Design of Pavement Structures, 1993',
  variables: {
    W18: { label: 'ESAL de diseño', unit: '-', description: 'Ejes equivalentes de 18 kip' },
    ZR: { label: 'Desviación normal estándar', unit: '-', description: 'Valor Z para confiabilidad' },
    So: { label: 'Desviación estándar', unit: '-', description: 'Desviación estándar combinada (0.40-0.50)' },
    SN: { label: 'Número estructural', unit: '-', description: 'Número estructural requerido' },
    deltaPSI: { label: 'Pérdida de serviciabilidad', unit: '-', description: 'ΔPSI = pi - pt' },
    MR: { label: 'Módulo resiliente', unit: 'psi', description: 'Módulo resiliente de la subrasante' },
    a1: { label: 'Coef. capa superficial', unit: '-', description: 'Coeficiente estructural capa asfáltica' },
    a2: { label: 'Coef. capa base', unit: '-', description: 'Coeficiente estructural base' },
    a3: { label: 'Coef. capa subbase', unit: '-', description: 'Coeficiente estructural subbase' },
    m2: { label: 'Coef. drenaje base', unit: '-', description: 'Coeficiente de drenaje base' },
    m3: { label: 'Coef. drenaje subbase', unit: '-', description: 'Coeficiente de drenaje subbase' },
    D1: { label: 'Espesor superficie', unit: 'in', description: 'Espesor capa asfáltica' },
    D2: { label: 'Espesor base', unit: 'in', description: 'Espesor capa base' },
    D3: { label: 'Espesor subbase', unit: 'in', description: 'Espesor capa subbase' },
  },

  toCalculationContent: (inputs: {
    W18: number;
    reliability: number;
    So: number;
    pi: number;
    pt: number;
    MR: number;
    SN: number;
    SNprovided: number;
    layers: Array<{ name: string; thickness: number; thicknessCm: number; coefficient: number; drainageCoeff?: number; contribution: number }>;
  }): CalculationContent => {
    const deltaPSI = inputs.pi - inputs.pt;
    const adequate = inputs.SNprovided >= inputs.SN;

    return {
      type: 'calculation',
      calculationType: 'aashto_flexible_pavement',
      inputs: {
        W18: { label: 'ESAL de diseño', value: inputs.W18, unit: '-' },
        reliability: { label: 'Confiabilidad', value: inputs.reliability, unit: '%' },
        So: { label: 'Desviación estándar', value: inputs.So, unit: '-' },
        pi: { label: 'Serviciabilidad inicial', value: inputs.pi, unit: '-' },
        pt: { label: 'Serviciabilidad terminal', value: inputs.pt, unit: '-' },
        deltaPSI: { label: 'ΔPSI', value: deltaPSI, unit: '-' },
        MR: { label: 'Módulo resiliente', value: inputs.MR, unit: 'psi' },
      },
      results: {
        SN: {
          label: 'Número Estructural Requerido',
          value: inputs.SN,
          unit: '-',
          formula: aashtoFlexibleEquation.latex,
          status: adequate ? 'ok' : 'error',
          statusMessage: adequate ? 'Diseño adecuado' : `SN proporcionado (${inputs.SNprovided.toFixed(2)}) es menor que el requerido`,
        },
        SNprovided: {
          label: 'Número Estructural Proporcionado',
          value: inputs.SNprovided,
          unit: '-',
          formula: aashtoFlexibleEquation.latexStructuralNumber,
          status: adequate ? 'ok' : 'warning',
        },
      },
      nchReference: 'AASHTO 93 / MOP Manual de Carreteras Vol. 3',
    };
  },
};

/**
 * AASHTO 93 Rigid Pavement Design Equation
 */
export const aashtoRigidEquation = {
  name: 'Ecuación AASHTO 93 - Pavimento Rígido',
  latex: '\\log_{10}(W_{18}) = Z_R \\cdot S_o + 7.35 \\cdot \\log_{10}(D+1) - 0.06 + \\frac{\\log_{10}\\left(\\frac{\\Delta PSI}{4.5-1.5}\\right)}{1 + \\frac{1.624 \\times 10^7}{(D+1)^{8.46}}} + (4.22 - 0.32 \\cdot p_t) \\cdot \\log_{10}\\left[\\frac{S_c \\cdot C_d \\cdot (D^{0.75} - 1.132)}{215.63 \\cdot J \\cdot (D^{0.75} - \\frac{18.42}{(E_c/k)^{0.25}})}\\right]',
  description: 'Ecuación de diseño de pavimentos rígidos AASHTO Guide 1993.',
  reference: 'AASHTO Guide for Design of Pavement Structures, 1993',
  variables: {
    W18: { label: 'ESAL de diseño', unit: '-', description: 'Ejes equivalentes de 18 kip' },
    D: { label: 'Espesor de losa', unit: 'in', description: 'Espesor de la losa de hormigón' },
    Sc: { label: 'Módulo de ruptura', unit: 'psi', description: 'Módulo de ruptura del hormigón' },
    Ec: { label: 'Módulo elástico', unit: 'psi', description: 'Módulo elástico del hormigón' },
    k: { label: 'Módulo de reacción', unit: 'pci', description: 'Módulo de reacción de la subrasante' },
    J: { label: 'Coef. transferencia de carga', unit: '-', description: 'Factor J (2.5-4.4)' },
    Cd: { label: 'Coef. de drenaje', unit: '-', description: 'Coeficiente de drenaje (0.9-1.25)' },
  },

  toCalculationContent: (inputs: {
    W18: number;
    reliability: number;
    So: number;
    pi: number;
    pt: number;
    Ec: number;
    Sc: number;
    k: number;
    J: number;
    Cd: number;
    thickness: number;
    thicknessCm: number;
    concreteGrade: string;
  }): CalculationContent => {
    const deltaPSI = inputs.pi - inputs.pt;
    const minThickness = inputs.W18 < 1000000 ? 6 : inputs.W18 < 5000000 ? 7 : inputs.W18 < 20000000 ? 8 : 9;
    const adequate = inputs.thickness >= minThickness;

    return {
      type: 'calculation',
      calculationType: 'aashto_rigid_pavement',
      inputs: {
        W18: { label: 'ESAL de diseño', value: inputs.W18, unit: '-' },
        reliability: { label: 'Confiabilidad', value: inputs.reliability, unit: '%' },
        So: { label: 'Desviación estándar', value: inputs.So, unit: '-' },
        pi: { label: 'Serviciabilidad inicial', value: inputs.pi, unit: '-' },
        pt: { label: 'Serviciabilidad terminal', value: inputs.pt, unit: '-' },
        Ec: { label: 'Módulo elástico hormigón', value: inputs.Ec, unit: 'psi' },
        Sc: { label: 'Módulo de ruptura', value: inputs.Sc, unit: 'psi' },
        k: { label: 'Módulo reacción subrasante', value: inputs.k, unit: 'pci' },
        J: { label: 'Coef. transferencia de carga', value: inputs.J, unit: '-' },
        Cd: { label: 'Coef. drenaje', value: inputs.Cd, unit: '-' },
      },
      results: {
        D: {
          label: 'Espesor de losa',
          value: inputs.thickness,
          unit: 'pulg',
          formula: aashtoRigidEquation.latex,
          status: adequate ? 'ok' : 'warning',
          statusMessage: adequate ? 'Diseño adecuado' : `Espesor menor al mínimo recomendado (${minThickness}")`,
        },
        Dcm: {
          label: 'Espesor de losa',
          value: inputs.thicknessCm,
          unit: 'cm',
          status: 'ok',
        },
        concreteGrade: {
          label: 'Grado de hormigón',
          value: inputs.concreteGrade,
          unit: '',
          status: 'ok',
        },
      },
      nchReference: 'AASHTO 93 / NCh 170',
    };
  },
};

// ============================================================================
// Road Geometry Equations
// ============================================================================

/**
 * Stopping Sight Distance Equation
 */
export const stoppingSightDistanceEquation = {
  name: 'Distancia de Detención',
  latex: 'D_p = \\frac{V \\cdot t}{3.6} + \\frac{V^2}{254 \\cdot (f \\pm G)}',
  latexReaction: 'd_{reacción} = \\frac{V \\cdot t}{3.6}',
  latexBraking: 'd_{frenado} = \\frac{V^2}{254 \\cdot (f \\pm G)}',
  description: 'Distancia mínima requerida para detener un vehículo de forma segura.',
  reference: 'AASHTO Green Book / MOP Manual de Carreteras Vol. 3',
  variables: {
    Dp: { label: 'Distancia de detención', unit: 'm', description: 'Distancia total de parada' },
    V: { label: 'Velocidad de diseño', unit: 'km/h', description: 'Velocidad de diseño' },
    t: { label: 'Tiempo de reacción', unit: 's', description: 'Tiempo percepción-reacción (típico 2.5s)' },
    f: { label: 'Coef. de fricción', unit: '-', description: 'Coeficiente de fricción longitudinal' },
    G: { label: 'Pendiente', unit: '%', description: 'Pendiente de la vía (+ subida, - bajada)' },
  },

  toCalculationContent: (inputs: {
    designSpeed: number;
    reactionTime: number;
    frictionCoefficient: number;
    grade: number;
    reactionDistance: number;
    brakingDistance: number;
    totalDistance: number;
  }): CalculationContent => {
    return {
      type: 'calculation',
      calculationType: 'stopping_sight_distance',
      inputs: {
        V: { label: 'Velocidad de diseño', value: inputs.designSpeed, unit: 'km/h' },
        t: { label: 'Tiempo de reacción', value: inputs.reactionTime, unit: 's' },
        f: { label: 'Coef. de fricción', value: inputs.frictionCoefficient, unit: '-' },
        G: { label: 'Pendiente', value: inputs.grade, unit: '%' },
      },
      results: {
        d_reaction: {
          label: 'Distancia de reacción',
          value: inputs.reactionDistance,
          unit: 'm',
          formula: stoppingSightDistanceEquation.latexReaction,
        },
        d_braking: {
          label: 'Distancia de frenado',
          value: inputs.brakingDistance,
          unit: 'm',
          formula: stoppingSightDistanceEquation.latexBraking,
        },
        Dp: {
          label: 'Distancia de detención',
          value: inputs.totalDistance,
          unit: 'm',
          formula: stoppingSightDistanceEquation.latex,
          status: 'ok',
        },
      },
      nchReference: 'MOP Manual de Carreteras Vol. 3',
    };
  },
};

/**
 * Minimum Curve Radius Equation
 */
export const minimumRadiusEquation = {
  name: 'Radio Mínimo de Curva Horizontal',
  latex: 'R_{min} = \\frac{V^2}{127 \\cdot (e + f)}',
  description: 'Radio mínimo de curva horizontal para velocidad y peralte dados.',
  reference: 'AASHTO Green Book / MOP Manual de Carreteras Vol. 3',
  variables: {
    Rmin: { label: 'Radio mínimo', unit: 'm', description: 'Radio mínimo de curva' },
    V: { label: 'Velocidad de diseño', unit: 'km/h', description: 'Velocidad de diseño' },
    e: { label: 'Peralte', unit: '-', description: 'Peralte máximo (decimal)' },
    f: { label: 'Fricción lateral', unit: '-', description: 'Coeficiente de fricción lateral' },
  },

  toCalculationContent: (inputs: {
    designSpeed: number;
    superelevation: number;
    lateralFriction: number;
    minimumRadius: number;
  }): CalculationContent => {
    return {
      type: 'calculation',
      calculationType: 'minimum_curve_radius',
      inputs: {
        V: { label: 'Velocidad de diseño', value: inputs.designSpeed, unit: 'km/h' },
        e: { label: 'Peralte', value: inputs.superelevation, unit: '%' },
        f: { label: 'Fricción lateral', value: inputs.lateralFriction, unit: '-' },
      },
      results: {
        Rmin: {
          label: 'Radio mínimo',
          value: inputs.minimumRadius,
          unit: 'm',
          formula: minimumRadiusEquation.latex,
          status: 'ok',
        },
      },
      nchReference: 'MOP Manual de Carreteras Vol. 3',
    };
  },
};

/**
 * Simple Circular Curve Elements
 */
export const circularCurveEquation = {
  name: 'Elementos de Curva Circular Simple',
  latexTangent: 'T = R \\cdot \\tan\\left(\\frac{\\Delta}{2}\\right)',
  latexLength: 'L = \\frac{\\pi \\cdot R \\cdot \\Delta}{180}',
  latexExternal: 'E = R \\cdot \\left(\\sec\\left(\\frac{\\Delta}{2}\\right) - 1\\right)',
  latexMiddleOrdinate: 'M = R \\cdot \\left(1 - \\cos\\left(\\frac{\\Delta}{2}\\right)\\right)',
  latexChord: 'C = 2 \\cdot R \\cdot \\sin\\left(\\frac{\\Delta}{2}\\right)',
  description: 'Elementos geométricos de una curva circular simple.',
  reference: 'MOP Manual de Carreteras Vol. 3',
  variables: {
    R: { label: 'Radio', unit: 'm', description: 'Radio de la curva' },
    Delta: { label: 'Ángulo de deflexión', unit: '°', description: 'Ángulo central de la curva' },
    T: { label: 'Tangente', unit: 'm', description: 'Longitud de la tangente' },
    L: { label: 'Longitud de curva', unit: 'm', description: 'Desarrollo de la curva' },
    E: { label: 'Externa', unit: 'm', description: 'Distancia externa' },
    M: { label: 'Ordenada media', unit: 'm', description: 'Ordenada media' },
    C: { label: 'Cuerda', unit: 'm', description: 'Cuerda larga' },
  },

  toCalculationContent: (inputs: {
    radius: number;
    deflectionAngle: number;
    tangent: number;
    length: number;
    external: number;
    middleOrdinate: number;
    chord: number;
  }): CalculationContent => {
    return {
      type: 'calculation',
      calculationType: 'circular_curve_elements',
      inputs: {
        R: { label: 'Radio', value: inputs.radius, unit: 'm' },
        Delta: { label: 'Ángulo de deflexión', value: inputs.deflectionAngle, unit: '°' },
      },
      results: {
        T: {
          label: 'Tangente',
          value: inputs.tangent,
          unit: 'm',
          formula: circularCurveEquation.latexTangent,
        },
        L: {
          label: 'Longitud de curva',
          value: inputs.length,
          unit: 'm',
          formula: circularCurveEquation.latexLength,
        },
        E: {
          label: 'Externa',
          value: inputs.external,
          unit: 'm',
          formula: circularCurveEquation.latexExternal,
        },
        M: {
          label: 'Ordenada media',
          value: inputs.middleOrdinate,
          unit: 'm',
          formula: circularCurveEquation.latexMiddleOrdinate,
        },
        C: {
          label: 'Cuerda',
          value: inputs.chord,
          unit: 'm',
          formula: circularCurveEquation.latexChord,
        },
      },
      nchReference: 'MOP Manual de Carreteras Vol. 3',
    };
  },
};

/**
 * Vertical Curve Length Equation
 */
export const verticalCurveEquation = {
  name: 'Longitud de Curva Vertical',
  latexCrest: 'L = \\frac{A \\cdot S^2}{200 \\cdot (\\sqrt{h_1} + \\sqrt{h_2})^2}',
  latexSag: 'L = \\frac{A \\cdot S^2}{200 \\cdot (H + S \\cdot \\tan(\\alpha))}',
  latexGeneral: 'L = K \\cdot A',
  description: 'Longitud mínima de curva vertical para distancia de visibilidad.',
  reference: 'AASHTO Green Book / MOP Manual de Carreteras Vol. 3',
  variables: {
    L: { label: 'Longitud de curva', unit: 'm', description: 'Longitud de la curva vertical' },
    A: { label: 'Diferencia algebraica', unit: '%', description: 'A = |g1 - g2|' },
    S: { label: 'Distancia de visibilidad', unit: 'm', description: 'Distancia de visibilidad requerida' },
    K: { label: 'Factor K', unit: 'm/%', description: 'Factor de curvatura vertical' },
    h1: { label: 'Altura de ojo', unit: 'm', description: 'Altura del ojo del conductor' },
    h2: { label: 'Altura de objeto', unit: 'm', description: 'Altura del objeto' },
  },

  toCalculationContent: (inputs: {
    curveType: 'crest' | 'sag';
    g1: number;
    g2: number;
    A: number;
    S: number;
    K: number;
    L: number;
    highLowPointStation?: number;
  }): CalculationContent => {
    const formula = inputs.curveType === 'crest'
      ? verticalCurveEquation.latexCrest
      : verticalCurveEquation.latexSag;

    return {
      type: 'calculation',
      calculationType: 'vertical_curve',
      inputs: {
        curveType: { label: 'Tipo de curva', value: inputs.curveType === 'crest' ? 'Convexa (cresta)' : 'Cóncava (columpio)', unit: '' },
        g1: { label: 'Pendiente entrada', value: inputs.g1, unit: '%' },
        g2: { label: 'Pendiente salida', value: inputs.g2, unit: '%' },
        A: { label: 'Diferencia algebraica', value: inputs.A, unit: '%' },
        S: { label: 'Dist. visibilidad requerida', value: inputs.S, unit: 'm' },
      },
      results: {
        K: {
          label: 'Factor K',
          value: inputs.K,
          unit: 'm/%',
          formula: verticalCurveEquation.latexGeneral,
        },
        L: {
          label: 'Longitud de curva',
          value: inputs.L,
          unit: 'm',
          formula,
          status: 'ok',
        },
      },
      nchReference: 'MOP Manual de Carreteras Vol. 3',
    };
  },
};

// ============================================================================
// Urban Elements Equations
// ============================================================================

/**
 * Pedestrian Ramp Slope Equation
 */
export const rampSlopeEquation = {
  name: 'Pendiente de Rampa Peatonal',
  latex: 'i = \\frac{h}{L} \\times 100',
  latexMaxSlope: 'i_{max} = 8.33\\% \\quad (1:12)',
  description: 'Cálculo de pendiente longitudinal de rampa de accesibilidad.',
  reference: 'OGUC Art. 4.1.7 / ADA Standards',
  variables: {
    i: { label: 'Pendiente', unit: '%', description: 'Pendiente longitudinal' },
    h: { label: 'Altura', unit: 'm', description: 'Desnivel a salvar' },
    L: { label: 'Longitud', unit: 'm', description: 'Longitud de desarrollo' },
  },

  toCalculationContent: (inputs: {
    curbHeight: number;
    runLength: number;
    runningSlope: number;
    crossSlope: number;
    bottomWidth: number;
    totalDepth: number;
    compliant: boolean;
    violations: string[];
  }): CalculationContent => {
    const maxSlope = 8.33;
    const adequate = inputs.runningSlope <= maxSlope;

    return {
      type: 'calculation',
      calculationType: 'pedestrian_ramp',
      inputs: {
        h: { label: 'Altura de solera', value: inputs.curbHeight, unit: 'm' },
        L: { label: 'Longitud de desarrollo', value: inputs.runLength, unit: 'm' },
        ancho: { label: 'Ancho de rampa', value: inputs.bottomWidth, unit: 'm' },
      },
      results: {
        i: {
          label: 'Pendiente longitudinal',
          value: inputs.runningSlope,
          unit: '%',
          formula: rampSlopeEquation.latex,
          status: adequate ? 'ok' : 'error',
          statusMessage: adequate
            ? 'Cumple con pendiente máxima OGUC (8.33%)'
            : `Pendiente (${inputs.runningSlope.toFixed(1)}%) excede máximo permitido (8.33%)`,
        },
        crossSlope: {
          label: 'Pendiente transversal',
          value: inputs.crossSlope,
          unit: '%',
          status: inputs.crossSlope <= 2.0 ? 'ok' : 'error',
        },
        depth: {
          label: 'Profundidad total',
          value: inputs.totalDepth,
          unit: 'm',
          status: 'ok',
        },
      },
      nchReference: 'OGUC Art. 4.1.7',
    };
  },
};

/**
 * Crosswalk Design Standards
 */
export const crosswalkEquation = {
  name: 'Diseño de Paso de Cebra',
  latexWidth: 'W \\geq 3.0 \\text{ m (mínimo)}',
  latexVisibility: 'D_v \\geq D_p \\text{ (distancia detención)}',
  description: 'Estándares de diseño para pasos peatonales.',
  reference: 'REDEVU / MUTCD',

  toCalculationContent: (inputs: {
    crosswalkType: string;
    width: number;
    length: number;
    approach1Speed: number;
    approach2Speed: number;
    visibilityDistance: number;
    adequate: boolean;
    features: string[];
  }): CalculationContent => {
    const minWidth = 3.0;

    return {
      type: 'calculation',
      calculationType: 'crosswalk_design',
      inputs: {
        type: { label: 'Tipo de cruce', value: inputs.crosswalkType, unit: '' },
        length: { label: 'Longitud de cruce', value: inputs.length, unit: 'm' },
        V1: { label: 'Velocidad acceso 1', value: inputs.approach1Speed, unit: 'km/h' },
        V2: { label: 'Velocidad acceso 2', value: inputs.approach2Speed, unit: 'km/h' },
      },
      results: {
        width: {
          label: 'Ancho de paso',
          value: inputs.width,
          unit: 'm',
          formula: crosswalkEquation.latexWidth,
          status: inputs.width >= minWidth ? 'ok' : 'error',
          statusMessage: inputs.width >= minWidth
            ? 'Cumple ancho mínimo (3.0 m)'
            : `Ancho (${inputs.width.toFixed(1)} m) menor al mínimo (3.0 m)`,
        },
        visibility: {
          label: 'Distancia de visibilidad',
          value: inputs.visibilityDistance,
          unit: 'm',
          status: inputs.adequate ? 'ok' : 'warning',
        },
      },
      nchReference: 'REDEVU',
    };
  },
};

// ============================================================================
// Export all equations
// ============================================================================

export const pavementEquations = {
  aashtoFlexible: aashtoFlexibleEquation,
  aashtoRigid: aashtoRigidEquation,
};

export const roadGeometryEquations = {
  stoppingSightDistance: stoppingSightDistanceEquation,
  minimumRadius: minimumRadiusEquation,
  circularCurve: circularCurveEquation,
  verticalCurve: verticalCurveEquation,
};

export const urbanEquations = {
  rampSlope: rampSlopeEquation,
  crosswalk: crosswalkEquation,
};

export const allEngineeringEquations = {
  ...pavementEquations,
  ...roadGeometryEquations,
  ...urbanEquations,
};
