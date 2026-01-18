/**
 * Georeferencing transformation utilities
 * Converts between CAD coordinates and geographic coordinates (lat/lon)
 */

import type { Point2D, LatLng, GeoControlPoint, GeoTransform } from '@/types/cad';

// Earth's radius in meters
const EARTH_RADIUS = 6371000;

/**
 * Convert degrees to radians
 */
export function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 */
export function radiansToDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Calculate the haversine distance between two geographic points
 * Returns distance in meters
 */
export function haversineDistance(p1: LatLng, p2: LatLng): number {
  const lat1 = degreesToRadians(p1.lat);
  const lat2 = degreesToRadians(p2.lat);
  const deltaLat = degreesToRadians(p2.lat - p1.lat);
  const deltaLng = degreesToRadians(p2.lng - p1.lng);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS * c;
}

/**
 * Calculate the bearing (angle) from point p1 to point p2
 * Returns bearing in radians (0 = north, clockwise positive)
 */
export function calculateBearing(p1: LatLng, p2: LatLng): number {
  const lat1 = degreesToRadians(p1.lat);
  const lat2 = degreesToRadians(p2.lat);
  const deltaLng = degreesToRadians(p2.lng - p1.lng);

  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);

  return Math.atan2(y, x);
}

/**
 * Calculate the Euclidean distance between two 2D points
 */
export function cadDistance(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate the angle from p1 to p2 in CAD coordinates
 * Returns angle in radians (0 = east/right, counter-clockwise positive)
 */
export function cadAngle(p1: Point2D, p2: Point2D): number {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x);
}

/**
 * Calculate the geo transformation from control points
 * Requires at least 2 control points
 */
export function calculateGeoTransform(controlPoints: GeoControlPoint[]): GeoTransform {
  if (controlPoints.length < 2) {
    return {
      controlPoints,
      scale: 1,
      rotation: 0,
      origin: controlPoints[0]?.geoPoint || { lat: 0, lng: 0 },
      cadOrigin: controlPoints[0]?.cadPoint || { x: 0, y: 0 },
      isValid: false,
    };
  }

  const cp1 = controlPoints[0];
  const cp2 = controlPoints[1];

  // Calculate scale: meters per CAD unit
  const cadDist = cadDistance(cp1.cadPoint, cp2.cadPoint);
  const geoDist = haversineDistance(cp1.geoPoint, cp2.geoPoint);

  if (cadDist === 0) {
    return {
      controlPoints,
      scale: 1,
      rotation: 0,
      origin: cp1.geoPoint,
      cadOrigin: cp1.cadPoint,
      isValid: false,
    };
  }

  const scale = geoDist / cadDist;

  // Calculate rotation
  // CAD angle is typically measured from east (positive X), counter-clockwise
  // Geographic bearing is measured from north, clockwise
  const cadAng = cadAngle(cp1.cadPoint, cp2.cadPoint);
  const geoBearing = calculateBearing(cp1.geoPoint, cp2.geoPoint);

  // Convert CAD angle to bearing-like system:
  // CAD: 0=east, counter-clockwise positive
  // Geo: 0=north, clockwise positive
  // To convert: bearing = 90° - cadAngle (in degrees), then handle wrap
  const cadAngleAsGeo = Math.PI / 2 - cadAng;
  const rotation = geoBearing - cadAngleAsGeo;

  return {
    controlPoints,
    scale,
    rotation,
    origin: cp1.geoPoint,
    cadOrigin: cp1.cadPoint,
    isValid: true,
  };
}

/**
 * Convert a CAD point to geographic coordinates using the transformation
 */
export function cadToGeo(cadPoint: Point2D, transform: GeoTransform): LatLng {
  if (!transform.isValid) {
    return transform.origin;
  }

  // Translate CAD point relative to CAD origin
  const dx = cadPoint.x - transform.cadOrigin.x;
  const dy = cadPoint.y - transform.cadOrigin.y;

  // Apply rotation (convert CAD coordinates to geographic bearing system)
  const cosR = Math.cos(transform.rotation);
  const sinR = Math.sin(transform.rotation);
  const rotatedX = dx * cosR - dy * sinR;
  const rotatedY = dx * sinR + dy * cosR;

  // Convert to meters
  const metersEast = rotatedX * transform.scale;
  const metersNorth = rotatedY * transform.scale;

  // Convert meters offset to lat/lon offset
  const originLatRad = degreesToRadians(transform.origin.lat);

  // Latitude change (1 degree latitude ~ 111,320 meters)
  const deltaLat = metersNorth / 111320;

  // Longitude change (depends on latitude)
  const metersPerDegreeLng = 111320 * Math.cos(originLatRad);
  const deltaLng = metersEast / metersPerDegreeLng;

  return {
    lat: transform.origin.lat + deltaLat,
    lng: transform.origin.lng + deltaLng,
  };
}

/**
 * Convert a geographic point to CAD coordinates using the transformation
 */
export function geoToCAD(geoPoint: LatLng, transform: GeoTransform): Point2D {
  if (!transform.isValid) {
    return transform.cadOrigin;
  }

  // Convert lat/lon offset to meters
  const deltaLat = geoPoint.lat - transform.origin.lat;
  const deltaLng = geoPoint.lng - transform.origin.lng;

  const originLatRad = degreesToRadians(transform.origin.lat);

  // Convert to meters
  const metersNorth = deltaLat * 111320;
  const metersEast = deltaLng * 111320 * Math.cos(originLatRad);

  // Convert meters to CAD units
  const unitsNorth = metersNorth / transform.scale;
  const unitsEast = metersEast / transform.scale;

  // Reverse rotation
  const cosR = Math.cos(-transform.rotation);
  const sinR = Math.sin(-transform.rotation);
  const dx = unitsEast * cosR - unitsNorth * sinR;
  const dy = unitsEast * sinR + unitsNorth * cosR;

  return {
    x: transform.cadOrigin.x + dx,
    y: transform.cadOrigin.y + dy,
  };
}

/**
 * Calculate bounds in geographic coordinates from CAD bounds
 */
export function cadBoundsToGeoBounds(
  cadBounds: { minX: number; minY: number; maxX: number; maxY: number },
  transform: GeoTransform
): { southWest: LatLng; northEast: LatLng } {
  // Convert all four corners and find the extent
  const corners = [
    { x: cadBounds.minX, y: cadBounds.minY },
    { x: cadBounds.maxX, y: cadBounds.minY },
    { x: cadBounds.maxX, y: cadBounds.maxY },
    { x: cadBounds.minX, y: cadBounds.maxY },
  ];

  const geoCorners = corners.map((c) => cadToGeo(c, transform));

  const lats = geoCorners.map((g) => g.lat);
  const lngs = geoCorners.map((g) => g.lng);

  return {
    southWest: {
      lat: Math.min(...lats),
      lng: Math.min(...lngs),
    },
    northEast: {
      lat: Math.max(...lats),
      lng: Math.max(...lngs),
    },
  };
}

/**
 * Generate a unique ID for control points
 */
export function generateControlPointId(): string {
  return `cp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
