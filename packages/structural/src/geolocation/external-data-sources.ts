// ============================================================
// EXTERNAL DATA SOURCE INTERFACES
// ============================================================
// Interfaces for integrating with public geological/geotechnical
// data sources and APIs
// ============================================================

import type { GeoCoordinates, SoilType } from './chilean-zones';

// ============================================================
// GEOLOGICAL DATA SOURCES
// ============================================================

/**
 * Chilean geological data providers
 */
export type GeologicalDataProvider =
  | 'SERNAGEOMIN'      // Servicio Nacional de Geología y Minería
  | 'IGM'              // Instituto Geográfico Militar
  | 'SHOA'             // Servicio Hidrográfico y Oceanográfico
  | 'CSN'              // Centro Sismológico Nacional
  | 'ONEMI'            // Oficina Nacional de Emergencia
  | 'DMC'              // Dirección Meteorológica de Chile
  | 'MINVU'            // Ministerio de Vivienda
  | 'CUSTOM_DB';       // Our own database

export interface DataProviderConfig {
  provider: GeologicalDataProvider;
  apiUrl?: string;
  apiKey?: string;
  enabled: boolean;
  cacheDuration?: number;  // seconds
  priority: number;        // lower = higher priority
}

// ============================================================
// SERNAGEOMIN INTEGRATION
// ============================================================
// National Geological Survey - provides geological maps,
// fault zones, volcanic hazards, etc.
// https://www.sernageomin.cl/
// ============================================================

export interface SernageominGeologyData {
  // Geological unit
  geologicalUnit: string;
  unitCode: string;
  era: string;
  period: string;
  epoch?: string;
  lithology: string;
  description: string;

  // Rock properties
  rockType: 'igneous' | 'sedimentary' | 'metamorphic' | 'volcanic';
  estimatedVs30Range: { min: number; max: number };
  suggestedSoilType: SoilType;

  // Hazards
  nearFaultZone: boolean;
  faultName?: string;
  faultDistance?: number;      // km
  volcanicZone: boolean;
  nearVolcano?: string;
  volcanoDistance?: number;    // km
  liquefactionSusceptible: boolean;
  landslideRisk: 'low' | 'medium' | 'high';

  // Source
  mapSheet: string;
  mapScale: string;
  lastUpdated: string;
}

export interface SernageominApiResponse {
  success: boolean;
  data?: SernageominGeologyData;
  error?: string;
  coordinates: GeoCoordinates;
  queryTime: string;
}

// ============================================================
// CSN (CENTRO SISMOLÓGICO NACIONAL) INTEGRATION
// ============================================================
// Seismological data, historical earthquakes, hazard maps
// https://www.csn.uchile.cl/
// ============================================================

export interface SeismicHazardData {
  // PGA values for different return periods
  pga475: number;    // 475 years (10% in 50 years)
  pga975: number;    // 975 years (5% in 50 years)
  pga2475: number;   // 2475 years (2% in 50 years)

  // Spectral acceleration
  sa02_475: number;  // Sa at 0.2s, 475 year
  sa10_475: number;  // Sa at 1.0s, 475 year

  // Site effects
  siteAmplification?: number;

  // Historical seismicity
  maxHistoricalMagnitude?: number;
  nearbyEarthquakes?: {
    date: string;
    magnitude: number;
    depth: number;
    distance: number;
  }[];

  // Fault proximity
  nearestActiveFault?: {
    name: string;
    distance: number;
    slipRate: number;
    maxMagnitude: number;
  };
}

// ============================================================
// SHOA (HYDROGRAPHIC SERVICE) INTEGRATION
// ============================================================
// Tsunami hazard zones, coastal data
// https://www.shoa.cl/
// ============================================================

export interface TsunamiHazardData {
  inTsunamiZone: boolean;
  runupHeight?: number;        // meters
  inundationDistance?: number; // meters from coast
  evacuationZone?: string;
  lastTsunamiDate?: string;
  historicalTsunamis?: {
    date: string;
    source: string;
    runupHeight: number;
  }[];
}

// ============================================================
// DMC (METEOROLOGICAL) INTEGRATION
// ============================================================
// Climate data, wind statistics, precipitation
// https://www.meteochile.gob.cl/
// ============================================================

export interface ClimateData {
  // Wind statistics
  meanWindSpeed: number;       // m/s
  maxGustRecorded: number;     // m/s
  predominantDirection: string;

  // Precipitation
  annualPrecipitation: number; // mm
  maxDailyPrecipitation: number;
  snowDays?: number;

  // Temperature
  meanAnnualTemp: number;      // °C
  minRecordedTemp: number;
  maxRecordedTemp: number;
  freezeDays?: number;

  // Weather station
  nearestStation: string;
  stationDistance: number;     // km
  dataYears: number;           // years of record
}

// ============================================================
// MINVU SOIL STUDIES DATABASE
// ============================================================
// Historical soil studies, Vs30 measurements
// ============================================================

export interface SoilStudyRecord {
  id: string;
  location: GeoCoordinates;
  distance: number;           // km from query point

  // Vs30 measurement
  vs30: number;
  vs30Method: 'downhole' | 'crosshole' | 'sasw' | 'masw' | 'remi' | 'spt_correlation';
  soilType: SoilType;

  // Soil profile
  soilLayers?: {
    depth: number;
    material: string;
    vs?: number;
    nSpt?: number;
  }[];

