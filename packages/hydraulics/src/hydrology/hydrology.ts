/**
 * Hydrology Module for Chilean Infrastructure Design
 * Focused on Biobío and Ñuble regions
 *
 * Implements:
 * - IDF (Intensity-Duration-Frequency) curves using Gumbel distribution
 * - Design storm hyetographs
 * - Return period calculations
 *
 * Based on Chilean standards and research from Universidad de Talca
 * (FONDEF D08I1054 project - Pizarro et al.)
 */

// ============================================
// TYPES
// ============================================

export interface StationCoefficients {
  name: string;
  code: string;
  region: 'biobio' | 'nuble';
  latitude: number;
  longitude: number;
  elevation: number; // meters
  // Gumbel distribution coefficients for sub-hourly (< 1hr)
  beta1: number;
  alfa1: number;
  // Gumbel distribution coefficients for hourly (>= 1hr)
  beta2: number;
  alfa2: number;
  // Annual mean precipitation (mm)
  annualPrecip?: number;
}

export interface IDFResult {
  station: string;
  returnPeriod: number; // years
  duration: number; // minutes
  intensity: number; // mm/hr
  depth: number; // mm (total precipitation)
}

export interface DesignStorm {
  station: string;
  returnPeriod: number;
  totalDuration: number; // minutes
  timeStep: number; // minutes
  times: number[]; // array of time steps (minutes from start)
  intensities: number[]; // mm/hr for each time step
  depths: number[]; // mm for each time step
  cumulativeDepth: number[]; // mm cumulative
  peakIntensity: number;
  totalDepth: number;
}

export type ReturnPeriod = 2 | 5 | 10 | 25 | 50 | 100;
export type Duration = 15 | 30 | 45 | 60 | 120 | 360 | 720 | 1440; // minutes

// ============================================
// STATION DATA - BIOBÍO AND ÑUBLE REGIONS
// ============================================

/**
 * Gumbel distribution coefficients for meteorological stations
 * Source: Universidad de Talca - Curvas IDF Chile
 * FONDEF D08I1054 project
 */
export const STATIONS: StationCoefficients[] = [
  // Ñuble Region Stations
  {
    name: 'Chillán DMC',
    code: 'CHILLAN',
    region: 'nuble',
    latitude: -36.5872,
    longitude: -72.0400,
    elevation: 124,
    beta1: -0.391,
    alfa1: 1.732,
    beta2: -0.790,
    alfa2: 3.542,
    annualPrecip: 1100,
  },
  {
    name: 'Embalse Diguillín',
    code: 'DIGUILLIN',
    region: 'nuble',
    latitude: -36.8667,
    longitude: -71.6333,
    elevation: 650,
    beta1: -0.421,
    alfa1: 1.856,
    beta2: -0.812,
    alfa2: 3.678,
    annualPrecip: 1800,
  },
  {
    name: 'Embalse Coihueco',
    code: 'COIHUECO',
    region: 'nuble',
    latitude: -36.6500,
    longitude: -71.7833,
    elevation: 320,
    beta1: -0.398,
    alfa1: 1.789,
    beta2: -0.795,
    alfa2: 3.598,
    annualPrecip: 1450,
  },
  // Biobío Region Stations
  {
    name: 'Los Ángeles',
    code: 'LOSANGELES',
    region: 'biobio',
    latitude: -37.4694,
    longitude: -72.3528,
    elevation: 145,
    beta1: -0.478,
    alfa1: 1.149,
    beta2: -0.936,
    alfa2: 2.445,
    annualPrecip: 1180,
  },
  {
    name: 'Concepción Carriel Sur',
    code: 'CONCEPCION',
    region: 'biobio',
    latitude: -36.7833,
    longitude: -73.0500,
    elevation: 12,
    beta1: -0.456,
    alfa1: 1.623,
    beta2: -0.878,
    alfa2: 3.245,
    annualPrecip: 1310,
  },
  {
    name: 'Polcura Endesa',
    code: 'POLCURA',
    region: 'biobio',
    latitude: -37.2833,
    longitude: -71.4333,
    elevation: 570,
    beta1: -0.512,
    alfa1: 1.234,
    beta2: -0.967,
    alfa2: 2.678,
    annualPrecip: 2200,
  },
  {
    name: 'Bellavista',
    code: 'BELLAVISTA',
    region: 'biobio',
    latitude: -37.0833,
    longitude: -72.4500,
    elevation: 180,
    beta1: -0.445,
    alfa1: 1.567,
    beta2: -0.856,
    alfa2: 3.123,
    annualPrecip: 1250,
  },
  {
    name: 'Quilaco',
    code: 'QUILACO',
    region: 'biobio',
    latitude: -37.6833,
    longitude: -72.0000,
    elevation: 230,
    beta1: -0.489,
    alfa1: 1.345,
    beta2: -0.923,
    alfa2: 2.789,
    annualPrecip: 1650,
  },
];

