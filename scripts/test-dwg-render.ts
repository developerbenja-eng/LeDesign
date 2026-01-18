/**
 * Parse DWG and render to SVG for visual verification
 * Run with: npx tsx scripts/test-dwg-render.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { Dwg_File_Type, LibreDwg } from '@mlightcad/libredwg-web';

const CAD_DIR = path.join(process.cwd(), 'minvu-docs', 'AutoCAD');
const OUTPUT_DIR = path.join(process.cwd(), 'temp');
const TEST_FILE = process.argv[2] || 'sum_s2.dwg';

// Ensure output dir exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

interface Point {
  x: number;
  y: number;
}

interface ParsedEntity {
  type: string;
  layer: string;
  data: any;
}

async function main() {
  const filePath = path.join(CAD_DIR, TEST_FILE);
  console.log(`Parsing: ${TEST_FILE}`);

  // Read and parse
  const buffer = fs.readFileSync(filePath);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

  const wasmPath = './node_modules/@mlightcad/libredwg-web/wasm/';
  const libredwg = await LibreDwg.create(wasmPath);
  const dwg = libredwg.dwg_read_data(new Uint8Array(arrayBuffer) as unknown as ArrayBuffer, Dwg_File_Type.DWG);

  if (!dwg) {
    throw new Error('Failed to parse DWG');
  }

  const rawDb: any = libredwg.convert(dwg);
  const entities = rawDb.entities || [];

  // Parse entities and collect bounds
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

  let skippedTypes: Record<string, number> = {};

  for (const entity of entities) {
    const type = entity.type;
    const layer = entity.layer || '0';

    switch (type) {
      case 'LINE': {
        // libredwg uses startPoint/endPoint
        const start = entity.startPoint || entity.start_pt || entity.start;
        const end = entity.endPoint || entity.end_pt || entity.end;
        if (start && end) {
          updateBounds(start.x, start.y);
          updateBounds(end.x, end.y);
          parsed.push({ type: 'line', layer, data: { start, end } });
        } else {
          console.log('LINE missing points:', JSON.stringify(entity).substring(0, 200));
        }
        break;
      }

      case 'LWPOLYLINE':
      case 'POLYLINE': {
        const vertices = entity.vertices || [];
        if (vertices.length >= 2) {
          for (const v of vertices) {
            updateBounds(v.x, v.y);
          }
          parsed.push({
            type: 'polyline',
            layer,
            data: { vertices, closed: entity.closed || entity.flag === 1 }
          });
        }
        break;
      }

      case 'CIRCLE': {
        const center = entity.center;
        const radius = entity.radius;
        if (center && radius) {
          updateBounds(center.x - radius, center.y - radius);
          updateBounds(center.x + radius, center.y + radius);
          parsed.push({ type: 'circle', layer, data: { center, radius } });
        }
        break;
      }

      case 'ARC': {
        const center = entity.center;
        const radius = entity.radius;
        if (center && radius) {
          updateBounds(center.x - radius, center.y - radius);
          updateBounds(center.x + radius, center.y + radius);
          parsed.push({
            type: 'arc',
            layer,
            data: { center, radius, startAngle: entity.startAngle, endAngle: entity.endAngle }
          });
        }
        break;
      }

      case 'TEXT':
      case 'MTEXT': {
        // libredwg uses startPoint for text position and textHeight for size
        const pos = entity.startPoint || entity.insertionPoint || entity.position || entity.insert_pt;
        const text = entity.text || entity.string || '';
        if (pos && text) {
          updateBounds(pos.x, pos.y);
          parsed.push({
            type: 'text',
            layer,
            data: {
              position: pos,
              text,
              height: entity.textHeight || entity.height || 2.5,
              rotation: entity.rotation || 0
            }
          });
        }
        break;
      }

      case 'SPLINE': {
        // Convert spline to polyline approximation using fit points or control points
        const fitPoints = entity.fitPoints || [];
        const controlPoints = entity.controlPoints || [];
        const points = fitPoints.length >= 2 ? fitPoints : controlPoints;

        if (points.length >= 2) {
          for (const p of points) {
            updateBounds(p.x, p.y);
          }
          parsed.push({
            type: 'spline',
            layer,
            data: { points, usedControlPoints: fitPoints.length < 2 }
          });
        } else {
          skippedTypes['SPLINE (no points)'] = (skippedTypes['SPLINE (no points)'] || 0) + 1;
        }
        break;
      }

      case 'POINT': {
        const pos = entity.position;
        if (pos) {
          updateBounds(pos.x, pos.y);
          parsed.push({ type: 'point', layer, data: { position: pos } });
        }
        break;
      }

      case 'SOLID': {
        // SOLID is a filled quadrilateral (often used for arrowheads)
        const corners = [entity.corner1, entity.corner2, entity.corner3, entity.corner4].filter(c => c);
        if (corners.length >= 3) {
          for (const c of corners) {
            updateBounds(c.x, c.y);
          }
          parsed.push({ type: 'solid', layer, data: { corners } });
        }
        break;
      }

      case 'DIMENSION': {
        // libredwg uses different property names for dimension points
        const defPoint1 = entity.subDefinitionPoint1 || entity.defPoint2;
        const defPoint2 = entity.subDefinitionPoint2 || entity.defPoint3;
        const dimLinePoint = entity.definitionPoint || entity.defPoint;
        const textPoint = entity.textPoint || entity.textMidpoint;

        if (defPoint1 && defPoint2) {
          updateBounds(defPoint1.x, defPoint1.y);
          updateBounds(defPoint2.x, defPoint2.y);
          if (dimLinePoint) updateBounds(dimLinePoint.x, dimLinePoint.y);

          parsed.push({
            type: 'dimension',
            layer,
            data: {
              defPoint1,
              defPoint2,
              dimLinePoint,
              textPoint,
              measurement: entity.measurement,
              text: entity.text || entity.measurement?.toFixed(2) || ''
            }
          });
        }
        break;
      }

      case 'HATCH': {
        // Skip hatches for now but track
        skippedTypes['HATCH'] = (skippedTypes['HATCH'] || 0) + 1;
        break;
      }

      case 'INSERT': {
        // Skip block inserts for now (need block explosion logic)
        skippedTypes['INSERT'] = (skippedTypes['INSERT'] || 0) + 1;
        break;
      }

      default:
        skippedTypes[type] = (skippedTypes[type] || 0) + 1;
    }
  }

  console.log(`Parsed ${parsed.length} entities`);
  console.log(`Bounds: (${minX.toFixed(2)}, ${minY.toFixed(2)}) to (${maxX.toFixed(2)}, ${maxY.toFixed(2)})`);

  if (Object.keys(skippedTypes).length > 0) {
    console.log('Skipped:', skippedTypes);
  }

  // Generate SVG
  const padding = 20;
  const width = maxX - minX;
  const height = maxY - minY;
  const scale = Math.min(800 / width, 600 / height);
  const svgWidth = width * scale + padding * 2;
  const svgHeight = height * scale + padding * 2;

  // Transform function (flip Y axis for SVG)
  const tx = (x: number) => (x - minX) * scale + padding;
  const ty = (y: number) => svgHeight - ((y - minY) * scale + padding);

  let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
  <rect width="100%" height="100%" fill="#1a1a2e"/>
  <g stroke="#00ff00" stroke-width="0.5" fill="none">
`;

  // Layer colors
  const layerColors: Record<string, string> = {
    '0': '#00ff00',
    '01': '#00ffff',
    '03': '#ff00ff',
    '04': '#ffff00',
    '05': '#ff8800',
    'TEXTO': '#ffffff',
  };

  for (const entity of parsed) {
    const color = layerColors[entity.layer] || '#00ff00';

    switch (entity.type) {
      case 'line': {
        const { start, end } = entity.data;
        svgContent += `    <line x1="${tx(start.x)}" y1="${ty(start.y)}" x2="${tx(end.x)}" y2="${ty(end.y)}" stroke="${color}"/>\n`;
        break;
      }

      case 'polyline': {
        const { vertices, closed } = entity.data;
        const points = vertices.map((v: Point) => `${tx(v.x)},${ty(v.y)}`).join(' ');

        // Check for bulge (arc segments in polyline)
        const hasBulge = vertices.some((v: any) => v.bulge && v.bulge !== 0);

        if (hasBulge) {
          // Convert polyline with bulges to path
          let path = `M ${tx(vertices[0].x)} ${ty(vertices[0].y)}`;
          for (let i = 0; i < vertices.length - 1; i++) {
            const v1 = vertices[i];
            const v2 = vertices[i + 1];
            if (v1.bulge && v1.bulge !== 0) {
              // Calculate arc from bulge
              const { arcPath } = bulgeToArc(v1, v2, tx, ty);
              path += ` ${arcPath}`;
            } else {
              path += ` L ${tx(v2.x)} ${ty(v2.y)}`;
            }
          }
          if (closed) {
            const v1 = vertices[vertices.length - 1];
            const v2 = vertices[0];
            if (v1.bulge && v1.bulge !== 0) {
              const { arcPath } = bulgeToArc(v1, v2, tx, ty);
              path += ` ${arcPath}`;
            } else {
              path += ' Z';
            }
          }
          svgContent += `    <path d="${path}" stroke="${color}"/>\n`;
        } else {
          const tag = closed ? 'polygon' : 'polyline';
          svgContent += `    <${tag} points="${points}" stroke="${color}"/>\n`;
        }
        break;
      }

      case 'circle': {
        const { center, radius } = entity.data;
        svgContent += `    <circle cx="${tx(center.x)}" cy="${ty(center.y)}" r="${radius * scale}" stroke="${color}"/>\n`;
        break;
      }

      case 'arc': {
        const { center, radius, startAngle, endAngle } = entity.data;
        const r = radius * scale;

        // Calculate start and end points
        const startX = tx(center.x + radius * Math.cos(startAngle));
        const startY = ty(center.y + radius * Math.sin(startAngle));
        const endX = tx(center.x + radius * Math.cos(endAngle));
        const endY = ty(center.y + radius * Math.sin(endAngle));

        // Determine sweep direction and large arc flag
        let sweep = endAngle - startAngle;
        if (sweep < 0) sweep += Math.PI * 2;
        const largeArc = sweep > Math.PI ? 1 : 0;

        // SVG arc: M startX,startY A rx ry rotation largeArcFlag sweepFlag endX endY
        // sweepFlag=0 for counter-clockwise (but Y is flipped, so it's 1)
        svgContent += `    <path d="M ${startX} ${startY} A ${r} ${r} 0 ${largeArc} 0 ${endX} ${endY}" stroke="${color}"/>\n`;
        break;
      }

      case 'text': {
        const { position, text, height, rotation } = entity.data;
        const fontSize = height * scale * 0.7;
        const rot = -(rotation * 180 / Math.PI); // Convert radians and flip for SVG
        svgContent += `    <text x="${tx(position.x)}" y="${ty(position.y)}" fill="${color}" font-size="${fontSize}" font-family="monospace" transform="rotate(${rot} ${tx(position.x)} ${ty(position.y)})">${escapeXml(text)}</text>\n`;
        break;
      }

      case 'spline': {
        // Approximate spline with polyline through fit points
        const { points } = entity.data;
        const pathPoints = points.map((p: Point) => `${tx(p.x)},${ty(p.y)}`).join(' ');
        svgContent += `    <polyline points="${pathPoints}" stroke="${color}" stroke-dasharray="2,2"/>\n`;
        break;
      }

      case 'point': {
        const { position } = entity.data;
        // Render point as small cross
        const size = 2;
        svgContent += `    <line x1="${tx(position.x) - size}" y1="${ty(position.y)}" x2="${tx(position.x) + size}" y2="${ty(position.y)}" stroke="${color}"/>\n`;
        svgContent += `    <line x1="${tx(position.x)}" y1="${ty(position.y) - size}" x2="${tx(position.x)}" y2="${ty(position.y) + size}" stroke="${color}"/>\n`;
        break;
      }

      case 'solid': {
        // Render solid as filled polygon
        const { corners } = entity.data;
        const pts = corners.map((c: Point) => `${tx(c.x)},${ty(c.y)}`).join(' ');
        svgContent += `    <polygon points="${pts}" fill="${color}" stroke="none"/>\n`;
        break;
      }

      case 'dimension': {
        const { defPoint1, defPoint2, dimLinePoint, textPoint, text } = entity.data;

        // Extension lines from definition points to dimension line
        if (dimLinePoint) {
          // Simple aligned dimension rendering
          const dimY = ty(dimLinePoint.y);
          svgContent += `    <line x1="${tx(defPoint1.x)}" y1="${ty(defPoint1.y)}" x2="${tx(defPoint1.x)}" y2="${dimY}" stroke="${color}" stroke-width="0.3"/>\n`;
          svgContent += `    <line x1="${tx(defPoint2.x)}" y1="${ty(defPoint2.y)}" x2="${tx(defPoint2.x)}" y2="${dimY}" stroke="${color}" stroke-width="0.3"/>\n`;

          // Dimension line
          svgContent += `    <line x1="${tx(defPoint1.x)}" y1="${dimY}" x2="${tx(defPoint2.x)}" y2="${dimY}" stroke="${color}" stroke-width="0.3"/>\n`;

          // Dimension text
          if (textPoint && text) {
            const fontSize = 8;
            svgContent += `    <text x="${tx(textPoint.x)}" y="${ty(textPoint.y)}" fill="${color}" font-size="${fontSize}" font-family="monospace" text-anchor="middle">${escapeXml(String(text))}</text>\n`;
          }
        }
        break;
      }
    }
  }

  svgContent += `  </g>
</svg>`;

  // Write SVG
  const outputPath = path.join(OUTPUT_DIR, TEST_FILE.replace(/\.dwg$/i, '.svg'));
  fs.writeFileSync(outputPath, svgContent);
  console.log(`\nSVG written to: ${outputPath}`);

  // Free memory
  libredwg.dwg_free(dwg);
}

// Helper to calculate arc from polyline bulge
function bulgeToArc(v1: any, v2: any, tx: (x: number) => number, ty: (y: number) => number) {
  const bulge = v1.bulge;
  const dx = v2.x - v1.x;
  const dy = v2.y - v1.y;
  const chord = Math.sqrt(dx * dx + dy * dy);

  // Bulge is the tangent of 1/4 the included angle
  const angle = 4 * Math.atan(Math.abs(bulge));
  const radius = chord / (2 * Math.sin(angle / 2));

  // Large arc flag
  const largeArc = Math.abs(angle) > Math.PI ? 1 : 0;
  // Sweep direction (bulge sign determines direction)
  const sweep = bulge > 0 ? 1 : 0;

  const r = radius * (tx(1) - tx(0)); // Scale radius

  return {
    arcPath: `A ${Math.abs(r)} ${Math.abs(r)} 0 ${largeArc} ${sweep} ${tx(v2.x)} ${ty(v2.y)}`,
    radius,
    angle
  };
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

main().catch(console.error);
