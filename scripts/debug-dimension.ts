/**
 * Debug DIMENSION entities
 */

import * as fs from 'fs';
import * as path from 'path';
import { Dwg_File_Type, LibreDwg } from '@mlightcad/libredwg-web';

const CAD_DIR = path.join(process.cwd(), 'minvu-docs', 'AutoCAD');

async function main() {
  const filePath = path.join(CAD_DIR, 'CAMARA_DECANTADORA_160523.DWG');
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

  // Find all DIMENSION entities
  const dimEntities = entities.filter((e: any) =>
    e.type === 'DIMENSION' ||
    e.type?.startsWith('DIMENSION_')
  );

  console.log(`Found ${dimEntities.length} DIMENSION entities\n`);

  // Show first 3
  for (let i = 0; i < Math.min(3, dimEntities.length); i++) {
    console.log(`=== DIMENSION ${i + 1} ===`);
    console.log(JSON.stringify(dimEntities[i], null, 2));
    console.log();
  }

  // Summary of types
  const types: Record<string, number> = {};
  for (const e of dimEntities) {
    types[e.type] = (types[e.type] || 0) + 1;
  }
  console.log('Dimension types:', types);

  libredwg.dwg_free(dwg);
}

main().catch(console.error);