// ============================================
// GUMBEL DISTRIBUTION FUNCTIONS
// ============================================

/**
 * Gumbel reduced variate for return period
 * y_T = -ln(-ln(1 - 1/T))
 */
export function gumbelReducedVariate(returnPeriod: number): number {
  return -Math.log(-Math.log(1 - 1 / returnPeriod));
}

/**
 * Calculate rainfall intensity using Gumbel distribution
 *
 * Formula: I = (beta + alfa * y_T) * D^n
 * Where:
 *   I = intensity (mm/hr)
 *   beta, alfa = Gumbel coefficients
 *   y_T = Gumbel reduced variate for return period T
 *   D = duration (hours)
 *   n = exponent (typically -0.75 for Chile)
 *
 * Note: Different coefficients for sub-hourly vs hourly durations
 */
export function calculateIntensity(
  station: StationCoefficients,
  returnPeriod: number,
  durationMinutes: number
): number {
  const y_T = gumbelReducedVariate(returnPeriod);
  const durationHours = durationMinutes / 60;

  // Use different coefficients based on duration
  // Sub-hourly uses beta1/alfa1, hourly uses beta2/alfa2
  const beta = durationMinutes < 60 ? station.beta1 : station.beta2;
  const alfa = durationMinutes < 60 ? station.alfa1 : station.alfa2;

  // Standard exponent for Chilean IDF curves
  const n = -0.75;

  // Calculate base intensity at 1 hour
  const baseIntensity = beta + alfa * y_T;

  // Apply duration correction
  const intensity = baseIntensity * Math.pow(durationHours, n);

  return Math.max(0, intensity);
}

/**
 * Calculate rainfall depth from intensity
 * P = I * D / 60
 */
export function intensityToDepth(intensity: number, durationMinutes: number): number {
  return intensity * durationMinutes / 60;
}

// ============================================
// IDF CURVE GENERATION
// ============================================

/**
 * Generate complete IDF curve data for a station
 */
export function generateIDFCurve(
  station: StationCoefficients,
  returnPeriods: ReturnPeriod[] = [2, 5, 10, 25, 50, 100],
  durations: Duration[] = [15, 30, 45, 60, 120, 360, 720, 1440]
): IDFResult[] {
  const results: IDFResult[] = [];

  for (const T of returnPeriods) {
    for (const D of durations) {
      const intensity = calculateIntensity(station, T, D);
      const depth = intensityToDepth(intensity, D);

      results.push({
        station: station.name,
        returnPeriod: T,
        duration: D,
        intensity,
        depth,
      });
    }
  }

  return results;
}

/**
 * Get IDF intensity table for display
 */
export function getIDFTable(station: StationCoefficients): {
  returnPeriods: number[];
  durations: number[];
  intensities: number[][]; // [returnPeriod][duration]
} {
  const returnPeriods: ReturnPeriod[] = [2, 5, 10, 25, 50, 100];
  const durations: Duration[] = [15, 30, 45, 60, 120, 360, 720, 1440];

  const intensities: number[][] = returnPeriods.map(T =>
    durations.map(D => calculateIntensity(station, T, D))
  );

  return { returnPeriods, durations, intensities };
}

// ============================================
// DESIGN STORM HYETOGRAPH
// ============================================

/**
 * Generate design storm using Alternating Block Method
 * This distributes rainfall intensities with peak at center
 */
