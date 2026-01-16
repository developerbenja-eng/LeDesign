// ============================================================
// CHILEAN SEISMIC, WIND, AND CLIMATE ZONES BY GEOLOCATION
// ============================================================
// Automatic zone determination from geographic coordinates
// Based on official Chilean norm zone maps (NCh433, NCh432, NCh431)
// ============================================================

// ============================================================
// COORDINATE TYPES
// ============================================================

export interface GeoCoordinates {
  latitude: number;   // Negative for Southern hemisphere
  longitude: number;  // Negative for Western hemisphere
  altitude?: number;  // Meters above sea level
}

export interface ProjectLocation extends GeoCoordinates {
  // Administrative location
  region?: ChileanRegion;
  province?: string;
  commune?: string;
  address?: string;

  // Derived from coordinates or user input
  altitude: number;

  // Location metadata
  source?: 'manual' | 'gps' | 'map_click' | 'address_lookup';
  accuracy?: number;  // meters
}

// ============================================================
// CHILEAN ADMINISTRATIVE DIVISIONS
// ============================================================

export type ChileanRegion =
  | 'XV'   // Arica y Parinacota
  | 'I'    // Tarapacá
  | 'II'   // Antofagasta
  | 'III'  // Atacama
  | 'IV'   // Coquimbo
  | 'V'    // Valparaíso
  | 'RM'   // Metropolitana de Santiago
  | 'VI'   // O'Higgins
  | 'VII'  // Maule
  | 'XVI'  // Ñuble
  | 'VIII' // Biobío
  | 'IX'   // Araucanía
  | 'XIV'  // Los Ríos
  | 'X'    // Los Lagos
  | 'XI'   // Aysén
  | 'XII'; // Magallanes

export interface RegionData {
  code: ChileanRegion;
  name: string;
  capital: string;
  latitudeRange: { min: number; max: number };
  seismicZones: (1 | 2 | 3)[];
  windZones: (1 | 2 | 3 | 4 | 5)[];
  hasSignificantSnow: boolean;
}

export const CHILEAN_REGIONS: Record<ChileanRegion, RegionData> = {
  XV: {
    code: 'XV',
    name: 'Arica y Parinacota',
    capital: 'Arica',
    latitudeRange: { min: -18.5, max: -17.5 },
    seismicZones: [3],
    windZones: [1, 2],
    hasSignificantSnow: true, // High altitude zones
  },
  I: {
    code: 'I',
    name: 'Tarapacá',
    capital: 'Iquique',
    latitudeRange: { min: -21.5, max: -18.5 },
    seismicZones: [3],
    windZones: [1, 2, 3],
    hasSignificantSnow: true, // High altitude zones
  },
  II: {
    code: 'II',
    name: 'Antofagasta',
    capital: 'Antofagasta',
    latitudeRange: { min: -26.1, max: -21.5 },
    seismicZones: [2, 3],
    windZones: [1, 2, 3],
    hasSignificantSnow: true, // High altitude zones
  },
  III: {
    code: 'III',
    name: 'Atacama',
    capital: 'Copiapó',
    latitudeRange: { min: -29.0, max: -26.1 },
    seismicZones: [2, 3],
    windZones: [2, 3],
    hasSignificantSnow: true, // High altitude zones
  },
  IV: {
    code: 'IV',
    name: 'Coquimbo',
    capital: 'La Serena',
    latitudeRange: { min: -32.2, max: -29.0 },
    seismicZones: [2, 3],
    windZones: [2, 3],
    hasSignificantSnow: true,
  },
  V: {
    code: 'V',
    name: 'Valparaíso',
    capital: 'Valparaíso',
    latitudeRange: { min: -33.9, max: -32.2 },
    seismicZones: [2, 3],
    windZones: [2, 3],
    hasSignificantSnow: true,
  },
  RM: {
    code: 'RM',
    name: 'Metropolitana de Santiago',
    capital: 'Santiago',
    latitudeRange: { min: -34.3, max: -32.9 },
    seismicZones: [2, 3],
    windZones: [2],
    hasSignificantSnow: true, // Cordillera
  },
  VI: {
    code: 'VI',
    name: "O'Higgins",
    capital: 'Rancagua',
    latitudeRange: { min: -35.1, max: -33.9 },
    seismicZones: [2, 3],
    windZones: [2, 3],
    hasSignificantSnow: true,
  },
  VII: {
    code: 'VII',
    name: 'Maule',
    capital: 'Talca',
    latitudeRange: { min: -36.5, max: -34.7 },
    seismicZones: [2, 3],
    windZones: [2, 3],
    hasSignificantSnow: true,
  },
  XVI: {
    code: 'XVI',
    name: 'Ñuble',
    capital: 'Chillán',
    latitudeRange: { min: -37.1, max: -36.0 },
    seismicZones: [2, 3],
    windZones: [3],
    hasSignificantSnow: true,
  },
  VIII: {
    code: 'VIII',
    name: 'Biobío',
    capital: 'Concepción',
    latitudeRange: { min: -38.5, max: -36.5 },
    seismicZones: [2, 3],
    windZones: [3],
    hasSignificantSnow: true,
  },
  IX: {
    code: 'IX',
    name: 'La Araucanía',
    capital: 'Temuco',
    latitudeRange: { min: -39.6, max: -37.6 },
    seismicZones: [2, 3],
    windZones: [3, 4],
    hasSignificantSnow: true,
  },
  XIV: {
    code: 'XIV',
    name: 'Los Ríos',
    capital: 'Valdivia',
    latitudeRange: { min: -40.5, max: -39.2 },
    seismicZones: [2, 3],
    windZones: [3, 4],
    hasSignificantSnow: true,
  },
  X: {
    code: 'X',
    name: 'Los Lagos',
    capital: 'Puerto Montt',
    latitudeRange: { min: -44.0, max: -40.2 },
    seismicZones: [2, 3],
    windZones: [4],
    hasSignificantSnow: true,
  },
  XI: {
    code: 'XI',
    name: 'Aysén',
    capital: 'Coyhaique',
    latitudeRange: { min: -49.0, max: -43.5 },
    seismicZones: [2, 3],
    windZones: [4, 5],
    hasSignificantSnow: true,
  },
  XII: {
    code: 'XII',
    name: 'Magallanes',
    capital: 'Punta Arenas',
    latitudeRange: { min: -56.0, max: -48.5 },
    seismicZones: [1, 2, 3],
    windZones: [5],
    hasSignificantSnow: true,
  },
};

