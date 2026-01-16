/**
 * Soil and Geotechnical Data Integration
 *
 * Provides soil classification, geotechnical parameters,
 * bearing capacity estimates, and groundwater information.
 */

import type { BoundingBox } from '../hydrology/copernicus-flood';

// ============================================================================
// Types
// ============================================================================

export interface SoilUnit {
  id: string;
  clasificacionUSDA: string;
  clasificacionFAO?: string;
  textura: 'arenoso' | 'franco' | 'arcilloso' | 'limoso' | 'franco_arenoso' | 'franco_arcilloso';
  profundidadEfectiva: number; // cm
  drenaje: 'excesivo' | 'bueno' | 'moderado' | 'imperfecto' | 'pobre';
  permeabilidad: 'muy_alta' | 'alta' | 'moderada' | 'baja' | 'muy_baja';
  capacidadUso: string; // I-VIII
  ph?: number;
  materiaOrganica?: number; // percentage
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
}

export interface GeotechnicalZone {
  id: string;
  tipoSueloNCh433: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  descripcion: string;
  vsPromedio?: number; // m/s - Shear wave velocity
  nsptPromedio?: number; // SPT blow count
  capacidadPortante?: number; // kg/cm² - estimated bearing capacity
  asentamientoEsperado?: string;
  licuefaccion: 'no_susceptible' | 'baja' | 'media' | 'alta';
  recomendaciones: string[];
}

export interface GroundwaterData {
  nivelFreatico?: number; // meters below surface
  variacionEstacional?: { min: number; max: number };
  calidad?: 'potable' | 'no_potable' | 'salobre';
  acuifero?: string;
  pozosRegistrados: number;
}

export interface NCh433SoilClass {
  tipo: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  nombre: string;
  descripcion: string;
  vsRango: { min: number; max: number }; // m/s
  nsptRango: { min: number; max: number };
  cu?: { min: number; max?: number }; // kPa - undrained shear strength
  T0: number; // Characteristic period (s)
  S: number; // Amplification factor
  p: number; // Exponent
}

export interface FoundationRecommendation {
  tipoRecomendado: 'superficial' | 'profunda' | 'especial';
  opciones: Array<{
    tipo: string;
    descripcion: string;
    profundidadMinima: number;
    capacidadEstimada?: number;
    observaciones: string[];
  }>;
  advertencias: string[];
  estudiosRequeridos: string[];
}

// ============================================================================
// NCh433 Soil Classification
// ============================================================================

export const NCH433_SOIL_CLASSES: Record<string, NCh433SoilClass> = {
  A: {
    tipo: 'A',
    nombre: 'Roca',
    descripcion: 'Roca con Vs > 900 m/s o roca muy fracturada con Vs > 500 m/s',
    vsRango: { min: 500, max: Infinity },
    nsptRango: { min: 50, max: Infinity },
    T0: 0.15,
    S: 0.90,
    p: 1.0,
  },
  B: {
    tipo: 'B',
    nombre: 'Suelo muy denso o muy firme',
    descripcion: 'Grava densa, arena muy densa, o arcilla muy firme',
    vsRango: { min: 350, max: 500 },
    nsptRango: { min: 40, max: 50 },
    cu: { min: 100 },
    T0: 0.30,
    S: 1.00,
    p: 1.0,
  },
  C: {
    tipo: 'C',
    nombre: 'Suelo denso o firme',
    descripcion: 'Arena densa, grava arenosa, o arcilla firme',
    vsRango: { min: 180, max: 350 },
    nsptRango: { min: 15, max: 40 },
    cu: { min: 50, max: 100 },
    T0: 0.40,
    S: 1.05,
    p: 1.0,
  },
  D: {
    tipo: 'D',
    nombre: 'Suelo medianamente denso',
    descripcion: 'Arena de compacidad media o arcilla de consistencia media',
    vsRango: { min: 100, max: 180 },
    nsptRango: { min: 6, max: 15 },
    cu: { min: 25, max: 50 },
    T0: 0.75,
    S: 1.20,
    p: 1.0,
  },
  E: {
    tipo: 'E',
    nombre: 'Suelo de baja compacidad',
    descripcion: 'Arena suelta o arcilla blanda',
    vsRango: { min: 0, max: 100 },
    nsptRango: { min: 0, max: 6 },
    cu: { min: 0, max: 25 },
    T0: 1.20,
    S: 1.30,
    p: 0.9,
  },
  F: {
    tipo: 'F',
    nombre: 'Suelos especiales',
    descripcion: 'Suelos susceptibles de licuefacción, colapsables, orgánicos, o rellenos no controlados',
    vsRango: { min: 0, max: Infinity },
    nsptRango: { min: 0, max: Infinity },
    T0: 1.20,
    S: 1.30,
    p: 0.8,
  },
};