  // Water table
  waterTableDepth?: number;

  // Study info
  studyDate: string;
  consultant: string;
  projectName?: string;
  reportNumber?: string;
}

export interface NearbyStudiesResult {
  studies: SoilStudyRecord[];
  searchRadius: number;       // km
  count: number;
  averageVs30?: number;
  suggestedSoilType?: SoilType;
}

// ============================================================
// UNIFIED EXTERNAL DATA INTERFACE
// ============================================================

export interface ExternalLocationData {
  coordinates: GeoCoordinates;
  queryTimestamp: string;

  // Geological data
  geology?: SernageominGeologyData;

  // Seismic hazard
  seismicHazard?: SeismicHazardData;

  // Tsunami hazard
  tsunamiHazard?: TsunamiHazardData;

  // Climate data
  climate?: ClimateData;

  // Nearby soil studies
  soilStudies?: NearbyStudiesResult;

  // Aggregated recommendations
  recommendations: {
    soilType: SoilType;
    soilTypeConfidence: 'measured' | 'nearby_study' | 'geological' | 'default';
    vs30Estimate?: number;
    specialConsiderations: string[];
    requiredStudies: string[];
  };

  // Data sources used
  sources: {
    provider: GeologicalDataProvider;
    dataType: string;
    success: boolean;
    timestamp: string;
  }[];
}

// ============================================================
// DATA FETCHING SERVICE INTERFACE
// ============================================================

export interface ExternalDataService {
  /**
   * Fetch all available external data for a location
   */
  fetchLocationData(coords: GeoCoordinates): Promise<ExternalLocationData>;

  /**
   * Fetch only geological data
   */
  fetchGeologyData(coords: GeoCoordinates): Promise<SernageominGeologyData | null>;

  /**
   * Fetch nearby soil studies
   */
  fetchNearbySoilStudies(
    coords: GeoCoordinates,
    radiusKm: number
  ): Promise<NearbyStudiesResult>;

  /**
   * Fetch seismic hazard data
   */
  fetchSeismicHazard(coords: GeoCoordinates): Promise<SeismicHazardData | null>;

  /**
   * Check if location is in special hazard zone
   */
  checkHazardZones(coords: GeoCoordinates): Promise<{
    tsunami: boolean;
    fault: boolean;
    volcanic: boolean;
    landslide: boolean;
    liquefaction: boolean;
  }>;
}

// ============================================================
// MOCK/STUB IMPLEMENTATION
// ============================================================
// For development and testing without real API access
// ============================================================

export class MockExternalDataService implements ExternalDataService {
  async fetchLocationData(coords: GeoCoordinates): Promise<ExternalLocationData> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      coordinates: coords,
      queryTimestamp: new Date().toISOString(),
      recommendations: {
        soilType: 'C',
        soilTypeConfidence: 'default',
        vs30Estimate: 400,
        specialConsiderations: [
          'Field study required per DS61',
          'Verify soil type with Vs30 measurement',
        ],
        requiredStudies: [
          'Geotechnical field study',
          'Vs30 measurement',
        ],
      },
      sources: [
        {
          provider: 'CUSTOM_DB',
          dataType: 'mock_data',
          success: true,
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }

  async fetchGeologyData(_coords: GeoCoordinates): Promise<SernageominGeologyData | null> {
    return null; // No mock geological data
  }

  async fetchNearbySoilStudies(
    coords: GeoCoordinates,
    radiusKm: number
  ): Promise<NearbyStudiesResult> {
    return {
      studies: [],
      searchRadius: radiusKm,
      count: 0,
    };
  }

  async fetchSeismicHazard(_coords: GeoCoordinates): Promise<SeismicHazardData | null> {
    return null;
  }

  async checkHazardZones(_coords: GeoCoordinates): Promise<{
    tsunami: boolean;
    fault: boolean;
    volcanic: boolean;
    landslide: boolean;
    liquefaction: boolean;
  }> {
    return {
      tsunami: false,
      fault: false,
      volcanic: false,
      landslide: false,
      liquefaction: false,
    };
  }
}

// ============================================================
// DATABASE SCHEMA TYPES
// ============================================================
// For storing our own geological/geotechnical data
// ============================================================

export interface SoilStudyDatabaseRecord {
  id: string;
  project_id?: string;

  // Location
  latitude: number;
  longitude: number;
  altitude?: number;
  address?: string;
  commune?: string;
  region?: string;

  // Vs30 data
  vs30: number;
  vs30_method: string;
  soil_type: SoilType;

  // Additional data
  water_table_depth?: number;
  liquefaction_susceptible?: boolean;
  soil_profile_json?: string;

  // Metadata
  study_date: string;
  consultant?: string;
  report_number?: string;
  is_public: boolean;
  created_by: string;
  created_at: string;
  updated_at?: string;
}

export interface GeologicalMapDatabaseRecord {
  id: string;

  // Polygon geometry (GeoJSON)
  geometry_json: string;

  // Geological data
  unit_code: string;
  unit_name: string;
  era: string;
  period?: string;
  lithology: string;
  rock_type: string;

  // Engineering properties
  estimated_vs30_min: number;
  estimated_vs30_max: number;
  suggested_soil_type: SoilType;
  liquefaction_susceptible: boolean;

  // Source
  source: string;
  source_scale: string;
  last_updated: string;
}
