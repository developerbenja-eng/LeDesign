/**
 * Road Geometry Module
 *
 * Complete geometric design calculations for road alignments including:
 * - Horizontal curves (simple, compound, transition)
 * - Vertical curves (crest, sag)
 * - Superelevation design
 * - Sight distance analysis
 * - Cross-section generation
 *
 * References:
 * - AASHTO A Policy on Geometric Design of Highways and Streets (Green Book)
 * - MOP Manual de Carreteras Vol. 3 (Chile)
 * - REDEVU (Chile)
 *
 * @module road-geometry
 */

export * from './design-tables';
export * from './horizontal-curves';
export * from './superelevation';
export * from './vertical-curves';
export * from './sight-distance';
export * from './transition-curves';
export * from './cross-section';
export * from './standard-sections';