// ============================================================================
// Soil Type Database (Chile regions)
// ============================================================================

interface RegionalSoilData {
  region: string;
  sueloTipico: string;
  texturaComun: SoilUnit['textura'];
  profundidadPromedio: number;
  drenajeComun: SoilUnit['drenaje'];
  clasificacionNCh433: NCh433SoilClass['tipo'];
  riesgoLicuefaccion: GeotechnicalZone['licuefaccion'];
  observaciones: string[];
}

const REGIONAL_SOIL_DATA: RegionalSoilData[] = [
  {
    region: 'Arica y Parinacota',
    sueloTipico: 'Aridisol / Entisol',
    texturaComun: 'arenoso',
    profundidadPromedio: 30,
    drenajeComun: 'excesivo',
    clasificacionNCh433: 'C',
    riesgoLicuefaccion: 'baja',
    observaciones: ['Suelos desérticos', 'Alta salinidad posible', 'Baja materia orgánica'],
  },
  {
    region: 'Tarapacá',
    sueloTipico: 'Aridisol',
    texturaComun: 'arenoso',
    profundidadPromedio: 25,
    drenajeComun: 'excesivo',
    clasificacionNCh433: 'C',
    riesgoLicuefaccion: 'baja',
    observaciones: ['Desierto de Atacama', 'Suelos salinos', 'Costras calcáreas'],
  },
  {
    region: 'Antofagasta',
    sueloTipico: 'Aridisol',
    texturaComun: 'arenoso',
    profundidadPromedio: 20,
    drenajeComun: 'excesivo',
    clasificacionNCh433: 'C',
    riesgoLicuefaccion: 'baja',
    observaciones: ['Suelos muy áridos', 'Posible presencia de nitratos'],
  },
  {
    region: 'Atacama',
    sueloTipico: 'Aridisol / Entisol',
    texturaComun: 'franco_arenoso',
    profundidadPromedio: 40,
    drenajeComun: 'bueno',
    clasificacionNCh433: 'C',
    riesgoLicuefaccion: 'baja',
    observaciones: ['Valles con suelos aluviales', 'Clima transicional'],
  },
  {
    region: 'Coquimbo',
    sueloTipico: 'Mollisol / Alfisol',
    texturaComun: 'franco',
    profundidadPromedio: 60,
    drenajeComun: 'bueno',
    clasificacionNCh433: 'C',
    riesgoLicuefaccion: 'media',
    observaciones: ['Valles transversales', 'Suelos agrícolas importantes'],
  },
  {
    region: 'Valparaíso',
    sueloTipico: 'Alfisol / Mollisol',
    texturaComun: 'franco_arcilloso',
    profundidadPromedio: 80,
    drenajeComun: 'moderado',
    clasificacionNCh433: 'D',
    riesgoLicuefaccion: 'media',
    observaciones: ['Suelos de ladera', 'Riesgo de erosión', 'Costa con arenas'],
  },
  {
    region: 'Metropolitana',
    sueloTipico: 'Mollisol / Alfisol',
    texturaComun: 'franco',
    profundidadPromedio: 100,
    drenajeComun: 'bueno',
    clasificacionNCh433: 'C',
    riesgoLicuefaccion: 'media',
    observaciones: ['Cuenca de Santiago', 'Depósitos aluviales', 'Nivel freático variable'],
  },
  {
    region: "O'Higgins",
    sueloTipico: 'Mollisol',
    texturaComun: 'franco_arcilloso',
    profundidadPromedio: 100,
    drenajeComun: 'moderado',
    clasificacionNCh433: 'C',
    riesgoLicuefaccion: 'media',
    observaciones: ['Valle Central', 'Suelos agrícolas de alta calidad'],
  },
  {
    region: 'Maule',
    sueloTipico: 'Andisol / Mollisol',
    texturaComun: 'franco',
    profundidadPromedio: 90,
    drenajeComun: 'bueno',
    clasificacionNCh433: 'C',
    riesgoLicuefaccion: 'media',
    observaciones: ['Suelos volcánicos en cordillera', 'Secano costero erosionado'],
  },
  {
    region: 'Ñuble',
    sueloTipico: 'Andisol / Alfisol',
    texturaComun: 'franco',
    profundidadPromedio: 80,
    drenajeComun: 'bueno',
    clasificacionNCh433: 'D',
    riesgoLicuefaccion: 'media',
    observaciones: ['Transición suelos volcánicos', 'Alto riesgo sísmico'],
  },
  {
    region: 'Biobío',
    sueloTipico: 'Andisol / Ultisol',
    texturaComun: 'franco',
    profundidadPromedio: 100,
    drenajeComun: 'bueno',
    clasificacionNCh433: 'D',
    riesgoLicuefaccion: 'alta',
    observaciones: ['Zona de licuefacción 2010', 'Suelos volcánicos', 'Costa con riesgo tsunami'],
  },
  {
    region: 'La Araucanía',
    sueloTipico: 'Andisol',
    texturaComun: 'franco',
    profundidadPromedio: 100,
    drenajeComun: 'bueno',
    clasificacionNCh433: 'D',
    riesgoLicuefaccion: 'media',
    observaciones: ['Trumaos (ceniza volcánica)', 'Suelos muy fértiles', 'Drenaje natural bueno'],
  },
  {
    region: 'Los Ríos',
    sueloTipico: 'Andisol / Inceptisol',
    texturaComun: 'franco_arcilloso',
    profundidadPromedio: 90,
    drenajeComun: 'moderado',
    clasificacionNCh433: 'D',
    riesgoLicuefaccion: 'media',
    observaciones: ['Ñadis (suelos mal drenados)', 'Alta pluviosidad'],
  },
  {
    region: 'Los Lagos',
    sueloTipico: 'Andisol / Histosol',
    texturaComun: 'franco',
    profundidadPromedio: 80,
    drenajeComun: 'moderado',
    clasificacionNCh433: 'D',
    riesgoLicuefaccion: 'media',
    observaciones: ['Turberas en zonas bajas', 'Suelos volcánicos', 'Alto contenido de agua'],
  },
  {
    region: 'Aysén',
    sueloTipico: 'Inceptisol / Histosol',
    texturaComun: 'franco',
    profundidadPromedio: 50,
    drenajeComun: 'imperfecto',
    clasificacionNCh433: 'D',
    riesgoLicuefaccion: 'baja',
    observaciones: ['Suelos de glaciar', 'Turberas', 'Delgados sobre roca'],
  },
  {
    region: 'Magallanes',
    sueloTipico: 'Histosol / Inceptisol',
    texturaComun: 'franco',
    profundidadPromedio: 40,
    drenajeComun: 'pobre',
    clasificacionNCh433: 'D',
    riesgoLicuefaccion: 'baja',
    observaciones: ['Turberas extensas', 'Permafrost en altura', 'Vientos extremos'],
  },
];

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Estimate soil type based on location
 */
