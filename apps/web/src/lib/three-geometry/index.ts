// ============================================================
// THREE.JS GEOMETRY UTILITIES
// ============================================================
// Efficient 3D geometry generation for structural elements
// ============================================================

// Section geometry generators
export {
  // W-Shapes (I-beams)
  createWShapeProfile,
  createWShapeGeometry,
  // Channels
  createChannelProfile,
  createChannelGeometry,
  // Angles
  createAngleProfile,
  createAngleGeometry,
  // HSS Rectangular
  createHssRectProfile,
  createHssRectGeometry,
  // HSS Round / Pipe
  createHssRoundGeometry,
  // Concrete sections
  createRectConcreteGeometry,
  createCircularConcreteGeometry,
  createTBeamProfile,
  createTBeamGeometry,
  // Timber
  createRectTimberGeometry,
  // Universal factory
  createSectionGeometry,
  // Utilities
  getDefaultDimensions,
  getCachedGeometry,
  setCachedGeometry,
  clearGeometryCache,
} from './section-geometry';

export type { SectionGeometryOptions } from './section-geometry';

// Material rendering
export {
  // Color constants
  MATERIAL_COLORS,
  ELEMENT_COLORS,
  // Material factories
  createMaterialByType,
  createMaterialFromEntity,
  createElementMaterial,
  createGhostMaterial,
  // Analysis visualization
  getStressColor,
  createStressMaterial,
  getDCRatioColor,
  createDCRatioMaterial,
  // Utilities
  createWireframeMaterial,
  createSupportMaterial,
  clearMaterialCache,
} from './material-rendering';

export type { MaterialOptions, StressColorMapOptions } from './material-rendering';
