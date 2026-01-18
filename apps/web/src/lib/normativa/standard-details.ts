/**
 * Standard Details API
 *
 * Query and retrieve MINVU standard CAD details from the database.
 * These details are used for automatic plan generation and detail insertion.
 */

import { getDb, query, queryOne } from '../db/turso';
import type { AnyCADEntity, Point3D } from '@/types/cad';

/**
 * Standard detail record from database
 */
export interface StandardDetail {
  id: string;
  category: string;
  subcategory: string | null;
  code: string;
  name_es: string;
  name_en: string | null;
  description: string | null;
  source_file: string;
  source_url: string | null;
  geometry_json: string;
  bounds_json: string | null;
  insertion_point_json: string | null;
  layers_json: string | null;
  tags_json: string | null;
  thumbnail_svg: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Parsed standard detail with geometry
 */
export interface ParsedStandardDetail {
  id: string;
  code: string;
  category: string;
  subcategory: string | null;
  name_es: string;
  name_en: string | null;
  description: string | null;
  source_file: string;
  entities: AnyCADEntity[];
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  insertionPoint: Point3D;
  layers: string[];
  tags: string[];
  thumbnailSvg: string | null;
}

/**
 * Drawing template record from database
 */
export interface DrawingTemplate {
  id: string;
  name: string;
  description: string | null;
  template_type: string;
  source_file: string;
  source_url: string | null;
  content_json: string;
  paper_size: string | null;
  scale: string | null;
  title_block_fields_json: string | null;
  thumbnail_svg: string | null;
  created_at: string;
}

/**
 * CAD symbol record from database
 */
export interface CADSymbol {
  id: string;
  category: string;
  name: string;
  source_file: string;
  geometry_json: string;
  bounds_json: string | null;
  insertion_point_json: string | null;
  is_text_block: number;
  text_content: string | null;
  thumbnail_svg: string | null;
  created_at: string;
}

/**
 * Infrastructure to detail mapping
 */
export interface InfrastructureDetailDefault {
  id: string;
  infrastructure_type: string;
  detail_code: string;
  is_default: number;
  conditions_json: string | null;
}

// ============================================================================
// Standard Details API
// ============================================================================

/**
 * Get all standard details
 */
export async function getAllStandardDetails(): Promise<StandardDetail[]> {
  const db = getDb();
  return query<StandardDetail>(db, 'SELECT * FROM standard_details ORDER BY category, subcategory, code');
}

/**
 * Get standard details by category
 */
export async function getDetailsByCategory(category: string): Promise<StandardDetail[]> {
  const db = getDb();
  return query<StandardDetail>(
    db,
    'SELECT * FROM standard_details WHERE category = ? ORDER BY subcategory, code',
    [category]
  );
}

/**
 * Get standard details by subcategory
 */
export async function getDetailsBySubcategory(category: string, subcategory: string): Promise<StandardDetail[]> {
  const db = getDb();
  return query<StandardDetail>(
    db,
    'SELECT * FROM standard_details WHERE category = ? AND subcategory = ? ORDER BY code',
    [category, subcategory]
  );
}

/**
 * Get a single standard detail by code
 */
export async function getDetailByCode(code: string): Promise<StandardDetail | null> {
  const db = getDb();
  return queryOne<StandardDetail>(
    db,
    'SELECT * FROM standard_details WHERE code = ?',
    [code]
  );
}

/**
 * Get a single standard detail by ID
 */
export async function getDetailById(id: string): Promise<StandardDetail | null> {
  const db = getDb();
  return queryOne<StandardDetail>(
    db,
    'SELECT * FROM standard_details WHERE id = ?',
    [id]
  );
}

/**
 * Search standard details by name or tags
 */
export async function searchDetails(searchTerm: string): Promise<StandardDetail[]> {
  const db = getDb();
  const term = `%${searchTerm}%`;
  return query<StandardDetail>(
    db,
    `SELECT * FROM standard_details
     WHERE name_es LIKE ? OR name_en LIKE ? OR tags_json LIKE ? OR description LIKE ?
     ORDER BY category, code`,
    [term, term, term, term]
  );
}

/**
 * Get all unique categories
 */
export async function getCategories(): Promise<string[]> {
  const db = getDb();
  const results = await query<{ category: string }>(
    db,
    'SELECT DISTINCT category FROM standard_details ORDER BY category'
  );
  return results.map(r => r.category);
}

/**
 * Get subcategories for a category
 */
export async function getSubcategories(category: string): Promise<string[]> {
  const db = getDb();
  const results = await query<{ subcategory: string }>(
    db,
    'SELECT DISTINCT subcategory FROM standard_details WHERE category = ? AND subcategory IS NOT NULL ORDER BY subcategory',
    [category]
  );
  return results.map(r => r.subcategory);
}

/**
 * Parse a standard detail record into a usable format with geometry
 */
export function parseStandardDetail(detail: StandardDetail): ParsedStandardDetail {
  return {
    id: detail.id,
    code: detail.code,
    category: detail.category,
    subcategory: detail.subcategory,
    name_es: detail.name_es,
    name_en: detail.name_en,
    description: detail.description,
    source_file: detail.source_file,
    entities: JSON.parse(detail.geometry_json || '[]') as AnyCADEntity[],
    bounds: detail.bounds_json
      ? JSON.parse(detail.bounds_json)
      : { minX: 0, minY: 0, maxX: 100, maxY: 100 },
    insertionPoint: detail.insertion_point_json
      ? JSON.parse(detail.insertion_point_json)
      : { x: 0, y: 0, z: 0 },
    layers: detail.layers_json ? JSON.parse(detail.layers_json) : [],
    tags: detail.tags_json ? JSON.parse(detail.tags_json) : [],
    thumbnailSvg: detail.thumbnail_svg,
  };
}

// ============================================================================
// Drawing Templates API
// ============================================================================

/**
 * Get all drawing templates
 */
export async function getAllDrawingTemplates(): Promise<DrawingTemplate[]> {
  const db = getDb();
  return query<DrawingTemplate>(db, 'SELECT * FROM drawing_templates ORDER BY template_type, name');
}

/**
 * Get drawing templates by type
 */
export async function getTemplatesByType(templateType: string): Promise<DrawingTemplate[]> {
  const db = getDb();
  return query<DrawingTemplate>(
    db,
    'SELECT * FROM drawing_templates WHERE template_type = ? ORDER BY name',
    [templateType]
  );
}

/**
 * Get a single drawing template by ID
 */
export async function getTemplateById(id: string): Promise<DrawingTemplate | null> {
  const db = getDb();
  return queryOne<DrawingTemplate>(
    db,
    'SELECT * FROM drawing_templates WHERE id = ?',
    [id]
  );
}

// ============================================================================
// CAD Symbols API
// ============================================================================

/**
 * Get all CAD symbols
 */
export async function getAllCADSymbols(): Promise<CADSymbol[]> {
  const db = getDb();
  return query<CADSymbol>(db, 'SELECT * FROM cad_symbols ORDER BY category, name');
}

/**
 * Get CAD symbols by category
 */
export async function getSymbolsByCategory(category: string): Promise<CADSymbol[]> {
  const db = getDb();
  return query<CADSymbol>(
    db,
    'SELECT * FROM cad_symbols WHERE category = ? ORDER BY name',
    [category]
  );
}

/**
 * Get a single CAD symbol by ID
 */
export async function getSymbolById(id: string): Promise<CADSymbol | null> {
  const db = getDb();
  return queryOne<CADSymbol>(
    db,
    'SELECT * FROM cad_symbols WHERE id = ?',
    [id]
  );
}

// ============================================================================
// Infrastructure Detail Defaults API
// ============================================================================

/**
 * Get the default detail code for an infrastructure type
 */
export async function getDefaultDetailForInfrastructure(infrastructureType: string): Promise<string | null> {
  const db = getDb();
  const result = await queryOne<InfrastructureDetailDefault>(
    db,
    'SELECT * FROM infrastructure_detail_defaults WHERE infrastructure_type = ? AND is_default = 1',
    [infrastructureType]
  );
  return result?.detail_code || null;
}

/**
 * Get all detail options for an infrastructure type
 */
export async function getDetailOptionsForInfrastructure(infrastructureType: string): Promise<InfrastructureDetailDefault[]> {
  const db = getDb();
  return query<InfrastructureDetailDefault>(
    db,
    'SELECT * FROM infrastructure_detail_defaults WHERE infrastructure_type = ? ORDER BY is_default DESC',
    [infrastructureType]
  );
}

/**
 * Get required details for a project based on placed infrastructure
 * This is used for automatic detail sheet generation
 */
export async function getRequiredDetailsForProject(
  infrastructureTypeCounts: Record<string, number>
): Promise<ParsedStandardDetail[]> {
  const db = getDb();
  const requiredCodes = new Set<string>();

  // Get default detail code for each infrastructure type used
  for (const infraType of Object.keys(infrastructureTypeCounts)) {
    const defaultCode = await getDefaultDetailForInfrastructure(infraType);
    if (defaultCode) {
      requiredCodes.add(defaultCode);
    }
  }

  // Fetch all required details
  const details: ParsedStandardDetail[] = [];
  for (const code of requiredCodes) {
    const detail = await getDetailByCode(code);
    if (detail) {
      details.push(parseStandardDetail(detail));
    }
  }

  return details;
}

// ============================================================================
// Update APIs (for client-side geometry population)
// ============================================================================

/**
 * Update the geometry of a standard detail
 * Called after client-side DWG parsing
 */
export async function updateDetailGeometry(
  code: string,
  entities: AnyCADEntity[],
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  layers: string[]
): Promise<void> {
  const db = getDb();
  const { execute } = await import('../db/turso');

  await execute(
    db,
    `UPDATE standard_details
     SET geometry_json = ?, bounds_json = ?, layers_json = ?, updated_at = datetime('now')
     WHERE code = ?`,
    [
      JSON.stringify(entities),
      JSON.stringify(bounds),
      JSON.stringify(layers),
      code,
    ]
  );
}

/**
 * Update the thumbnail SVG of a standard detail
 */
export async function updateDetailThumbnail(code: string, thumbnailSvg: string): Promise<void> {
  const db = getDb();
  const { execute } = await import('../db/turso');

  await execute(
    db,
    `UPDATE standard_details SET thumbnail_svg = ?, updated_at = datetime('now') WHERE code = ?`,
    [thumbnailSvg, code]
  );
}