export function generateDesignStorm(
  station: StationCoefficients,
  returnPeriod: ReturnPeriod,
  totalDurationMinutes: number,
  timeStepMinutes: number = 5
): DesignStorm {
  const numBlocks = Math.floor(totalDurationMinutes / timeStepMinutes);
  const times: number[] = [];
  const depths: number[] = [];

  // Calculate cumulative depths for each duration
  const cumulativeDepths: { duration: number; depth: number }[] = [];
  for (let i = 1; i <= numBlocks; i++) {
    const duration = i * timeStepMinutes;
    const intensity = calculateIntensity(station, returnPeriod, duration);
    const depth = intensityToDepth(intensity, duration);
    cumulativeDepths.push({ duration, depth });
  }

  // Calculate incremental depths
  const incrementalDepths: number[] = [];
  for (let i = 0; i < cumulativeDepths.length; i++) {
    if (i === 0) {
      incrementalDepths.push(cumulativeDepths[i].depth);
    } else {
      incrementalDepths.push(cumulativeDepths[i].depth - cumulativeDepths[i - 1].depth);
    }
  }

  // Sort incremental depths in descending order
  const sortedDepths = [...incrementalDepths].sort((a, b) => b - a);

  // Alternating block method: place largest at center, then alternate sides
  const result = new Array(numBlocks).fill(0);
  const center = Math.floor(numBlocks / 2);

  for (let i = 0; i < sortedDepths.length; i++) {
    if (i === 0) {
      result[center] = sortedDepths[i];
    } else if (i % 2 === 1) {
      // Place on right of center
      const offset = Math.ceil(i / 2);
      if (center + offset < numBlocks) {
        result[center + offset] = sortedDepths[i];
      }
    } else {
      // Place on left of center
      const offset = i / 2;
      if (center - offset >= 0) {
        result[center - offset] = sortedDepths[i];
      }
    }
  }

  // Build output arrays
  for (let i = 0; i < numBlocks; i++) {
    times.push(i * timeStepMinutes);
    depths.push(result[i]);
  }

  // Calculate intensities from depths
  const intensities = depths.map(d => (d / timeStepMinutes) * 60);

  // Calculate cumulative depth
  const cumulativeDepth: number[] = [];
  let cumSum = 0;
  for (const d of depths) {
    cumSum += d;
    cumulativeDepth.push(cumSum);
  }

  return {
    station: station.name,
    returnPeriod,
    totalDuration: totalDurationMinutes,
    timeStep: timeStepMinutes,
    times,
    intensities,
    depths,
    cumulativeDepth,
    peakIntensity: Math.max(...intensities),
    totalDepth: cumSum,
  };
}

/**
 * Generate Chicago design storm (asymmetric)
 * r = time to peak / total duration (typically 0.375 for Chile)
 */
