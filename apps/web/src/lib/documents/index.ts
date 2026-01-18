/**
 * Documents Module Index
 *
 * Exports all document generation functionality including:
 * - PDF generation
 * - Document templates
 * - Data extraction and calculation generators
 * - Project data conversion
 * - Detail sheet generation
 */

// PDF Generation
export {
  generatePDF,
  downloadPDF,
  DEFAULT_PDF_OPTIONS,
} from './pdf-generator';

// Document Templates
export {
  MEMORIA_CALCULO_TEMPLATE,
  ESPECIFICACIONES_TECNICAS_TEMPLATE,
  INFORME_TECNICO_TEMPLATE,
  PRESUPUESTO_TEMPLATE,
  DOCUMENT_TEMPLATES,
  getTemplateByType,
  getAllTemplates,
  cloneTemplate,
  DEFAULT_CARATULA_BY_TYPE,
} from './templates';

// Data Extraction - Hydraulic Calculations
export {
  extractInfrastructureSummary,
  generateManningCalculation,
  generateHazenWilliamsCalculation,
  generateRationalCalculation,
  generateHarmonCalculation,
  generatePipeInventoryTable,
  generateManholeInventoryTable,
  generateHydraulicResultsTable,
  generateBudgetItems,
  calculateBudgetSubtotals,
  // Pavement Calculations
  generateFlexiblePavementCalculation,
  generateRigidPavementCalculation,
  generatePavementLayerTable,
  generateRigidPavementJointTable,
  // Road Geometry Calculations
  generateStoppingSightDistanceCalculation,
  generateMinimumRadiusCalculation,
  generateCircularCurveCalculation,
  generateVerticalCurveCalculation,
  generateRoadGeometrySummaryTable,
  // Urban Elements Calculations
  generatePedestrianRampCalculation,
  generatePedestrianRampTable,
  generateAccessibilityComplianceSection,
  generateCrosswalkCalculation,
} from './data-extractor';

// Project Data Conversion
export {
  generateCaratulaFromProject,
  generateStudyAreaContent,
  generateDesignCriteriaContent,
  generatePopulationDemandContent,
  generateInfrastructureSummaryContent,
  populateSectionFromProject,
  populateDocumentSections,
} from './project-data-converter';
export type { ProjectDataForDocument } from './project-data-converter';

// Detail Sheet Generation
export {
  PAPER_SIZES,
  getRequiredDetailCodes,
  countDetailUsage,
  generateDetailSheet,
  generateDetailSheetFromProject,
} from './detail-sheet-generator';
export type {
  PaperSize,
  DetailSheetConfig,
  StandardDetailData,
  DetailSheetResult,
} from './detail-sheet-generator';
