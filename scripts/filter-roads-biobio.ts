/**
 * Filter Chile Road Surface Data for Biobío and Ñuble Regions
 *
 * This script filters the national road surface dataset to extract
 * only roads within the Biobío and Ñuble regions for use in CAD-POC.
 *
 * Data source: HeiGIT / Humanitarian Data Exchange
 * https://data.humdata.org/dataset/chile-road-surface-data
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Bounding boxes for regions (approximate)
const REGIONS = {
  // Ñuble Region
  nuble: {
    name: 'Ñuble',
    capital: 'Chillán',
    bbox: {
      west: -72.8,
      south: -37.2,
      east: -71.0,
      north: -36.0
    }
  },
  // Biobío Region
  biobio: {
    name: 'Biobío',
    capital: 'Concepción',
    bbox: {
      west: -73.5,
      south: -38.5,
      east: -71.0,
      north: -36.5
    }
  },
  // Combined for both regions
  combined: {
    name: 'Ñuble + Biobío',
    bbox: {
      west: -73.5,
      south: -38.5,
      east: -71.0,
      north: -36.0
    }
  }
};

// Key cities with their coordinates
const CITIES = {
  concepcion: { name: 'Concepción', lat: -36.8270, lng: -73.0503, pop: 230000 },
  chillan: { name: 'Chillán', lat: -36.6066, lng: -72.1034, pop: 180000 },
  talcahuano: { name: 'Talcahuano', lat: -36.7249, lng: -73.1167, pop: 170000 },
  losAngeles: { name: 'Los Ángeles', lat: -37.4693, lng: -72.3527, pop: 130000 },
  coronel: { name: 'Coronel', lat: -37.0292, lng: -73.1567, pop: 110000 },
  sanCarlos: { name: 'San Carlos', lat: -36.4264, lng: -71.9586, pop: 35000 },
  tome: { name: 'Tomé', lat: -36.6177, lng: -72.9618, pop: 55000 },
  chiguayante: { name: 'Chiguayante', lat: -36.9167, lng: -73.0167, pop: 85000 },
};

const DATA_DIR = path.join(__dirname, '..', 'data', 'chile-roads');
const INPUT_FILE = path.join(DATA_DIR, 'chile_road_surface.gpkg');

async function checkDependencies(): Promise<boolean> {
  try {
    execSync('which ogr2ogr', { stdio: 'pipe' });
    return true;
  } catch {
    console.error('❌ ogr2ogr not found. Please install GDAL:');
    console.error('   brew install gdal');
    return false;
  }
}

async function checkInputFile(): Promise<boolean> {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error('❌ Input file not found:', INPUT_FILE);
    console.error('   Run first: npm run download-chile-roads');
    return false;
  }
  return true;
}

async function filterByBbox(
  regionKey: keyof typeof REGIONS,
  outputFormat: 'gpkg' | 'geojson' = 'geojson'
): Promise<string> {
  const region = REGIONS[regionKey];
  const { west, south, east, north } = region.bbox;

  const ext = outputFormat === 'gpkg' ? 'gpkg' : 'geojson';
  const outputFile = path.join(DATA_DIR, `roads_${regionKey}.${ext}`);

  console.log(`\n📍 Filtering roads for: ${region.name}`);
  console.log(`   Bounding box: ${west},${south} to ${east},${north}`);

  const driver = outputFormat === 'gpkg' ? 'GPKG' : 'GeoJSON';

  const cmd = [
    'ogr2ogr',
    '-f', `"${driver}"`,
    `"${outputFile}"`,
    `"${INPUT_FILE}"`,
    '-spat', west, south, east, north,
    '-progress'
  ].join(' ');

  console.log(`   Running: ogr2ogr...`);

  try {
    execSync(cmd, { stdio: 'inherit' });

    const stats = fs.statSync(outputFile);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

    console.log(`   ✅ Output: ${outputFile}`);
    console.log(`   📦 Size: ${sizeMB} MB`);

    return outputFile;
  } catch (error) {
    console.error(`   ❌ Failed to filter region ${regionKey}`);
    throw error;
  }
}

async function getStats(filePath: string): Promise<void> {
  console.log(`\n📊 Getting statistics for: ${path.basename(filePath)}`);

  try {
    const cmd = `ogrinfo -al -so "${filePath}" | head -50`;
    const output = execSync(cmd, { encoding: 'utf-8' });
    console.log(output);
  } catch (error) {
    console.error('Could not get stats');
  }
}

async function filterByCities(): Promise<void> {
  console.log('\n🏙️  Filtering by major cities (5km radius each)...');

  for (const [key, city] of Object.entries(CITIES)) {
    const outputFile = path.join(DATA_DIR, `roads_${key}.geojson`);

    // Create a rough bounding box (approximately 5km = 0.045 degrees)
    const delta = 0.045;
    const bbox = {
      west: city.lng - delta,
      south: city.lat - delta,
      east: city.lng + delta,
      north: city.lat + delta
    };

    console.log(`\n   📍 ${city.name} (pop: ${city.pop.toLocaleString()})`);

    const cmd = [
      'ogr2ogr',
      '-f', '"GeoJSON"',
      `"${outputFile}"`,
      `"${INPUT_FILE}"`,
      '-spat', bbox.west, bbox.south, bbox.east, bbox.north
    ].join(' ');

    try {
      execSync(cmd, { stdio: 'pipe' });

      if (fs.existsSync(outputFile)) {
        const stats = fs.statSync(outputFile);
        const sizeKB = (stats.size / 1024).toFixed(1);
        console.log(`      ✅ ${outputFile} (${sizeKB} KB)`);
      }
    } catch (error) {
      console.log(`      ⚠️  No data or error for ${city.name}`);
    }
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Chile Road Surface Data Filter - Biobío & Ñuble        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  // Check dependencies
  if (!await checkDependencies()) {
    process.exit(1);
  }

  // Check input file
  if (!await checkInputFile()) {
    process.exit(1);
  }

  // Filter combined region (both Ñuble and Biobío)
  const combinedFile = await filterByBbox('combined', 'geojson');
  await getStats(combinedFile);

  // Also create individual region files
  await filterByBbox('nuble', 'geojson');
  await filterByBbox('biobio', 'geojson');

  // Filter by cities for detailed analysis
  await filterByCities();

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('✅ Filtering complete!');
  console.log('');
  console.log('Output files in:', DATA_DIR);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Open in QGIS to visualize');
  console.log('  2. Import into CAD-POC project');
  console.log('  3. Identify streets needing field surveys');
  console.log('════════════════════════════════════════════════════════════');
}

main().catch(console.error);
