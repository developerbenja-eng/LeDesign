// ============================================================
// HYDRAULIC MODULE SCHEMA
// ============================================================
// Database types for hydraulic engineering module
// Includes water networks, sewer, stormwater, and open channels

export interface HydraulicNode {
  id: string;
  project_id: string;
  type: 'junction' | 'reservoir' | 'tank' | 'pump' | 'valve';
  name: string;
  lat: number;
  lng: number;
  elevation: number;
  demand: number | null;
  pressure: number | null;
  created_at: string;
}

export interface HydraulicPipe {
  id: string;
  project_id: string;
  start_node_id: string;
  end_node_id: string;
  length: number;
  diameter: number;
  material: 'PVC' | 'HDPE' | 'Ductile Iron' | 'Steel' | 'Concrete';
  roughness: number;
  created_at: string;
}

export interface SewerNode {
  id: string;
  project_id: string;
  type: 'manhole' | 'inlet' | 'outlet' | 'pump-station';
  name: string;
  lat: number;
  lng: number;
  ground_elevation: number;
  invert_elevation: number;
  created_at: string;
}

export interface SewerPipe {
  id: string;
  project_id: string;
  upstream_node_id: string;
  downstream_node_id: string;
  length: number;
  diameter: number;
  material: 'PVC' | 'HDPE' | 'Concrete' | 'Vitrified Clay';
  slope: number;
  manning_n: number;
  created_at: string;
}

export interface Channel {
  id: string;
  project_id: string;
  name: string;
  section_type: 'rectangular' | 'trapezoidal' | 'circular' | 'parabolic';
  width: number;
  depth: number;
  side_slope: number | null;
  slope: number;
  manning_n: number;
  created_at: string;
}

// Will be extended during migration
