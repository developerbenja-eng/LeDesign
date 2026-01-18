/**
 * Debug LINE entity structure from libredwg
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

  // Find first LINE entity and dump all its properties
  const lineEntity = entities.find((e: any) => e.type === 'LINE');
  if (lineEntity) {
    console.log('=== LINE ENTITY - ALL PROPERTIES ===');
    console.log(JSON.stringify(lineEntity, null, 2));
    console.log('\n=== Property names ===');
    console.log(Object.keys(lineEntity));
  }

  // Also check a CIRCLE for comparison (we know those work)
  const circleEntity = entities.find((e: any) => e.type === 'CIRCLE');
  if (circleEntity) {
    console.log('\n=== CIRCLE ENTITY - ALL PROPERTIES ===');
    console.log(JSON.stringify(circleEntity, null, 2));
  }

  // Check LWPOLYLINE too
  const polyEntity = entities.find((e: any) => e.type === 'LWPOLYLINE');
  if (polyEntity) {
    console.log('\n=== LWPOLYLINE ENTITY - ALL PROPERTIES ===');
    console.log(JSON.stringify(polyEntity, null, 2));
  }

  libredwg.dwg_free(dwg);
}

main().catch(console.error);
