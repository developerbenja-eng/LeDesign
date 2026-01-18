/**
 * Test DWG parsing on a single file to analyze what we extract
 * Run with: npx tsx scripts/test-dwg-parse.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Since we're in Node, we need to use the @mlightcad/libredwg-web library directly
import { Dwg_File_Type, LibreDwg } from '@mlightcad/libredwg-web';

const CAD_DIR = path.join(process.cwd(), 'minvu-docs', 'AutoCAD');
const TEST_FILE = 'sum_s2.dwg';

interface EntityStats {
  type: string;
  count: number;
  sample?: object;
}

async function main() {
  const filePath = path.join(CAD_DIR, TEST_FILE);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Parsing: ${TEST_FILE}`);
  console.log(`File size: ${(fs.statSync(filePath).size / 1024).toFixed(1)} KB`);
  console.log(`${'='.repeat(60)}\n`);

  // Read file
  const buffer = fs.readFileSync(filePath);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

  // Check DWG version
  const versionBytes = new Uint8Array(arrayBuffer, 0, 6);
  const versionStr = String.fromCharCode(...versionBytes);
  console.log(`DWG Version: ${versionStr}`);

  // Initialize libredwg
  const wasmPath = './node_modules/@mlightcad/libredwg-web/wasm/';
  const libredwg = await LibreDwg.create(wasmPath);

  // Parse
  const dwg = libredwg.dwg_read_data(new Uint8Array(arrayBuffer) as unknown as ArrayBuffer, Dwg_File_Type.DWG);
  if (!dwg) {
    throw new Error('Failed to parse DWG');
  }

  // Convert to raw database
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawDb: any = libredwg.convert(dwg);

  // === ANALYZE ENTITIES ===
  console.log(`\n--- ENTITIES (Model Space) ---`);
  const entities = rawDb.entities || [];
  console.log(`Total entities: ${entities.length}`);

  const entityStats: Map<string, EntityStats> = new Map();
  for (const entity of entities) {
    const type = entity.type || 'UNKNOWN';
    if (!entityStats.has(type)) {
      entityStats.set(type, { type, count: 0, sample: entity });
    }
    entityStats.get(type)!.count++;
  }

  // Print entity breakdown
  console.log(`\nEntity breakdown:`);
  for (const [type, stats] of entityStats) {
    console.log(`  ${type}: ${stats.count}`);
  }

  // === ANALYZE BLOCKS ===
  console.log(`\n--- BLOCK DEFINITIONS ---`);
  const blockRecords = rawDb.tables?.BLOCK_RECORD?.entries || [];
  const userBlocks = blockRecords.filter((b: any) => b.name && !b.name.startsWith('*'));
  console.log(`Total block definitions: ${blockRecords.length}`);
  console.log(`User blocks (non-system): ${userBlocks.length}`);

  for (const block of userBlocks.slice(0, 10)) {
    const blockEntities = block.entities || [];
    console.log(`\n  Block: "${block.name}"`);
    console.log(`    Base point: (${block.basePoint?.x?.toFixed(2) || 0}, ${block.basePoint?.y?.toFixed(2) || 0})`);
    console.log(`    Entities: ${blockEntities.length}`);

    // Entity types in block
    const blockEntityTypes: Record<string, number> = {};
    for (const e of blockEntities) {
      const t = e.type || 'UNKNOWN';
      blockEntityTypes[t] = (blockEntityTypes[t] || 0) + 1;
    }
    if (Object.keys(blockEntityTypes).length > 0) {
      console.log(`    Types: ${Object.entries(blockEntityTypes).map(([t,c]) => `${t}(${c})`).join(', ')}`);
    }
  }

  // === ANALYZE LAYERS ===
  console.log(`\n--- LAYERS ---`);
  const layers = rawDb.tables?.LAYER?.entries || [];
  console.log(`Total layers: ${layers.length}`);
  for (const layer of layers.slice(0, 15)) {
    console.log(`  "${layer.name}" - color: ${layer.color}, on: ${layer.on}, frozen: ${layer.frozen}`);
  }

  // === SAMPLE ENTITIES ===
  console.log(`\n--- SAMPLE ENTITIES ---`);

  // Show sample of each type
  for (const [type, stats] of entityStats) {
    console.log(`\n${type} sample:`);
    const sample = stats.sample;
    // Print relevant properties based on type
    const relevantProps: Record<string, string[]> = {
      'LINE': ['start', 'end', 'layer'],
      'LWPOLYLINE': ['vertices', 'closed', 'layer'],
      'POLYLINE': ['vertices', 'closed', 'layer'],
      'CIRCLE': ['center', 'radius', 'layer'],
      'ARC': ['center', 'radius', 'startAngle', 'endAngle', 'layer'],
      'TEXT': ['text', 'position', 'height', 'layer'],
      'MTEXT': ['text', 'position', 'height', 'layer'],
      'INSERT': ['name', 'insertionPoint', 'rotation', 'xScale', 'yScale', 'layer'],
      'DIMENSION': ['dimensionType', 'defPoint', 'defPoint2', 'defPoint3', 'measurement', 'text', 'layer'],
      'DIMENSION_LINEAR': ['dimensionType', 'defPoint', 'defPoint2', 'defPoint3', 'measurement', 'text', 'layer'],
      'POINT': ['location', 'layer'],
      'HATCH': ['patternName', 'layer'],
      'SOLID': ['point0', 'point1', 'point2', 'point3', 'layer'],
    };

    const props = relevantProps[type] || Object.keys(sample as object).filter(k => k !== 'type');
    for (const prop of props) {
      if ((sample as any)[prop] !== undefined) {
        const val = (sample as any)[prop];
        if (typeof val === 'object' && val !== null) {
          if (Array.isArray(val)) {
            console.log(`  ${prop}: [${val.length} items]`);
            if (val.length > 0 && val.length <= 3) {
              val.forEach((v: any, i: number) => {
                console.log(`    [${i}]: ${JSON.stringify(v)}`);
              });
            }
          } else {
            console.log(`  ${prop}: ${JSON.stringify(val)}`);
          }
        } else {
          console.log(`  ${prop}: ${val}`);
        }
      }
    }
  }

  // === CHECK FOR INSERT ENTITIES ===
  const insertEntities = entities.filter((e: any) => e.type === 'INSERT');
  if (insertEntities.length > 0) {
    console.log(`\n--- INSERT REFERENCES (${insertEntities.length} total) ---`);
    const insertsByBlock: Record<string, number> = {};
    for (const insert of insertEntities) {
      const name = insert.name || 'UNKNOWN';
      insertsByBlock[name] = (insertsByBlock[name] || 0) + 1;
    }
    for (const [name, count] of Object.entries(insertsByBlock)) {
      const blockDef = userBlocks.find((b: any) => b.name === name);
      const blockEntCount = blockDef?.entities?.length || 0;
      console.log(`  "${name}": ${count} instances × ${blockEntCount} entities = ${count * blockEntCount} potential entities`);
    }
  }

  // Free memory
  libredwg.dwg_free(dwg);

  console.log(`\n${'='.repeat(60)}`);
  console.log('Done!');
}

main().catch(console.error);
