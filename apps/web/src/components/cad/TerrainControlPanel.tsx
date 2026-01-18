'use client';

import { useState } from 'react';
import { useProjectTerrain } from '@/hooks/use-project-terrain';

export interface TerrainControlPanelProps {
  projectId: string;
  onSurfaceGenerated?: (surfaceId: string) => void;
}

/**
 * Control panel for managing project terrain (DEM) data
 * Allows fetching DEM, viewing terrain info, and generating TIN surfaces
 */
export function TerrainControlPanel({
  projectId,
  onSurfaceGenerated,
}: TerrainControlPanelProps) {
  const { terrain, isLoading, error, refetch, generateSurface } = useProjectTerrain(
    projectId,
    false
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const [demSampleSpacing, setDemSampleSpacing] = useState(100);
  const [surfaceName, setSurfaceName] = useState('');

  const handleFetchTerrain = async () => {
    await refetch({ fetch: true, buffer: 0.01 });
  };

  const handleGenerateSurface = async () => {
    setIsGenerating(true);
    setGenerateError(null);

    try {
      const result = await generateSurface({
        name: surfaceName || 'DEM Terrain',
        useDEM: true,
        demSampleSpacing,
        demInfluenceRadius: 50,
      });

      if (result.success && result.surfaceId) {
        onSurfaceGenerated?.(result.surfaceId);
        setSurfaceName('');
      } else {
        setGenerateError(result.error || 'Failed to generate surface');
      }
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border border-gray-700 rounded-lg bg-gray-800">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Terrain (DEM)</h3>
        <button
          onClick={handleFetchTerrain}
          disabled={isLoading}
          className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded transition-colors"
        >
          {isLoading ? 'Loading...' : terrain ? 'Refresh' : 'Fetch DEM'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-900/50 border border-red-700 rounded text-red-200 text-sm">
          {error}
        </div>
      )}

      {terrain && (
        <div className="space-y-3">
          {/* Terrain Info */}
          <div className="p-3 bg-gray-900 rounded space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Source:</span>
              <span className="text-white font-mono">{terrain.source}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Resolution:</span>
              <span className="text-white font-mono">{terrain.resolution}m</span>
            </div>
            {terrain.stats && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-400">Elevation Range:</span>
                  <span className="text-white font-mono">
                    {terrain.stats.min.toFixed(1)}m - {terrain.stats.max.toFixed(1)}m
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Relief:</span>
                  <span className="text-white font-mono">{terrain.stats.range.toFixed(1)}m</span>
                </div>
              </>
            )}
            {terrain.centerElevation !== null && terrain.centerElevation !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-400">Center Elevation:</span>
                <span className="text-white font-mono">
                  {terrain.centerElevation.toFixed(1)}m
                </span>
              </div>
            )}
            {terrain.tiles && (
              <div className="flex justify-between">
                <span className="text-gray-400">Tiles:</span>
                <span className="text-white font-mono">{terrain.tiles.length}</span>
              </div>
            )}
          </div>

          {/* Surface Generation */}
          <div className="p-3 bg-gray-900 rounded space-y-3">
            <h4 className="text-sm font-semibold text-white">Generate TIN Surface</h4>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Surface Name</label>
              <input
                type="text"
                value={surfaceName}
                onChange={(e) => setSurfaceName(e.target.value)}
                placeholder="DEM Terrain"
                className="w-full px-2 py-1 text-sm bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Sample Spacing: {demSampleSpacing}m
              </label>
              <input
                type="range"
                min="10"
                max="200"
                step="10"
                value={demSampleSpacing}
                onChange={(e) => setDemSampleSpacing(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Dense (10m)</span>
                <span>Sparse (200m)</span>
              </div>
            </div>

            <button
              onClick={handleGenerateSurface}
              disabled={isGenerating}
              className="w-full px-3 py-2 text-sm bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded transition-colors font-medium"
            >
              {isGenerating ? 'Generating...' : 'Generate Surface from DEM'}
            </button>

            {generateError && (
              <div className="p-2 bg-red-900/50 border border-red-700 rounded text-red-200 text-xs">
                {generateError}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="text-xs text-gray-400 space-y-1">
            <p>• Lower spacing = more detail but slower generation</p>
            <p>• Recommended: 50-100m for urban areas, 100-200m for rural</p>
            <p>• Surface will be available in the 3D viewer</p>
          </div>
        </div>
      )}

      {!terrain && !isLoading && !error && (
        <div className="text-sm text-gray-400 text-center py-4">
          Click &quot;Fetch DEM&quot; to load terrain data for this project
        </div>
      )}
    </div>
  );
}