export function generateChicagoStorm(
  station: StationCoefficients,
  returnPeriod: ReturnPeriod,
  totalDurationMinutes: number,
  timeStepMinutes: number = 5,
  r: number = 0.375 // advance coefficient
): DesignStorm {
  const numBlocks = Math.floor(totalDurationMinutes / timeStepMinutes);
  const peakTime = r * totalDurationMinutes;
  const times: number[] = [];
  const intensities: number[] = [];
  const depths: number[] = [];

  // IDF curve parameters (simplified Bernard formula)
  // I = a / (t + b)^c
  // We derive parameters from station coefficients
  const y_T = gumbelReducedVariate(returnPeriod);
  const a = station.alfa1 * y_T + station.beta1;
  const b = 10; // typical value for Chile (minutes)
  const c = 0.75;

  for (let i = 0; i < numBlocks; i++) {
    const t = i * timeStepMinutes;
    times.push(t);

    let intensity: number;
    if (t <= peakTime) {
      // Rising limb
      const tb = peakTime - t;
      intensity = (a * ((1 - c) * (tb + b) + c * b)) / Math.pow(tb + b, c + 1);
    } else {
      // Falling limb
      const ta = t - peakTime;
      intensity = (a * ((1 - c) * (ta + b) + c * b)) / Math.pow(ta + b, c + 1);
    }

    intensities.push(Math.max(0, intensity));
    depths.push((intensity * timeStepMinutes) / 60);
  }

  // Calculate cumulative depth
  const cumulativeDepth: number[] = [];
  let cumSum = 0;
  for (const d of depths) {
    cumSum += d;
    cumulativeDepth.push(cumSum);
  }

  return {
    station: station.name,
    returnPeriod,
    totalDuration: totalDurationMinutes,
    timeStep: timeStepMinutes,
    times,
    intensities,
    depths,
    cumulativeDepth,
    peakIntensity: Math.max(...intensities),
    totalDepth: cumSum,
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Find nearest station to a given coordinate
 */
export function findNearestStation(
  latitude: number,
  longitude: number
): StationCoefficients {
  let nearest = STATIONS[0];
  let minDistance = Infinity;

  for (const station of STATIONS) {
    const distance = haversineDistance(
      latitude,
      longitude,
      station.latitude,
      station.longitude
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearest = station;
    }
  }

  return nearest;
}

/**
 * Get stations by region
 */
export function getStationsByRegion(region: 'biobio' | 'nuble'): StationCoefficients[] {
  return STATIONS.filter(s => s.region === region);
}

/**
 * Haversine distance between two points (km)
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Format duration for display
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return `${minutes / 60} hr`;
  return `${minutes / 1440} días`;
}

/**
 * Get intensity description for drainage design
 */
export function getIntensityCategory(intensity: number): {
  category: 'light' | 'moderate' | 'heavy' | 'extreme';
  description: string;
  color: string;
} {
  if (intensity < 10) {
    return { category: 'light', description: 'Lluvia ligera', color: '#22c55e' };
  }
  if (intensity < 30) {
    return { category: 'moderate', description: 'Lluvia moderada', color: '#eab308' };
  }
  if (intensity < 60) {
    return { category: 'heavy', description: 'Lluvia intensa', color: '#f97316' };
  }
  return { category: 'extreme', description: 'Lluvia extrema', color: '#ef4444' };
}

// ============================================
// DESIGN STANDARDS - CHILE
// ============================================

/**
 * Recommended return periods for different infrastructure types
 * Based on Chilean MOP (Ministry of Public Works) standards
 */
export const DESIGN_STANDARDS = {
  // Aguas Lluvias (Stormwater)
  stormwater: {
    minorDrainage: { returnPeriod: 2, description: 'Drenaje menor - calles locales' },
    majorDrainage: { returnPeriod: 10, description: 'Drenaje mayor - colectores' },
    criticalInfra: { returnPeriod: 25, description: 'Infraestructura crítica' },
    floodControl: { returnPeriod: 100, description: 'Control de inundaciones' },
  },
  // Alcantarillado (Sewerage)
  sewerage: {
    secondary: { returnPeriod: 5, description: 'Red secundaria' },
    primary: { returnPeriod: 10, description: 'Red primaria' },
    trunk: { returnPeriod: 25, description: 'Colector troncal' },
  },
  // Obras Hidráulicas (Hydraulic Works)
  hydraulic: {
    smallBridge: { returnPeriod: 50, description: 'Puentes menores' },
    largeBridge: { returnPeriod: 100, description: 'Puentes mayores' },
    dam: { returnPeriod: 1000, description: 'Presas (PMF)' },
  },
  // Durations típicas
  durations: {
    urban: { minutes: 15, description: 'Área urbana pequeña (< 5 ha)' },
    suburban: { minutes: 30, description: 'Área suburbana (5-50 ha)' },
    catchment: { minutes: 60, description: 'Cuenca pequeña (50-500 ha)' },
    river: { minutes: 360, description: 'Cuenca media (> 500 ha)' },
  },
} as const;

/**
 * Get recommended design parameters for a project type
 */
export function getDesignRecommendation(
  projectType: 'stormwater' | 'sewerage' | 'hydraulic',
  subType: string
): { returnPeriod: number; description: string } | undefined {
  const standards = DESIGN_STANDARDS[projectType] as Record<string, { returnPeriod: number; description: string }>;
  return standards[subType];
}