// ============================================================
// SEISMIC ZONE DETERMINATION (NCh433)
// ============================================================
// Zone 1: Low seismicity (Magallanes interior)
// Zone 2: Medium seismicity (Central valley, some Patagonia)
// Zone 3: High seismicity (Coastal and near-coast areas)
// ============================================================

export interface SeismicZoneResult {
  zone: 1 | 2 | 3;
  A0: number;          // Peak ground acceleration (g)
  confidence: 'high' | 'medium' | 'low';
  source: 'coordinate_lookup' | 'region_default' | 'manual';
  notes?: string;
}

/**
 * Determine seismic zone from coordinates
 * Based on NCh433:2012 Appendix A zone maps
 *
 * The zone is primarily determined by distance from coast
 * and latitude. Zone 3 is coastal, Zone 2 is interior,
 * Zone 1 is extreme south interior.
 */
export function determineSeismicZone(
  coords: GeoCoordinates
): SeismicZoneResult {
  const { latitude, longitude } = coords;
  const absLat = Math.abs(latitude);

  // Magallanes (south of -48°) - can be any zone
  if (absLat >= 48) {
    // Interior Magallanes is Zone 1
    if (longitude > -72) {
      return {
        zone: 1,
        A0: 0.20,
        confidence: 'medium',
        source: 'coordinate_lookup',
        notes: 'Zona 1 - Interior de Magallanes',
      };
    }
    // Coastal Magallanes
    return {
      zone: 2,
      A0: 0.30,
      confidence: 'medium',
      source: 'coordinate_lookup',
      notes: 'Zona 2 - Costa de Magallanes',
    };
  }

  // Aysén (between -43.5° and -48°)
  if (absLat >= 43.5) {
    // Interior is Zone 2
    if (longitude > -72.5) {
      return {
        zone: 2,
        A0: 0.30,
        confidence: 'medium',
        source: 'coordinate_lookup',
        notes: 'Zona 2 - Interior de Aysén',
      };
    }
    // Coastal Aysén is Zone 3
    return {
      zone: 3,
      A0: 0.40,
      confidence: 'medium',
      source: 'coordinate_lookup',
      notes: 'Zona 3 - Costa de Aysén',
    };
  }

  // Central and Northern Chile - distance from coast determines zone
  // Approximate Chilean coast line runs roughly along -71.5° to -73°
  // depending on latitude

  // Calculate approximate distance from coast
  // Coast longitude varies with latitude
  const coastLongitude = getApproximateCoastLongitude(latitude);
  const distanceFromCoast = Math.abs(longitude - coastLongitude);

  // Zone 3: Within ~100km of coast (roughly 1° longitude)
  if (distanceFromCoast < 1.0) {
    return {
      zone: 3,
      A0: 0.40,
      confidence: 'high',
      source: 'coordinate_lookup',
      notes: 'Zona 3 - Área costera',
    };
  }

  // Zone 2: Interior (Central Valley, pre-cordillera)
  if (distanceFromCoast < 2.5) {
    return {
      zone: 2,
      A0: 0.30,
      confidence: 'high',
      source: 'coordinate_lookup',
      notes: 'Zona 2 - Valle central e interior',
    };
  }

  // Very far interior (Cordillera) - still Zone 2 for most of Chile
  return {
    zone: 2,
    A0: 0.30,
    confidence: 'medium',
    source: 'coordinate_lookup',
    notes: 'Zona 2 - Cordillera',
  };
}

