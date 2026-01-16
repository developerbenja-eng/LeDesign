/**
 * @ledesign/cubicacion
 *
 * Cost estimation and quantity takeoff module for infrastructure projects
 * Integrates with SERVIU itemizado for Chilean infrastructure standards
 */

// Export all types
export type {
  // Cubicacion types
  CubicacionCategory,
  MeasurementUnit,
  CubicacionItem,
  CubicacionSubtotal,
  Cubicacion,
  // Parameter types
  ExcavationParams,
  BeddingParams,
  BackfillParams,
  ManholeParams,
  // Configuration
  CubicacionGeneratorConfig,
  // API types
  CreateCubicacionRequest,
  UpdateCubicacionRequest,
  GenerateCubicacionRequest,
  CubicacionResponse,
  CubicacionListResponse,
  // Infrastructure entity types
  BaseInfrastructureEntity,
  WaterPipeEntity,
  SewerPipeEntity,
  StormCollectorEntity,
  ManholeEntity,
  StormInletEntity,
  HouseConnectionEntity,
  WaterValveEntity,
  HydrantEntity,
  AnyInfrastructureEntity,
} from './types';

// Export constants
export { DEFAULT_GENERATOR_CONFIG, CATEGORY_LABELS } from './types';

// Export SERVIU itemizado
export type { ServiuItem } from './serviu-itemizado';
export {
  SERVIU_ITEMS,
  getServiuItem,
  getServiuItemsByCategory,
  searchServiuItems,
  getPipeItem,
  getManholeItem,
  getExcavationItem,
  getRegionalPriceFactor,
} from './serviu-itemizado';

// Export generator functions
export {
  generateCubicacion,
  recalculateTotals,
  addManualItem,
  updateItem,
  removeItem,
} from './generator';
