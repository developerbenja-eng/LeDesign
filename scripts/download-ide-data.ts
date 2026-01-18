/**
 * IDE Chile Data Downloader
 * Downloads all available geospatial data from Chilean government ArcGIS services
 * and prepares it for upload to Turso database
 */

import * as fs from 'fs';
import * as path from 'path';

// Service definitions
interface IDEService {
  id: string;
  name: string;
  baseUrl: string;
  layers?: { id: number; name: string; geometryType?: string }[];
}

const IDE_SERVICES: IDEService[] = [
  // ROADS
  { id: 'red-vial-chile', name: 'National Road Network', baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/VIALIDAD/Red_Vial_Chile/MapServer', layers: [{ id: 0, name: 'Scale 1:5M' }, { id: 1, name: 'Scale 1:1.1M' }, { id: 2, name: 'Scale 1:500K' }, { id: 3, name: 'Scale 1:1K' }] },
  { id: 'catastro-vial', name: 'Road Cadastre', baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/VIALIDAD/Catastro_Vial/MapServer' },
  { id: 'estado-red-vial', name: 'Paved Road Status', baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/VIALIDAD/Estado_Red_Vial_Pavimentada/MapServer' },
  { id: 'red-vial-estructurante', name: 'Structural Road Network', baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/VIALIDAD/Red_Vial_Estructurante/MapServer' },

  // BRIDGES
  { id: 'puentes', name: 'Bridges', baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/VIALIDAD/Puentes/MapServer', layers: [{ id: 0, name: 'Puentes', geometryType: 'point' }] },
  { id: 'puentes-ruta5', name: 'Route 5 Bridges', baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/VIALIDAD/Puentes_Ruta5/MapServer' },

  // INFRASTRUCTURE
  { id: 'infraestructura-vial', name: 'Road Infrastructure', baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/VIALIDAD/Infraestructura_Vial/MapServer', layers: [{ id: 0, name: 'Weighing Stations' }, { id: 1, name: 'Toll Plazas' }, { id: 2, name: 'Ferries' }, { id: 3, name: 'Tunnels' }] },
  { id: 'pasos-fronterizos', name: 'Border Crossings', baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/VIALIDAD/Pasos_Fronterizos/MapServer' },
  { id: 'zonas-descanso', name: 'Rest Areas', baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/VIALIDAD/Zonas_de_Descanso/MapServer' },

  // HYDRAULIC (DOH)
  { id: 'embalses', name: 'Dams and Reservoirs', baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/DOH/Embalses/MapServer', layers: [{ id: 0, name: 'Reservoir Cadastre' }] },
  { id: 'canales-cnr', name: 'Irrigation Canals', baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/DOH/Canales_CNR/MapServer' },
  { id: 'apr', name: 'Rural Potable Water', baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/DOH/APR/MapServer' },

  // STORM WATER
  { id: 'siall', name: 'Storm Water Infrastructure', baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/DOH/SIALL/MapServer', layers: [{ id: 0, name: 'Collectors' }, { id: 2, name: 'Discharge Points' }, { id: 3, name: 'Chambers' }, { id: 5, name: 'Catch Basins' }, { id: 8, name: 'Master Plan Zones' }, { id: 9, name: 'Tributary Areas' }] },

  // SANITATION
  { id: 'ssr-ley20998', name: 'Rural Sanitation', baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/DOH/SSR_Clasificados_Ley_20998/MapServer' },
  { id: 'ssr-contratos', name: 'Sanitation Contracts', baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/DOH/SSR_Contratos/MapServer' },

  // WATER RESOURCES (DGA)
  { id: 'red-hidrometrica', name: 'Hydrometric Network', baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/DGA/Red_Hidrometrica/MapServer', layers: [{ id: 0, name: 'Station Types' }] },
  { id: 'alertas-dga', name: 'Flood Alerts', baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/DGA/ALERTAS/MapServer', layers: [{ id: 0, name: 'Hydrometeorological Network' }] },
  { id: 'estaciones-embalse', name: 'Reservoir Stations', baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/DGA/ESTACION_EMBALSE/MapServer', layers: [{ id: 0, name: 'DGA Measurement Stations' }] },
  { id: 'acuiferos-protegidos', name: 'Protected Aquifers', baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/DGA/Acuiferos_Protegidos/MapServer' },
  { id: 'areas-restriccion', name: 'Restriction Zones', baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/DGA/Areas_de_Restriccion_y_Zonas_de_Prohibicion/MapServer' },
  { id: 'escasez-hidrica', name: 'Water Scarcity Decrees', baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/DGA/Decretos_Escasez_Hidrica/MapServer' },
  { id: 'declaracion-agotamiento', name: 'Water Depletion', baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/DGA/Declaracion_de_Agotamiento/MapServer' },
  { id: 'caudales-reserva', name: 'Reserved Flow Decrees', baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/DGA/Decretos_Caudales_de_Reserva/MapServer' },
  { id: 'turberas-prohibicion', name: 'Peatland Prohibition', baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/DGA/Area_prohibicion_para_drenajes_en_turberas/MapServer' },

  // BASE MAPS
  { id: 'limites', name: 'Administrative Boundaries', baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/MAPA_BASE/LIMITES/MapServer' },
  { id: 'asentamientos', name: 'Settlements', baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/MAPA_BASE/ASENTAMIENTOS/MapServer' },
  { id: 'red-hidrografica', name: 'Hydrographic Network', baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/MAPA_BASE/RED_HIDROGRAFICA/MapServer' },
  { id: 'snaspe', name: 'Protected Areas', baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/MAPA_BASE/SNASPE/MapServer' },

  // EMERGENCY
  { id: 'emergencias-vialidad', name: 'Road Emergencies', baseUrl: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/VIALIDAD/Emergencias_Vialidad/MapServer' },
];

// Output directory
const OUTPUT_DIR = path.join(__dirname, '../data/ide-chile');

interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: string;
    coordinates: number[] | number[][] | number[][][];
  } | null;
  properties: Record<string, unknown>;
}

interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

interface LayerInfo {
  id: number;
  name: string;
  type?: string;
  geometryType?: string;
}

interface ServiceInfo {
  layers?: LayerInfo[];
}

// Fetch with retry
async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      console.log(`  Retry ${i + 1}/${retries} for ${url}`);
    } catch (error) {
      if (i === retries - 1) throw error;
      console.log(`  Retry ${i + 1}/${retries} after error`);
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error(`Failed after ${retries} retries`);
}

// Get service info (layers)
async function getServiceInfo(baseUrl: string): Promise<ServiceInfo> {
  try {
    const response = await fetchWithRetry(`${baseUrl}?f=json`);
    return await response.json() as ServiceInfo;
  } catch (error) {
    console.log(`  Could not get service info: ${error}`);
    return { layers: [] };
  }
}

// Query layer for all features (paginated)
async function queryLayer(baseUrl: string, layerId: number, maxRecords = 2000): Promise<GeoJSONFeatureCollection> {
  const allFeatures: GeoJSONFeature[] = [];
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const params = new URLSearchParams({
      where: '1=1',
      outFields: '*',
      returnGeometry: 'true',
      outSR: '4326',
      f: 'geojson',
      resultOffset: String(offset),
      resultRecordCount: String(pageSize),
    });

    try {
      const url = `${baseUrl}/${layerId}/query?${params}`;
      const response = await fetchWithRetry(url);
      const data = await response.json() as GeoJSONFeatureCollection & { exceededTransferLimit?: boolean };

      if (data.features && data.features.length > 0) {
        allFeatures.push(...data.features);
        console.log(`    Fetched ${allFeatures.length} features...`);

        if (data.features.length < pageSize || allFeatures.length >= maxRecords) {
          break;
        }
        offset += pageSize;
      } else {
        break;
      }
    } catch (error) {
      console.log(`    Error querying layer ${layerId}: ${error}`);
      break;
    }
  }

  return {
    type: 'FeatureCollection',
    features: allFeatures,
  };
}

// Download all data from a service
async function downloadService(service: IDEService): Promise<void> {
  console.log(`\nDownloading: ${service.name} (${service.id})`);

  const serviceDir = path.join(OUTPUT_DIR, service.id);
  if (!fs.existsSync(serviceDir)) {
    fs.mkdirSync(serviceDir, { recursive: true });
  }

  // Get service info to find layers
  const serviceInfo = await getServiceInfo(service.baseUrl);
  const layers = service.layers || serviceInfo.layers || [];

  if (layers.length === 0) {
    // Try layer 0 as default
    layers.push({ id: 0, name: 'default' });
  }

  const serviceData: {
    service: IDEService;
    downloadedAt: string;
    layers: Array<{
      id: number;
      name: string;
      featureCount: number;
      file: string;
    }>;
    totalFeatures: number;
  } = {
    service,
    downloadedAt: new Date().toISOString(),
    layers: [],
    totalFeatures: 0,
  };

  for (const layer of layers) {
    // Skip group layers (they don't have geometry)
    if (layer.type === 'Group Layer') continue;

    console.log(`  Layer ${layer.id}: ${layer.name}`);

    try {
      const geojson = await queryLayer(service.baseUrl, layer.id);

      if (geojson.features.length > 0) {
        const filename = `layer_${layer.id}.geojson`;
        const filepath = path.join(serviceDir, filename);
        fs.writeFileSync(filepath, JSON.stringify(geojson, null, 2));

        serviceData.layers.push({
          id: layer.id,
          name: layer.name,
          featureCount: geojson.features.length,
          file: filename,
        });
        serviceData.totalFeatures += geojson.features.length;

        console.log(`    Saved ${geojson.features.length} features to ${filename}`);
      } else {
        console.log(`    No features found`);
      }
    } catch (error) {
      console.log(`    Error: ${error}`);
    }

    // Small delay between layers
    await new Promise(r => setTimeout(r, 500));
  }

  // Save service metadata
  fs.writeFileSync(
    path.join(serviceDir, 'metadata.json'),
    JSON.stringify(serviceData, null, 2)
  );
}

// Main function
async function main() {
  console.log('='.repeat(60));
  console.log('IDE Chile Data Downloader');
  console.log('='.repeat(60));

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const summary: Array<{
    id: string;
    name: string;
    features: number;
    status: string;
  }> = [];

  for (const service of IDE_SERVICES) {
    try {
      await downloadService(service);

      // Read metadata to get feature count
      const metadataPath = path.join(OUTPUT_DIR, service.id, 'metadata.json');
      if (fs.existsSync(metadataPath)) {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        summary.push({
          id: service.id,
          name: service.name,
          features: metadata.totalFeatures,
          status: 'success',
        });
      }
    } catch (error) {
      console.log(`  Failed: ${error}`);
      summary.push({
        id: service.id,
        name: service.name,
        features: 0,
        status: 'failed',
      });
    }

    // Delay between services
    await new Promise(r => setTimeout(r, 1000));
  }

  // Save summary
  const summaryPath = path.join(OUTPUT_DIR, 'download-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify({
    downloadedAt: new Date().toISOString(),
    services: summary,
    totalFeatures: summary.reduce((acc, s) => acc + s.features, 0),
  }, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log('Download Summary');
  console.log('='.repeat(60));
  console.table(summary);
  console.log(`\nTotal features downloaded: ${summary.reduce((acc, s) => acc + s.features, 0)}`);
  console.log(`Data saved to: ${OUTPUT_DIR}`);
}

main().catch(console.error);
