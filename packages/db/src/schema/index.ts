// ============================================================
// DATABASE SCHEMA - UNIFIED TYPES
// ============================================================
// Type definitions for all LeDesign modules
// Module-namespaced tables to avoid conflicts

// ============================================================
// CORE ENTITIES (Shared across all modules)
// ============================================================

export interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  location_lat: number | null;
  location_lng: number | null;
  location_address: string | null;
  // Module access flags
  module_structural: boolean;
  module_hydraulic: boolean;
  module_pavement: boolean;
  module_road: boolean;
  module_terrain: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================
// MODULE-SPECIFIC SCHEMAS
// ============================================================
// Each module exports its own schema types
// Import from discipline packages when needed

export * from './structural';
export * from './hydraulic';
export * from './pavement';
export * from './road';
export * from './terrain';
