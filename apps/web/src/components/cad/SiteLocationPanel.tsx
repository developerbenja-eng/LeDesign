'use client';

// ============================================================
// SITE LOCATION SETUP PANEL
// Configure project geographic location and georeferencing
// ============================================================

import { useState, useEffect } from 'react';
import { MapPin, Navigation, Crosshair, Save, AlertCircle, Check, Map, Eye } from 'lucide-react';
import { useCADStore } from '@/stores/cad-store';
import type { MapStyle } from '@/types/cad';
import dynamic from 'next/dynamic';

// Dynamically import map to avoid SSR issues
const LocationMapSelector = dynamic(
  () => import('./LocationMapSelector').then((mod) => mod.LocationMapSelector),
  { ssr: false, loading: () => <div className="h-96 bg-slate-900/50 rounded-lg border border-slate-700 flex items-center justify-center text-slate-400">Loading map...</div> }
);

interface SiteLocationPanelProps {
  projectId: string;
  projectName?: string;
}

interface SiteLocation {
  center_lat: number | null;
  center_lon: number | null;
  bounds_south: number | null;
  bounds_north: number | null;
  bounds_west: number | null;
  bounds_east: number | null;
  region: string | null;
  comuna: string | null;
  crs: string;
}

export function SiteLocationPanel({ projectId, projectName }: SiteLocationPanelProps) {
  const [location, setLocation] = useState<SiteLocation>({
    center_lat: null,
    center_lon: null,
    bounds_south: null,
    bounds_north: null,
    bounds_west: null,
    bounds_east: null,
    region: null,
    comuna: null,
    crs: 'EPSG:32719', // UTM Zone 19S (Chile default)
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const geoTransform = useCADStore((state) => state.geoTransform);
  const setGeoTransform = useCADStore((state) => state.setGeoTransform);
  const viewMode = useCADStore((state) => state.viewMode);
  const setViewMode = useCADStore((state) => state.setViewMode);
  const mapStyle = useCADStore((state) => state.mapStyle);
  const setMapStyle = useCADStore((state) => state.setMapStyle);
  const mapOpacity = useCADStore((state) => state.mapOpacity);
  const setMapOpacity = useCADStore((state) => state.setMapOpacity);

  // Load existing project location
  useEffect(() => {
    const loadProjectLocation = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/projects/${projectId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.project) {
            setLocation({
              center_lat: data.project.center_lat,
              center_lon: data.project.center_lon,
              bounds_south: data.project.bounds_south,
              bounds_north: data.project.bounds_north,
              bounds_west: data.project.bounds_west,
              bounds_east: data.project.bounds_east,
              region: data.project.region,
              comuna: data.project.comuna,
              crs: 'EPSG:32719',
            });

            // If we have a center location, set up basic geo transform
            if (data.project.center_lat && data.project.center_lon) {
              setGeoTransform({
                controlPoints: [],
                scale: 1, // 1 meter per CAD unit
                rotation: 0,
                origin: {
                  lat: data.project.center_lat,
                  lng: data.project.center_lon,
                },
                cadOrigin: { x: 0, y: 0 },
                isValid: true,
              });
            }
          }
        }
      } catch (error) {
        console.error('Error loading project location:', error);
        setMessage({ type: 'error', text: 'Failed to load project location' });
      } finally {
        setIsLoading(false);
      }
    };

    loadProjectLocation();
  }, [projectId, setGeoTransform]);

  // Save location to project
  const handleSaveLocation = async () => {
    if (!location.center_lat || !location.center_lon) {
      setMessage({ type: 'error', text: 'Center coordinates are required' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          center_lat: location.center_lat,
          center_lon: location.center_lon,
          bounds_south: location.bounds_south,
          bounds_north: location.bounds_north,
          bounds_west: location.bounds_west,
          bounds_east: location.bounds_east,
          region: location.region,
          comuna: location.comuna,
        }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Site location saved successfully' });

        // Update geo transform
        setGeoTransform({
          controlPoints: geoTransform?.controlPoints || [],
          scale: geoTransform?.scale || 1,
          rotation: geoTransform?.rotation || 0,
          origin: {
            lat: location.center_lat,
            lng: location.center_lon,
          },
          cadOrigin: geoTransform?.cadOrigin || { x: 0, y: 0 },
          isValid: true,
        });
      } else {
        setMessage({ type: 'error', text: 'Failed to save location' });
      }
    } catch (error) {
      console.error('Error saving location:', error);
      setMessage({ type: 'error', text: 'Failed to save location' });
    } finally {
      setIsSaving(false);
    }
  };

  // Use current browser location
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage({ type: 'error', text: 'Geolocation not supported by browser' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        // Set center and create default bounds (±0.01 degrees ~1km)
        setLocation({
          ...location,
          center_lat: lat,
          center_lon: lon,
          bounds_south: lat - 0.01,
          bounds_north: lat + 0.01,
          bounds_west: lon - 0.01,
          bounds_east: lon + 0.01,
        });

        setMessage({ type: 'success', text: 'Current location set' });
      },
      (error) => {
        console.error('Geolocation error:', error);
        setMessage({ type: 'error', text: 'Failed to get current location' });
      }
    );
  };

  // Update bounds from center and radius
  const handleSetBoundsFromRadius = () => {
    if (!location.center_lat || !location.center_lon) {
      setMessage({ type: 'error', text: 'Set center coordinates first' });
      return;
    }

    // Default 2km radius (±0.02 degrees)
    const radiusDeg = 0.02;
    setLocation({
      ...location,
      bounds_south: location.center_lat - radiusDeg,
      bounds_north: location.center_lat + radiusDeg,
      bounds_west: location.center_lon - radiusDeg,
      bounds_east: location.center_lon + radiusDeg,
    });
  };

  return (
    <div className="h-full flex flex-col bg-slate-800/30">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <MapPin size={18} className="text-blue-400" />
          <h3 className="font-semibold text-white">Site Location</h3>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Configure project geographic location
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {isLoading ? (
          <div className="text-center text-slate-400 py-8">Loading...</div>
        ) : (
          <>
            {/* Status Message */}
            {message && (
              <div
                className={`px-3 py-2 rounded text-sm flex items-center gap-2 ${
                  message.type === 'success'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}
              >
                {message.type === 'success' ? (
                  <Check size={16} />
                ) : (
                  <AlertCircle size={16} />
                )}
                {message.text}
              </div>
            )}

            {/* Georeferencing Status */}
            <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Georeferencing Status</span>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    geoTransform?.isValid
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}
                >
                  {geoTransform?.isValid ? 'Configured' : 'Not Set'}
                </span>
              </div>
              {geoTransform?.isValid && (
                <div className="mt-2 text-xs text-slate-400">
                  <div>Origin: {geoTransform.origin.lat.toFixed(6)}, {geoTransform.origin.lng.toFixed(6)}</div>
                  <div>Scale: {geoTransform.scale}m per unit</div>
                </div>
              )}
            </div>

            {/* Interactive Map */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Select Location</label>
              <LocationMapSelector
                center={
                  location.center_lat && location.center_lon
                    ? { lat: location.center_lat, lon: location.center_lon }
                    : null
                }
                bounds={
                  location.bounds_south &&
                  location.bounds_north &&
                  location.bounds_west &&
                  location.bounds_east
                    ? {
                        south: location.bounds_south,
                        north: location.bounds_north,
                        west: location.bounds_west,
                        east: location.bounds_east,
                      }
                    : null
                }
                onLocationChange={(loc) => {
                  setLocation({
                    ...location,
                    center_lat: loc.lat,
                    center_lon: loc.lon,
                  });
                }}
                onBoundsChange={(bounds) => {
                  setLocation({
                    ...location,
                    bounds_south: bounds.south,
                    bounds_north: bounds.north,
                    bounds_west: bounds.west,
                    bounds_east: bounds.east,
                  });
                }}
              />
            </div>

            {/* Canvas Integration */}
            <div className="space-y-3 bg-slate-900/50 rounded-lg p-3 border border-slate-700">
              <div className="flex items-center gap-2">
                <Map size={16} className="text-blue-400" />
                <label className="text-sm font-medium text-slate-300">Canvas Integration</label>
              </div>

              {/* View Mode Toggle */}
              <div className="space-y-2">
                <label className="text-xs text-slate-400">View Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setViewMode('design')}
                    disabled={!location.center_lat || !location.center_lon}
                    className={`px-3 py-2 text-xs font-medium rounded transition-colors ${
                      viewMode === 'design'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800/50 text-slate-300 hover:bg-slate-800'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    Design
                  </button>
                  <button
                    onClick={() => setViewMode('reference')}
                    disabled={!location.center_lat || !location.center_lon}
                    className={`px-3 py-2 text-xs font-medium rounded transition-colors ${
                      viewMode === 'reference'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800/50 text-slate-300 hover:bg-slate-800'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    Reference
                  </button>
                  <button
                    onClick={() => setViewMode('analysis')}
                    disabled={!location.center_lat || !location.center_lon}
                    className={`px-3 py-2 text-xs font-medium rounded transition-colors ${
                      viewMode === 'analysis'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800/50 text-slate-300 hover:bg-slate-800'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    Analysis
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  {viewMode === 'design' && 'Pure CAD view without map background'}
                  {viewMode === 'reference' && 'CAD overlay on satellite/street map'}
                  {viewMode === 'analysis' && 'Analysis mode with terrain data'}
                </p>
              </div>

              {/* Map Style Selection (only shown in reference mode) */}
              {viewMode === 'reference' && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400">Map Style</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setMapStyle('satellite')}
                        className={`px-3 py-2 text-xs font-medium rounded transition-colors ${
                          mapStyle === 'satellite'
                            ? 'bg-green-600 text-white'
                            : 'bg-slate-800/50 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        Satellite
                      </button>
                      <button
                        onClick={() => setMapStyle('streets')}
                        className={`px-3 py-2 text-xs font-medium rounded transition-colors ${
                          mapStyle === 'streets'
                            ? 'bg-green-600 text-white'
                            : 'bg-slate-800/50 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        Streets
                      </button>
                      <button
                        onClick={() => setMapStyle('terrain')}
                        className={`px-3 py-2 text-xs font-medium rounded transition-colors ${
                          mapStyle === 'terrain'
                            ? 'bg-green-600 text-white'
                            : 'bg-slate-800/50 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        Terrain
                      </button>
                      <button
                        onClick={() => setMapStyle('dark')}
                        className={`px-3 py-2 text-xs font-medium rounded transition-colors ${
                          mapStyle === 'dark'
                            ? 'bg-green-600 text-white'
                            : 'bg-slate-800/50 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        Dark
                      </button>
                    </div>
                  </div>

                  {/* Map Opacity Control */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-slate-400">Map Opacity</label>
                      <span className="text-xs text-slate-400">{Math.round(mapOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={mapOpacity}
                      onChange={(e) => setMapOpacity(parseFloat(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Eye size={12} />
                      <span>Adjust transparency of map background</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Quick Setup</label>
              <button
                onClick={handleUseCurrentLocation}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded hover:bg-blue-600/30 transition-colors"
              >
                <Navigation size={16} />
                Use Current Location
              </button>
              <button
                onClick={handleSetBoundsFromRadius}
                disabled={!location.center_lat || !location.center_lon}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-700/50 text-slate-300 border border-slate-600 rounded hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Crosshair size={16} />
                Set 2km Radius Bounds
              </button>
            </div>

            {/* Center Coordinates */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-300">Site Center (WGS84)</label>

              <div>
                <label className="text-xs text-slate-400">Latitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={location.center_lat || ''}
                  onChange={(e) =>
                    setLocation({ ...location, center_lat: parseFloat(e.target.value) || null })
                  }
                  placeholder="-33.4489"
                  className="w-full mt-1 px-3 py-2 bg-slate-900/50 border border-slate-700 rounded text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Longitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={location.center_lon || ''}
                  onChange={(e) =>
                    setLocation({ ...location, center_lon: parseFloat(e.target.value) || null })
                  }
                  placeholder="-70.6693"
                  className="w-full mt-1 px-3 py-2 bg-slate-900/50 border border-slate-700 rounded text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Bounding Box */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-300">Project Bounds (WGS84)</label>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">South</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={location.bounds_south || ''}
                    onChange={(e) =>
                      setLocation({ ...location, bounds_south: parseFloat(e.target.value) || null })
                    }
                    className="w-full mt-1 px-3 py-2 bg-slate-900/50 border border-slate-700 rounded text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400">North</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={location.bounds_north || ''}
                    onChange={(e) =>
                      setLocation({ ...location, bounds_north: parseFloat(e.target.value) || null })
                    }
                    className="w-full mt-1 px-3 py-2 bg-slate-900/50 border border-slate-700 rounded text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400">West</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={location.bounds_west || ''}
                    onChange={(e) =>
                      setLocation({ ...location, bounds_west: parseFloat(e.target.value) || null })
                    }
                    className="w-full mt-1 px-3 py-2 bg-slate-900/50 border border-slate-700 rounded text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400">East</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={location.bounds_east || ''}
                    onChange={(e) =>
                      setLocation({ ...location, bounds_east: parseFloat(e.target.value) || null })
                    }
                    className="w-full mt-1 px-3 py-2 bg-slate-900/50 border border-slate-700 rounded text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Administrative Location */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-300">Administrative Location</label>

              <div>
                <label className="text-xs text-slate-400">Region</label>
                <input
                  type="text"
                  value={location.region || ''}
                  onChange={(e) => setLocation({ ...location, region: e.target.value || null })}
                  placeholder="Región Metropolitana"
                  className="w-full mt-1 px-3 py-2 bg-slate-900/50 border border-slate-700 rounded text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Comuna</label>
                <input
                  type="text"
                  value={location.comuna || ''}
                  onChange={(e) => setLocation({ ...location, comuna: e.target.value || null })}
                  placeholder="Santiago"
                  className="w-full mt-1 px-3 py-2 bg-slate-900/50 border border-slate-700 rounded text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Coordinate System */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-300">Coordinate System</label>

              <div>
                <label className="text-xs text-slate-400">CRS (EPSG Code)</label>
                <select
                  value={location.crs}
                  onChange={(e) => setLocation({ ...location, crs: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-900/50 border border-slate-700 rounded text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="EPSG:32719">EPSG:32719 - WGS 84 / UTM Zone 19S (Chile)</option>
                  <option value="EPSG:32718">EPSG:32718 - WGS 84 / UTM Zone 18S</option>
                  <option value="EPSG:5361">EPSG:5361 - SIRGAS-Chile / UTM Zone 19S</option>
                  <option value="EPSG:4326">EPSG:4326 - WGS 84 (Geographic)</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Used for survey data and coordinate transformations
                </p>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveLocation}
              disabled={isSaving || !location.center_lat || !location.center_lon}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={18} />
              {isSaving ? 'Saving...' : 'Save Location'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
