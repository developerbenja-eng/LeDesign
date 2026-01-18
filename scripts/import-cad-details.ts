/**
 * Import MINVU CAD Details
 *
 * This script reads DWG files from minvu-docs/AutoCAD,
 * parses them using libredwg-web, classifies them by filename,
 * and inserts them into the database.
 *
 * Usage: npx tsx scripts/import-cad-details.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { getDb, execute } from '../src/lib/db/turso';
import { createStandardDetailsTable, createDrawingTemplatesTable, createCADSymbolsTable, createInfrastructureDetailDefaultsTable } from '../src/lib/db/migrations';

// Since libredwg-web is browser-only (WASM), we'll use a simplified approach
// for server-side: parse files and store metadata, actual parsing happens client-side
// For a full solution, we'd need Node.js bindings or a separate parser

interface FileClassification {
  category: 'stormwater' | 'pipes' | 'curbs' | 'pavement' | 'traffic' | 'template' | 'symbol' | 'reference';
  subcategory: string;
  code: string;
  name_es: string;
  type: 'detail' | 'template' | 'symbol';
}

/**
 * Classify a DWG file based on its filename
 */
function classifyFile(filename: string): FileClassification {
  const lower = filename.toLowerCase();
  const base = path.basename(filename, path.extname(filename));

  // Sumideros (Storm inlets)
  if (lower.includes('sum_s') || lower.includes('sumidero')) {
    const match = lower.match(/sum_s(\d)/);
    const num = match ? match[1] : '';
    return {
      category: 'stormwater',
      subcategory: 'sumideros',
      code: `SUM-S${num || '1'}`,
      name_es: `Sumidero S${num || '1'}`,
      type: 'detail',
    };
  }

  if (lower.includes('sum_tipo')) {
    if (lower.includes('tipo_g')) {
      return {
        category: 'stormwater',
        subcategory: 'sumideros',
        code: 'SUM-TIPO-G',
        name_es: 'Sumidero Tipo G',
        type: 'detail',
      };
    }
    if (lower.includes('serviu')) {
      return {
        category: 'stormwater',
        subcategory: 'sumideros',
        code: 'SUM-SERVIU',
        name_es: 'Sumidero Tipo SERVIU',
        type: 'detail',
      };
    }
  }

  // Cámaras (Manholes)
  if (lower.includes('camara') || lower.includes('cam_')) {
    if (lower.includes('decantadora')) {
      return {
        category: 'stormwater',
        subcategory: 'camaras',
        code: 'CAM-DEC',
        name_es: 'Cámara Decantadora',
        type: 'detail',
      };
    }
    if (lower.includes('tipo_a') || lower.includes('tipo a')) {
      return {
        category: 'stormwater',
        subcategory: 'camaras',
        code: 'CAM-TIPO-A',
        name_es: 'Cámara Tipo A',
        type: 'detail',
      };
    }
    if (lower.includes('tipo_b') || lower.includes('tipo b')) {
      return {
        category: 'stormwater',
        subcategory: 'camaras',
        code: 'CAM-TIPO-B',
        name_es: 'Cámara Tipo B',
        type: 'detail',
      };
    }
    if (lower.includes('esp')) {
      return {
        category: 'stormwater',
        subcategory: 'camaras',
        code: 'CAM-ESP-A',
        name_es: 'Cámara Especial Tipo A',
        type: 'detail',
      };
    }
  }

  // Zanjas (Trenches)
  if (lower.includes('zanja')) {
    if (lower.includes('inf')) {
      return {
        category: 'pipes',
        subcategory: 'zanjas',
        code: 'ZAN-INF-DEC',
        name_es: 'Zanja Inferior Decantadora',
        type: 'detail',
      };
    }
    return {
      category: 'pipes',
      subcategory: 'zanjas',
      code: 'ZAN-TUB',
      name_es: 'Zanja Tipo Tuberías',
      type: 'detail',
    };
  }

  // Tuberías (Pipes)
  if (lower.includes('tuberia') || lower.includes('tubo')) {
    if (lower.includes('colocacion')) {
      return {
        category: 'pipes',
        subcategory: 'instalacion',
        code: 'TUB-COL',
        name_es: 'Colocación de Tubería',
        type: 'detail',
      };
    }
    if (lower.includes('atravieso') || lower.includes('bajo calzada')) {
      return {
        category: 'pipes',
        subcategory: 'cruces',
        code: 'TUB-ATRAV',
        name_es: 'Atravieso Bajo Calzada',
        type: 'detail',
      };
    }
  }

  // Losas bajo tubería
  if (lower.includes('losa_bajo')) {
    let code = 'LOSA-TUB';
    let name = 'Losa Bajo Tubería';
    if (lower.includes('existente')) {
      code += '-EX';
      name += ' Existente';
    } else if (lower.includes('proyect')) {
      code += '-PR';
      name += ' Proyectada';
    }
    if (lower.includes('asf')) {
      code += '-ASF';
      name += ' Asfalto';
    } else if (lower.includes('hcv')) {
      code += '-HCV';
      name += ' Hormigón';
    }
    return {
      category: 'pipes',
      subcategory: 'refuerzos',
      code,
      name_es: name,
      type: 'detail',
    };
  }

  // Dados de refuerzo
  if (lower.includes('dado') && lower.includes('refuerzo')) {
    const isExisting = lower.includes('existente');
    return {
      category: 'pipes',
      subcategory: 'refuerzos',
      code: isExisting ? 'DADO-REF-EX' : 'DADO-REF-PR',
      name_es: isExisting ? 'Dado Refuerzo Tubo Existente' : 'Dado Refuerzo Tubo Proyectado',
      type: 'detail',
    };
  }

  // Excavación
  if (lower.includes('excavacion') || lower.includes('entibacion')) {
    return {
      category: 'pipes',
      subcategory: 'excavacion',
      code: 'EXC-ENTIB',
      name_es: 'Excavación Con y Sin Entibación',
      type: 'detail',
    };
  }

  // Soleras y veredas
  if (lower.includes('solera')) {
    if (lower.includes('zarpa')) {
      return {
        category: 'curbs',
        subcategory: 'soleras',
        code: 'SOL-ZARPA',
        name_es: 'Solera con Zarpa',
        type: 'detail',
      };
    }
    if (lower.includes('sitio')) {
      return {
        category: 'curbs',
        subcategory: 'soleras',
        code: 'SOL-SITIO',
        name_es: 'Solera en Sitio',
        type: 'detail',
      };
    }
    if (lower.includes('tipo')) {
      return {
        category: 'curbs',
        subcategory: 'soleras',
        code: 'SOL-TIPO-AC',
        name_es: 'Soleras Tipo A/C',
        type: 'detail',
      };
    }
  }

  if (lower.includes('acera') || lower.includes('vereda')) {
    if (lower.includes('reforzada')) {
      return {
        category: 'curbs',
        subcategory: 'veredas',
        code: 'ACER-REF',
        name_es: 'Acera Reforzada',
        type: 'detail',
      };
    }
    if (lower.includes('rebaje')) {
      return {
        category: 'curbs',
        subcategory: 'veredas',
        code: 'REBAJE-VER',
        name_es: 'Rebajes de Vereda',
        type: 'detail',
      };
    }
    if (lower.includes('reposicion') || lower.includes('reposición')) {
      return {
        category: 'curbs',
        subcategory: 'veredas',
        code: 'REP-VER',
        name_es: 'Reposición Parcial de Veredas',
        type: 'detail',
      };
    }
  }

  // Pavimentos (Pavement)
  if (lower.includes('bacheo')) {
    const isDeep = lower.includes('profundo');
    return {
      category: 'pavement',
      subcategory: 'bacheos',
      code: isDeep ? 'BACH-PROF' : 'BACH-SUP',
      name_es: isDeep ? 'Bacheo Profundo' : 'Bacheo Superficial',
      type: 'detail',
    };
  }

  if (lower.includes('fresado') || lower.includes('recapado')) {
    return {
      category: 'pavement',
      subcategory: 'fresado',
      code: 'FRES-RECAP',
      name_es: 'Fresado y Recapado',
      type: 'detail',
    };
  }

  if (lower.includes('losa') && !lower.includes('tuberia')) {
    return {
      category: 'pavement',
      subcategory: 'losas',
      code: 'REP-LOSA',
      name_es: 'Reposición de Losas Hormigón',
      type: 'detail',
    };
  }

  // Traffic elements
  if (lower.includes('bolson') || lower.includes('retorno')) {
    const isNew = lower.includes('nva') || lower.includes('nueva');
    return {
      category: 'traffic',
      subcategory: 'bolsones',
      code: isNew ? 'BOLS-NVA' : 'BOLS-EX',
      name_es: isNew ? 'Bolsón de Retorno Nueva Vía' : 'Bolsón Existente',
      type: 'detail',
    };
  }

  if (lower.includes('ciclovia') || lower.includes('señalizacion')) {
    return {
      category: 'traffic',
      subcategory: 'señalizacion',
      code: 'SEN-CICLO',
      name_es: 'Señalización Cruce con Ciclovía',
      type: 'detail',
    };
  }

  if (lower.includes('esquina') && lower.includes('refuerzo')) {
    return {
      category: 'traffic',
      subcategory: 'esquinas',
      code: 'REF-ESQ',
      name_es: 'Refuerzo Esquina Aguda',
      type: 'detail',
    };
  }

  // Drawing templates
  if (lower.includes('formato') || lower.includes('formulario')) {
    if (lower.includes('formulario')) {
      const match = lower.match(/(\d+)/);
      const num = match ? match[1] : '8';
      return {
        category: 'template',
        subcategory: 'forms',
        code: `FORM-${num}`,
        name_es: `Formulario N°${num}`,
        type: 'template',
      };
    }
    return {
      category: 'template',
      subcategory: 'layout',
      code: 'FORMATO-OBRAS',
      name_es: 'Formato Planos Obras Roturas',
      type: 'template',
    };
  }

  // Symbols
  if (lower.includes('simbologia')) {
    return {
      category: 'symbol',
      subcategory: 'annotation',
      code: 'SIMB-STD',
      name_es: 'Simbología Estándar',
      type: 'symbol',
    };
  }

  if (lower.includes('notas')) {
    return {
      category: 'symbol',
      subcategory: 'notes',
      code: 'NOTAS-STD',
      name_es: 'Notas Estándar',
      type: 'symbol',
    };
  }

  // Reference standards
  if (lower.includes('perfil')) {
    return {
      category: 'reference',
      subcategory: 'profiles',
      code: 'PERF-TIPO',
      name_es: 'Perfiles Tipo',
      type: 'detail',
    };
  }

  if (lower.includes('criterio')) {
    return {
      category: 'reference',
      subcategory: 'criteria',
      code: 'CRIT-GEN',
      name_es: 'Criterios de Diseño',
      type: 'detail',
    };
  }

  // Tapa de cámara
  if (lower.includes('tapa')) {
    return {
      category: 'stormwater',
      subcategory: 'accesorios',
      code: 'TAPA-CAM',
      name_es: 'Tapa de Cámara',
      type: 'detail',
    };
  }

  // EstDescanso
  if (lower.includes('descanso')) {
    return {
      category: 'curbs',
      subcategory: 'mobiliario',
      code: 'EST-DESC',
      name_es: 'Estación de Descanso',
      type: 'detail',
    };
  }

  // Default fallback
  return {
    category: 'reference',
    subcategory: 'otros',
    code: `DET-${base.substring(0, 10).toUpperCase().replace(/[^A-Z0-9]/g, '')}`,
    name_es: base.replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim(),
    type: 'detail',
  };
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Main import function
 */
async function importCADDetails() {
  console.log('Starting CAD details import...\n');

  // Ensure tables exist
  console.log('Creating/verifying database tables...');
  await createStandardDetailsTable();
  await createDrawingTemplatesTable();
  await createCADSymbolsTable();
  await createInfrastructureDetailDefaultsTable();
  console.log('');

  const autocadDir = path.join(process.cwd(), 'minvu-docs', 'AutoCAD');

  if (!fs.existsSync(autocadDir)) {
    console.error(`AutoCAD directory not found: ${autocadDir}`);
    console.log('Make sure minvu-docs/AutoCAD exists with DWG files.');
    process.exit(1);
  }

  const files = fs.readdirSync(autocadDir).filter(f =>
    f.toLowerCase().endsWith('.dwg')
  );

  console.log(`Found ${files.length} DWG files to process.\n`);

  const db = getDb();
  let detailsCount = 0;
  let templatesCount = 0;
  let symbolsCount = 0;
  const usedCodes = new Set<string>();

  for (const file of files) {
    const filePath = path.join(autocadDir, file);
    const stats = fs.statSync(filePath);
    const classification = classifyFile(file);

    // Ensure unique code
    let code = classification.code;
    let suffix = 1;
    while (usedCodes.has(code)) {
      code = `${classification.code}-${suffix}`;
      suffix++;
    }
    usedCodes.add(code);

    console.log(`Processing: ${file}`);
    console.log(`  Category: ${classification.category}/${classification.subcategory}`);
    console.log(`  Code: ${code}`);
    console.log(`  Name: ${classification.name_es}`);
    console.log(`  Type: ${classification.type}`);
    console.log(`  Size: ${(stats.size / 1024).toFixed(1)} KB`);

    try {
      const id = generateId();

      // Note: Since libredwg-web is browser-only, we store file metadata here
      // Actual parsing with geometry extraction happens client-side when needed
      // For now, we store a placeholder that will be populated on first client-side parse

      if (classification.type === 'detail') {
        await execute(db, `
          INSERT OR REPLACE INTO standard_details (
            id, category, subcategory, code, name_es, source_file,
            geometry_json, bounds_json, tags_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          id,
          classification.category,
          classification.subcategory,
          code,
          classification.name_es,
          file,
          JSON.stringify([]), // Placeholder - parsed client-side
          JSON.stringify({ minX: 0, minY: 0, maxX: 100, maxY: 100 }),
          JSON.stringify([classification.category, classification.subcategory]),
        ]);
        detailsCount++;
      } else if (classification.type === 'template') {
        await execute(db, `
          INSERT OR REPLACE INTO drawing_templates (
            id, name, description, template_type, source_file, content_json
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
          id,
          classification.name_es,
          `MINVU standard template: ${classification.name_es}`,
          classification.subcategory,
          file,
          JSON.stringify([]), // Placeholder
        ]);
        templatesCount++;
      } else if (classification.type === 'symbol') {
        await execute(db, `
          INSERT OR REPLACE INTO cad_symbols (
            id, category, name, source_file, geometry_json
          ) VALUES (?, ?, ?, ?, ?)
        `, [
          id,
          classification.subcategory,
          classification.name_es,
          file,
          JSON.stringify([]), // Placeholder
        ]);
        symbolsCount++;
      }

      console.log(`  -> Inserted successfully\n`);
    } catch (error) {
      console.error(`  -> Error: ${error}\n`);
    }
  }

  // Insert default infrastructure-detail mappings
  console.log('\nInserting infrastructure-detail default mappings...');

  const defaultMappings = [
    { infraType: 'storm_inlet', detailCode: 'SUM-S1' },
    { infraType: 'storm_inlet', detailCode: 'SUM-S2', isDefault: false },
    { infraType: 'storm_inlet', detailCode: 'SUM-S3', isDefault: false },
    { infraType: 'manhole', detailCode: 'CAM-TIPO-A' },
    { infraType: 'manhole', detailCode: 'CAM-TIPO-B', isDefault: false },
    { infraType: 'settling_chamber', detailCode: 'CAM-DEC' },
    { infraType: 'sewer_pipe', detailCode: 'ZAN-TUB' },
    { infraType: 'curb', detailCode: 'SOL-ZARPA' },
    { infraType: 'sidewalk', detailCode: 'ACER-REF' },
    { infraType: 'manhole_cover', detailCode: 'TAPA-CAM' },
  ];

  for (const mapping of defaultMappings) {
    try {
      // Check if detail code exists
      const exists = await execute(db, 'SELECT code FROM standard_details WHERE code = ?', [mapping.detailCode]);
      if (exists.rows && exists.rows.length > 0) {
        await execute(db, `
          INSERT OR REPLACE INTO infrastructure_detail_defaults (
            id, infrastructure_type, detail_code, is_default
          ) VALUES (?, ?, ?, ?)
        `, [
          generateId(),
          mapping.infraType,
          mapping.detailCode,
          mapping.isDefault !== false ? 1 : 0,
        ]);
        console.log(`  Mapped ${mapping.infraType} -> ${mapping.detailCode}`);
      }
    } catch (error) {
      console.error(`  Failed to map ${mapping.infraType}: ${error}`);
    }
  }

  console.log('\n========================================');
  console.log('Import Summary:');
  console.log(`  Standard Details: ${detailsCount}`);
  console.log(`  Drawing Templates: ${templatesCount}`);
  console.log(`  CAD Symbols: ${symbolsCount}`);
  console.log('========================================\n');
}

// Run the import
importCADDetails().catch(console.error);
