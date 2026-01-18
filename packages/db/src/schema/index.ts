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
// LECOIN - FRIENDS & FAMILY FUNDRAISING
// ============================================================

export interface LeCoinSupporter {
  id: string;
  user_id: string | null; // Links to user account after creation
  name: string;
  email: string;
  phone: string | null;
  message: string | null; // Personal message for Benja
  total_donated: number;
  created_at: string;
  updated_at: string;
}

export interface LeCoin {
  id: string;
  coin_number: number; // 1-100
  supporter_id: string; // References LeCoinSupporter
  original_donor_name: string;
  original_donation_amount: number;
  issued_date: string;
  current_holder_since: string;
  transfer_count: number;
  is_returned_to_founder: boolean;
}

export interface LeCoinDonation {
  id: string;
  supporter_id: string;
  amount: number;
  payment_method: 'stripe' | 'transfer' | 'paypal';
  payment_status: 'pending' | 'completed' | 'failed';
  stripe_payment_intent_id: string | null;
  donation_date: string;
  notes: string | null;
}

export interface LeCoinFundPot {
  id: string;
  total_raised: number;
  total_spent: number;
  current_balance: number;
  minimum_reserve: number; // Threshold for allowing exits
  last_distribution_date: string | null;
  last_distribution_amount: number | null;
  updated_at: string;
}

export interface LeCoinTransfer {
  id: string;
  coin_id: string;
  from_supporter_id: string | null; // null if returning to founder
  to_supporter_id: string | null; // null if receiving from founder
  transfer_type: 'peer_to_peer' | 'return_to_founder' | 'initial_issue';
  transfer_date: string;
  notes: string | null;
}

export interface LeCoinRepayment {
  id: string;
  supporter_id: string;
  original_amount: number;
  repayment_amount: number; // Includes optional thank-you bonus
  bonus_amount: number;
  repayment_date: string;
  message_from_benja: string | null;
  coin_returned: boolean; // Did they return the coin?
  status: 'pending' | 'completed' | 'declined';
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

// ============================================================
// DRIZZLE ORM TABLE EXPORTS
// ============================================================
// Re-export Drizzle table definitions from root schema

export * from '../schema';
