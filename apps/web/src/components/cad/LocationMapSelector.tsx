'use client';

// ============================================================
// LOCATION MAP SELECTOR
// Interactive map for selecting project location
// ============================================================

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, Rectangle, Polygon, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, Navigation, Loader2, Layers, Ruler, Pencil, Square, X } from 'lucide-react';

// Fix for default marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

type MapStyle = 'street' | 'satellite' | 'terrain';
type DrawMode = 'none' | 'polygon' | 'measure';

interface LocationMapSelectorProps {
  center: { lat: number; lon: number } | null;
  bounds?: {
    south: number;
    north: number;
    west: number;
    east: number;
  } | null;
  onLocationChange: (location: { lat: number; lon: number }) => void;
  onBoundsChange?: (bounds: { south: number; north: number; west: number; east: number }) => void;
}

// Component to handle map events
function MapEventHandler({
  onLocationChange,
  drawMode,
  onPolygonPoint,
  onMeasurePoint
}: {
  onLocationChange: (location: { lat: number; lon: number }) => void;
  drawMode: DrawMode;
  onPolygonPoint: (point: L.LatLng) => void;
  onMeasurePoint: (point: L.LatLng) => void;
}) {
  useMapEvents({
    click: (e) => {
      if (drawMode === 'polygon') {
        onPolygonPoint(e.latlng);
      } else if (drawMode === 'measure') {
        onMeasurePoint(e.latlng);
      } else {
        onLocationChange({
          lat: e.latlng.lat,
          lon: e.latlng.lng,
        });
      }
    },
  });
  return null;
}

// Component to update map view when center changes
function MapViewController({ center }: { center: { lat: number; lon: number } | null }) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.setView([center.lat, center.lon], map.getZoom());
    }
  }, [center, map]);

  return null;
}

