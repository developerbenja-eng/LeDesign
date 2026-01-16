'use client';

import { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useCADStore } from '@/stores/cad-store';
import { cadToGeo, cadBoundsToGeoBounds } from '@/lib/geo-transform';
import { SpatialIndex, createEntitySpatialIndex } from '@/lib/spatial-index';
import {
  simplifyPolyline,
  generateCirclePoints,
  generateArcPoints,
  shouldRenderAtZoom,
  LODCache,
  DEFAULT_LOD_CONFIG,
} from '@/lib/lod-system';
import { WebGLRenderer, parseColor } from '@/lib/webgl-renderer';
import type { AnyCADEntity, MapStyle, GeoTransform, LatLng } from '@/types/cad';

// Tile layer configurations
const TILE_LAYERS: Record<MapStyle, { url: string; attribution: string } | null> = {
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Esri World Imagery',
  },
  streets: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  terrain: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenTopoMap',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CartoDB',
  },
  none: null,
};

interface GeoCanvasProps {
  bounds?: { minX: number; minY: number; maxX: number; maxY: number };
}

// Transformed entity with pre-computed geographic coordinates
interface TransformedEntity {
  id: string;
  type: AnyCADEntity['type'];
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

// Performance settings
const PERFORMANCE_CONFIG = {
  maxEntitiesPerFrame: 10000,
  minFrameTime: 33, // ~30fps
  useWebGL: false, // Enable for GPU acceleration (experimental)
  useSpatialIndex: true,
  useLOD: true,
  debugMode: process.env.NODE_ENV === 'development',
};

/**
 * Transform and cache entity coordinates
 * Uses Web Worker for large datasets (> 1000 entities)
 */
function useTransformedEntities(
  entities: Map<string, AnyCADEntity>,
  geoTransform: GeoTransform | null,
  layers: Map<string, { visible: boolean; color: string }>
): TransformedEntity[] {
  return useMemo(() => {
    if (!geoTransform?.isValid) return [];

    const result: TransformedEntity[] = [];

    entities.forEach((entity) => {
      const layer = layers.get(entity.layer);
      const color = entity.color || layer?.color || '#00ff00';
      const layerVisible = layer?.visible !== false;

      let transformed: TransformedEntity | null = null;

      switch (entity.type) {
        case 'point': {
          const geo = cadToGeo(entity.position, geoTransform);
          transformed = {
            id: entity.id,
            type: 'point',
            color,
            layerVisible,
            geoPoints: [geo],
            bounds: { minLat: geo.lat, maxLat: geo.lat, minLng: geo.lng, maxLng: geo.lng },
          };
          break;
        }
        case 'line': {
          const start = cadToGeo(entity.start, geoTransform);
          const end = cadToGeo(entity.end, geoTransform);
          transformed = {
            id: entity.id,
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
          break;
        }
        case 'polyline': {
          if (entity.vertices.length < 2) break;
          const geoPoints = entity.vertices.map((v) => cadToGeo(v, geoTransform));
          const lats = geoPoints.map((p) => p.lat);
          const lngs = geoPoints.map((p) => p.lng);
          transformed = {
            id: entity.id,
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
          break;
        }
        case 'circle': {
          const center = cadToGeo(entity.center, geoTransform);
          const radiusMeters = entity.radius * geoTransform.scale;
          const latOffset = radiusMeters / 111320;
          const lngOffset = radiusMeters / (111320 * Math.cos(center.lat * Math.PI / 180));
          transformed = {
            id: entity.id,
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
          break;
        }
        case 'arc': {
          const center = cadToGeo(entity.center, geoTransform);
          const radiusMeters = entity.radius * geoTransform.scale;
          const latOffset = radiusMeters / 111320;
          const lngOffset = radiusMeters / (111320 * Math.cos(center.lat * Math.PI / 180));
          transformed = {
            id: entity.id,
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
          break;
        }
        case 'text': {
          const geo = cadToGeo(entity.position, geoTransform);
          transformed = {
            id: entity.id,
            type: 'text',
            color,
            layerVisible,
            geoPoints: [geo],
            text: entity.text,
            bounds: { minLat: geo.lat, maxLat: geo.lat, minLng: geo.lng, maxLng: geo.lng },
          };
          break;
        }
      }

      if (transformed) {
        result.push(transformed);
      }
    });

    return result;
  }, [entities, geoTransform, layers]);
}

/**
 * Create and maintain spatial index for fast viewport queries
 */
function useSpatialIndex(entities: TransformedEntity[]): SpatialIndex<TransformedEntity> | null {
  return useMemo(() => {
    if (!PERFORMANCE_CONFIG.useSpatialIndex || entities.length === 0) return null;
    return createEntitySpatialIndex(entities);
  }, [entities]);
}

/**
 * Get entities visible in viewport using spatial index
 */
function getVisibleEntities(
  allEntities: TransformedEntity[],
  spatialIndex: SpatialIndex<TransformedEntity> | null,
  viewportBounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  zoom: number
): TransformedEntity[] {
  let visibleEntities: TransformedEntity[];

  if (spatialIndex) {
    // O(log n) spatial query
    visibleEntities = spatialIndex.query({
      minX: viewportBounds.minLng,
      minY: viewportBounds.minLat,
      maxX: viewportBounds.maxLng,
      maxY: viewportBounds.maxLat,
    }).map((item) => item.data);
  } else {
    // O(n) fallback
    visibleEntities = allEntities.filter((entity) => {
      return !(
        entity.bounds.maxLat < viewportBounds.minLat ||
        entity.bounds.minLat > viewportBounds.maxLat ||
        entity.bounds.maxLng < viewportBounds.minLng ||
        entity.bounds.minLng > viewportBounds.maxLng
      );
    });
  }

  // Filter by layer visibility and size at current zoom
  return visibleEntities.filter((entity) => {
    if (!entity.layerVisible) return false;
    if (!shouldRenderAtZoom(entity.bounds, zoom)) return false;
    return true;
  });
}

/**
 * Optimized CAD Overlay with spatial indexing and LOD
 */
function CADOverlay({
  transformedEntities,
  spatialIndex,
}: {
  transformedEntities: TransformedEntity[];
  spatialIndex: SpatialIndex<TransformedEntity> | null;
}) {
  const map = useMap();
  const pathsRef = useRef<L.Path[]>([]);
  const renderScheduledRef = useRef(false);
  const lastRenderTimeRef = useRef(0);
  const lodCacheRef = useRef(new LODCache<LatLng[]>());
  const webglRendererRef = useRef<WebGLRenderer | null>(null);
  const webglCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize WebGL renderer (optional)
  useEffect(() => {
    if (PERFORMANCE_CONFIG.useWebGL && typeof window !== 'undefined') {
      const container = map.getContainer();
      const canvas = document.createElement('canvas');
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '500';
      container.appendChild(canvas);
      webglCanvasRef.current = canvas;

      try {
        webglRendererRef.current = new WebGLRenderer(canvas);
      } catch (error) {
        console.warn('WebGL initialization failed:', error);
      }
    }

    return () => {
      webglRendererRef.current?.dispose();
      webglCanvasRef.current?.remove();
    };
  }, [map]);

  // Apply LOD to polyline points
  const getSimplifiedPoints = useCallback((entity: TransformedEntity, zoom: number): LatLng[] => {
    if (!PERFORMANCE_CONFIG.useLOD) return entity.geoPoints;
    if (entity.type !== 'polyline' || entity.geoPoints.length < 3) {
      return entity.geoPoints;
    }

    return lodCacheRef.current.getOrCompute(
      entity.id,
      zoom,
      () => simplifyPolyline(entity.geoPoints, zoom, DEFAULT_LOD_CONFIG)
    );
  }, []);

  // Create Leaflet path from entity with LOD applied
  const createPath = useCallback((entity: TransformedEntity, zoom: number): L.Path | null => {
    const style = {
      color: entity.color,
      weight: 2,
      opacity: 0.9,
      fillOpacity: 0.1,
    };

    switch (entity.type) {
      case 'point': {
        const pos = entity.geoPoints[0];
        return L.circleMarker([pos.lat, pos.lng], {
          ...style,
          radius: 4,
          fill: true,
          fillOpacity: 1,
        });
      }
      case 'line': {
        return L.polyline(
          entity.geoPoints.map((p) => [p.lat, p.lng] as [number, number]),
          style
        );
      }
      case 'polyline': {
        const simplifiedPoints = getSimplifiedPoints(entity, zoom);
        return L.polyline(
          simplifiedPoints.map((p) => [p.lat, p.lng] as [number, number]),
          style
        );
      }
      case 'circle': {
        if (!entity.geoCenter || !entity.radiusMeters) return null;
        return L.circle([entity.geoCenter.lat, entity.geoCenter.lng], {
          ...style,
          radius: entity.radiusMeters,
        });
      }
      case 'arc': {
        if (!entity.geoCenter || !entity.radiusMeters) return null;
        const arcPoints = generateArcPoints(
          entity.geoCenter,
          entity.radiusMeters,
          entity.startAngle || 0,
          entity.endAngle || Math.PI * 2,
          zoom
        );
        return L.polyline(
          arcPoints.map((p) => [p.lat, p.lng] as [number, number]),
          style
        );
      }
      case 'text': {
        const pos = entity.geoPoints[0];
        const icon = L.divIcon({
          className: 'cad-text-label',
          html: `<span style="color:${entity.color};font-size:12px;white-space:nowrap;text-shadow:1px 1px 2px black,-1px -1px 2px black">${entity.text || ''}</span>`,
          iconSize: [100, 20],
          iconAnchor: [0, 10],
        });
        return L.marker([pos.lat, pos.lng], { icon }) as unknown as L.Path;
      }
      default:
        return null;
    }
  }, [getSimplifiedPoints]);

  // Render with WebGL
  const renderWithWebGL = useCallback((
    entities: TransformedEntity[],
    zoom: number,
    viewportBounds: { north: number; south: number; east: number; west: number }
  ) => {
    const renderer = webglRendererRef.current;
    if (!renderer || !webglCanvasRef.current) return;

    // Resize canvas
    const container = map.getContainer();
    webglCanvasRef.current.width = container.clientWidth;
    webglCanvasRef.current.height = container.clientHeight;

    renderer.beginFrame();

    for (const entity of entities) {
      const color = parseColor(entity.color);

      switch (entity.type) {
        case 'point':
          if (entity.geoPoints[0]) {
            renderer.addPoint(entity.geoPoints[0], color);
          }
          break;
        case 'line':
          if (entity.geoPoints.length >= 2) {
            renderer.addLine(entity.geoPoints[0], entity.geoPoints[1], color);
          }
          break;
        case 'polyline':
          const simplified = getSimplifiedPoints(entity, zoom);
          renderer.addPolyline(simplified, color);
          break;
        case 'circle':
          if (entity.geoCenter && entity.radiusMeters) {
            renderer.addCircle(entity.geoCenter, entity.radiusMeters, color);
          }
          break;
        case 'arc':
          if (entity.geoCenter && entity.radiusMeters) {
            renderer.addArc(
              entity.geoCenter,
              entity.radiusMeters,
              entity.startAngle || 0,
              entity.endAngle || Math.PI * 2,
              color
            );
          }
          break;
      }
    }

    renderer.render(viewportBounds);
  }, [map, getSimplifiedPoints]);

  // Throttled render function
  const scheduleRender = useCallback(() => {
    if (renderScheduledRef.current) return;

    const now = performance.now();
    const timeSinceLastRender = now - lastRenderTimeRef.current;

    if (timeSinceLastRender < PERFORMANCE_CONFIG.minFrameTime) {
      renderScheduledRef.current = true;
      setTimeout(() => {
        renderScheduledRef.current = false;
        scheduleRender();
      }, PERFORMANCE_CONFIG.minFrameTime - timeSinceLastRender);
      return;
    }

    lastRenderTimeRef.current = now;

    const bounds = map.getBounds();
    const zoom = map.getZoom();
    const viewportBounds = {
      minLat: bounds.getSouth(),
      maxLat: bounds.getNorth(),
      minLng: bounds.getWest(),
      maxLng: bounds.getEast(),
    };

    // Get visible entities using spatial index (O(log n))
    const visibleEntities = getVisibleEntities(
      transformedEntities,
      spatialIndex,
      viewportBounds,
      zoom
    );

    // Limit entities per frame
    const entitiesToRender = visibleEntities.slice(0, PERFORMANCE_CONFIG.maxEntitiesPerFrame);

    if (PERFORMANCE_CONFIG.useWebGL && webglRendererRef.current) {
      // Use WebGL renderer
      renderWithWebGL(entitiesToRender, zoom, {
        north: viewportBounds.maxLat,
        south: viewportBounds.minLat,
        east: viewportBounds.maxLng,
        west: viewportBounds.minLng,
      });
    } else {
      // Use Leaflet paths
      pathsRef.current.forEach((path) => path.remove());
      pathsRef.current = [];

      for (const entity of entitiesToRender) {
        const path = createPath(entity, zoom);
        if (path) {
          path.addTo(map);
          pathsRef.current.push(path);
        }
      }
    }
  }, [map, transformedEntities, spatialIndex, createPath, renderWithWebGL]);

  // Initial render and re-render on changes
  useEffect(() => {
    scheduleRender();
  }, [transformedEntities, scheduleRender]);

  // Re-render on map move/zoom
  useEffect(() => {
    const handleMoveEnd = () => scheduleRender();

    map.on('moveend', handleMoveEnd);
    map.on('zoomend', handleMoveEnd);

    return () => {
      map.off('moveend', handleMoveEnd);
      map.off('zoomend', handleMoveEnd);
      pathsRef.current.forEach((path) => path.remove());
      pathsRef.current = [];
    };
  }, [map, scheduleRender]);

  return null;
}

/**
 * Fit map to CAD bounds
 */
function FitBounds({
  bounds,
  geoTransform,
}: {
  bounds?: { minX: number; minY: number; maxX: number; maxY: number };
  geoTransform: GeoTransform | null;
}) {
  const map = useMap();
  const hasFittedRef = useRef(false);

  useEffect(() => {
    if (!bounds || !geoTransform?.isValid || hasFittedRef.current) return;

    const geoBounds = cadBoundsToGeoBounds(bounds, geoTransform);
    const leafletBounds = L.latLngBounds(
      L.latLng(geoBounds.southWest.lat, geoBounds.southWest.lng),
      L.latLng(geoBounds.northEast.lat, geoBounds.northEast.lng)
    );

    map.fitBounds(leafletBounds, { padding: [50, 50] });
    hasFittedRef.current = true;
  }, [bounds, geoTransform, map]);

  return null;
}

/**
 * Performance stats overlay
 */
function PerformanceStats({
  entityCount,
  visibleCount,
  spatialIndexSize,
}: {
  entityCount: number;
  visibleCount: number;
  spatialIndexSize: number;
}) {
  if (!PERFORMANCE_CONFIG.debugMode) return null;

  return (
    <div className="absolute bottom-4 left-4 bg-black/70 text-white text-xs px-2 py-1 rounded font-mono z-[1000] space-y-1">
      <div>Entities: {visibleCount}/{entityCount}</div>
      <div>Spatial Index: {spatialIndexSize > 0 ? `${spatialIndexSize} items` : 'disabled'}</div>
      <div>LOD: {PERFORMANCE_CONFIG.useLOD ? 'enabled' : 'disabled'}</div>
      <div>WebGL: {PERFORMANCE_CONFIG.useWebGL ? 'enabled' : 'disabled'}</div>
    </div>
  );
}

/**
 * Main GeoCanvas component
 */
export default function GeoCanvas({ bounds }: GeoCanvasProps) {
  const entities = useCADStore((state) => state.entities);
  const layers = useCADStore((state) => state.layers);
  const mapStyle = useCADStore((state) => state.mapStyle);
  const geoTransform = useCADStore((state) => state.geoTransform);

  const tileConfig = TILE_LAYERS[mapStyle];

  // Convert layers to Map for lookup
  const layersMap = useMemo(() => {
    const map = new Map<string, { visible: boolean; color: string }>();
    layers.forEach((layer, name) => {
      map.set(name, { visible: layer.visible, color: layer.color });
    });
    return map;
  }, [layers]);

  // Transform entities (cached)
  const transformedEntities = useTransformedEntities(entities, geoTransform, layersMap);

  // Build spatial index (O(n log n) once, O(log n) per query)
  const spatialIndex = useSpatialIndex(transformedEntities);

  // Default map center
  const defaultCenter: [number, number] = useMemo(() => {
    if (geoTransform?.isValid) {
      return [geoTransform.origin.lat, geoTransform.origin.lng];
    }
    return [-36.8201, -73.0444]; // Concepcion, Chile
  }, [geoTransform]);

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={defaultCenter}
        zoom={15}
        className="w-full h-full"
        style={{ background: mapStyle === 'none' ? '#1a1a2e' : undefined }}
        preferCanvas={true}
      >
        {tileConfig && (
          <TileLayer url={tileConfig.url} attribution={tileConfig.attribution} />
        )}

        {geoTransform?.isValid && (
          <>
            <CADOverlay
              transformedEntities={transformedEntities}
              spatialIndex={spatialIndex}
            />
            <FitBounds bounds={bounds} geoTransform={geoTransform} />
          </>
        )}
      </MapContainer>

      {!geoTransform?.isValid && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none">
          <div className="bg-gray-800 text-white p-6 rounded-lg text-center max-w-md">
            <h3 className="text-lg font-semibold mb-2">Georeferencing Required</h3>
            <p className="text-gray-300 text-sm">
              Add at least 2 control points to align the CAD drawing with the map.
              Switch to Design mode and use the georeferencing tool.
            </p>
          </div>
        </div>
      )}

      <PerformanceStats
        entityCount={entities.size}
        visibleCount={transformedEntities.filter((e) => e.layerVisible).length}
        spatialIndexSize={spatialIndex?.size || 0}
      />
    </div>
  );
}