export function estimateSoilType(
  lat: number,
  lon: number
): RegionalSoilData | null {
  // Determine region based on latitude (simplified)
  let region: string;

  if (lat > -18.5) {
    region = 'Arica y Parinacota';
  } else if (lat > -20.5) {
    region = 'Tarapacá';
  } else if (lat > -26) {
    region = 'Antofagasta';
  } else if (lat > -29) {
    region = 'Atacama';
  } else if (lat > -32) {
    region = 'Coquimbo';
  } else if (lat > -33.5) {
    region = 'Valparaíso';
  } else if (lat > -34.5) {
    region = 'Metropolitana';
  } else if (lat > -35.5) {
    region = "O'Higgins";
  } else if (lat > -36.5) {
    region = 'Maule';
  } else if (lat > -37) {
    region = 'Ñuble';
  } else if (lat > -38.5) {
    region = 'Biobío';
  } else if (lat > -39.5) {
    region = 'La Araucanía';
  } else if (lat > -40.5) {
    region = 'Los Ríos';
  } else if (lat > -44) {
    region = 'Los Lagos';
  } else if (lat > -49) {
    region = 'Aysén';
  } else {
    region = 'Magallanes';
  }

  return REGIONAL_SOIL_DATA.find(r => r.region === region) || null;
}

/**
 * Get NCh433 soil classification for location
 */
