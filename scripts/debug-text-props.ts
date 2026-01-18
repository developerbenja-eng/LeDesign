/**
 * Debug TEXT entity all properties
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

  // Find first TEXT entity and dump ALL properties
  const textEntity = entities.find((e: any) => e.type === 'TEXT');
  if (textEntity) {
    console.log('=== TEXT ENTITY - ALL PROPERTIES ===');
    console.log(JSON.stringify(textEntity, null, 2));
    console.log('\n=== Property names ===');
    console.log(Object.keys(textEntity));
  }

  libredwg.dwg_free(dwg);
}

main().catch(console.error);
