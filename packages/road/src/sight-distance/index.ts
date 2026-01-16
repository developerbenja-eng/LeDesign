// ============================================================
// SIGHT DISTANCE
// ============================================================
// Stopping sight distance, passing sight distance calculations

export {
  calculateStoppingSightDistance,
  getStoppingSightDistance,
  calculatePassingSightDistance,
  getPassingSightDistance,
  calculateDecisionSightDistance,
  calculateIntersectionSightDistance,
  calculateSightTriangle,
  calculateSightDistanceOnHorizontalCurve,
  // calculateRequiredClearance - not exported to avoid conflict with horizontal module
  validateSightDistance,
  checkSightDistanceRequirements,
  // Export types
  type StoppingSightDistanceInput,
  type StoppingSightDistanceResult,
  type PassingSightDistanceInput,
  type PassingSightDistanceResult,
  type DecisionAvoidanceType,
  type DecisionSightDistanceInput,
  type DecisionSightDistanceResult,
  type IntersectionSightDistanceInput,
  type IntersectionSightDistanceResult,
} from './sight-distance';
