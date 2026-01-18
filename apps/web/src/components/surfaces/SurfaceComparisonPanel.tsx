'use client';

import { useState, useEffect } from 'react';

export interface SurfaceInfo {
  id: string;
  name: string;
  surface_type: 'existing' | 'proposed' | 'interim' | 'final' | 'reference';
  triangle_count: number;
  vertex_count: number;
  created_at: string;
}

export interface VolumeComparison {
  cut: number;
  fill: number;
  net: number;
  cutArea: number;
  fillArea: number;
  noChangeArea: number;
  totalArea: number;
  avgCutDepth: number;
  avgFillDepth: number;
  maxCutDepth: number;
  maxFillDepth: number;
}

interface SurfaceComparisonPanelProps {
  projectId: string;
}

export function SurfaceComparisonPanel({ projectId }: SurfaceComparisonPanelProps) {
  const [surfaces, setSurfaces] = useState<SurfaceInfo[]>([]);
  const [existingSurfaceId, setExistingSurfaceId] = useState<string>('');
  const [proposedSurfaceId, setProposedSurfaceId] = useState<string>('');
  const [gridResolution, setGridResolution] = useState(1.0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSurfaces, setIsLoadingSurfaces] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comparison, setComparison] = useState<VolumeComparison | null>(null);

  // Load surfaces on mount
  useEffect(() => {
    loadSurfaces();
  }, [projectId]);

  const loadSurfaces = async () => {
    setIsLoadingSurfaces(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/surfaces/compare`);
      const data = await response.json();

      if (data.success) {
        setSurfaces(data.surfaces);

        // Auto-select first existing and proposed surfaces
        const existing = data.surfaces.find((s: SurfaceInfo) => s.surface_type === 'existing');
        const proposed = data.surfaces.find((s: SurfaceInfo) => s.surface_type === 'proposed');

        if (existing) setExistingSurfaceId(existing.id);
        if (proposed) setProposedSurfaceId(proposed.id);
      } else {
        setError(data.error || 'Failed to load surfaces');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load surfaces');
    } finally {
      setIsLoadingSurfaces(false);
    }
  };

  const handleCompare = async () => {
    if (!existingSurfaceId || !proposedSurfaceId) {
      setError('Please select both existing and proposed surfaces');
      return;
    }

    setIsLoading(true);
    setError(null);
    setComparison(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/surfaces/compare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          existingSurfaceId,
          proposedSurfaceId,
          gridResolution,
          includeHeatMap: false, // Can be enabled for visualization
        }),
      });

      const data = await response.json();

      if (data.success) {
        setComparison(data.comparison.volumes);
      } else {
        setError(data.error || 'Failed to compare surfaces');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compare surfaces');
    } finally {
      setIsLoading(false);
    }
  };

  const formatVolume = (volume: number) => {
    if (Math.abs(volume) >= 1000) {
      return `${(volume / 1000).toFixed(2)} × 10³ m³`;
    }
    return `${volume.toFixed(2)} m³`;
  };

  const formatArea = (area: number) => {
    if (area >= 10000) {
      return `${(area / 10000).toFixed(2)} ha`;
    }
    return `${area.toFixed(0)} m²`;
  };

  const getSurfaceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      existing: 'Existente',
      proposed: 'Proyectada',
      interim: 'Transitoria',
      final: 'Final',
      reference: 'Referencia',
    };
    return labels[type] || type;
  };

  const getSurfaceTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      existing: 'bg-blue-600',
      proposed: 'bg-green-600',
      interim: 'bg-yellow-600',
      final: 'bg-purple-600',
      reference: 'bg-gray-600',
    };
    return colors[type] || 'bg-gray-600';
  };

  return (
    <div className="space-y-4 p-4 border border-gray-700 rounded-lg bg-gray-800">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Comparación de Superficies</h3>
        <button
          onClick={loadSurfaces}
          disabled={isLoadingSurfaces}
          className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white rounded transition-colors"
        >
          {isLoadingSurfaces ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-900/50 border border-red-700 rounded text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Surface Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Superficie Existente
          </label>
          <select
            value={existingSurfaceId}
            onChange={(e) => setExistingSurfaceId(e.target.value)}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">Seleccionar...</option>
            {surfaces
              .filter((s) => s.surface_type === 'existing' || s.surface_type === 'reference')
              .map((surface) => (
                <option key={surface.id} value={surface.id}>
                  {surface.name} ({getSurfaceTypeLabel(surface.surface_type)})
                </option>
              ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Superficie Proyectada
          </label>
          <select
            value={proposedSurfaceId}
            onChange={(e) => setProposedSurfaceId(e.target.value)}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">Seleccionar...</option>
            {surfaces
              .filter((s) => s.surface_type === 'proposed' || s.surface_type === 'final')
              .map((surface) => (
                <option key={surface.id} value={surface.id}>
                  {surface.name} ({getSurfaceTypeLabel(surface.surface_type)})
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Grid Resolution */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Resolución de Malla: {gridResolution.toFixed(1)}m
        </label>
        <input
          type="range"
          min="0.5"
          max="5"
          step="0.5"
          value={gridResolution}
          onChange={(e) => setGridResolution(parseFloat(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Alta precisión (0.5m)</span>
          <span>Rápido (5m)</span>
        </div>
      </div>

      {/* Compare Button */}
      <button
        onClick={handleCompare}
        disabled={isLoading || !existingSurfaceId || !proposedSurfaceId}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded font-medium transition-colors"
      >
        {isLoading ? 'Calculando...' : 'Calcular Volúmenes'}
      </button>

      {/* Results */}
      {comparison && (
        <div className="mt-6 space-y-4">
          <h4 className="text-md font-semibold text-white border-b border-gray-700 pb-2">
            Resultados de Cubicación
          </h4>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-red-900/30 border border-red-700 rounded">
              <div className="text-xs text-red-300 uppercase font-medium mb-1">Corte</div>
              <div className="text-2xl font-bold text-red-400">
                {formatVolume(comparison.cut)}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Área: {formatArea(comparison.cutArea)}
              </div>
            </div>

            <div className="p-4 bg-green-900/30 border border-green-700 rounded">
              <div className="text-xs text-green-300 uppercase font-medium mb-1">Relleno</div>
              <div className="text-2xl font-bold text-green-400">
                {formatVolume(comparison.fill)}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Área: {formatArea(comparison.fillArea)}
              </div>
            </div>

            <div className="p-4 bg-blue-900/30 border border-blue-700 rounded">
              <div className="text-xs text-blue-300 uppercase font-medium mb-1">Neto</div>
              <div className="text-2xl font-bold text-blue-400">
                {formatVolume(comparison.net)}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {comparison.net > 0 ? 'Requiere relleno' : 'Sobra material'}
              </div>
            </div>
          </div>

          {/* Detailed Stats */}
          <div className="p-4 bg-gray-900 rounded space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Profundidad prom. corte:</span>
              <span className="text-white font-mono">{comparison.avgCutDepth.toFixed(2)} m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Profundidad prom. relleno:</span>
              <span className="text-white font-mono">{comparison.avgFillDepth.toFixed(2)} m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Profundidad máx. corte:</span>
              <span className="text-white font-mono">{comparison.maxCutDepth.toFixed(2)} m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Profundidad máx. relleno:</span>
              <span className="text-white font-mono">{comparison.maxFillDepth.toFixed(2)} m</span>
            </div>
            <div className="flex justify-between border-t border-gray-700 pt-2 mt-2">
              <span className="text-gray-400">Área total:</span>
              <span className="text-white font-mono">{formatArea(comparison.totalArea)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Sin cambio:</span>
              <span className="text-white font-mono">
                {formatArea(comparison.noChangeArea)} (
                {((comparison.noChangeArea / comparison.totalArea) * 100).toFixed(1)}%)
              </span>
            </div>
          </div>

          {/* Balance Analysis */}
          <div className="p-4 bg-gray-900 rounded">
            <h5 className="text-sm font-semibold text-white mb-2">Análisis de Balance</h5>
            <div className="space-y-1 text-sm">
              {comparison.net > 0 ? (
                <>
                  <p className="text-yellow-400">
                    ⚠️ Se requiere {formatVolume(Math.abs(comparison.net))} de material de relleno
                  </p>
                  <p className="text-gray-400 text-xs">
                    Considerar fuentes de préstamo o material importado
                  </p>
                </>
              ) : comparison.net < 0 ? (
                <>
                  <p className="text-blue-400">
                    ℹ️ Sobra {formatVolume(Math.abs(comparison.net))} de material
                  </p>
                  <p className="text-gray-400 text-xs">
                    Considerar depósitos o reutilización en otros sectores
                  </p>
                </>
              ) : (
                <p className="text-green-400">✓ Balance equilibrado de corte y relleno</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Available Surfaces List */}
      {surfaces.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-300 mb-3">
            Superficies Disponibles ({surfaces.length})
          </h4>
          <div className="space-y-2">
            {surfaces.map((surface) => (
              <div
                key={surface.id}
                className="flex items-center justify-between p-3 bg-gray-900 rounded text-sm"
              >
                <div className="flex items-center space-x-3">
                  <span
                    className={`px-2 py-1 ${getSurfaceTypeColor(surface.surface_type)} text-white text-xs rounded`}
                  >
                    {getSurfaceTypeLabel(surface.surface_type)}
                  </span>
                  <span className="text-white font-medium">{surface.name}</span>
                </div>
                <div className="text-gray-400 text-xs">
                  {surface.triangle_count.toLocaleString()} triángulos
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
