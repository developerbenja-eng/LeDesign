// Test script for parsing DWG files using libredwg-web
import { readFileSync } from 'fs';
import { Dwg_File_Type, LibreDwg } from '@mlightcad/libredwg-web';

const DWG_FILE = '/Users/benjaledesma/Downloads/LOTEO.dwg';

async function testDWGParsing() {
  console.log('Testing DWG parsing with libredwg-web...\n');

  try {
    // Read the DWG file
    console.log('Reading file:', DWG_FILE);
    const buffer = readFileSync(DWG_FILE);
    console.log('File size:', (buffer.length / 1024 / 1024).toFixed(2), 'MB\n');

    // Initialize LibreDwg with wasm path for Node.js
    console.log('Initializing LibreDwg...');
    const wasmPath = './node_modules/@mlightcad/libredwg-web/wasm/';
    const libredwg = await LibreDwg.create(wasmPath);
    console.log('LibreDwg initialized successfully\n');

    // Parse the DWG file
    console.log('Parsing DWG file...');
    const dwg = libredwg.dwg_read_data(new Uint8Array(buffer), Dwg_File_Type.DWG);

    if (!dwg) {
      console.error('Failed to parse DWG file');
      return;
    }

    console.log('DWG file parsed, converting to database...');

    // Convert to database format
    const db = libredwg.convert(dwg);

    console.log('\n=== DWG FILE CONTENTS ===\n');

    // Layers
    if (db.tables?.layer) {
      console.log('LAYERS (' + db.tables.layer.length + '):');
      for (const layer of db.tables.layer) {
        console.log(`  - ${layer.name} (color: ${layer.color}, visible: ${layer.on !== false})`);
      }
      console.log('');
    }

    // Count entities by layer
    const layerCounts = {};
    const typeCounts = {};

    if (db.entities) {
      for (const entity of db.entities) {
        const type = entity.type || 'UNKNOWN';
        const layer = entity.layer || '0';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
        layerCounts[layer] = (layerCounts[layer] || 0) + 1;
      }

      console.log('ENTITIES BY TYPE (' + db.entities.length + ' total):');
      for (const [type, count] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${type}: ${count}`);
      }
      console.log('');

      console.log('ENTITIES BY LAYER:');
      for (const [layer, count] of Object.entries(layerCounts).sort((a, b) => b[1] - a[1]).slice(0, 20)) {
        console.log(`  ${layer}: ${count}`);
      }
      if (Object.keys(layerCounts).length > 20) {
        console.log(`  ... and ${Object.keys(layerCounts).length - 20} more layers`);
      }
      console.log('');

      // Sample different entity types
      console.log('SAMPLE ENTITIES BY TYPE:');

      // Sample lines
      const lines = db.entities.filter(e => e.type === 'LINE').slice(0, 3);
      if (lines.length) {
        console.log('\n  LINES:');
        for (const line of lines) {
          console.log(`    Layer: ${line.layer}`);
          console.log(`    Start: (${line.start?.x?.toFixed(2)}, ${line.start?.y?.toFixed(2)})`);
          console.log(`    End: (${line.end?.x?.toFixed(2)}, ${line.end?.y?.toFixed(2)})`);
        }
      }

      // Sample polylines
      const polys = db.entities.filter(e => e.type === 'LWPOLYLINE' || e.type === 'POLYLINE2D').slice(0, 3);
      if (polys.length) {
        console.log('\n  POLYLINES:');
        for (const poly of polys) {
          console.log(`    Layer: ${poly.layer}, Vertices: ${poly.vertices?.length || 0}, Closed: ${poly.closed}`);
          if (poly.vertices?.length) {
            const first = poly.vertices[0];
            const last = poly.vertices[poly.vertices.length - 1];
            console.log(`    First vertex: (${first?.x?.toFixed(2)}, ${first?.y?.toFixed(2)})`);
            console.log(`    Last vertex: (${last?.x?.toFixed(2)}, ${last?.y?.toFixed(2)})`);
          }
        }
      }

      // Sample circles
      const circles = db.entities.filter(e => e.type === 'CIRCLE').slice(0, 3);
      if (circles.length) {
        console.log('\n  CIRCLES:');
        for (const circle of circles) {
          console.log(`    Layer: ${circle.layer}`);
          console.log(`    Center: (${circle.center?.x?.toFixed(2)}, ${circle.center?.y?.toFixed(2)})`);
          console.log(`    Radius: ${circle.radius?.toFixed(2)}`);
        }
      }

      // Sample arcs
      const arcs = db.entities.filter(e => e.type === 'ARC').slice(0, 3);
      if (arcs.length) {
        console.log('\n  ARCS:');
        for (const arc of arcs) {
          console.log(`    Layer: ${arc.layer}`);
          console.log(`    Center: (${arc.center?.x?.toFixed(2)}, ${arc.center?.y?.toFixed(2)})`);
          console.log(`    Radius: ${arc.radius?.toFixed(2)}, Angles: ${arc.startAngle?.toFixed(2)} - ${arc.endAngle?.toFixed(2)}`);
        }
      }

      // Sample text
      const texts = db.entities.filter(e => e.type === 'TEXT' || e.type === 'MTEXT').slice(0, 3);
      if (texts.length) {
        console.log('\n  TEXT:');
        for (const text of texts) {
          console.log(`    Layer: ${text.layer}`);
          console.log(`    Content: "${(text.text || text.string || '').substring(0, 60)}"`);
          const pos = text.position || text.insertionPoint;
          console.log(`    Position: (${pos?.x?.toFixed(2)}, ${pos?.y?.toFixed(2)})`);
        }
      }

      // Sample dimensions
      const dims = db.entities.filter(e => e.type === 'DIMENSION').slice(0, 3);
      if (dims.length) {
        console.log('\n  DIMENSIONS:');
        for (const dim of dims) {
          console.log(`    Layer: ${dim.layer}, Type: ${dim.dimensionType}`);
          console.log(`    Text: "${dim.text || 'auto'}"`);
        }
      }
    }

    // Calculate bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const entity of db.entities || []) {
      const points = [];
      if (entity.start) points.push(entity.start);
      if (entity.end) points.push(entity.end);
      if (entity.center) points.push(entity.center);
      if (entity.position) points.push(entity.position);
      if (entity.vertices) points.push(...entity.vertices);

      for (const pt of points) {
        if (pt?.x !== undefined && pt?.y !== undefined) {
          minX = Math.min(minX, pt.x);
          minY = Math.min(minY, pt.y);
          maxX = Math.max(maxX, pt.x);
          maxY = Math.max(maxY, pt.y);
        }
      }
    }

    if (minX !== Infinity) {
      console.log('\nDRAWING BOUNDS:');
      console.log(`  Min: (${minX.toFixed(2)}, ${minY.toFixed(2)})`);
      console.log(`  Max: (${maxX.toFixed(2)}, ${maxY.toFixed(2)})`);
      console.log(`  Size: ${(maxX - minX).toFixed(2)} x ${(maxY - minY).toFixed(2)}`);
    }

    // Free memory
    libredwg.dwg_free(dwg);

    console.log('\n=== PARSING COMPLETE ===');

  } catch (error) {
    console.error('Error parsing DWG:', error);
    console.error(error.stack);
  }
}

testDWGParsing();