/**
 * Approximate Chilean coast longitude by latitude
 * This is a simplified model - actual zone boundaries
 * should be verified against official NCh433 maps
 */
function getApproximateCoastLongitude(latitude: number): number {
  const absLat = Math.abs(latitude);

  // Northern Chile (Arica to Coquimbo) - coast around -70° to -71°
  if (absLat < 30) return -70.5;

  // Central Chile (Valparaíso to Biobío) - coast around -71° to -73°
  if (absLat < 38) return -71.5 - (absLat - 30) * 0.05;

  // Southern Chile - coast moves west
  return -73.5;
}

// ============================================================
// WIND ZONE DETERMINATION (NCh432)
// ============================================================
// Zone 1: 30 m/s (protected valleys, northern interior)
// Zone 2: 35 m/s (central valley, Santiago area)
// Zone 3: 45 m/s (central-south coast)
// Zone 4: 50 m/s (southern coast, Lakes region)
// Zone 5: 55 m/s (Aysén, Magallanes)
// ============================================================

export interface WindZoneResult {
  zone: 1 | 2 | 3 | 4 | 5;
  V: number;           // Basic wind speed (m/s)
  confidence: 'high' | 'medium' | 'low';
  source: 'coordinate_lookup' | 'region_default' | 'manual';
  notes?: string;
}

/**
 * Determine wind zone from coordinates
 * Based on NCh432:2025 zone map
 */
export function determineWindZone(
  coords: GeoCoordinates
): WindZoneResult {
  const { latitude, longitude } = coords;
  const absLat = Math.abs(latitude);

  // Zone 5: Magallanes and Aysén coast (south of 43°)
  if (absLat >= 50) {
    return {
      zone: 5,
      V: 55,
      confidence: 'high',
      source: 'coordinate_lookup',
      notes: 'Zona 5 - Magallanes (55 m/s)',
    };
  }

  if (absLat >= 43) {
    // Aysén - mostly Zone 4-5
    if (longitude < -73) {
      return {
        zone: 5,
        V: 55,
        confidence: 'medium',
        source: 'coordinate_lookup',
        notes: 'Zona 5 - Costa de Aysén',
      };
    }
    return {
      zone: 4,
      V: 50,
      confidence: 'medium',
      source: 'coordinate_lookup',
      notes: 'Zona 4 - Interior de Aysén',
    };
  }

  // Zone 4: Los Lagos, Los Ríos coast (40° to 43°)
  if (absLat >= 40) {
    return {
      zone: 4,
      V: 50,
      confidence: 'high',
      source: 'coordinate_lookup',
      notes: 'Zona 4 - Región de Los Lagos',
    };
  }

  // Zone 3-4: Araucanía, Biobío (37° to 40°)
  if (absLat >= 37) {
    // Coast is Zone 4
    if (longitude < -72.5) {
      return {
        zone: 4,
        V: 50,
        confidence: 'medium',
        source: 'coordinate_lookup',
        notes: 'Zona 4 - Costa sur',
      };
    }
    // Interior is Zone 3
    return {
      zone: 3,
      V: 45,
      confidence: 'high',
      source: 'coordinate_lookup',
      notes: 'Zona 3 - Biobío/Araucanía interior',
    };
  }

  // Zone 2-3: Central Chile (33° to 37°)
  if (absLat >= 33) {
    // Coast is Zone 3
    const coastLng = getApproximateCoastLongitude(latitude);
    if (Math.abs(longitude - coastLng) < 0.5) {
      return {
        zone: 3,
        V: 45,
        confidence: 'high',
        source: 'coordinate_lookup',
        notes: 'Zona 3 - Costa central',
      };
    }
    // Central valley is Zone 2
    return {
      zone: 2,
      V: 35,
      confidence: 'high',
      source: 'coordinate_lookup',
      notes: 'Zona 2 - Valle central',
    };
  }

  // Zone 1-3: Northern Chile (north of 33°)
  // Coast is Zone 3, interior protected valleys Zone 1
  if (absLat >= 27) {
    // Coquimbo region
    const coastLng = getApproximateCoastLongitude(latitude);
    if (Math.abs(longitude - coastLng) < 0.5) {
      return {
        zone: 3,
        V: 45,
        confidence: 'high',
        source: 'coordinate_lookup',
        notes: 'Zona 3 - Costa norte',
      };
    }
    return {
      zone: 2,
      V: 35,
      confidence: 'medium',
      source: 'coordinate_lookup',
      notes: 'Zona 2 - Interior norte',
    };
  }

  // Far north - mostly Zone 1-2
  // Very protected interior valleys
  if (longitude > -69.5) {
    return {
      zone: 1,
      V: 30,
      confidence: 'medium',
      source: 'coordinate_lookup',
      notes: 'Zona 1 - Altiplano/valles protegidos',
    };
  }

  return {
    zone: 2,
    V: 35,
    confidence: 'medium',
    source: 'coordinate_lookup',
    notes: 'Zona 2 - Norte de Chile',
  };
}

