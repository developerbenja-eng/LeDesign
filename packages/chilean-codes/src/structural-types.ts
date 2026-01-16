/**
 * Structural load types for Chilean codes
 * Local types to avoid dependency on app-specific types
 */

export interface SpectrumPoint {
  period: number;
  acceleration: number;
}

export interface CodeBasedSpectrumParams {
  code: 'ASCE7-22' | 'NCh433' | 'IBC' | 'Eurocode8';
  siteClass?: string;
  designCategory?: string;
  occupancyCategory?: string;
  Ss?: number;
  S1?: number;
  Fa?: number;
  Fv?: number;
  SDS?: number;
  SD1?: number;
  TL?: number;
  zone?: number;
  soilType?: string;
  A0?: number;
  S?: number;
  I?: number;
  R?: number;
  T0?: number;
  Tp?: number;
  n?: number;
  nch433_zone?: 1 | 2 | 3;
  nch433_soil_type?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  nch433_occupancy?: 'I' | 'II' | 'III' | 'IV';
  nch433_system?: string;
  nch433_A0?: number;
  nch433_S?: number;
  nch433_T0?: number;
  nch433_Tp?: number;
  nch433_n?: number;
  nch433_I?: number;
  nch433_R0?: number;
}
