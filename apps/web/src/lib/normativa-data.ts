/**
 * Normativa Data API
 *
 * Provides access to extracted MINVU/SERVIU regulatory data including:
 * - Unit prices for budget generation
 * - Verification criteria for inspection checklists
 * - Test specifications for QC planning
 * - Material standards for design validation
 * - Approved products for material selection
 * - Workflow states for project lifecycle tracking
 */

import { getDb } from '@ledesign/db';

// ============================================================================
// Type Definitions
// ============================================================================

export interface UnitPrice {
  id: string;
  code: string;
  category: string;
  subcategory: string | null;
  description_es: string;
  description_en: string | null;
  unit: string;
  price_uf: number | null;
  price_clp: number | null;
  price_date: string | null;
  source: string | null;
  source_document: string | null;
  ordinance_number: string | null;
  valid_from: string | null;
  valid_until: string | null;
  is_active: number;
  notes: string | null;
  tags_json: string | null;
}

export interface VerificationCriterion {
  id: string;
  code: string;
  category: string;
  subcategory: string | null;
  phase: string;
  description_es: string;
  description_en: string | null;
  measurement_type: string | null;
  pass_condition: string | null;
  min_value: number | null;
  max_value: number | null;
  tolerance: number | null;
  unit: string | null;
  severity: string;
  reference_standard: string | null;
  reference_section: string | null;
  source_document: string | null;
  requires_photo: number;
  requires_lab_test: number;
  test_method: string | null;
  is_active: number;
}

export interface TestSpecification {
  id: string;
  code: string;
  test_type: string;
  category: string;
  name_es: string;
  name_en: string | null;
  description: string | null;
  min_value: number | null;
  max_value: number | null;
  unit: string | null;
  frequency_type: string | null;
  frequency_value: number | null;
  frequency_unit: string | null;
  min_samples: number;
  test_method: string | null;
  lab_required: number;
  field_test: number;
  applies_to_json: string | null;
  reference_standard: string | null;
  source_document: string | null;
  is_active: number;
}

export interface MaterialStandard {
  id: string;
  code: string;
  material_type: string;
  category: string;
  name_es: string;
  name_en: string | null;
  description: string | null;
  thickness_min_mm: number | null;
  thickness_max_mm: number | null;
  thickness_typical_mm: number | null;
  cbr_min: number | null;
  compaction_min: number | null;
  plasticity_index_max: number | null;
  liquid_limit_max: number | null;
  gradation_spec: string | null;
  max_aggregate_size_mm: number | null;
  specs_json: string | null;
  traffic_class_json: string | null;
  road_type_json: string | null;
  reference_standard: string | null;
  reference_section: string | null;
  source_document: string | null;
  is_active: number;
}

export interface ApprovedProduct {
  id: string;
  code: string;
  name: string;
  manufacturer: string | null;
  model: string | null;
  category: string;
  subcategory: string | null;
  product_type: string | null;
  ordinance_number: string | null;
  approval_date: string | null;
  approval_entity: string | null;
  approval_document_url: string | null;
  specs_json: string | null;
  load_capacity_tn_m2: number | null;
  storage_volume_m3: number | null;
  flow_capacity_l_s: number | null;
  dimensions_json: string | null;
  material: string | null;
  min_cover_mm: number | null;
  max_depth_mm: number | null;
  traffic_compatible: number;
  valid_until: string | null;
  is_active: number;
  source_document: string | null;
  datasheet_url: string | null;
  notes: string | null;
  tags_json: string | null;
}

export interface WorkflowState {
  id: string;
  code: string;
  name_es: string;
  name_en: string | null;
  description: string | null;
  workflow_type: string;
  phase: string | null;
  order_index: number;
  next_states_json: string | null;
  required_documents_json: string | null;
  required_forms_json: string | null;
  required_approvals_json: string | null;
  max_duration_days: number | null;
  color: string | null;
  icon: string | null;
  is_terminal: number;
  is_active: number;
}

