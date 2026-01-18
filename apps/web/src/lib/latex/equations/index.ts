/**
 * LaTeX Equations Index
 *
 * Exports all engineering equations used for document generation.
 * Includes hydraulic, pavement, road geometry, and urban infrastructure equations.
 */

// Hydraulic Equations
export {
  manningEquation,
  manningNValues,
  hazenWilliamsEquation,
  hazenWilliamsCValues,
  darcyWeisbachEquation,
  rationalMethodEquation,
  runoffCoefficients,
  harmonEquation,
  populationDensity,
  circularPipeGeometry,
  froudeNumber,
  allEquations as hydraulicEquations,
  materialCoefficients,
} from './hydraulic-equations';

// Engineering Equations (Pavement, Road Geometry, Urban)
export {
  // Pavement
  aashtoFlexibleEquation,
  aashtoRigidEquation,
  pavementEquations,
  // Road Geometry
  stoppingSightDistanceEquation,
  minimumRadiusEquation,
  circularCurveEquation,
  verticalCurveEquation,
  roadGeometryEquations,
  // Urban
  rampSlopeEquation,
  crosswalkEquation,
  urbanEquations,
  // All
  allEngineeringEquations,
} from './engineering-equations';
