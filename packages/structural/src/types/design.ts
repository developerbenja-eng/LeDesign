// ============================================================
// STRUCTURAL TYPES - DESIGN
// ============================================================
// Reinforcement design types for concrete elements

// ============================================================
// REBAR CONFIGURATION
// ============================================================

export interface RebarBar {
  size: string;       // '#3', '#4', etc.
  x: number;          // Position X (mm)
  y: number;          // Position Y (mm)
  diameter: number;   // Bar diameter (mm)
  area: number;       // Bar area (mm²)
}

export interface TransverseBars {
  size: string;       // Stirrup/tie size
  spacing: number;    // Stirrup spacing (mm)
  legs: number;       // Number of legs
  area: number;       // Total area per spacing (mm²)
}

export interface RebarConfiguration {
  // Longitudinal reinforcement
  tension_bars: RebarBar[];        // Bottom bars (tension)
  compression_bars: RebarBar[];    // Top bars (compression)
  side_bars?: RebarBar[];          // Side bars (for columns/walls)

  // Transverse reinforcement
  transverse: TransverseBars;      // Stirrups or ties

  // Cover
  cover_top: number;               // Top cover (mm)
  cover_bottom: number;            // Bottom cover (mm)
  cover_side: number;              // Side cover (mm)

  // Totals
  total_tension_area: number;      // Sum of tension bar areas
  total_compression_area: number;  // Sum of compression bar areas

  // Development
  development_length?: number;     // Development length (mm)
  splice_length?: number;          // Splice length (mm)
}
