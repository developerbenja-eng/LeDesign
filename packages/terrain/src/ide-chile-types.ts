/**
 * IDE Chile Type Definitions
 * Simplified types for IDE Chile WFS services
 */

export interface IDEService {
  id: string;
  name: string;
  url: string;
  layer: string;
  type: 'road' | 'river' | 'water_body' | 'other';
}

export const IDE_SERVICES: IDEService[] = [
  {
    id: 'red-vial-chile',
    name: 'Red Vial',
    url: 'https://ide.cl/wfs',
    layer: 'red_vial',
    type: 'road',
  },
  {
    id: 'red-hidrografica',
    name: 'Red Hidrográfica',
    url: 'https://ide.cl/wfs',
    layer: 'red_hidrografica',
    type: 'river',
  },
  {
    id: 'cursos-agua-chile',
    name: 'Cursos de Agua',
    url: 'https://ide.cl/wfs',
    layer: 'cursos_agua',
    type: 'river',
  },
  {
    id: 'cuerpos-agua-chile',
    name: 'Cuerpos de Agua',
    url: 'https://ide.cl/wfs',
    layer: 'cuerpos_agua',
    type: 'water_body',
  },
  {
    id: 'embalses',
    name: 'Embalses',
    url: 'https://ide.cl/wfs',
    layer: 'embalses',
    type: 'water_body',
  },
  {
    id: 'siall',
    name: 'SIALL',
    url: 'https://ide.cl/wfs',
    layer: 'siall',
    type: 'other',
  },
];

export interface IDEQueryParams {
  bbox?: [number, number, number, number] | { west: number; south: number; east: number; north: number };
  outFields?: string[];
  returnGeometry?: boolean;
  maxRecords?: number;
  format?: 'geojson' | 'json';
  srsName?: string;
  maxFeatures?: number;
}

export type GeoJSONPosition = [number, number] | [number, number, number];
export type GeoJSONLineString = GeoJSONPosition[];
export type GeoJSONMultiLineString = GeoJSONLineString[];
export type GeoJSONPolygonRing = GeoJSONPosition[];
export type GeoJSONPolygon = GeoJSONPolygonRing[];
export type GeoJSONMultiPolygon = GeoJSONPolygon[];

export interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: string;
    coordinates: GeoJSONPosition | GeoJSONLineString | GeoJSONMultiLineString | GeoJSONPolygon | GeoJSONMultiPolygon;
  };
  properties: Record<string, unknown>;
}

export function buildQueryUrl(service: IDEService, layer?: number, params?: IDEQueryParams): string {
  const { bbox, srsName = 'EPSG:4326', maxFeatures = 100, maxRecords, format = 'geojson' } = params || {};

  // Use layer parameter if provided, otherwise use service.layer
  const layerName = layer !== undefined ? `${service.layer}/${layer}` : service.layer;

  let url = `${service.url}?service=WFS&version=2.0.0&request=GetFeature&typeName=${layerName}&outputFormat=application/json`;

  if (bbox) {
    // Convert object format to tuple if needed
    const bboxArray = Array.isArray(bbox)
      ? bbox
      : [bbox.west, bbox.south, bbox.east, bbox.north];
    url += `&bbox=${bboxArray.join(',')},${srsName}`;
  }

  url += `&maxFeatures=${maxRecords || maxFeatures}`;

  return url;
}