// ============================================================
// SOIL TYPE ESTIMATION
// ============================================================
// This requires geotechnical data - we provide interfaces
// for future integration with SERNAGEOMIN or other sources
// ============================================================

export type SoilType = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface SoilDataResult {
  soilType: SoilType;
  vs30?: number;              // m/s - if measured
  vs30Estimated?: number;     // m/s - if estimated from geology
  confidence: 'measured' | 'estimated' | 'default';
  source: 'field_study' | 'database' | 'geology_map' | 'default';
  geology?: string;
  notes?: string;
}

/**
 * Default soil type estimation based on general location
 * IMPORTANT: This is for preliminary design only!
 * Actual soil type must be determined by field study per DS61
 */
export function estimateSoilType(
  coords: GeoCoordinates,
  geologicalContext?: string
): SoilDataResult {
  const { altitude = 0 } = coords;

  // High altitude rocky terrain likely to be Type A or B
  if (altitude > 2500) {
    return {
      soilType: 'B',
      vs30Estimated: 600,
      confidence: 'estimated',
      source: 'geology_map',
      geology: 'Rock/volcanic at high altitude',
      notes: 'Preliminary estimate - field study required per DS61',
    };
  }

  // Default to Type C (intermediate) for preliminary design
  // This is conservative for most urban areas
  return {
    soilType: 'C',
    vs30Estimated: 400,
    confidence: 'default',
    source: 'default',
    notes: 'Default assumption - field study required per DS61',
  };
}

// ============================================================
// COMBINED ZONE DETERMINATION
// ============================================================

export interface AllZonesResult {
  coordinates: GeoCoordinates;
  region?: RegionData;
  seismic: SeismicZoneResult;
  wind: WindZoneResult;
  soil: SoilDataResult;
  snowRelevant: boolean;
  timestamp: string;
}

/**
 * Determine all applicable zones from coordinates
 */
export function determineAllZones(
  coords: GeoCoordinates
): AllZonesResult {
  const region = getRegionFromCoordinates(coords);
  const seismic = determineSeismicZone(coords);
  const wind = determineWindZone(coords);
  const soil = estimateSoilType(coords);

  // Snow is relevant for most of Chile except far north low altitude
  const snowRelevant = Math.abs(coords.latitude) > 27 ||
    (coords.altitude ?? 0) > 2000;

  return {
    coordinates: coords,
    region,
    seismic,
    wind,
    soil,
    snowRelevant,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get region from coordinates
 */
export function getRegionFromCoordinates(
  coords: GeoCoordinates
): RegionData | undefined {
  const absLat = Math.abs(coords.latitude);

  for (const region of Object.values(CHILEAN_REGIONS)) {
    if (absLat >= Math.abs(region.latitudeRange.max) &&
        absLat <= Math.abs(region.latitudeRange.min)) {
      return region;
    }
  }

  return undefined;
}

// ============================================================
// VALIDATION HELPERS
// ============================================================

/**
 * Check if coordinates are within Chile
 */
export function isWithinChile(coords: GeoCoordinates): boolean {
  const { latitude, longitude } = coords;

  // Chile spans roughly from -17° to -56° latitude
  // and -66° to -76° longitude (including Easter Island at -109°)
  const inMainland = (
    latitude >= -56 && latitude <= -17 &&
    longitude >= -76 && longitude <= -66
  );

  // Easter Island (Rapa Nui)
  const inEasterIsland = (
    latitude >= -27.5 && latitude <= -26.8 &&
    longitude >= -110 && longitude <= -108
  );

  // Juan Fernández Islands
  const inJuanFernandez = (
    latitude >= -34 && latitude <= -33 &&
    longitude >= -81 && longitude <= -78
  );

  return inMainland || inEasterIsland || inJuanFernandez;
}

/**
 * Validate and normalize coordinates
 */
export function normalizeCoordinates(
  lat: number,
  lng: number,
  alt?: number
): GeoCoordinates {
  // Ensure latitude is negative (Southern hemisphere)
  const latitude = lat > 0 ? -lat : lat;

  // Ensure longitude is negative (Western hemisphere)
  const longitude = lng > 0 ? -lng : lng;

  return {
    latitude,
    longitude,
    altitude: alt ?? 0,
  };
}
