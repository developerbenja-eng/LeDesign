import { NextRequest, NextResponse } from 'next/server';

interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface DataLayerResult {
  id: string;
  category: string;
  name: string;
  source: string;
  available: boolean;
  coverage: string;
  cost: string;
  description: string;
  selected: boolean;
}

// Check if a point is within Chile (rough bounds)
function isInChile(bounds: Bounds): boolean {
  const chileBounds = {
    north: -17.5,
    south: -56.0,
    west: -76.0,
    east: -66.0,
  };

  return (
    bounds.south >= chileBounds.south &&
    bounds.north <= chileBounds.north &&
    bounds.west >= chileBounds.west &&
    bounds.east <= chileBounds.east
  );
}

// Determine IDF station based on location
function getIDFStation(bounds: Bounds): { name: string; distance: string } | null {
  const center = {
    lat: (bounds.north + bounds.south) / 2,
    lng: (bounds.east + bounds.west) / 2,
  };

  // IDF stations in Chile (simplified)
  const stations = [
    { name: 'Carriel Sur (Concepción)', lat: -36.78, lng: -73.06 },
    { name: 'Pudahuel (Santiago)', lat: -33.39, lng: -70.79 },
    { name: 'La Florida (Santiago)', lat: -33.52, lng: -70.59 },
    { name: 'Chillán', lat: -36.59, lng: -72.10 },
    { name: 'Temuco', lat: -38.77, lng: -72.64 },
    { name: 'Valdivia', lat: -39.80, lng: -73.24 },
    { name: 'Puerto Montt', lat: -41.47, lng: -72.94 },
    { name: 'La Serena', lat: -29.91, lng: -71.25 },
    { name: 'Antofagasta', lat: -23.65, lng: -70.40 },
  ];

  let closest = stations[0];
  let minDist = Infinity;

  for (const station of stations) {
    const dist = Math.sqrt(
      Math.pow(center.lat - station.lat, 2) + Math.pow(center.lng - station.lng, 2)
    );
    if (dist < minDist) {
      minDist = dist;
      closest = station;
    }
  }

  // Approximate distance in km (very rough)
  const distKm = Math.round(minDist * 111);

  return { name: closest.name, distance: `${distKm} km` };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bounds, projectType } = body as { bounds: Bounds; projectType: string };

    if (!bounds) {
      return NextResponse.json({ error: 'Bounds required' }, { status: 400 });
    }

    const layers: DataLayerResult[] = [];
    const inChile = isInChile(bounds);
    const idfStation = getIDFStation(bounds);

    // Terrain & Satellite Data (always available globally)
    layers.push({
      id: 'copernicus-dem',
      category: 'Terreno',
      name: 'Copernicus DEM 30m',
      source: 'ESA/Copernicus',
      available: true,
      coverage: '100%',
      cost: 'Gratis',
      description: 'Modelo de elevación digital global de 30m de resolución',
      selected: true,
    });

    layers.push({
      id: 'satellite-imagery',
      category: 'Terreno',
      name: 'Imagen Satelital',
      source: 'Google/ESRI',
      available: true,
      coverage: '100%',
      cost: 'Gratis',
      description: 'Imágenes satelitales de alta resolución',
      selected: true,
    });

    layers.push({
      id: 'alos-dem',
      category: 'Terreno',
      name: 'ALOS PALSAR 12.5m',
      source: 'JAXA',
      available: true,
      coverage: '100%',
      cost: '$5/km²',
      description: 'DEM de mayor resolución para análisis detallado',
      selected: false,
    });

    // IDE Chile Data (only if in Chile)
    if (inChile) {
      layers.push({
        id: 'mop-roads',
        category: 'IDE Chile',
        name: 'Vialidad MOP',
        source: 'Ministerio de Obras Públicas',
        available: true,
        coverage: 'Variable',
        cost: 'Gratis',
        description: 'Red vial nacional y regional',
        selected: true,
      });

      layers.push({
        id: 'water-network',
        category: 'IDE Chile',
        name: 'Red de Agua Potable',
        source: 'Superintendencia de Servicios Sanitarios',
        available: true,
        coverage: 'Urbano',
        cost: 'Gratis',
        description: 'Red de distribución de agua potable existente',
        selected: projectType === 'water-sewer' || projectType === 'subdivision',
      });

      layers.push({
        id: 'sewer-network',
        category: 'IDE Chile',
        name: 'Red de Alcantarillado',
        source: 'Superintendencia de Servicios Sanitarios',
        available: true,
        coverage: 'Urbano',
        cost: 'Gratis',
        description: 'Red de alcantarillado existente',
        selected: projectType === 'water-sewer' || projectType === 'subdivision',
      });

      layers.push({
        id: 'cadastre',
        category: 'IDE Chile',
        name: 'Límites Prediales',
        source: 'SII / MINVU',
        available: true,
        coverage: 'Variable',
        cost: 'Gratis',
        description: 'Límites de propiedades y predios',
        selected: projectType === 'subdivision',
      });

      layers.push({
        id: 'plan-regulador',
        category: 'IDE Chile',
        name: 'Plan Regulador',
        source: 'MINVU',
        available: true,
        coverage: 'Urbano',
        cost: 'Gratis',
        description: 'Zonificación y normativa urbanística',
        selected: projectType === 'subdivision',
      });

      layers.push({
        id: 'flood-zones',
        category: 'IDE Chile',
        name: 'Zonas Inundables',
        source: 'SHOA / MOP',
        available: true,
        coverage: 'Costero/Fluvial',
        cost: 'Gratis',
        description: 'Áreas de riesgo de inundación',
        selected: projectType === 'stormwater' || projectType === 'channel',
      });
    }

    // Hydrological Data
    if (idfStation) {
      layers.push({
        id: 'idf-curves',
        category: 'Hidrología',
        name: 'Curvas IDF',
        source: `Est. ${idfStation.name}`,
        available: true,
        coverage: idfStation.distance,
        cost: 'Gratis',
        description: 'Curvas Intensidad-Duración-Frecuencia para diseño de drenaje',
        selected: projectType === 'stormwater' || projectType === 'channel' || projectType === 'subdivision',
      });
    }

    layers.push({
      id: 'precipitation',
      category: 'Hidrología',
      name: 'Precipitación Histórica',
      source: 'Open-Meteo / DGA',
      available: true,
      coverage: '30+ años',
      cost: 'Gratis',
      description: 'Registros históricos de precipitación diaria y horaria',
      selected: projectType === 'stormwater' || projectType === 'channel',
    });

    layers.push({
      id: 'dga-stations',
      category: 'Hidrología',
      name: 'Estaciones DGA',
      source: 'Dirección General de Aguas',
      available: inChile,
      coverage: inChile ? 'Nacional' : 'N/D',
      cost: 'Gratis',
      description: 'Estaciones fluviométricas y meteorológicas',
      selected: projectType === 'channel',
    });

    layers.push({
      id: 'runoff-coefficients',
      category: 'Hidrología',
      name: 'Coeficientes de Escorrentía',
      source: 'Tabla MINVU',
      available: true,
      coverage: 'Por uso de suelo',
      cost: 'Gratis',
      description: 'Coeficientes C sugeridos según tipo de superficie',
      selected: projectType === 'stormwater' || projectType === 'subdivision',
    });

    return NextResponse.json({
      layers,
      metadata: {
        inChile,
        idfStation,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Data discovery error:', error);
    return NextResponse.json(
      { error: 'Failed to discover data' },
      { status: 500 }
    );
  }
}
