// ============================================================
// MAP INTEGRATION FOR PROJECT LOCATION
// ============================================================
// Types and utilities for map-based project location selection
// Supports: Mapbox, Google Maps, Leaflet, OpenStreetMap
// ============================================================

import type {
  GeoCoordinates,
  ProjectLocation,
  AllZonesResult,
  ChileanRegion,
} from './chilean-zones';

// ============================================================
// GEOJSON TYPES (inline to avoid external dependency)
// ============================================================

export type GeoJSONPosition = [number, number] | [number, number, number];

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: GeoJSONPosition[][];
}

export interface GeoJSONMultiPolygon {
  type: 'MultiPolygon';
  coordinates: GeoJSONPosition[][][];
}

export interface GeoJSONPoint {
  type: 'Point';
  coordinates: GeoJSONPosition;
}

export interface GeoJSONLineString {
  type: 'LineString';
  coordinates: GeoJSONPosition[];
}

export type GeoJSONGeometry =
  | GeoJSONPoint
  | GeoJSONLineString
  | GeoJSONPolygon
  | GeoJSONMultiPolygon;

// ============================================================
// MAP PROVIDER TYPES
// ============================================================

export type MapProvider = 'mapbox' | 'google' | 'leaflet' | 'osm';

export interface MapConfig {
  provider: MapProvider;
  apiKey?: string;
  style?: string;
  defaultCenter: GeoCoordinates;
  defaultZoom: number;
  minZoom: number;
  maxZoom: number;
  satelliteAvailable: boolean;
  terrainAvailable: boolean;
}

export const DEFAULT_CHILE_MAP_CONFIG: MapConfig = {
  provider: 'mapbox',
  style: 'mapbox://styles/mapbox/satellite-streets-v12',
  defaultCenter: {
    latitude: -33.4489,  // Santiago
    longitude: -70.6693,
    altitude: 520,
  },
  defaultZoom: 5,
  minZoom: 3,
  maxZoom: 20,
  satelliteAvailable: true,
  terrainAvailable: true,
};

// ============================================================
// LOCATION PICKER STATE
// ============================================================

export type LocationPickerMode =
  | 'browse'           // Just browsing the map
  | 'select'           // Click to select location
  | 'drawing'          // Drawing building footprint
  | 'measuring';       // Measuring distances

export interface LocationPickerState {
  mode: LocationPickerMode;
  selectedLocation?: ProjectLocation;
  zoneData?: AllZonesResult;
  isLoading: boolean;
  error?: string;

  // Map view state
  center: GeoCoordinates;
  zoom: number;
  bearing: number;
  pitch: number;

  // Layers visibility
  showSatellite: boolean;
  showTerrain: boolean;
  showSeismicZones: boolean;
  showWindZones: boolean;
  showSoilData: boolean;
  showNearbySoilStudies: boolean;
}

// ============================================================
// LOCATION SELECTION RESULT
// ============================================================

export interface LocationSelectionResult {
  // Core location
  location: ProjectLocation;

  // Automatic zone determination
  zones: AllZonesResult;

  // Address (from reverse geocoding)
  address?: {
    street?: string;
    number?: string;
    commune: string;
    city: string;
    region: ChileanRegion;
    postalCode?: string;
    formatted: string;
  };

  // Elevation data (from terrain API)
  elevation: {
    value: number;       // meters
    source: 'terrain_api' | 'user_input' | 'default';
    accuracy?: number;
  };

  // Nearby references
  nearbyReferences?: {
    type: 'city' | 'landmark' | 'road';
    name: string;
    distance: number;    // km
    direction: string;   // N, NE, E, etc.
  }[];
}

// ============================================================
// MAP LAYER TYPES
// ============================================================

export interface MapLayer {
  id: string;
  name: string;
  nameEs: string;
  type: 'fill' | 'line' | 'circle' | 'symbol' | 'heatmap';
  visible: boolean;
  opacity: number;
  minZoom?: number;
  maxZoom?: number;
}