export function LocationMapSelector({ center, bounds, onLocationChange, onBoundsChange }: LocationMapSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapStyle>('street');
  const [showStyleMenu, setShowStyleMenu] = useState(false);
  const [drawMode, setDrawMode] = useState<DrawMode>('none');
  const [polygonPoints, setPolygonPoints] = useState<L.LatLng[]>([]);
  const [measurePoints, setMeasurePoints] = useState<L.LatLng[]>([]);
  const [measureDistance, setMeasureDistance] = useState<number>(0);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Default center (Santiago, Chile)
  const defaultCenter = center || { lat: -33.4489, lon: -70.6693 };

  // Map tile URLs
  const tileUrls = {
    street: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    terrain: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
  };

  const tileAttributions = {
    street: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    satellite: '&copy; <a href="https://www.esri.com/">Esri</a>',
    terrain: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
  };

  // Search for address using Nominatim
  const searchAddress = async (query: string) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`
      );
      const data = await response.json();
      setSearchResults(data);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.length >= 3) {
      searchTimeoutRef.current = setTimeout(() => {
        searchAddress(searchQuery);
      }, 500);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Handle search result selection
  const handleSelectResult = (result: any) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    onLocationChange({ lat, lon });
    setSearchQuery(result.display_name);
    setShowResults(false);

    // Optionally set bounds from result
    if (onBoundsChange && result.boundingbox) {
      const [south, north, west, east] = result.boundingbox.map(parseFloat);
      onBoundsChange({ south, north, west, east });
    }
  };

  // Use current location
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported by browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        onLocationChange({ lat, lon });

        // Set default bounds (±0.01 degrees ~1km)
        if (onBoundsChange) {
          onBoundsChange({
            south: lat - 0.01,
            north: lat + 0.01,
            west: lon - 0.01,
            east: lon + 0.01,
          });
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Failed to get current location');
      }
    );
  };

  // Handle polygon drawing
  const handlePolygonPoint = (point: L.LatLng) => {
    setPolygonPoints([...polygonPoints, point]);
  };

  const finishPolygon = () => {
    if (polygonPoints.length >= 3 && onBoundsChange) {
      // Calculate bounds from polygon
      const lats = polygonPoints.map(p => p.lat);
      const lngs = polygonPoints.map(p => p.lng);
      onBoundsChange({
        south: Math.min(...lats),
        north: Math.max(...lats),
        west: Math.min(...lngs),
        east: Math.max(...lngs),
      });

      // Set center to polygon centroid
      const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
      const centerLon = lngs.reduce((a, b) => a + b, 0) / lngs.length;
      onLocationChange({ lat: centerLat, lon: centerLon });
    }
    setPolygonPoints([]);
    setDrawMode('none');
  };

  const cancelPolygon = () => {
    setPolygonPoints([]);
    setDrawMode('none');
  };

  // Handle measurement
  const handleMeasurePoint = (point: L.LatLng) => {
    const newPoints = [...measurePoints, point];
    setMeasurePoints(newPoints);

    if (newPoints.length > 1) {
      // Calculate total distance
      let totalDistance = 0;
      for (let i = 1; i < newPoints.length; i++) {
        totalDistance += newPoints[i - 1].distanceTo(newPoints[i]);
      }
      setMeasureDistance(totalDistance);
    }
  };

  const clearMeasurement = () => {
    setMeasurePoints([]);
    setMeasureDistance(0);
    setDrawMode('none');
  };

  // Format distance for display
  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${meters.toFixed(1)} m`;
    }
    return `${(meters / 1000).toFixed(2)} km`;
  };

  // Calculate polygon area
  const calculatePolygonArea = (points: L.LatLng[]): number => {
    if (points.length < 3) return 0;

    // Use spherical excess formula for accurate area on sphere
    let area = 0;
    const R = 6371000; // Earth radius in meters

    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      area += (p2.lng - p1.lng) * (Math.PI / 180) * (2 + Math.sin(p1.lat * Math.PI / 180) + Math.sin(p2.lat * Math.PI / 180));
    }

    area = Math.abs(area * R * R / 2);
    return area;
  };

  // Format area for display
  const formatArea = (sqMeters: number): string => {
    if (sqMeters < 10000) {
      return `${sqMeters.toFixed(1)} m²`;
    }
    return `${(sqMeters / 10000).toFixed(2)} ha`;
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10">
            {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            placeholder="Search address or place..."
            className="w-full pl-10 pr-3 py-2 bg-slate-900/50 border border-slate-700 rounded text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none text-sm"
          />
        </div>

        {/* Map Style Selector */}
        <div className="relative">
          <button
            onClick={() => setShowStyleMenu(!showStyleMenu)}
            title="Map Style"
            className={`px-3 py-2 border rounded transition-colors ${
              showStyleMenu
                ? 'bg-blue-600/30 text-blue-400 border-blue-500/30'
                : 'bg-slate-900/50 text-slate-400 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <Layers size={16} />
          </button>

          {showStyleMenu && (
            <div className="absolute top-full right-0 mt-1 bg-slate-800 border border-slate-700 rounded shadow-lg z-50 min-w-32">
              <button
                onClick={() => { setMapStyle('street'); setShowStyleMenu(false); }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-700 transition-colors ${
                  mapStyle === 'street' ? 'text-blue-400 bg-slate-700/50' : 'text-slate-300'
                }`}
              >
                Street
              </button>
              <button
                onClick={() => { setMapStyle('satellite'); setShowStyleMenu(false); }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-700 transition-colors ${
                  mapStyle === 'satellite' ? 'text-blue-400 bg-slate-700/50' : 'text-slate-300'
                }`}
              >
                Satellite
              </button>
              <button
                onClick={() => { setMapStyle('terrain'); setShowStyleMenu(false); }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-700 transition-colors ${
                  mapStyle === 'terrain' ? 'text-blue-400 bg-slate-700/50' : 'text-slate-300'
                }`}
              >
                Terrain
              </button>
            </div>
          )}
        </div>

        {/* Drawing Tools */}
        <button
          onClick={() => setDrawMode(drawMode === 'polygon' ? 'none' : 'polygon')}
          title="Draw Polygon Area"
          className={`px-3 py-2 border rounded transition-colors ${
            drawMode === 'polygon'
              ? 'bg-blue-600/30 text-blue-400 border-blue-500/30'
              : 'bg-slate-900/50 text-slate-400 border-slate-700 hover:bg-slate-800'
          }`}
        >
          <Pencil size={16} />
        </button>

        <button
          onClick={() => setDrawMode(drawMode === 'measure' ? 'none' : 'measure')}
          title="Measure Distance"
          className={`px-3 py-2 border rounded transition-colors ${
            drawMode === 'measure'
              ? 'bg-blue-600/30 text-blue-400 border-blue-500/30'
              : 'bg-slate-900/50 text-slate-400 border-slate-700 hover:bg-slate-800'
          }`}
        >
          <Ruler size={16} />
        </button>

        <button
          onClick={handleUseCurrentLocation}
          title="Use Current Location"
          className="px-3 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded hover:bg-blue-600/30 transition-colors"
        >
          <Navigation size={16} />
        </button>
      </div>

      {/* Drawing Mode Instructions */}
      {drawMode === 'polygon' && (
        <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/30 rounded px-3 py-2 text-sm">
          <span className="text-blue-300">
            Click on map to add points • {polygonPoints.length} points
          </span>
          <div className="flex gap-2">
            {polygonPoints.length >= 3 && (
              <button
                onClick={finishPolygon}
                className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
              >
                Finish
              </button>
            )}
            <button
              onClick={cancelPolygon}
              className="px-2 py-1 bg-slate-600 text-white rounded text-xs hover:bg-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {drawMode === 'measure' && (
        <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded px-3 py-2 text-sm">
          <span className="text-green-300">
            Click on map to measure • {measurePoints.length > 1 ? formatDistance(measureDistance) : 'Click to start'}
          </span>
          <button
            onClick={clearMeasurement}
            className="px-2 py-1 bg-slate-600 text-white rounded text-xs hover:bg-slate-700"
          >
            Clear
          </button>
        </div>
      )}

      {/* Search Results Dropdown */}
      <div className="relative">

        {/* Search Results Dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded shadow-lg z-50 max-h-60 overflow-y-auto">
            {searchResults.map((result, index) => (
              <button
                key={index}
                onClick={() => handleSelectResult(result)}
                className="w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-700 transition-colors border-b border-slate-700 last:border-b-0"
              >
                <div className="font-medium">{result.display_name}</div>
                {result.address && (
                  <div className="text-xs text-slate-400 mt-0.5">
                    {[result.address.city, result.address.state, result.address.country]
                      .filter(Boolean)
                      .join(', ')}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="h-96 rounded-lg overflow-hidden border border-slate-700">
        <MapContainer
          center={[defaultCenter.lat, defaultCenter.lon]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            attribution={tileAttributions[mapStyle]}
            url={tileUrls[mapStyle]}
          />

          {/* Map Event Handler */}
          <MapEventHandler
            onLocationChange={onLocationChange}
            drawMode={drawMode}
            onPolygonPoint={handlePolygonPoint}
            onMeasurePoint={handleMeasurePoint}
          />

          {/* View Controller */}
          <MapViewController center={center} />

          {/* Center Marker */}
          {center && drawMode === 'none' && (
            <Marker
              position={[center.lat, center.lon]}
              draggable={true}
              eventHandlers={{
                dragend: (e) => {
                  const marker = e.target;
                  const position = marker.getLatLng();
                  onLocationChange({
                    lat: position.lat,
                    lon: position.lng,
                  });
                },
              }}
            />
          )}

          {/* Bounds Rectangle */}
          {bounds && drawMode === 'none' && (
            <Rectangle
              bounds={[
                [bounds.south, bounds.west],
                [bounds.north, bounds.east],
              ]}
              pathOptions={{
                color: 'blue',
                weight: 2,
                fillOpacity: 0.1,
              }}
            />
          )}

          {/* Polygon Drawing */}
          {polygonPoints.length > 0 && (
            <>
              {polygonPoints.length >= 3 && (
                <Polygon
                  positions={polygonPoints.map(p => [p.lat, p.lng])}
                  pathOptions={{
                    color: '#3b82f6',
                    weight: 2,
                    fillOpacity: 0.2,
                  }}
                />
              )}
              {polygonPoints.length >= 2 && polygonPoints.length < 3 && (
                <Polyline
                  positions={polygonPoints.map(p => [p.lat, p.lng])}
                  pathOptions={{
                    color: '#3b82f6',
                    weight: 2,
                    dashArray: '5, 5',
                  }}
                />
              )}
              {polygonPoints.map((point, index) => (
                <Marker
                  key={index}
                  position={[point.lat, point.lng]}
                  icon={L.divIcon({
                    className: 'custom-marker',
                    html: `<div style="background: #3b82f6; width: 10px; height: 10px; border-radius: 50%; border: 2px solid white;"></div>`,
                  })}
                />
              ))}
            </>
          )}

          {/* Measurement Line */}
          {measurePoints.length > 0 && (
            <>
              {measurePoints.length >= 2 && (
                <Polyline
                  positions={measurePoints.map(p => [p.lat, p.lng])}
                  pathOptions={{
                    color: '#10b981',
                    weight: 3,
                  }}
                />
              )}
              {measurePoints.map((point, index) => (
                <Marker
                  key={index}
                  position={[point.lat, point.lng]}
                  icon={L.divIcon({
                    className: 'custom-marker',
                    html: `<div style="background: #10b981; width: 10px; height: 10px; border-radius: 50%; border: 2px solid white;"></div>`,
                  })}
                />
              ))}
            </>
          )}
        </MapContainer>
      </div>

      {/* Instructions */}
      <div className="text-xs text-slate-400 space-y-1">
        {drawMode === 'none' && (
          <>
            <div>• Click on the map to set the project center</div>
            <div>• Drag the marker to adjust position</div>
            <div>• Search for addresses or places above</div>
            <div>• Use the polygon tool to draw custom project areas</div>
            <div>• Use the ruler tool to measure distances</div>
            {bounds && <div>• Blue rectangle shows project bounds</div>}
          </>
        )}
        {drawMode === 'polygon' && polygonPoints.length > 0 && (
          <div>• Area: {formatArea(calculatePolygonArea(polygonPoints))}</div>
        )}
      </div>
    </div>
  );
}
