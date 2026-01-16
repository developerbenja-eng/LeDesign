// ============================================================
// ROAD MODULE SCHEMA
// ============================================================
// Database types for road geometry module
// Horizontal/vertical alignment, cross-sections, superelevation

export interface RoadAlignment {
  id: string;
  project_id: string;
  name: string;
  design_speed: number; // km/h
  classification: 'highway' | 'primary' | 'secondary' | 'local';
  created_at: string;
  updated_at: string;
}

export interface HorizontalCurve {
  id: string;
  alignment_id: string;
  station: number;
  curve_type: 'simple' | 'compound' | 'spiral';
  radius: number;
  length: number;
  deflection_angle: number;
  superelevation: number | null;
  created_at: string;
}

export interface VerticalCurve {
  id: string;
  alignment_id: string;
  station: number;
  curve_type: 'crest' | 'sag';
  length: number;
  entry_grade: number; // %
  exit_grade: number; // %
  k_value: number;
  created_at: string;
}

export interface RoadCrossSection {
  id: string;
  alignment_id: string;
  station: number;
  section_type: 'normal' | 'transition' | 'widening';
  lane_width: number;
  num_lanes: number;
  shoulder_width_left: number;
  shoulder_width_right: number;
  slope_left: number; // %
  slope_right: number; // %
  created_at: string;
}

export interface Stationing {
  id: string;
  alignment_id: string;
  station: number;
  northing: number;
  easting: number;
  elevation: number;
  created_at: string;
}

// Will be extended during migration
