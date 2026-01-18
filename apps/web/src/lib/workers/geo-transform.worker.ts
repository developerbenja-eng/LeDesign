/**
 * Web Worker for heavy coordinate transformation calculations
 * Offloads CPU-intensive work from main thread
 */

import type { GeoTransform, LatLng } from '@/types/cad';

// Message types for worker communication
export interface TransformRequest {
  type: 'transform';
  id: string;
  entities: SerializedEntity[];
  geoTransform: GeoTransform;
}

export interface TransformResponse {
  type: 'transform-result';
  id: string;
  transformedEntities: TransformedEntityData[];
  timing: number;
}

export interface SerializedEntity {
  id: string;
  entityType: string;
  color: string;
  layerVisible: boolean;
  // Geometry data
  points?: { x: number; y: number }[];
  center?: { x: number; y: number };
  radius?: number;
  startAngle?: number;
  endAngle?: number;
  text?: string;
}

export interface TransformedEntityData {
  id: string;
  type: string;
  color: string;
  layerVisible: boolean;
  geoPoints: LatLng[];
  geoCenter?: LatLng;
  radiusMeters?: number;
  startAngle?: number;
  endAngle?: number;
  text?: string;
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number };
}

// Earth's radius in meters
const EARTH_RADIUS = 6371000;

function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert CAD point to geographic coordinates
 */
function cadToGeo(
  cadPoint: { x: number; y: number },
  transform: GeoTransform
): LatLng {
  if (!transform.isValid) {
    return transform.origin;
  }

  const dx = cadPoint.x - transform.cadOrigin.x;
  const dy = cadPoint.y - transform.cadOrigin.y;

  const cosR = Math.cos(transform.rotation);
  const sinR = Math.sin(transform.rotation);
  const rotatedX = dx * cosR - dy * sinR;
  const rotatedY = dx * sinR + dy * cosR;

  const metersEast = rotatedX * transform.scale;
  const metersNorth = rotatedY * transform.scale;

  const originLatRad = degreesToRadians(transform.origin.lat);
  const deltaLat = metersNorth / 111320;
  const metersPerDegreeLng = 111320 * Math.cos(originLatRad);
  const deltaLng = metersEast / metersPerDegreeLng;

  return {
    lat: transform.origin.lat + deltaLat,
    lng: transform.origin.lng + deltaLng,
  };
}

/**
 * Transform a single entity
 */
function transformEntity(
  entity: SerializedEntity,
  geoTransform: GeoTransform
): TransformedEntityData | null {
  const { id, entityType, color, layerVisible } = entity;

  switch (entityType) {
    case 'point': {
      if (!entity.points?.[0]) return null;
      const geo = cadToGeo(entity.points[0], geoTransform);
      return {
        id,
        type: 'point',
        color,
        layerVisible,
        geoPoints: [geo],
        bounds: { minLat: geo.lat, maxLat: geo.lat, minLng: geo.lng, maxLng: geo.lng },
      };
    }

    case 'line': {
      if (!entity.points || entity.points.length < 2) return null;
      const start = cadToGeo(entity.points[0], geoTransform);
      const end = cadToGeo(entity.points[1], geoTransform);
      return {
        id,
        type: 'line',
        color,
        layerVisible,
        geoPoints: [start, end],
        bounds: {
          minLat: Math.min(start.lat, end.lat),
          maxLat: Math.max(start.lat, end.lat),
          minLng: Math.min(start.lng, end.lng),
          maxLng: Math.max(start.lng, end.lng),
        },
      };
    }

    case 'polyline': {
      if (!entity.points || entity.points.length < 2) return null;
      const geoPoints = entity.points.map((p) => cadToGeo(p, geoTransform));
      const lats = geoPoints.map((p) => p.lat);
      const lngs = geoPoints.map((p) => p.lng);
      return {
        id,
        type: 'polyline',
        color,
        layerVisible,
        geoPoints,
        bounds: {
          minLat: Math.min(...lats),
          maxLat: Math.max(...lats),
          minLng: Math.min(...lngs),
          maxLng: Math.max(...lngs),
        },
      };
    }

    case 'circle': {
      if (!entity.center || entity.radius === undefined) return null;
      const center = cadToGeo(entity.center, geoTransform);
      const radiusMeters = entity.radius * geoTransform.scale;
      const latOffset = radiusMeters / 111320;
      const lngOffset = radiusMeters / (111320 * Math.cos(center.lat * Math.PI / 180));
      return {
        id,
        type: 'circle',
        color,
        layerVisible,
        geoPoints: [],
        geoCenter: center,
        radiusMeters,
        bounds: {
          minLat: center.lat - latOffset,
          maxLat: center.lat + latOffset,
          minLng: center.lng - lngOffset,
          maxLng: center.lng + lngOffset,
        },
      };
    }

    case 'arc': {
      if (!entity.center || entity.radius === undefined) return null;
      const center = cadToGeo(entity.center, geoTransform);
      const radiusMeters = entity.radius * geoTransform.scale;
      const latOffset = radiusMeters / 111320;
      const lngOffset = radiusMeters / (111320 * Math.cos(center.lat * Math.PI / 180));
      return {
        id,
        type: 'arc',
        color,
        layerVisible,
        geoPoints: [],
        geoCenter: center,
        radiusMeters,
        startAngle: entity.startAngle,
        endAngle: entity.endAngle,
        bounds: {
          minLat: center.lat - latOffset,
          maxLat: center.lat + latOffset,
          minLng: center.lng - lngOffset,
          maxLng: center.lng + lngOffset,
        },
      };
    }

    case 'text': {
      if (!entity.points?.[0]) return null;
      const geo = cadToGeo(entity.points[0], geoTransform);
      return {
        id,
        type: 'text',
        color,
        layerVisible,
        geoPoints: [geo],
        text: entity.text,
        bounds: { minLat: geo.lat, maxLat: geo.lat, minLng: geo.lng, maxLng: geo.lng },
      };
    }

    default:
      return null;
  }
}

/**
 * Process batch transformation request
 */
function processTransform(request: TransformRequest): TransformResponse {
  const startTime = performance.now();

  const transformedEntities: TransformedEntityData[] = [];

  for (const entity of request.entities) {
    const transformed = transformEntity(entity, request.geoTransform);
    if (transformed) {
      transformedEntities.push(transformed);
    }
  }

  const timing = performance.now() - startTime;

  return {
    type: 'transform-result',
    id: request.id,
    transformedEntities,
    timing,
  };
}

// Worker message handler
self.onmessage = (event: MessageEvent<TransformRequest>) => {
  const request = event.data;

  if (request.type === 'transform') {
    const response = processTransform(request);
    self.postMessage(response);
  }
};

export {};
