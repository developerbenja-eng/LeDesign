export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
  avatar_url: string | null;
  role: 'user' | 'admin' | 'owner';
  email_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login: string | null;
  google_id: string | null;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  // Geographic bounds for map view
  bounds_south: number | null;
  bounds_north: number | null;
  bounds_west: number | null;
  bounds_east: number | null;
  // Center point for map marker
  center_lat: number | null;
  center_lon: number | null;
  // Chilean region/comuna for grouping
  region: string | null;
  comuna: string | null;
  // Project type
  project_type: 'pavement' | 'sewer' | 'drainage' | 'mixed' | null;
  status: 'draft' | 'active' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface ProjectElement {
  id: string;
  project_id: string;
  element_type: 'polyline' | 'polygon' | 'point' | 'circle' | 'arc' | 'text';
  layer: string;
  // GeoJSON or CAD coordinates stored as JSON
  geometry: string;
  properties: string; // JSON for additional properties
  created_at: string;
  updated_at: string;
}

export interface ProjectTopography {
  id: string;
  project_id: string;
  name: string;
  source: 'copernicus' | 'opentopography' | 'upload' | 'survey';
  // GCS path or local reference
  dem_path: string | null;
  bounds_south: number;
  bounds_north: number;
  bounds_west: number;
  bounds_east: number;
  resolution: number; // meters
  created_at: string;
}

export type PublicUser = Omit<User, 'password_hash'>;

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: User['role'];
  iat: number;
  exp: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name?: string;
}