export interface SeismicZoneLayer extends MapLayer {
  type: 'fill';
  data: {
    zone: 1 | 2 | 3;
    geometry: GeoJSONPolygon | GeoJSONMultiPolygon;
    color: string;
  }[];
}

export interface WindZoneLayer extends MapLayer {
  type: 'fill';
  data: {
    zone: 1 | 2 | 3 | 4 | 5;
    geometry: GeoJSONPolygon | GeoJSONMultiPolygon;
    color: string;
  }[];
}

export interface SoilStudyLayer extends MapLayer {
  type: 'circle';
  data: {
    id: string;
    coordinates: GeoCoordinates;
    vs30: number;
    soilType: string;
    studyDate: string;
  }[];
}

// ============================================================
// MAP EVENTS
// ============================================================

export interface MapClickEvent {
  coordinates: GeoCoordinates;
  pixel: { x: number; y: number };
  features?: MapFeature[];
}

export interface MapFeature {
  layerId: string;
  properties: Record<string, unknown>;
  geometry: GeoJSONGeometry;
}

export interface MapMoveEvent {
  center: GeoCoordinates;
  zoom: number;
  bearing: number;
  pitch: number;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

// ============================================================
// LOCATION PICKER CALLBACKS
// ============================================================

export interface LocationPickerCallbacks {
  onLocationSelect?: (result: LocationSelectionResult) => void;
  onLocationChange?: (location: GeoCoordinates) => void;
  onZonesCalculated?: (zones: AllZonesResult) => void;
  onError?: (error: string) => void;
  onMapMove?: (event: MapMoveEvent) => void;
  onLayerToggle?: (layerId: string, visible: boolean) => void;
}

// ============================================================
// LOCATION PICKER PROPS (for React component)
// ============================================================

export interface LocationPickerProps {
  // Initial values
  initialLocation?: GeoCoordinates;
  initialZoom?: number;

  // Configuration
  config?: Partial<MapConfig>;
  mode?: LocationPickerMode;
  readOnly?: boolean;

  // Layers
  showLayers?: {
    seismicZones?: boolean;
    windZones?: boolean;
    soilStudies?: boolean;
    faultLines?: boolean;
    tsunamiZones?: boolean;
  };

  // Callbacks
  callbacks?: LocationPickerCallbacks;

  // Styling
  className?: string;
  height?: string | number;
  width?: string | number;
}

// ============================================================
// GEOCODING TYPES
// ============================================================

export interface GeocodingResult {
  coordinates: GeoCoordinates;
  address: {
    street?: string;
    number?: string;
    commune: string;
    city: string;
    region: string;
    country: string;
    postalCode?: string;
    formatted: string;
  };
  confidence: number;    // 0-1
  source: MapProvider;
}

export interface ReverseGeocodingResult extends GeocodingResult {
  nearbyPlaces?: {
    name: string;
    type: string;
    distance: number;
  }[];
}

// ============================================================
// ELEVATION SERVICE
// ============================================================

export interface ElevationResult {
  elevation: number;     // meters
  resolution: number;    // meters (data resolution)
  source: 'mapbox' | 'google' | 'srtm' | 'aster';
}

export interface ElevationProfilePoint {
  coordinates: GeoCoordinates;
  elevation: number;
  distance: number;      // meters from start
}

// ============================================================
// DRAWING/ANNOTATION TYPES
// ============================================================

export interface DrawingFeature {
  id: string;
  type: 'point' | 'line' | 'polygon' | 'rectangle' | 'circle';
  coordinates: GeoCoordinates | GeoCoordinates[] | GeoCoordinates[][];
  properties: {
    name?: string;
    description?: string;
    color?: string;
    [key: string]: unknown;
  };
}

export interface BuildingFootprint extends DrawingFeature {
  type: 'polygon';
  properties: {
    name: string;
    area: number;          // m²
    perimeter: number;     // m
    centroid: GeoCoordinates;
  };
}

// ============================================================
// MAP UTILITIES
// ============================================================

/**
 * Calculate distance between two coordinates (Haversine)
 */
export function calculateDistance(
  coord1: GeoCoordinates,
  coord2: GeoCoordinates
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);
  const lat1 = toRad(coord1.latitude);
  const lat2 = toRad(coord2.latitude);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.sin(dLon / 2) * Math.sin(dLon / 2) *
            Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function toRad(deg: number): number {
  return deg * Math.PI / 180;
}

/**
 * Calculate bearing between two coordinates
 */
export function calculateBearing(
  from: GeoCoordinates,
  to: GeoCoordinates
): number {
  const dLon = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) -
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  const bearing = Math.atan2(y, x);
  return (bearing * 180 / Math.PI + 360) % 360;
}