export interface NormativaDocument {
  id: string;
  name: string;
  description: string | null;
  document_type: string;
  category: string | null;
  subcategory: string | null;
  file_type: string;
  file_path: string | null;
  source_url: string | null;
  version: string | null;
  publication_date: string | null;
  data_extracted: number;
  extraction_date: string | null;
  extracted_tables_json: string | null;
  manifest_name: string | null;
  manifest_category: string | null;
  manifest_subcategory: string | null;
  is_active: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

async function query<T>(sql: string, args: unknown[] = []): Promise<T[]> {
  const db = getDb();
  const result = await db.execute({ sql, args });
  return result.rows as T[];
}

async function queryOne<T>(sql: string, args: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(sql, args);
  return rows.length > 0 ? rows[0] : null;
}

async function execute(sql: string, args: unknown[] = []): Promise<void> {
  const db = getDb();
  await db.execute({ sql, args });
}

// ============================================================================
// Unit Prices API
// ============================================================================

export async function getAllUnitPrices(): Promise<UnitPrice[]> {
  return query<UnitPrice>(
    'SELECT * FROM unit_prices WHERE is_active = 1 ORDER BY category, code'
  );
}

export async function getUnitPricesByCategory(category: string): Promise<UnitPrice[]> {
  return query<UnitPrice>(
    'SELECT * FROM unit_prices WHERE category = ? AND is_active = 1 ORDER BY code',
    [category]
  );
}

export async function getUnitPriceByCode(code: string): Promise<UnitPrice | null> {
  return queryOne<UnitPrice>(
    'SELECT * FROM unit_prices WHERE code = ?',
    [code]
  );
}

export async function searchUnitPrices(term: string): Promise<UnitPrice[]> {
  const searchTerm = `%${term}%`;
  return query<UnitPrice>(
    `SELECT * FROM unit_prices
     WHERE (description_es LIKE ? OR code LIKE ? OR tags_json LIKE ?)
     AND is_active = 1
     ORDER BY category, code`,
    [searchTerm, searchTerm, searchTerm]
  );
}

// ============================================================================
// Verification Criteria API
// ============================================================================

export async function getAllVerificationCriteria(): Promise<VerificationCriterion[]> {
  return query<VerificationCriterion>(
    'SELECT * FROM verification_criteria WHERE is_active = 1 ORDER BY category, phase, code'
  );
}

export async function getVerificationCriteriaByPhase(phase: string): Promise<VerificationCriterion[]> {
  return query<VerificationCriterion>(
    'SELECT * FROM verification_criteria WHERE phase = ? AND is_active = 1 ORDER BY category, severity, code',
    [phase]
  );
}

export async function getVerificationCriteriaByCategory(category: string): Promise<VerificationCriterion[]> {
  return query<VerificationCriterion>(
    'SELECT * FROM verification_criteria WHERE category = ? AND is_active = 1 ORDER BY phase, severity, code',
    [category]
  );
}

export async function getVerificationCriteriaForChecklist(
  category: string,
  phase: string
): Promise<VerificationCriterion[]> {
  return query<VerificationCriterion>(
    `SELECT * FROM verification_criteria
     WHERE category = ? AND phase = ? AND is_active = 1
     ORDER BY severity DESC, code`,
    [category, phase]
  );
}

export async function getVerificationCriterionByCode(code: string): Promise<VerificationCriterion | null> {
  return queryOne<VerificationCriterion>(
    'SELECT * FROM verification_criteria WHERE code = ? AND is_active = 1',
    [code]
  );
}

// ============================================================================
// Test Specifications API
// ============================================================================

export async function getAllTestSpecifications(): Promise<TestSpecification[]> {
  return query<TestSpecification>(
    'SELECT * FROM test_specifications WHERE is_active = 1 ORDER BY category, test_type'
  );
}

export async function getTestSpecificationsByCategory(category: string): Promise<TestSpecification[]> {
  return query<TestSpecification>(
    'SELECT * FROM test_specifications WHERE category = ? AND is_active = 1 ORDER BY test_type',
    [category]
  );
}

export async function getTestSpecificationByCode(code: string): Promise<TestSpecification | null> {
  return queryOne<TestSpecification>(
    'SELECT * FROM test_specifications WHERE code = ?',
    [code]
  );
}

/**
 * Get tests applicable to a specific layer type
 */
export async function getTestsForLayer(layerType: string): Promise<TestSpecification[]> {
  return query<TestSpecification>(
    `SELECT * FROM test_specifications
     WHERE applies_to_json LIKE ? AND is_active = 1
     ORDER BY test_type, code`,
    [`%"${layerType}"%`]
  );
}

/**
 * Calculate required tests based on project quantities
 */
export async function calculateRequiredTests(
  layerType: string,
  quantity: number,
  quantityUnit: string
): Promise<Array<{ spec: TestSpecification; requiredCount: number }>> {
  // Get specs that apply to this layer type
  const specs = await query<TestSpecification>(
    `SELECT * FROM test_specifications
     WHERE applies_to_json LIKE ? AND is_active = 1`,
    [`%"${layerType}"%`]
  );

  return specs.map(spec => {
    let requiredCount = spec.min_samples;

    if (spec.frequency_value && spec.frequency_unit === quantityUnit) {
      requiredCount = Math.max(
        spec.min_samples,
        Math.ceil(quantity / spec.frequency_value)
      );
    }

    return { spec, requiredCount };
  });
}

// ============================================================================
// Material Standards API
// ============================================================================

export async function getAllMaterialStandards(): Promise<MaterialStandard[]> {
  return query<MaterialStandard>(
    'SELECT * FROM material_standards WHERE is_active = 1 ORDER BY material_type, category'
  );
}

export async function getMaterialStandardsByType(materialType: string): Promise<MaterialStandard[]> {
  return query<MaterialStandard>(
    'SELECT * FROM material_standards WHERE material_type = ? AND is_active = 1 ORDER BY category',
    [materialType]
  );
}

export async function getMaterialStandardByCode(code: string): Promise<MaterialStandard | null> {
  return queryOne<MaterialStandard>(
    'SELECT * FROM material_standards WHERE code = ?',
    [code]
  );
}

/**
 * Validate a pavement layer against standards
 */
export function validateLayerAgainstStandard(
  layer: { thickness: number; cbr?: number; compaction?: number },
  standard: MaterialStandard
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (standard.thickness_min_mm && layer.thickness < standard.thickness_min_mm) {
    issues.push(`Espesor ${layer.thickness}mm menor al mínimo ${standard.thickness_min_mm}mm`);
  }

  if (standard.thickness_max_mm && layer.thickness > standard.thickness_max_mm) {
    issues.push(`Espesor ${layer.thickness}mm mayor al máximo ${standard.thickness_max_mm}mm`);
  }

  if (standard.cbr_min && layer.cbr && layer.cbr < standard.cbr_min) {
    issues.push(`CBR ${layer.cbr}% menor al mínimo ${standard.cbr_min}%`);
  }

  if (standard.compaction_min && layer.compaction && layer.compaction < standard.compaction_min) {
    issues.push(`Compactación ${layer.compaction}% menor al mínimo ${standard.compaction_min}%`);
  }

  return { valid: issues.length === 0, issues };
}

// ============================================================================
// Approved Products API
// ============================================================================

export async function getAllApprovedProducts(): Promise<ApprovedProduct[]> {
  return query<ApprovedProduct>(
    'SELECT * FROM approved_products WHERE is_active = 1 ORDER BY category, manufacturer, name'
  );
}

export async function getApprovedProductsByCategory(category: string): Promise<ApprovedProduct[]> {
  return query<ApprovedProduct>(
    'SELECT * FROM approved_products WHERE category = ? AND is_active = 1 ORDER BY manufacturer, name',
    [category]
  );
}

export async function getApprovedProductByCode(code: string): Promise<ApprovedProduct | null> {
  return queryOne<ApprovedProduct>(
    'SELECT * FROM approved_products WHERE code = ?',
    [code]
  );
}

export async function searchApprovedProducts(term: string): Promise<ApprovedProduct[]> {
  const searchTerm = `%${term}%`;
  return query<ApprovedProduct>(
    `SELECT * FROM approved_products
     WHERE (name LIKE ? OR manufacturer LIKE ? OR model LIKE ? OR tags_json LIKE ?)
     AND is_active = 1
     ORDER BY category, manufacturer, name`,
    [searchTerm, searchTerm, searchTerm, searchTerm]
  );
}

// ============================================================================
// Workflow States API
// ============================================================================

export async function getWorkflowStates(workflowType: string): Promise<WorkflowState[]> {
  return query<WorkflowState>(
    'SELECT * FROM workflow_states WHERE workflow_type = ? AND is_active = 1 ORDER BY order_index',
    [workflowType]
  );
}

export async function getWorkflowStateByCode(code: string): Promise<WorkflowState | null> {
  return queryOne<WorkflowState>(
    'SELECT * FROM workflow_states WHERE code = ?',
    [code]
  );
}

export async function getNextWorkflowStates(currentCode: string): Promise<WorkflowState[]> {
  const current = await getWorkflowStateByCode(currentCode);

  if (!current || !current.next_states_json) {
    return [];
  }

  const nextCodes: string[] = JSON.parse(current.next_states_json);
  if (nextCodes.length === 0) {
    return [];
  }

  const placeholders = nextCodes.map(() => '?').join(', ');
  return query<WorkflowState>(
    `SELECT * FROM workflow_states WHERE code IN (${placeholders}) ORDER BY order_index`,
    nextCodes
  );
}

// ============================================================================
// Normativa Documents API
// ============================================================================

export async function getAllNormativaDocuments(): Promise<NormativaDocument[]> {
  return query<NormativaDocument>(
    'SELECT * FROM normativa_documents WHERE is_active = 1 ORDER BY document_type, category, name'
  );
}

export async function getNormativaDocumentsByType(documentType: string): Promise<NormativaDocument[]> {
  return query<NormativaDocument>(
    'SELECT * FROM normativa_documents WHERE document_type = ? AND is_active = 1 ORDER BY category, name',
    [documentType]
  );
}

export async function getUnextractedDocuments(): Promise<NormativaDocument[]> {
  return query<NormativaDocument>(
    'SELECT * FROM normativa_documents WHERE data_extracted = 0 AND is_active = 1 ORDER BY document_type, name'
  );
}

// ============================================================================
// Import Functions (for use by import scripts)
// ============================================================================

export async function insertUnitPrice(price: Omit<UnitPrice, 'id'>): Promise<string> {
  const id = `price_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  await execute(
    `INSERT INTO unit_prices (
      id, code, category, subcategory, description_es, description_en,
      unit, price_uf, price_clp, price_date, source, source_document,
      ordinance_number, valid_from, valid_until, is_active, notes, tags_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, price.code, price.category, price.subcategory, price.description_es, price.description_en,
      price.unit, price.price_uf, price.price_clp, price.price_date, price.source, price.source_document,
      price.ordinance_number, price.valid_from, price.valid_until, price.is_active ?? 1, price.notes, price.tags_json
    ]
  );