export function getNCh433Classification(
  lat: number,
  lon: number,
  vsData?: number, // Shear wave velocity if available
  nsptData?: number // SPT data if available
): GeotechnicalZone {
  const regionalData = estimateSoilType(lat, lon);
  let tipoSuelo: NCh433SoilClass['tipo'] = regionalData?.clasificacionNCh433 || 'C';

  // Refine classification if geotechnical data available
  if (vsData) {
    if (vsData > 500) tipoSuelo = 'A';
    else if (vsData > 350) tipoSuelo = 'B';
    else if (vsData > 180) tipoSuelo = 'C';
    else if (vsData > 100) tipoSuelo = 'D';
    else tipoSuelo = 'E';
  } else if (nsptData) {
    if (nsptData > 50) tipoSuelo = 'A';
    else if (nsptData > 40) tipoSuelo = 'B';
    else if (nsptData > 15) tipoSuelo = 'C';
    else if (nsptData > 6) tipoSuelo = 'D';
    else tipoSuelo = 'E';
  }

  const soilClass = NCH433_SOIL_CLASSES[tipoSuelo];
  const recomendaciones: string[] = [];

  // Estimate bearing capacity
  let capacidadPortante: number | undefined;
  switch (tipoSuelo) {
    case 'A':
      capacidadPortante = 10; // kg/cm²
      break;
    case 'B':
      capacidadPortante = 4;
      break;
    case 'C':
      capacidadPortante = 2;
      break;
    case 'D':
      capacidadPortante = 1;
      break;
    case 'E':
      capacidadPortante = 0.5;
      break;
  }

  // Add recommendations
  if (tipoSuelo === 'D' || tipoSuelo === 'E') {
    recomendaciones.push('Requiere estudio de mecánica de suelos detallado');
  }

  if (tipoSuelo === 'E' || tipoSuelo === 'F') {
    recomendaciones.push('Evaluar susceptibilidad a licuefacción');
    recomendaciones.push('Considerar mejoramiento de suelo o fundación profunda');
  }

  if (regionalData?.riesgoLicuefaccion === 'alta') {
    recomendaciones.push('ALERTA: Zona con antecedentes de licuefacción');
  }

  return {
    id: 'estimated',
    tipoSueloNCh433: tipoSuelo,
    descripcion: soilClass.descripcion,
    vsPromedio: vsData,
    nsptPromedio: nsptData,
    capacidadPortante,
    licuefaccion: regionalData?.riesgoLicuefaccion || 'media',
    recomendaciones,
  };
}

/**
 * Estimate foundation type for a structure
 */
