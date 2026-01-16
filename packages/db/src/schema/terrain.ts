// ============================================================
// TERRAIN MODULE SCHEMA
// ============================================================
// Database types for terrain analysis and surveying
// DEM processing, earthwork volumes, surveying data

export interface Surface {
  id: string;
  project_id: string;
  name: string;
  surface_type: 'existing' | 'proposed' | 'reference';
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface SurfacePoint {
  id: string;
  surface_id: string;
  northing: number;
  easting: number;
  elevation: number;
  point_type: 'measured' | 'interpolated' | 'grid';
  created_at: string;
}

export interface Contour {
  id: string;
  surface_id: string;
  elevation: number;
  contour_type: 'major' | 'minor';
  geometry: string; // GeoJSON LineString
  created_at: string;
}

export interface EarthworkVolume {
  id: string;
  project_id: string;
  existing_surface_id: string;
  proposed_surface_id: string;
  cut_volume: number;
  fill_volume: number;
  net_volume: number;
  calculation_method: 'average-end-area' | 'grid' | 'contour';
  created_at: string;
}

export interface SurveyPoint {
  id: string;
  project_id: string;
  point_number: string;
  northing: number;
  easting: number;
  elevation: number;
  description: string | null;
  survey_date: string | null;
  created_at: string;
}

// Will be extended during migration