/**
 * Get cardinal direction from bearing
 */
export function bearingToDirection(bearing: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

/**
 * Calculate polygon area (in m²)
 */
export function calculatePolygonArea(coords: GeoCoordinates[]): number {
  if (coords.length < 3) return 0;

  // Use spherical excess formula for accurate area on Earth's surface
  let total = 0;
  const n = coords.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const k = (i + 2) % n;

    total += toRad(coords[j].longitude - coords[i].longitude) *
             (2 + Math.sin(toRad(coords[i].latitude)) +
              Math.sin(toRad(coords[j].latitude)));
  }

  // Earth's radius squared
  const R = 6371000; // meters
  return Math.abs(total * R * R / 2);
}

/**
 * Calculate polygon perimeter (in m)
 */
export function calculatePolygonPerimeter(coords: GeoCoordinates[]): number {
  if (coords.length < 2) return 0;

  let perimeter = 0;
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    perimeter += calculateDistance(coords[i], coords[j]) * 1000; // km to m
  }

  return perimeter;
}

/**
 * Calculate centroid of polygon
 */
export function calculateCentroid(coords: GeoCoordinates[]): GeoCoordinates {
  if (coords.length === 0) {
    return { latitude: 0, longitude: 0 };
  }

  let sumLat = 0;
  let sumLng = 0;

  for (const coord of coords) {
    sumLat += coord.latitude;
    sumLng += coord.longitude;
  }

  return {
    latitude: sumLat / coords.length,
    longitude: sumLng / coords.length,
  };
}

// ============================================================
// ZONE COLOR SCHEMES
// ============================================================

export const SEISMIC_ZONE_COLORS = {
  1: 'rgba(34, 197, 94, 0.3)',   // Green - low
  2: 'rgba(234, 179, 8, 0.3)',    // Yellow - medium
  3: 'rgba(239, 68, 68, 0.3)',    // Red - high
};

export const WIND_ZONE_COLORS = {
  1: 'rgba(34, 197, 94, 0.3)',    // Green - 30 m/s
  2: 'rgba(132, 204, 22, 0.3)',   // Lime - 35 m/s
  3: 'rgba(234, 179, 8, 0.3)',    // Yellow - 45 m/s
  4: 'rgba(249, 115, 22, 0.3)',   // Orange - 50 m/s
  5: 'rgba(239, 68, 68, 0.3)',    // Red - 55 m/s
};

export const SOIL_TYPE_COLORS = {
  A: 'rgba(34, 197, 94, 0.5)',    // Green - rock
  B: 'rgba(132, 204, 22, 0.5)',   // Lime - very dense
  C: 'rgba(234, 179, 8, 0.5)',    // Yellow - dense/stiff
  D: 'rgba(249, 115, 22, 0.5)',   // Orange - soft
  E: 'rgba(239, 68, 68, 0.5)',    // Red - very soft
  F: 'rgba(139, 69, 19, 0.5)',    // Brown - special study
};