  return id;
}

export async function insertVerificationCriterion(criterion: Omit<VerificationCriterion, 'id'>): Promise<string> {
  const id = `ver_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  await execute(
    `INSERT INTO verification_criteria (
      id, code, category, subcategory, phase, description_es, description_en,
      measurement_type, pass_condition, min_value, max_value, tolerance, unit,
      severity, reference_standard, reference_section, source_document,
      requires_photo, requires_lab_test, test_method, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, criterion.code, criterion.category, criterion.subcategory, criterion.phase,
      criterion.description_es, criterion.description_en, criterion.measurement_type,
      criterion.pass_condition, criterion.min_value, criterion.max_value, criterion.tolerance,
      criterion.unit, criterion.severity, criterion.reference_standard, criterion.reference_section,
      criterion.source_document, criterion.requires_photo ?? 0, criterion.requires_lab_test ?? 0,
      criterion.test_method, criterion.is_active ?? 1
    ]
  );

  return id;
}

export async function insertApprovedProduct(product: Omit<ApprovedProduct, 'id'>): Promise<string> {
  const id = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  await execute(
    `INSERT INTO approved_products (
      id, code, name, manufacturer, model, category, subcategory, product_type,
      ordinance_number, approval_date, approval_entity, approval_document_url,
      specs_json, load_capacity_tn_m2, storage_volume_m3, flow_capacity_l_s,
      dimensions_json, material, min_cover_mm, max_depth_mm, traffic_compatible,
      valid_until, is_active, source_document, datasheet_url, notes, tags_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, product.code, product.name, product.manufacturer, product.model,
      product.category, product.subcategory, product.product_type,
      product.ordinance_number, product.approval_date, product.approval_entity,
      product.approval_document_url, product.specs_json, product.load_capacity_tn_m2,
      product.storage_volume_m3, product.flow_capacity_l_s, product.dimensions_json,
      product.material, product.min_cover_mm, product.max_depth_mm,
      product.traffic_compatible ?? 0, product.valid_until, product.is_active ?? 1,
      product.source_document, product.datasheet_url, product.notes, product.tags_json
    ]
  );

  return id;
}

export async function insertNormativaDocument(doc: Omit<NormativaDocument, 'id'>): Promise<string> {
  const id = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  await execute(
    `INSERT INTO normativa_documents (
      id, name, description, document_type, category, subcategory,
      file_type, file_path, source_url, version, publication_date,
      data_extracted, extraction_date, extracted_tables_json,
      manifest_name, manifest_category, manifest_subcategory, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, doc.name, doc.description, doc.document_type, doc.category, doc.subcategory,
      doc.file_type, doc.file_path, doc.source_url, doc.version, doc.publication_date,
      doc.data_extracted ?? 0, doc.extraction_date, doc.extracted_tables_json,
      doc.manifest_name, doc.manifest_category, doc.manifest_subcategory, doc.is_active ?? 1
    ]
  );

  return id;
}

export async function markDocumentExtracted(
  id: string,
  extractedTables: string[]
): Promise<void> {
  await execute(
    `UPDATE normativa_documents
     SET data_extracted = 1,
         extraction_date = datetime('now'),
         extracted_tables_json = ?,
         updated_at = datetime('now')
     WHERE id = ?`,
    [JSON.stringify(extractedTables), id]
  );
}
