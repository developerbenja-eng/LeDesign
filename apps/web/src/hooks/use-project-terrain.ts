import { useState, useEffect } from 'react';

export interface TerrainData {
  id: string;
  projectId: string;
  name: string;
  source: string;
  resolution: number;
  bounds: {
    south: number;
    north: number;
    west: number;
    east: number;
  };
  width?: number;
  height?: number;
  centerElevation?: number | null;
  stats?: {
    min: number;
    max: number;
    range: number;
  };
  tiles?: Array<{
    lat: number;
    lon: number;
    url: string;
  }>;
  createdAt?: string;
}

export interface TerrainFetchOptions {
  fetch?: boolean;
  buffer?: number;
  source?: 'copernicus' | 'opentopography';
}

export interface UseProjectTerrainResult {
  terrain: TerrainData | null;
  isLoading: boolean;
  error: string | null;
  refetch: (options?: TerrainFetchOptions) => Promise<void>;
  generateSurface: (options?: GenerateSurfaceOptions) => Promise<GenerateSurfaceResult>;
}

export interface GenerateSurfaceOptions {
  name?: string;
  points?: Array<{ x: number; y: number; z: number; code?: string }>;
  useDEM?: boolean;
  demSampleSpacing?: number;
  demInfluenceRadius?: number;
}

export interface GenerateSurfaceResult {
  success: boolean;
  surfaceId?: string;
  terrainId?: string;
  surface?: {
    id: string;
    name: string;
    vertexCount: number;
    triangleCount: number;
  };
  dem?: {
    tileCount: number;
    resolution: number;
    demPointCount: number;
    surveyPointCount: number;
    totalPoints: number;
  };
  error?: string;
}

/**
 * Hook for fetching and managing project terrain data (DEM)
 *
 * @param projectId - The project ID
 * @param autoFetch - Whether to automatically fetch terrain on mount (default: false)
 *
 * @example
 * ```tsx
 * const { terrain, isLoading, error, refetch, generateSurface } = useProjectTerrain(projectId);
 *
 * // Fetch terrain manually
 * const handleFetchTerrain = async () => {
 *   await refetch({ fetch: true, buffer: 0.02 });
 * };
 *
 * // Generate TIN surface from DEM
 * const handleGenerateSurface = async () => {
 *   const result = await generateSurface({
 *     name: 'My Terrain',
 *     useDEM: true,
 *     demSampleSpacing: 50,
 *   });
 *   if (result.success) {
 *     console.log('Surface generated:', result.surfaceId);
 *   }
 * };
 * ```
 */
export function useProjectTerrain(
  projectId: string | null,
  autoFetch: boolean = false
): UseProjectTerrainResult {
  const [terrain, setTerrain] = useState<TerrainData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = async (options: TerrainFetchOptions = {}) => {
    if (!projectId) {
      setError('No project ID provided');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (options.fetch) params.set('fetch', 'true');
      if (options.buffer) params.set('buffer', options.buffer.toString());
      if (options.source) params.set('source', options.source);

      const response = await fetch(`/api/projects/${projectId}/terrain?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch terrain');
      }

      const data = await response.json();

      if (data.success) {
        setTerrain(data.terrain);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch terrain';
      setError(errorMessage);
      console.error('Error fetching terrain:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const generateSurface = async (
    options: GenerateSurfaceOptions = {}
  ): Promise<GenerateSurfaceResult> => {
    if (!projectId) {
      return {
        success: false,
        error: 'No project ID provided',
      };
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/surfaces/generate-with-dem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: options.name,
          points: options.points,
          useDEM: options.useDEM ?? true,
          demSampleSpacing: options.demSampleSpacing ?? 100,
          demInfluenceRadius: options.demInfluenceRadius ?? 50,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || 'Failed to generate surface',
        };
      }

      const data = await response.json();

      if (data.success) {
        // Refresh terrain data
        await refetch();

        return {
          success: true,
          surfaceId: data.surfaceId,
          terrainId: data.terrainId,
          surface: data.surface,
          dem: data.dem,
        };
      } else {
        return {
          success: false,
          error: data.error || 'Unknown error',
        };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate surface';
      console.error('Error generating surface:', err);
      return {
        success: false,
        error: errorMessage,
      };
    }
  };

  useEffect(() => {
    if (autoFetch && projectId) {
      refetch();
    }
  }, [projectId, autoFetch]);

  return {
    terrain,
    isLoading,
    error,
    refetch,
    generateSurface,
  };
}
