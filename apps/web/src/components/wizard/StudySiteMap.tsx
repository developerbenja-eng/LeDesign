'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface StudyArea {
  type: 'polygon' | 'rectangle' | 'circle';
  coordinates: [number, number][];
  center: [number, number];
  areaHa: number;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

interface StudySiteMapProps {
  onAreaChange: (area: StudyArea | null) => void;
  searchQuery?: string;
  initialCenter?: [number, number];
}

// Calculate area of polygon in hectares using Shoelace formula
function calculatePolygonArea(latlngs: L.LatLng[]): number {
  if (latlngs.length < 3) return 0;

  // Convert to meters using approximate conversion
  const R = 6371000; // Earth's radius in meters
  const toRad = Math.PI / 180;

  let area = 0;
  for (let i = 0; i < latlngs.length; i++) {
    const j = (i + 1) % latlngs.length;
    const lat1 = latlngs[i].lat * toRad;
    const lat2 = latlngs[j].lat * toRad;
    const dLng = (latlngs[j].lng - latlngs[i].lng) * toRad;

    area += dLng * (2 + Math.sin(lat1) + Math.sin(lat2));
  }

  area = Math.abs(area * R * R / 2);
  return area / 10000; // Convert to hectares
}

export default function StudySiteMap({ onAreaChange, searchQuery, initialCenter }: StudySiteMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drawnLayerRef = useRef<L.Polygon | L.Rectangle | L.Circle | null>(null);
  const drawingRef = useRef<L.LatLng[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState<'polygon' | 'rectangle' | 'circle'>('polygon');
  const tempLayerRef = useRef<L.Polyline | null>(null);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: initialCenter || [-36.82, -73.05],
      zoom: 13,
      zoomControl: false,
    });

    // Add zoom control to top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Add satellite tile layer
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri',
      maxZoom: 19,
    }).addTo(map);

    // Add labels overlay
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [initialCenter]);

  // Handle drawing events
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      if (!isDrawing) return;

      if (drawMode === 'polygon') {
        drawingRef.current.push(e.latlng);
        updateTempPolygon();
      }
    };

    const handleDoubleClick = (e: L.LeafletMouseEvent) => {
      if (!isDrawing || drawMode !== 'polygon') return;
      e.originalEvent.preventDefault();
      finishDrawing();
    };

    const handleMouseMove = (e: L.LeafletMouseEvent) => {
      if (!isDrawing || drawMode !== 'polygon' || drawingRef.current.length === 0) return;
      updateTempPolygon(e.latlng);
    };

    map.on('click', handleClick);
    map.on('dblclick', handleDoubleClick);
    map.on('mousemove', handleMouseMove);

    return () => {
      map.off('click', handleClick);
      map.off('dblclick', handleDoubleClick);
      map.off('mousemove', handleMouseMove);
    };
  }, [isDrawing, drawMode]);

  const updateTempPolygon = (mousePos?: L.LatLng) => {
    const map = mapRef.current;
    if (!map) return;

    // Remove existing temp layer
    if (tempLayerRef.current) {
      map.removeLayer(tempLayerRef.current);
    }

    const points = [...drawingRef.current];
    if (mousePos) {
      points.push(mousePos);
    }

    if (points.length >= 2) {
      // Close the polygon for preview
      const previewPoints = [...points, points[0]];
      tempLayerRef.current = L.polyline(previewPoints, {
        color: '#3b82f6',
        weight: 2,
        dashArray: '5, 10',
        fillColor: '#3b82f6',
        fillOpacity: 0.2,
      }).addTo(map);
    }
  };

  const startDrawing = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing drawing
    if (drawnLayerRef.current) {
      map.removeLayer(drawnLayerRef.current);
      drawnLayerRef.current = null;
    }
    if (tempLayerRef.current) {
      map.removeLayer(tempLayerRef.current);
      tempLayerRef.current = null;
    }

    drawingRef.current = [];
    setIsDrawing(true);
    map.getContainer().style.cursor = 'crosshair';
    onAreaChange(null);
  }, [onAreaChange]);

  const finishDrawing = useCallback(() => {
    const map = mapRef.current;
    if (!map || drawingRef.current.length < 3) {
      setIsDrawing(false);
      if (map) map.getContainer().style.cursor = '';
      return;
    }

    // Remove temp layer
    if (tempLayerRef.current) {
      map.removeLayer(tempLayerRef.current);
      tempLayerRef.current = null;
    }

    const latlngs = drawingRef.current;

    // Create final polygon
    const polygon = L.polygon(latlngs, {
      color: '#3b82f6',
      weight: 3,
      fillColor: '#3b82f6',
      fillOpacity: 0.3,
    }).addTo(map);

    drawnLayerRef.current = polygon;
    setIsDrawing(false);
    map.getContainer().style.cursor = '';

    // Calculate area and bounds
    const bounds = polygon.getBounds();
    const areaHa = calculatePolygonArea(latlngs);
    const center = bounds.getCenter();

    const studyArea: StudyArea = {
      type: 'polygon',
      coordinates: latlngs.map(ll => [ll.lat, ll.lng]),
      center: [center.lat, center.lng],
      areaHa,
      bounds: {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      },
    };

    onAreaChange(studyArea);
    drawingRef.current = [];
  }, [onAreaChange]);

  const cancelDrawing = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tempLayerRef.current) {
      map.removeLayer(tempLayerRef.current);
      tempLayerRef.current = null;
    }

    drawingRef.current = [];
    setIsDrawing(false);
    map.getContainer().style.cursor = '';
  }, []);

  const clearArea = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    if (drawnLayerRef.current) {
      map.removeLayer(drawnLayerRef.current);
      drawnLayerRef.current = null;
    }

    onAreaChange(null);
  }, [onAreaChange]);

  // Handle search
  useEffect(() => {
    if (!searchQuery || !mapRef.current) return;

    // Simple geocoding using Nominatim
    const searchLocation = async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}, Chile&limit=1`
        );
        const data = await res.json();

        if (data.length > 0) {
          const { lat, lon } = data[0];
          mapRef.current?.setView([parseFloat(lat), parseFloat(lon)], 14);
        }
      } catch (err) {
        console.error('Geocoding failed:', err);
      }
    };

    const debounceTimer = setTimeout(searchLocation, 500);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  return (
    <div className="h-full flex flex-col">
      {/* Drawing Controls */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
        {!isDrawing ? (
          <>
            <button
              onClick={startDrawing}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg font-medium flex items-center gap-2"
            >
              <span>✏️</span> Dibujar Área
            </button>
            {drawnLayerRef.current && (
              <button
                onClick={clearArea}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow-lg font-medium flex items-center gap-2"
              >
                <span>🗑️</span> Borrar
              </button>
            )}
          </>
        ) : (
          <div className="bg-gray-900/90 rounded-lg p-3 shadow-lg">
            <p className="text-white text-sm mb-2">
              Haz clic para agregar puntos
            </p>
            <p className="text-gray-400 text-xs mb-3">
              Doble clic para terminar
            </p>
            <div className="flex gap-2">
              <button
                onClick={finishDrawing}
                disabled={drawingRef.current.length < 3}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-3 py-1.5 rounded text-sm"
              >
                ✓ Terminar
              </button>
              <button
                onClick={cancelDrawing}
                className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1.5 rounded text-sm"
              >
                ✕ Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Map Container */}
      <div ref={containerRef} className="flex-1" />

      {/* Instructions overlay when no area drawn */}
      {!drawnLayerRef.current && !isDrawing && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="bg-gray-900/80 backdrop-blur-sm rounded-xl p-6 text-center max-w-sm">
            <div className="text-4xl mb-3">📍</div>
            <h3 className="text-white font-medium mb-2">Define tu área de estudio</h3>
            <p className="text-gray-400 text-sm">
              Usa el botón "Dibujar Área" para delimitar la zona de tu proyecto
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
