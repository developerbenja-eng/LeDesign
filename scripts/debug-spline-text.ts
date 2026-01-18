/**
 * Debug SPLINE and TEXT entities
 */

import * as fs from 'fs';
import * as path from 'path';
import { Dwg_File_Type, LibreDwg } from '@mlightcad/libredwg-web';

const CAD_DIR = path.join(process.cwd(), 'minvu-docs', 'AutoCAD');

async function main() {
  const filePath = path.join(CAD_DIR, 'sum_s2.dwg');
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

  // Find ALL SPLINE entities
  const splineEntities = entities.filter((e: any) => e.type === 'SPLINE');
  console.log(`=== SPLINE ENTITIES (${splineEntities.length} total) ===\n`);

  for (let i = 0; i < splineEntities.length; i++) {
    const spline = splineEntities[i];
    console.log(`SPLINE ${i + 1}:`);
    console.log(`  degree: ${spline.degree}`);
    console.log(`  numberOfFitPoints: ${spline.numberOfFitPoints}`);
    console.log(`  numberOfControlPoints: ${spline.numberOfControlPoints}`);
    console.log(`  numberOfKnots: ${spline.numberOfKnots}`);
    console.log(`  fitPoints: ${spline.fitPoints?.length || 0} points`);
    if (spline.fitPoints && spline.fitPoints.length > 0) {
      console.log(`    Sample: ${JSON.stringify(spline.fitPoints[0])}`);
    }
    console.log(`  controlPoints: ${spline.controlPoints?.length || 0} points`);
    if (spline.controlPoints && spline.controlPoints.length > 0) {
      console.log(`    Sample: ${JSON.stringify(spline.controlPoints[0])}`);
    }
    console.log();
  }

  // Find some TEXT entities
  const textEntities = entities.filter((e: any) => e.type === 'TEXT' || e.type === 'MTEXT');
  console.log(`\n=== TEXT/MTEXT ENTITIES (${textEntities.length} total) ===\n`);

  // Show first 5
  for (let i = 0; i < Math.min(5, textEntities.length); i++) {
    const text = textEntities[i];
    console.log(`TEXT ${i + 1}:`);
    console.log(`  type: ${text.type}`);
    console.log(`  text: "${text.text}"`);
    console.log(`  string: "${text.string}"`);
    console.log(`  insertionPoint: ${JSON.stringify(text.insertionPoint)}`);
    console.log(`  position: ${JSON.stringify(text.position)}`);
    console.log(`  insert_pt: ${JSON.stringify(text.insert_pt)}`);
    console.log(`  height: ${text.height}`);
    console.log(`  rotation: ${text.rotation}`);
    console.log();
  }

  libredwg.dwg_free(dwg);
}

main().catch(console.error);
