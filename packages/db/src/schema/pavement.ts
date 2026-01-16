// ============================================================
// PAVEMENT MODULE SCHEMA
// ============================================================
// Database types for pavement design module
// AASHTO flexible/rigid pavement and CBR-based design

export interface PavementProject {
  id: string;
  project_id: string;
  name: string;
  design_method: 'AASHTO-flexible' | 'AASHTO-rigid' | 'CBR';
  design_life: number;
  reliability: number;
  created_at: string;
  updated_at: string;
}

export interface PavementSection {
  id: string;
  pavement_project_id: string;
  name: string;
  station_start: number;
  station_end: number;
  // Layer thicknesses (mm)
  surface_thickness: number | null;
  base_thickness: number | null;
  subbase_thickness: number | null;
  // Material properties
  subgrade_mr: number | null; // Resilient modulus (MPa)
  subgrade_cbr: number | null; // CBR (%)
  created_at: string;
}

export interface TrafficData {
  id: string;
  pavement_project_id: string;
  aadt: number; // Average Annual Daily Traffic
  truck_percentage: number;
  growth_rate: number;
  esal: number | null; // Equivalent Single Axle Loads
  created_at: string;
}

// Will be extended during migration
