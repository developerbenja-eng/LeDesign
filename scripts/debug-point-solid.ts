/**
 * Debug POINT and SOLID entities
 */

import * as fs from 'fs';
import * as path from 'path';
import { Dwg_File_Type, LibreDwg } from '@mlightcad/libredwg-web';

const CAD_DIR = path.join(process.cwd(), 'minvu-docs', 'AutoCAD');

async function main() {
  const filePath = path.join(CAD_DIR, 'sum_s1.dwg');
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

  // Find POINT entity
  const pointEntity = entities.find((e: any) => e.type === 'POINT');
  if (pointEntity) {
    console.log('=== POINT ENTITY ===');
    console.log(JSON.stringify(pointEntity, null, 2));
  }

  // Find SOLID entity
  const solidEntity = entities.find((e: any) => e.type === 'SOLID');
  if (solidEntity) {
    console.log('\n=== SOLID ENTITY ===');
    console.log(JSON.stringify(solidEntity, null, 2));
  }

  // Find INSERT entity
  const insertEntity = entities.find((e: any) => e.type === 'INSERT');
  if (insertEntity) {
    console.log('\n=== INSERT ENTITY ===');
    console.log(JSON.stringify(insertEntity, null, 2));
  }

  libredwg.dwg_free(dwg);
}

main().catch(console.error);
