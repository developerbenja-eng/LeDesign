'use client';

import { useState, useCallback } from 'react';

// Chile regions - defined locally to avoid importing server-only module
const CHILE_REGIONS = {
  santiago: { south: -33.65, north: -33.30, west: -70.85, east: -70.45 },
  valparaiso: { south: -33.10, north: -32.95, west: -71.70, east: -71.50 },
  concepcion: { south: -36.90, north: -36.75, west: -73.15, east: -72.95 },
  antofagasta: { south: -23.75, north: -23.55, west: -70.45, east: -70.30 },
  temuco: { south: -38.80, north: -38.65, west: -72.70, east: -72.50 },
} as const;

type ChileRegion = keyof typeof CHILE_REGIONS;

interface TerrainLoaderProps {
  onTerrainLoad: (buffer: ArrayBuffer, metadata: TerrainMetadata) => void;
  onError: (error: string) => void;
}

interface TerrainMetadata {
  source: 'file' | 'copernicus' | 'opentopography';
  region?: string;
  bounds?: {
    south: number;
    north: number;
    west: number;
    east: number;
  };
}

export function TerrainLoader({ onTerrainLoad, onError }: TerrainLoaderProps) {
  const [loading, setLoading] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<ChileRegion>('santiago');
  const [customBounds, setCustomBounds] = useState({
    south: -33.5,
    north: -33.4,
    west: -70.7,
    east: -70.6,
  });

  // Load from file upload
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      onTerrainLoad(buffer, { source: 'file' });
    } catch (err) {
      onError(`Failed to load file: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [onTerrainLoad, onError]);

  // Load from predefined Chile region
  const handleLoadRegion = useCallback(async () => {
    setLoading(true);
    try {
      const bounds = CHILE_REGIONS[selectedRegion];

      // Get the first tile for the region
      const lat = Math.floor(bounds.south);
      const lon = Math.floor(bounds.west);

      const response = await fetch(`/api/dem?lat=${lat}&lon=${lon}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch DEM: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      onTerrainLoad(buffer, {
        source: 'copernicus',
        region: selectedRegion,
        bounds,
      });
    } catch (err) {
      onError(`Failed to load region: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [selectedRegion, onTerrainLoad, onError]);

  // Load from custom bounds
  const handleLoadCustom = useCallback(async () => {
    setLoading(true);
    try {
      const lat = Math.floor(customBounds.south);
      const lon = Math.floor(customBounds.west);

      const response = await fetch(`/api/dem?lat=${lat}&lon=${lon}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch DEM: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      onTerrainLoad(buffer, {
        source: 'copernicus',
        bounds: customBounds,
      });
    } catch (err) {
      onError(`Failed to load custom area: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [customBounds, onTerrainLoad, onError]);

  // Load directly from AWS (no caching)
  const handleLoadDirect = useCallback(async () => {
    setLoading(true);
    try {
      const bounds = CHILE_REGIONS[selectedRegion];
      const lat = Math.floor(bounds.south);
      const lon = Math.floor(bounds.west);

      const ns = lat >= 0 ? 'N' : 'S';
      const ew = lon >= 0 ? 'E' : 'W';
      const latStr = Math.abs(lat).toString().padStart(2, '0');
      const lonStr = Math.abs(lon).toString().padStart(3, '0');

      const tileName = `Copernicus_DSM_COG_10_${ns}${latStr}_00_${ew}${lonStr}_00_DEM`;
      const url = `https://copernicus-dem-30m.s3.eu-central-1.amazonaws.com/${tileName}/${tileName}.tif`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch from AWS: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      onTerrainLoad(buffer, {
        source: 'copernicus',
        region: selectedRegion,
        bounds,
      });
    } catch (err) {
      onError(`Failed to load from AWS: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [selectedRegion, onTerrainLoad, onError]);

  return (
    <div className="bg-gray-800 p-4 rounded-lg space-y-4">
      <h3 className="text-white font-semibold text-lg">Load Terrain DEM</h3>

      {/* File Upload */}
      <div className="space-y-2">
        <label className="block text-gray-300 text-sm">Upload GeoTIFF file:</label>
        <input
          type="file"
          accept=".tif,.tiff,.geotiff"
          onChange={handleFileUpload}
          disabled={loading}
          className="block w-full text-sm text-gray-300
            file:mr-4 file:py-2 file:px-4
            file:rounded file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-600 file:text-white
            hover:file:bg-blue-700
            disabled:opacity-50"
        />
      </div>

      <div className="border-t border-gray-600 my-4" />

      {/* Predefined Regions */}
      <div className="space-y-2">
        <label className="block text-gray-300 text-sm">Or select Chile region:</label>
        <select
          value={selectedRegion}
          onChange={(e) => setSelectedRegion(e.target.value as ChileRegion)}
          disabled={loading}
          className="w-full bg-gray-700 text-white px-3 py-2 rounded"
        >
          {Object.keys(CHILE_REGIONS).map((region) => (
            <option key={region} value={region}>
              {region.charAt(0).toUpperCase() + region.slice(1)}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <button
            onClick={handleLoadRegion}
            disabled={loading}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded text-sm"
          >
            {loading ? 'Loading...' : 'Load via API (cached)'}
          </button>
          <button
            onClick={handleLoadDirect}
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded text-sm"
          >
            {loading ? 'Loading...' : 'Load Direct (AWS)'}
          </button>
        </div>
      </div>

      <div className="border-t border-gray-600 my-4" />

      {/* Custom Coordinates */}
      <div className="space-y-2">
        <label className="block text-gray-300 text-sm">Or enter custom coordinates:</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-400">South</label>
            <input
              type="number"
              step="0.01"
              value={customBounds.south}
              onChange={(e) => setCustomBounds(b => ({ ...b, south: parseFloat(e.target.value) }))}
              className="w-full bg-gray-700 text-white px-2 py-1 rounded text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">North</label>
            <input
              type="number"
              step="0.01"
              value={customBounds.north}
              onChange={(e) => setCustomBounds(b => ({ ...b, north: parseFloat(e.target.value) }))}
              className="w-full bg-gray-700 text-white px-2 py-1 rounded text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">West</label>
            <input
              type="number"
              step="0.01"
              value={customBounds.west}
              onChange={(e) => setCustomBounds(b => ({ ...b, west: parseFloat(e.target.value) }))}
              className="w-full bg-gray-700 text-white px-2 py-1 rounded text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">East</label>
            <input
              type="number"
              step="0.01"
              value={customBounds.east}
              onChange={(e) => setCustomBounds(b => ({ ...b, east: parseFloat(e.target.value) }))}
              className="w-full bg-gray-700 text-white px-2 py-1 rounded text-sm"
            />
          </div>
        </div>
        <button
          onClick={handleLoadCustom}
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded text-sm"
        >
          {loading ? 'Loading...' : 'Load Custom Area'}
        </button>
      </div>

      {/* Info */}
      <div className="text-xs text-gray-400 mt-4">
        <p>Data source: Copernicus DEM GLO-30 (30m resolution)</p>
        <p>Coverage: Global, including all of Chile</p>
      </div>
    </div>
  );
}
