'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useCADStore } from '@/stores/cad-store';
import type { AnyCADEntity, StandardDetailPlacement } from '@/types/cad';

interface StandardDetailsPanelProps {
  onClose: () => void;
}

// Detail category definitions
const DETAIL_CATEGORIES = [
  { id: 'all', label: 'Todos', icon: '📋' },
  { id: 'stormwater', label: 'Aguas Lluvias', icon: '🌧️' },
  { id: 'pipes', label: 'Tuberías', icon: '🔧' },
  { id: 'curbs', label: 'Soleras/Veredas', icon: '🚶' },
  { id: 'pavement', label: 'Pavimentos', icon: '🛣️' },
  { id: 'traffic', label: 'Tránsito', icon: '🚗' },
  { id: 'reference', label: 'Referencia', icon: '📖' },
] as const;

// Standard detail item interface
interface StandardDetailItem {
  id: string;
  code: string;
  category: string;
  subcategory: string | null;
  name_es: string;
  source_file: string;
  thumbnail_svg: string | null;
  entities: AnyCADEntity[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

export default function StandardDetailsPanel({ onClose }: StandardDetailsPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [details, setDetails] = useState<StandardDetailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { setPlacementDetail, placementDetail, cancelPlacement } = useCADStore();

  // Load details from API
  const loadDetails = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const url = selectedCategory === 'all'
        ? '/api/normativa/details'
        : `/api/normativa/details?category=${selectedCategory}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to load details');
      }

      const data = await response.json();

      // Parse geometry JSON for each detail
      const parsedDetails: StandardDetailItem[] = data.map((d: Record<string, unknown>) => {
        // geometry_json contains {filename, classification, bounds, layers, entities}
        let entities: AnyCADEntity[] = [];
        let bounds = { minX: 0, minY: 0, maxX: 100, maxY: 100 };

        try {
          if (d.geometry_json) {
            const geomData = JSON.parse(d.geometry_json as string);
            // Extract entities array from the geometry data
            if (geomData.entities && Array.isArray(geomData.entities)) {
              entities = geomData.entities;
            }
            // Use bounds from geometry data if available
            if (geomData.bounds) {
              bounds = geomData.bounds;
            }
          }
        } catch {
          console.warn(`Failed to parse geometry for ${d.code}`);
        }

        // Fallback to bounds_json if available
        if (d.bounds_json) {
          try {
            bounds = JSON.parse(d.bounds_json as string);
          } catch {
            // Use default bounds
          }
        }

        return {
          id: d.id as string,
          code: d.code as string,
          category: d.category as string,
          subcategory: d.subcategory as string | null,
          name_es: d.name_es as string,
          source_file: d.source_file as string,
          thumbnail_svg: d.thumbnail_svg as string | null,
          entities,
          bounds,
        };
      });

      setDetails(parsedDetails);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading details');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  // Filter details by search term
  const filteredDetails = details.filter(detail =>
    detail.name_es.toLowerCase().includes(searchTerm.toLowerCase()) ||
    detail.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (detail.subcategory?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Group details by subcategory
  const groupedDetails = filteredDetails.reduce((acc, detail) => {
    const group = detail.subcategory || 'General';
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(detail);
    return acc;
  }, {} as Record<string, StandardDetailItem[]>);

  // Handle detail selection for placement
  const handleDetailSelect = (detail: StandardDetailItem) => {
    // Convert to StandardDetailPlacement format for the store
    const placement: StandardDetailPlacement = {
      id: detail.id,
      code: detail.code,
      name: detail.name_es,
      entities: detail.entities,
      bounds: detail.bounds,
    };
    setPlacementDetail(placement);
  };

  // Render SVG preview for a detail
  const renderPreview = (detail: StandardDetailItem) => {
    if (detail.thumbnail_svg) {
      return (
        <div
          className="w-full h-24 flex items-center justify-center bg-gray-800"
          dangerouslySetInnerHTML={{ __html: detail.thumbnail_svg }}
        />
      );
    }

    // Generate simple preview from bounds
    const { minX, minY, maxX, maxY } = detail.bounds;
    const width = maxX - minX || 100;
    const height = maxY - minY || 100;
    const padding = 10;

    return (
      <svg
        viewBox={`${minX - padding} ${minY - padding} ${width + padding * 2} ${height + padding * 2}`}
        className="w-full h-24 bg-gray-800"
        preserveAspectRatio="xMidYMid meet"
      >
        <rect
          x={minX}
          y={minY}
          width={width}
          height={height}
          fill="none"
          stroke="#4a5568"
          strokeWidth="1"
          strokeDasharray="4,4"
        />
        <text
          x={minX + width / 2}
          y={minY + height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#718096"
          fontSize="12"
        >
          {detail.entities.length} entidades
        </text>
      </svg>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white">Detalles Tipo MINVU</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Placement mode banner */}
      {placementDetail && (
        <div className="bg-blue-600 px-4 py-2 text-white text-sm">
          <div className="font-medium">Modo inserción: {placementDetail.name}</div>
          <div className="text-blue-200 text-xs">Haz clic en el canvas para insertar (ESC para cancelar)</div>
          <button
            onClick={cancelPlacement}
            className="mt-1 text-xs underline hover:no-underline"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Search */}
      <div className="px-4 py-2 border-b border-gray-700">
        <input
          type="text"
          placeholder="Buscar detalles..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm placeholder-gray-400 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1 px-4 py-2 border-b border-gray-700">
        {DETAIL_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              selectedCategory === cat.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <span className="mr-1">{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : error ? (
          <div className="text-red-400 text-center py-4">
            <div className="mb-2">{error}</div>
            <button
              onClick={loadDetails}
              className="text-sm text-blue-400 hover:underline"
            >
              Reintentar
            </button>
          </div>
        ) : filteredDetails.length === 0 ? (
          <div className="text-gray-400 text-center py-8">
            <div className="text-4xl mb-2">📂</div>
            <div>No se encontraron detalles</div>
            <div className="text-sm mt-1">
              {searchTerm ? 'Prueba con otro término de búsqueda' : 'Ejecuta el script de importación'}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedDetails).map(([subcategory, items]) => (
              <div key={subcategory}>
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                  {subcategory}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {items.map((detail) => (
                    <button
                      key={detail.id}
                      onClick={() => handleDetailSelect(detail)}
                      className={`group relative rounded-lg overflow-hidden border transition-all ${
                        placementDetail?.id === detail.id
                          ? 'border-blue-500 ring-2 ring-blue-500/50'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      {renderPreview(detail)}
                      <div className="p-2 bg-gray-800">
                        <div className="text-xs font-medium text-white truncate">
                          {detail.name_es}
                        </div>
                        <div className="text-xs text-gray-400 truncate">
                          {detail.code}
                        </div>
                      </div>
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-xs font-medium bg-blue-600 px-2 py-1 rounded">
                          Insertar
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-700 text-xs text-gray-400">
        <div>{filteredDetails.length} detalles disponibles</div>
        <div className="text-gray-500">Fuente: MINVU/SERVIU</div>
      </div>
    </div>
  );
}
