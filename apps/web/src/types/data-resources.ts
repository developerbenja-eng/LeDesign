// Data Resources Types
// Defines all types of external data sources that can be accessed and linked to projects

export type DataResourceType =
  | 'dem'           // Digital Elevation Model
  | 'imagery'       // Satellite/aerial imagery
  | 'api'           // External API endpoint
  | 'service'       // Web service (WMS, WFS, etc.)
  | 'dataset'       // Generic dataset
  | 'sensor'        // IoT sensor data
  | 'weather';      // Weather data source

export type DataSourceProvider =
  | 'copernicus'    // Copernicus Open Access Hub
  | 'opentopography' // OpenTopography
  | 'google'        // Google Earth Engine
  | 'bing'          // Bing Maps
  | 'custom'        // Custom/self-hosted
  | 'shared'        // Shared within organization
  | 'dga'           // Dirección General de Aguas (Chile)
  | 'dmc'           // Dirección Meteorológica de Chile
  | 'ine'           // Instituto Nacional de Estadísticas
  | 'minvu';        // Ministerio de Vivienda y Urbanismo

export interface DataResourceBounds {
  south: number;
  north: number;
  west: number;
  east: number;
}

export interface DataResource {
  id: string;
  name: string;
  description?: string;
  type: DataResourceType;
  provider: DataSourceProvider;

  // Geographic coverage
  bounds?: DataResourceBounds;
  center_lat?: number;
  center_lon?: number;

  // Resource details
  url?: string;              // API endpoint or download URL
  format?: string;           // Format: 'GeoTIFF', 'WMS', 'WFS', 'JSON', 'CSV'
  resolution?: string;       // e.g., "30m", "1km"
  coverage_area?: string;    // e.g., "Chile", "Región del Biobío"

  // Access control
  access_type: 'public' | 'private' | 'shared' | 'api_key';
  api_key?: string;          // Encrypted API key if needed

  // Usage tracking
  linked_projects?: string[]; // Project IDs using this resource
  last_accessed?: string;
  created_at: string;
  updated_at: string;

  // Metadata
  tags?: string[];
  source_citation?: string;
  license?: string;
}

export interface DEMResource extends DataResource {
  type: 'dem';
  resolution: string;        // Required for DEMs
  vertical_datum?: string;   // e.g., "WGS84", "EGM96"
  horizontal_datum?: string; // e.g., "WGS84", "SIRGAS2000"
}

export interface ImageryResource extends DataResource {
  type: 'imagery';
  capture_date?: string;
  cloud_cover?: number;      // Percentage 0-100
  sensor?: string;           // e.g., "Sentinel-2", "Landsat-8"
  bands?: string[];          // e.g., ["Red", "Green", "Blue", "NIR"]
}

export interface APIResource extends DataResource {
  type: 'api';
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  auth_type?: 'none' | 'api_key' | 'oauth' | 'bearer';
  headers?: Record<string, string>;
  rate_limit?: string;       // e.g., "100 requests/hour"
}

export interface ServiceResource extends DataResource {
  type: 'service';
  service_type: 'wms' | 'wfs' | 'wmts' | 'tms' | 'arcgis';
  layers?: string[];
  capabilities_url?: string;
}

// Project-Resource link
export interface ProjectResourceLink {
  id: string;
  project_id: string;
  resource_id: string;
  linked_at: string;
  linked_by: string;         // User ID who linked it
  usage_type?: string;       // How it's used: 'basemap', 'analysis', 'reference'
  settings?: Record<string, any>; // Custom settings for this link
}

// Filter/search options
export interface DataResourceFilters {
  type?: DataResourceType[];
  provider?: DataSourceProvider[];
  bounds?: DataResourceBounds;
  tags?: string[];
  access_type?: ('public' | 'private' | 'shared' | 'api_key')[];
  search_query?: string;
}
