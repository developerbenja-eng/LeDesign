/**
 * Process all MINVU DWG files - extract, categorize, and generate previews
 * Run with: npx tsx scripts/process-all-dwg.ts
 *
 * Output:
 * - temp/dwg-manifest.json - Editable manifest with auto-detected categories
 * - temp/svg/ - SVG previews for each file
 * - temp/geometry/ - JSON geometry data for each file
 */

import * as fs from 'fs';
import * as path from 'path';
import { Dwg_File_Type, LibreDwg } from '@mlightcad/libredwg-web';

const CAD_DIR = path.join(process.cwd(), 'minvu-docs', 'AutoCAD');
const OUTPUT_DIR = path.join(process.cwd(), 'temp');
const SVG_DIR = path.join(OUTPUT_DIR, 'svg');
const GEOMETRY_DIR = path.join(OUTPUT_DIR, 'geometry');

// Ensure output directories exist
[OUTPUT_DIR, SVG_DIR, GEOMETRY_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

interface Point { x: number; y: number; z?: number; }

interface ParsedEntity {
  type: string;
  layer: string;
  data: Record<string, any>;
}

interface DWGFileInfo {
  filename: string;
  fileSize: number;
  dwgVersion: string;

  // Auto-detected classification (editable)
  category: string;           // 'stormwater', 'pipes', 'curbs', 'pavement', 'templates', 'symbols'
  subcategory: string;        // More specific
  code: string;               // Short code like 'SUM-S1', 'CAM-DEC'
  name_es: string;            // Spanish name
  name_en?: string;           // English name (optional)
  description?: string;

  // Parsing results
  entityCount: number;
  entityTypes: Record<string, number>;
  layers: string[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };

  // Output files
  svgPath: string;
  geometryPath: string;

  // Status
  parseStatus: 'success' | 'partial' | 'failed';
  skippedTypes: Record<string, number>;
  errors?: string[];
}

// Category detection rules based on filename patterns
const CATEGORY_RULES: Array<{
  pattern: RegExp;
  category: string;
  subcategory: string;
  nameExtractor: (match: RegExpMatchArray, filename: string) => { code: string; name_es: string; name_en?: string };
}> = [
  // Sumideros (storm drains)
  {
    pattern: /^sum[_\s]*(s\d+|tipo[_\s]*(g|serviu))/i,
    category: 'stormwater',
    subcategory: 'sumideros',
    nameExtractor: (match, filename) => {
      const type = filename.match(/s(\d+)/i)?.[1] || filename.match(/tipo[_\s]*(g|serviu)/i)?.[1] || '';
      return {
        code: `SUM-${type.toUpperCase()}`,
        name_es: `Sumidero ${type.toUpperCase()}`,
        name_en: `Storm Drain ${type.toUpperCase()}`
      };
    }
  },
  // Cámaras (manholes)
  {
    pattern: /^(det[_\.]*)?(cam|camara)[_\s]*(tipo|decantadora|esp)/i,
    category: 'stormwater',
    subcategory: 'camaras',
    nameExtractor: (match, filename) => {
      if (/decantadora/i.test(filename)) {
        return { code: 'CAM-DEC', name_es: 'Cámara Decantadora', name_en: 'Settling Chamber' };
      }
      const tipo = filename.match(/tipo[_\s]*([ab])/i)?.[1]?.toUpperCase() || '';
      if (tipo) {
        return { code: `CAM-TIPO-${tipo}`, name_es: `Cámara Tipo ${tipo}`, name_en: `Manhole Type ${tipo}` };
      }
      if (/esp/i.test(filename)) {
        return { code: 'CAM-ESP', name_es: 'Cámara Especial', name_en: 'Special Manhole' };
      }
      return { code: 'CAM', name_es: 'Cámara', name_en: 'Manhole' };
    }
  },
  // Zanjas (trenches) and excavation
  {
    pattern: /zanja|det[_\.]*colocacion|excavacion.*entibacion/i,
    category: 'pipes',
    subcategory: 'zanjas',
    nameExtractor: (match, filename) => {
      if (/colocacion/i.test(filename)) {
        return { code: 'ZAN-COL', name_es: 'Colocación de Tubería', name_en: 'Pipe Placement' };
      }
      if (/excavacion/i.test(filename)) {
        return { code: 'ZAN-EXC', name_es: 'Excavación con/sin Entibación', name_en: 'Shored/Unshored Excavation' };
      }
      return { code: 'ZAN', name_es: 'Zanja de Tuberías', name_en: 'Pipe Trench' };
    }
  },
  // Losas bajo tubería
  {
    pattern: /losa[_\s]*bajo/i,
    category: 'pipes',
    subcategory: 'refuerzos',
    nameExtractor: (match, filename) => {
      const tipo = /existente/i.test(filename) ? 'Existente' : 'Proyectada';
      const pav = /asf/i.test(filename) ? 'Asfalto' : 'Hormigón';
      return {
        code: `LOSA-${tipo.substring(0, 3).toUpperCase()}-${pav.substring(0, 3).toUpperCase()}`,
        name_es: `Losa Bajo Tubería ${tipo} - ${pav}`,
        name_en: `Slab Under ${tipo === 'Existente' ? 'Existing' : 'New'} Pipe - ${pav === 'Asfalto' ? 'Asphalt' : 'Concrete'}`
      };
    }
  },
  // Dados de refuerzo
  {
    pattern: /dado[_\s]*de[_\s]*refuerzo/i,
    category: 'pipes',
    subcategory: 'refuerzos',
    nameExtractor: (match, filename) => {
      const tipo = /existente/i.test(filename) ? 'Existente' : 'Proyectado';
      return {
        code: `DADO-${tipo.substring(0, 3).toUpperCase()}`,
        name_es: `Dado de Refuerzo - Tubo ${tipo}`,
        name_en: `Reinforcement Block - ${tipo === 'Existente' ? 'Existing' : 'New'} Pipe`
      };
    }
  },
  // Atravieso bajo calzada
  {
    pattern: /atravieso|atraveso/i,
    category: 'pipes',
    subcategory: 'cruces',
    nameExtractor: () => ({
      code: 'ATR-CAL',
      name_es: 'Atravieso Bajo Calzada',
      name_en: 'Pipe Crossing Under Road'
    })
  },
  // Soleras (curbs)
  {
    pattern: /solera|sol[_\.]/i,
    category: 'curbs',
    subcategory: 'soleras',
    nameExtractor: (match, filename) => {
      if (/zarpa/i.test(filename)) {
        return { code: 'SOL-ZARPA', name_es: 'Solera con Zarpa', name_en: 'Curb with Footing' };
      }
      if (/sitio/i.test(filename)) {
        return { code: 'SOL-SITIO', name_es: 'Solera en Sitio', name_en: 'Cast-in-place Curb' };
      }
      if (/tipo/i.test(filename)) {
        return { code: 'SOL-TIPO', name_es: 'Soleras Tipo A/C', name_en: 'Standard Curb Types' };
      }
      return { code: 'SOL', name_es: 'Solera', name_en: 'Curb' };
    }
  },
  // Veredas y aceras
  {
    pattern: /vereda|acera|rebaje/i,
    category: 'curbs',
    subcategory: 'veredas',
    nameExtractor: (match, filename) => {
      if (/rebaje/i.test(filename)) {
        return { code: 'VER-REB', name_es: 'Rebajes de Vereda', name_en: 'Sidewalk Ramps' };
      }
      if (/reforzada/i.test(filename)) {
        return { code: 'ACE-REF', name_es: 'Acera Reforzada', name_en: 'Reinforced Sidewalk' };
      }
      if (/reposicion/i.test(filename)) {
        return { code: 'VER-REP', name_es: 'Reposición de Veredas', name_en: 'Sidewalk Repair' };
      }
      return { code: 'VER', name_es: 'Vereda', name_en: 'Sidewalk' };
    }
  },
  // Bacheos (patching)
  {
    pattern: /bacheo/i,
    category: 'pavement',
    subcategory: 'bacheos',
    nameExtractor: (match, filename) => {
      const tipo = /profundo/i.test(filename) ? 'Profundo' : 'Superficial';
      return {
        code: `BACH-${tipo.substring(0, 4).toUpperCase()}`,
        name_es: `Bacheo ${tipo}`,
        name_en: `${tipo === 'Profundo' ? 'Deep' : 'Surface'} Patching`
      };
    }
  },
  // Fresado y recapado
  {
    pattern: /fresado|recapado/i,
    category: 'pavement',
    subcategory: 'reparaciones',
    nameExtractor: () => ({
      code: 'FRES-REC',
      name_es: 'Fresado y Recapado',
      name_en: 'Milling and Overlay'
    })
  },
  // Reposición de losas (handles accented characters)
  {
    pattern: /reposici[oó]n[_\s]*de[_\s]*losas/i,
    category: 'pavement',
    subcategory: 'losas',
    nameExtractor: () => ({
      code: 'REP-LOSAS',
      name_es: 'Reposición de Losas de Hormigón',
      name_en: 'Concrete Slab Replacement'
    })
  },
  // Bolsón de retorno
  {
    pattern: /bolson/i,
    category: 'traffic',
    subcategory: 'bolsones',
    nameExtractor: (match, filename) => {
      const tipo = /existente/i.test(filename) ? 'Existente' : 'Nuevo';
      return {
        code: `BOL-${tipo.substring(0, 3).toUpperCase()}`,
        name_es: `Bolsón de Retorno ${tipo}`,
        name_en: `Turn Bollard ${tipo === 'Existente' ? '(Existing)' : '(New)'}`
      };
    }
  },
  // Formularios (forms)
  {
    pattern: /formulario|form\./i,
    category: 'templates',
    subcategory: 'formularios',
    nameExtractor: (match, filename) => {
      const num = filename.match(/(\d+)/)?.[1] || '';
      return {
        code: `FORM-${num}`,
        name_es: `Formulario N°${num}`,
        name_en: `Form ${num}`
      };
    }
  },
  // Formato de planos (templates)
  {
    pattern: /formato/i,
    category: 'templates',
    subcategory: 'formatos',
    nameExtractor: () => ({
      code: 'FORM-PLANO',
      name_es: 'Formato de Planos',
      name_en: 'Drawing Template'
    })
  },
  // Simbología
  {
    pattern: /simbologia|simbolo/i,
    category: 'symbols',
    subcategory: 'simbologia',
    nameExtractor: () => ({
      code: 'SIMB',
      name_es: 'Simbología',
      name_en: 'Symbols'
    })
  },
  // Notas
  {
    pattern: /^notas/i,
    category: 'symbols',
    subcategory: 'notas',
    nameExtractor: () => ({
      code: 'NOTAS',
      name_es: 'Notas Estándar',
      name_en: 'Standard Notes'
    })
  },
  // Perfiles tipo
  {
    pattern: /perfil|criterio/i,
    category: 'reference',
    subcategory: 'criterios',
    nameExtractor: (match, filename) => {
      if (/perfil/i.test(filename)) {
        return { code: 'PERF-TIPO', name_es: 'Perfiles Tipo', name_en: 'Typical Profiles' };
      }
      return { code: 'CRIT', name_es: 'Criterios de Diseño', name_en: 'Design Criteria' };
    }
  },
  // Refuerzo esquina
  {
    pattern: /refuerzo[_\s]*esquina/i,
    category: 'pavement',
    subcategory: 'refuerzos',
    nameExtractor: () => ({
      code: 'REF-ESQ',
      name_es: 'Refuerzo de Esquina Aguda',
      name_en: 'Sharp Corner Reinforcement'
    })
  },
  // Señalización ciclovia
  {
    pattern: /senalizacion|ciclovia/i,
    category: 'traffic',
    subcategory: 'senalizacion',
    nameExtractor: () => ({
      code: 'SEN-CICLO',
      name_es: 'Señalización Cruce Ciclovía',
      name_en: 'Bike Lane Crossing Signage'
    })
  },
  // Estación de descanso
  {
    pattern: /descanso/i,
    category: 'curbs',
    subcategory: 'accesibilidad',
    nameExtractor: () => ({
      code: 'EST-DESC',
      name_es: 'Estación de Descanso',
      name_en: 'Rest Area'
    })
  },
  // Tapa
  {
    pattern: /^tapa/i,
    category: 'stormwater',
    subcategory: 'accesorios',
    nameExtractor: () => ({
      code: 'TAPA',
      name_es: 'Tapa de Cámara',
      name_en: 'Manhole Cover'
    })
  },
];

function classifyFile(filename: string): { category: string; subcategory: string; code: string; name_es: string; name_en?: string } {
  for (const rule of CATEGORY_RULES) {
    const match = filename.match(rule.pattern);
    if (match) {
      return {
        category: rule.category,
        subcategory: rule.subcategory,
        ...rule.nameExtractor(match, filename)
      };
    }
  }

  // Default fallback
  const cleanName = filename.replace(/\.dwg$/i, '').replace(/[_-]/g, ' ');
  return {
    category: 'unknown',
    subcategory: 'unclassified',
    code: filename.substring(0, 10).toUpperCase().replace(/[^A-Z0-9]/g, ''),
    name_es: cleanName,
    name_en: undefined
  };
}

function getDWGVersion(buffer: ArrayBuffer): string {
  const view = new Uint8Array(buffer, 0, 6);
  const versionStr = String.fromCharCode(...view);
  const versions: Record<string, string> = {
    'AC1015': 'AutoCAD 2000',
    'AC1018': 'AutoCAD 2004',
    'AC1021': 'AutoCAD 2007',
    'AC1024': 'AutoCAD 2010',
    'AC1027': 'AutoCAD 2013',
    'AC1032': 'AutoCAD 2018',
  };
  return versions[versionStr] || versionStr;
}

async function processFile(filename: string, libredwg: LibreDwg): Promise<DWGFileInfo> {
  const filePath = path.join(CAD_DIR, filename);
  const buffer = fs.readFileSync(filePath);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

  const classification = classifyFile(filename);

  const info: DWGFileInfo = {
    filename,
    fileSize: buffer.length,
    dwgVersion: getDWGVersion(arrayBuffer),
    ...classification,
    entityCount: 0,
    entityTypes: {},
    layers: [],
    bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
    svgPath: path.join(SVG_DIR, filename.replace(/\.dwg$/i, '.svg')),
    geometryPath: path.join(GEOMETRY_DIR, filename.replace(/\.dwg$/i, '.json')),
    parseStatus: 'failed',
    skippedTypes: {},
  };

  try {
    const dwg = libredwg.dwg_read_data(new Uint8Array(arrayBuffer) as unknown as ArrayBuffer, Dwg_File_Type.DWG);

    if (!dwg) {
      info.errors = ['Failed to parse DWG file'];
      return info;
    }

    const rawDb: any = libredwg.convert(dwg);
    const entities = rawDb.entities || [];
    const layers = rawDb.tables?.LAYER?.entries || [];

    info.layers = layers.map((l: any) => l.name);

    // Parse entities
    const parsed: ParsedEntity[] = [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    const updateBounds = (x: number, y: number) => {
      if (isFinite(x) && isFinite(y)) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    };

    for (const entity of entities) {
      const type = entity.type;
      const layer = entity.layer || '0';

      info.entityTypes[type] = (info.entityTypes[type] || 0) + 1;

      // Parse based on type (simplified from test-dwg-render.ts)
      let parsedEntity: ParsedEntity | null = null;

      switch (type) {
        case 'LINE': {
          const start = entity.startPoint || entity.start;
          const end = entity.endPoint || entity.end;
          if (start && end) {
            updateBounds(start.x, start.y);
            updateBounds(end.x, end.y);
            parsedEntity = { type: 'line', layer, data: { start, end } };
          }
          break;
        }
        case 'LWPOLYLINE':
        case 'POLYLINE': {
          const vertices = entity.vertices || [];
          if (vertices.length >= 2) {
            for (const v of vertices) updateBounds(v.x, v.y);
            parsedEntity = { type: 'polyline', layer, data: { vertices, closed: entity.closed || entity.flag === 1 } };
          }
          break;
        }
        case 'CIRCLE': {
          if (entity.center && entity.radius) {
            updateBounds(entity.center.x - entity.radius, entity.center.y - entity.radius);
            updateBounds(entity.center.x + entity.radius, entity.center.y + entity.radius);
            parsedEntity = { type: 'circle', layer, data: { center: entity.center, radius: entity.radius } };
          }
          break;
        }
        case 'ARC': {
          if (entity.center && entity.radius) {
            updateBounds(entity.center.x - entity.radius, entity.center.y - entity.radius);
            updateBounds(entity.center.x + entity.radius, entity.center.y + entity.radius);
            parsedEntity = { type: 'arc', layer, data: { center: entity.center, radius: entity.radius, startAngle: entity.startAngle, endAngle: entity.endAngle } };
          }
          break;
        }
        case 'TEXT':
        case 'MTEXT': {
          const pos = entity.startPoint || entity.insertionPoint || entity.position;
          const text = entity.text || '';
          if (pos && text) {
            updateBounds(pos.x, pos.y);
            parsedEntity = { type: 'text', layer, data: { position: pos, text, height: entity.textHeight || entity.height || 2.5, rotation: entity.rotation || 0 } };
          }
          break;
        }
        case 'POINT': {
          if (entity.position) {
            updateBounds(entity.position.x, entity.position.y);
            parsedEntity = { type: 'point', layer, data: { position: entity.position } };
          }
          break;
        }
        case 'SOLID': {
          const corners = [entity.corner1, entity.corner2, entity.corner3, entity.corner4].filter(c => c);
          if (corners.length >= 3) {
            for (const c of corners) updateBounds(c.x, c.y);
            parsedEntity = { type: 'solid', layer, data: { corners } };
          }
          break;
        }
        case 'DIMENSION': {
          const defPoint1 = entity.subDefinitionPoint1 || entity.defPoint2;
          const defPoint2 = entity.subDefinitionPoint2 || entity.defPoint3;
          if (defPoint1 && defPoint2) {
            updateBounds(defPoint1.x, defPoint1.y);
            updateBounds(defPoint2.x, defPoint2.y);
            parsedEntity = { type: 'dimension', layer, data: { defPoint1, defPoint2, dimLinePoint: entity.definitionPoint, textPoint: entity.textPoint, measurement: entity.measurement, text: entity.text } };
          }
          break;
        }
        case 'SPLINE': {
          const points = (entity.fitPoints?.length >= 2 ? entity.fitPoints : entity.controlPoints) || [];
          if (points.length >= 2) {
            for (const p of points) updateBounds(p.x, p.y);
            parsedEntity = { type: 'spline', layer, data: { points } };
          }
          break;
        }
        default:
          info.skippedTypes[type] = (info.skippedTypes[type] || 0) + 1;
      }

      if (parsedEntity) {
        parsed.push(parsedEntity);
      }
    }

    info.entityCount = parsed.length;
    info.bounds = {
      minX: minX === Infinity ? 0 : minX,
      minY: minY === Infinity ? 0 : minY,
      maxX: maxX === -Infinity ? 100 : maxX,
      maxY: maxY === -Infinity ? 100 : maxY,
    };

    // Generate SVG
    const svg = generateSVG(parsed, info.bounds);
    fs.writeFileSync(info.svgPath, svg);

    // Save geometry JSON
    fs.writeFileSync(info.geometryPath, JSON.stringify({
      filename,
      classification,
      bounds: info.bounds,
      layers: info.layers,
      entities: parsed
    }, null, 2));

    info.parseStatus = Object.keys(info.skippedTypes).length > 0 ? 'partial' : 'success';

    libredwg.dwg_free(dwg);

  } catch (error) {
    info.errors = [(error as Error).message];
  }

  return info;
}

function generateSVG(entities: ParsedEntity[], bounds: DWGFileInfo['bounds']): string {
  const padding = 20;
  const width = bounds.maxX - bounds.minX || 100;
  const height = bounds.maxY - bounds.minY || 100;
  const scale = Math.min(800 / width, 600 / height);
  const svgWidth = width * scale + padding * 2;
  const svgHeight = height * scale + padding * 2;

  const tx = (x: number) => (x - bounds.minX) * scale + padding;
  const ty = (y: number) => svgHeight - ((y - bounds.minY) * scale + padding);

  const layerColors: Record<string, string> = {
    '0': '#00ff00', '01': '#00ffff', '03': '#ff00ff', '04': '#ffff00',
    '05': '#ff8800', 'TEXTO': '#ffffff', 'DEFPOINTS': '#666666',
  };

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
  <rect width="100%" height="100%" fill="#1a1a2e"/>
  <g stroke="#00ff00" stroke-width="0.5" fill="none">
`;

  for (const entity of entities) {
    const color = layerColors[entity.layer] || '#00ff00';

    switch (entity.type) {
      case 'line': {
        const { start, end } = entity.data;
        svg += `    <line x1="${tx(start.x)}" y1="${ty(start.y)}" x2="${tx(end.x)}" y2="${ty(end.y)}" stroke="${color}"/>\n`;
        break;
      }
      case 'polyline': {
        const points = entity.data.vertices.map((v: Point) => `${tx(v.x)},${ty(v.y)}`).join(' ');
        const tag = entity.data.closed ? 'polygon' : 'polyline';
        svg += `    <${tag} points="${points}" stroke="${color}"/>\n`;
        break;
      }
      case 'circle': {
        const { center, radius } = entity.data;
        svg += `    <circle cx="${tx(center.x)}" cy="${ty(center.y)}" r="${radius * scale}" stroke="${color}"/>\n`;
        break;
      }
      case 'arc': {
        const { center, radius, startAngle, endAngle } = entity.data;
        const r = radius * scale;
        const startX = tx(center.x + radius * Math.cos(startAngle));
        const startY = ty(center.y + radius * Math.sin(startAngle));
        const endX = tx(center.x + radius * Math.cos(endAngle));
        const endY = ty(center.y + radius * Math.sin(endAngle));
        let sweep = endAngle - startAngle;
        if (sweep < 0) sweep += Math.PI * 2;
        const largeArc = sweep > Math.PI ? 1 : 0;
        svg += `    <path d="M ${startX} ${startY} A ${r} ${r} 0 ${largeArc} 0 ${endX} ${endY}" stroke="${color}"/>\n`;
        break;
      }
      case 'text': {
        const { position, text, height } = entity.data;
        const fontSize = Math.max(6, height * scale * 0.7);
        svg += `    <text x="${tx(position.x)}" y="${ty(position.y)}" fill="${color}" font-size="${fontSize}" font-family="monospace">${escapeXml(text)}</text>\n`;
        break;
      }
      case 'point': {
        const { position } = entity.data;
        const size = 2;
        svg += `    <line x1="${tx(position.x) - size}" y1="${ty(position.y)}" x2="${tx(position.x) + size}" y2="${ty(position.y)}" stroke="${color}"/>\n`;
        svg += `    <line x1="${tx(position.x)}" y1="${ty(position.y) - size}" x2="${tx(position.x)}" y2="${ty(position.y) + size}" stroke="${color}"/>\n`;
        break;
      }
      case 'solid': {
        const pts = entity.data.corners.map((c: Point) => `${tx(c.x)},${ty(c.y)}`).join(' ');
        svg += `    <polygon points="${pts}" fill="${color}" stroke="none"/>\n`;
        break;
      }
      case 'spline': {
        const points = entity.data.points.map((p: Point) => `${tx(p.x)},${ty(p.y)}`).join(' ');
        svg += `    <polyline points="${points}" stroke="${color}" stroke-dasharray="2,2"/>\n`;
        break;
      }
    }
  }

  svg += `  </g>
</svg>`;

  return svg;
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function main() {
  console.log('Processing all MINVU DWG files...\n');

  // Get all DWG files
  const files = fs.readdirSync(CAD_DIR).filter(f => /\.dwg$/i.test(f));
  console.log(`Found ${files.length} DWG files\n`);

  // Initialize libredwg
  const wasmPath = './node_modules/@mlightcad/libredwg-web/wasm/';
  const libredwg = await LibreDwg.create(wasmPath);

  const results: DWGFileInfo[] = [];

  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    process.stdout.write(`[${i + 1}/${files.length}] ${filename}...`);

    try {
      const info = await processFile(filename, libredwg);
      results.push(info);

      const status = info.parseStatus === 'success' ? '✓' : info.parseStatus === 'partial' ? '◐' : '✗';
      console.log(` ${status} ${info.entityCount} entities, category: ${info.category}/${info.subcategory}`);
    } catch (error) {
      console.log(` ✗ Error: ${(error as Error).message}`);
      results.push({
        filename,
        fileSize: 0,
        dwgVersion: '',
        category: 'unknown',
        subcategory: 'error',
        code: '',
        name_es: filename,
        entityCount: 0,
        entityTypes: {},
        layers: [],
        bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
        svgPath: '',
        geometryPath: '',
        parseStatus: 'failed',
        skippedTypes: {},
        errors: [(error as Error).message]
      });
    }
  }

  // Write manifest
  const manifestPath = path.join(OUTPUT_DIR, 'dwg-manifest.json');
  const manifest = {
    generatedAt: new Date().toISOString(),
    totalFiles: results.length,
    byCategory: {} as Record<string, number>,
    byStatus: { success: 0, partial: 0, failed: 0 },
    files: results.map(r => ({
      // Editable fields - modify these before import
      filename: r.filename,
      category: r.category,
      subcategory: r.subcategory,
      code: r.code,
      name_es: r.name_es,
      name_en: r.name_en,
      description: r.description,

      // Read-only info
      _fileSize: r.fileSize,
      _dwgVersion: r.dwgVersion,
      _entityCount: r.entityCount,
      _entityTypes: r.entityTypes,
      _layers: r.layers,
      _bounds: r.bounds,
      _svgPath: r.svgPath,
      _geometryPath: r.geometryPath,
      _parseStatus: r.parseStatus,
      _skippedTypes: r.skippedTypes,
      _errors: r.errors,
    }))
  };

  // Calculate summary
  for (const r of results) {
    manifest.byCategory[r.category] = (manifest.byCategory[r.category] || 0) + 1;
    manifest.byStatus[r.parseStatus]++;
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`\nParse Status:`);
  console.log(`  ✓ Success: ${manifest.byStatus.success}`);
  console.log(`  ◐ Partial: ${manifest.byStatus.partial}`);
  console.log(`  ✗ Failed: ${manifest.byStatus.failed}`);
  console.log(`\nBy Category:`);
  Object.entries(manifest.byCategory).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count}`);
  });
  console.log(`\nOutput:`);
  console.log(`  Manifest: ${manifestPath}`);
  console.log(`  SVGs: ${SVG_DIR}/`);
  console.log(`  Geometry: ${GEOMETRY_DIR}/`);
  console.log(`\n✏️  Edit the manifest to correct categories, then run import script.`);
}

main().catch(console.error);