export function recommendFoundation(
  lat: number,
  lon: number,
  structureType: 'vivienda' | 'edificio' | 'industrial' | 'puente' | 'muro',
  loads?: { vertical: number; horizontal?: number } // kN
): FoundationRecommendation {
  const geoZone = getNCh433Classification(lat, lon);
  const regionalSoil = estimateSoilType(lat, lon);

  const opciones: FoundationRecommendation['opciones'] = [];
  const advertencias: string[] = [];
  const estudiosRequeridos: string[] = [];

  let tipoRecomendado: FoundationRecommendation['tipoRecomendado'] = 'superficial';

  // Default studies
  estudiosRequeridos.push('Estudio de mecánica de suelos');
  estudiosRequeridos.push('Calicatas o sondajes según NCh 1508');

  // Recommendations based on soil type and structure
  switch (geoZone.tipoSueloNCh433) {
    case 'A':
    case 'B':
      opciones.push({
        tipo: 'Zapata aislada',
        descripcion: 'Fundación superficial sobre suelo competente',
        profundidadMinima: 0.8,
        capacidadEstimada: geoZone.capacidadPortante,
        observaciones: ['Suelo de buena calidad', 'Verificar nivel freático'],
      });
      opciones.push({
        tipo: 'Zapata corrida',
        descripcion: 'Para muros o estructuras lineales',
        profundidadMinima: 0.6,
        observaciones: ['Adecuado para cargas distribuidas'],
      });
      break;

    case 'C':
      opciones.push({
        tipo: 'Zapata aislada reforzada',
        descripcion: 'Fundación superficial con mayor área',
        profundidadMinima: 1.0,
        capacidadEstimada: geoZone.capacidadPortante,
        observaciones: ['Aumentar área de contacto', 'Considerar armadura'],
      });
      opciones.push({
        tipo: 'Losa de fundación',
        descripcion: 'Distribuye cargas en suelos moderados',
        profundidadMinima: 0.4,
        observaciones: ['Para estructuras livianas', 'Reduce presiones de contacto'],
      });
      break;

    case 'D':
      tipoRecomendado = structureType === 'vivienda' ? 'superficial' : 'profunda';
      opciones.push({
        tipo: 'Losa de fundación',
        descripcion: 'Recomendada para suelos blandos',
        profundidadMinima: 0.5,
        observaciones: ['Reduce asentamientos diferenciales'],
      });
      opciones.push({
        tipo: 'Pilotes de fricción',
        descripcion: 'Transfieren carga por fricción lateral',
        profundidadMinima: 6,
        observaciones: ['Para cargas mayores', 'Requiere estudio de profundidad'],
      });
      advertencias.push('Suelo de mediana a baja capacidad portante');
      estudiosRequeridos.push('Ensayo de carga de placa');
      break;

    case 'E':
    case 'F':
      tipoRecomendado = 'profunda';
      opciones.push({
        tipo: 'Pilotes preexcavados',
        descripcion: 'Fundación profunda hasta estrato competente',
        profundidadMinima: 10,
        observaciones: ['Atravesar estratos blandos', 'Apoyar en estrato firme'],
      });
      opciones.push({
        tipo: 'Mejoramiento de suelo + losa',
        descripcion: 'Compactación dinámica o columnas de grava',
        profundidadMinima: 0.5,
        observaciones: ['Alternativa a pilotes', 'Evaluar costo-beneficio'],
      });
      advertencias.push('ADVERTENCIA: Suelo de muy baja capacidad');
      advertencias.push('Alto riesgo de asentamientos');
      if (geoZone.licuefaccion === 'alta') {
        advertencias.push('CRÍTICO: Susceptible a licuefacción sísmica');
        estudiosRequeridos.push('Análisis de potencial de licuefacción');
      }
      estudiosRequeridos.push('Sondajes profundos (mínimo 15m)');
      break;
  }

  // Structure-specific adjustments
  if (structureType === 'edificio') {
    estudiosRequeridos.push('Estudio de interacción suelo-estructura');
    if (geoZone.tipoSueloNCh433 !== 'A' && geoZone.tipoSueloNCh433 !== 'B') {
      advertencias.push('Edificio requiere análisis detallado de asentamientos');
    }
  }

  if (structureType === 'puente') {
    tipoRecomendado = 'profunda';
    estudiosRequeridos.push('Estudio de socavación');
    estudiosRequeridos.push('Análisis de carga sísmica según Manual de Carreteras');
  }

  // Regional warnings
  if (regionalSoil?.observaciones) {
    for (const obs of regionalSoil.observaciones) {
      if (obs.toLowerCase().includes('licuefacción') || obs.toLowerCase().includes('tsunami')) {
        advertencias.push(obs);
      }
    }
  }

  return {
    tipoRecomendado,
    opciones,
    advertencias,
    estudiosRequeridos,
  };
}

/**
 * Estimate groundwater level
 */
export function estimateGroundwater(
  lat: number,
  lon: number
): GroundwaterData {
  const regionalSoil = estimateSoilType(lat, lon);

  // Very rough estimates based on region and typical conditions
  let nivelFreatico: number | undefined;
  let variacion: { min: number; max: number } | undefined;

  if (regionalSoil) {
    switch (regionalSoil.region) {
      case 'Arica y Parinacota':
      case 'Tarapacá':
      case 'Antofagasta':
        nivelFreatico = 50; // Deep in desert
        break;
      case 'Atacama':
      case 'Coquimbo':
        nivelFreatico = 20;
        variacion = { min: 15, max: 30 };
        break;
      case 'Valparaíso':
      case 'Metropolitana':
        nivelFreatico = 10;
        variacion = { min: 5, max: 20 };
        break;
      case "O'Higgins":
      case 'Maule':
        nivelFreatico = 5;
        variacion = { min: 2, max: 10 };
        break;
      case 'Biobío':
      case 'La Araucanía':
        nivelFreatico = 3;
        variacion = { min: 1, max: 6 };
        break;
      case 'Los Ríos':
      case 'Los Lagos':
        nivelFreatico = 2;
        variacion = { min: 0.5, max: 4 };
        break;
      case 'Aysén':
      case 'Magallanes':
        nivelFreatico = 1;
        variacion = { min: 0, max: 3 };
        break;
    }
  }

  return {
    nivelFreatico,
    variacionEstacional: variacion,
    pozosRegistrados: 0, // Would need DGA data
  };
}

