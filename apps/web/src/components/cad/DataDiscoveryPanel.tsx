'use client';

import { useMemo } from 'react';

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

interface DataLayer {
  id: string;
  category: string;
  name: string;
  source: string;
  available: boolean;
  coverage: string;
  cost: string;
  description: string;
  selected: boolean;
}

interface DataDiscoveryPanelProps {
  studyArea: StudyArea | null;
  dataLayers: DataLayer[];
  isLoading: boolean;
  onToggleLayer: (layerId: string) => void;
  onSelectAll: (category: string) => void;
  projectType: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  'Terreno': '🛰️',
  'IDE Chile': '🏛️',
  'Hidrología': '🌧️',
  'Normativa': '📋',
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'Terreno': 'Datos topográficos e imágenes satelitales',
  'IDE Chile': 'Infraestructura de Datos Espaciales del gobierno',
  'Hidrología': 'Datos de precipitación y caudales',
  'Normativa': 'Regulaciones y estándares aplicables',
};

export default function DataDiscoveryPanel({
  studyArea,
  dataLayers,
  isLoading,
  onToggleLayer,
  onSelectAll,
  projectType,
}: DataDiscoveryPanelProps) {
  // Group layers by category
  const layersByCategory = useMemo(() => {
    const groups: Record<string, DataLayer[]> = {};
    for (const layer of dataLayers) {
      if (!groups[layer.category]) {
        groups[layer.category] = [];
      }
      groups[layer.category].push(layer);
    }
    return groups;
  }, [dataLayers]);

  const selectedCount = dataLayers.filter(l => l.selected).length;
  const totalCost = dataLayers
    .filter(l => l.selected && l.cost !== 'Gratis')
    .reduce((sum, l) => {
      // Parse cost if it's a number format
      const match = l.cost.match(/\$(\d+)/);
      return sum + (match ? parseInt(match[1]) : 0);
    }, 0);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Buscando datos disponibles...</p>
          <p className="text-gray-500 text-sm mt-2">
            Consultando IDE Chile, DGA, y otras fuentes
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 px-6 py-4 border-b border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-1">
          Paso 2: Datos Disponibles para tu Área
        </h2>
        {studyArea && (
          <p className="text-gray-400 text-sm">
            📍 {studyArea.areaHa.toFixed(2)} hectáreas en {studyArea.center[0].toFixed(4)}, {studyArea.center[1].toFixed(4)}
          </p>
        )}
      </div>

      {/* Data Layers */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {Object.entries(layersByCategory).map(([category, layers]) => (
            <div
              key={category}
              className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden"
            >
              {/* Category Header */}
              <div className="bg-gray-800 px-5 py-4 border-b border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{CATEGORY_ICONS[category] || '📁'}</span>
                  <div>
                    <h3 className="font-semibold text-white">{category}</h3>
                    <p className="text-xs text-gray-400">{CATEGORY_DESCRIPTIONS[category]}</p>
                  </div>
                </div>
                <button
                  onClick={() => onSelectAll(category)}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  + Seleccionar todos
                </button>
              </div>

              {/* Layers List */}
              <div className="divide-y divide-gray-700/50">
                {layers.map((layer) => (
                  <div
                    key={layer.id}
                    className={`px-5 py-4 flex items-center gap-4 transition-colors ${
                      layer.selected ? 'bg-blue-900/10' : 'hover:bg-gray-800/50'
                    }`}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => onToggleLayer(layer.id)}
                      disabled={!layer.available}
                      className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                        layer.selected
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : layer.available
                          ? 'border-gray-600 hover:border-gray-500'
                          : 'border-gray-700 bg-gray-800 cursor-not-allowed'
                      }`}
                    >
                      {layer.selected && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>

                    {/* Layer Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${layer.available ? 'text-white' : 'text-gray-500'}`}>
                          {layer.name}
                        </span>
                        {!layer.available && (
                          <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded">
                            No disponible
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 truncate">{layer.description}</p>
                    </div>

                    {/* Source */}
                    <div className="text-right hidden md:block">
                      <p className="text-sm text-gray-400">{layer.source}</p>
                    </div>

                    {/* Coverage */}
                    <div className="w-24 text-right hidden lg:block">
                      <span className={`text-sm ${
                        layer.coverage === '100%' ? 'text-green-400' :
                        layer.coverage === 'Variable' ? 'text-yellow-400' : 'text-gray-400'
                      }`}>
                        {layer.coverage}
                      </span>
                    </div>

                    {/* Cost */}
                    <div className="w-20 text-right">
                      <span className={`text-sm font-medium ${
                        layer.cost === 'Gratis' ? 'text-green-400' : 'text-blue-400'
                      }`}>
                        {layer.cost}
                      </span>
                    </div>

                    {/* Preview Button */}
                    <button
                      disabled={!layer.available}
                      className="text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Vista previa"
                    >
                      👁️
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Applicable Standards */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
            <div className="bg-gray-800 px-5 py-4 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📋</span>
                <div>
                  <h3 className="font-semibold text-white">Normativa Aplicable</h3>
                  <p className="text-xs text-gray-400">Estándares y regulaciones que aplican a tu proyecto</p>
                </div>
              </div>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-3">
                {projectType === 'water-sewer' || projectType === 'subdivision' ? (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-green-400">✓</span>
                      <span className="text-white">NCh 691 - Agua Potable</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-green-400">✓</span>
                      <span className="text-white">NCh 1105 - Alcantarillado</span>
                    </div>
                  </>
                ) : null}
                {projectType === 'stormwater' || projectType === 'subdivision' ? (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-green-400">✓</span>
                      <span className="text-white">Manual MINVU - Aguas Lluvias</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-green-400">✓</span>
                      <span className="text-white">OGUC - Urbanización</span>
                    </div>
                  </>
                ) : null}
                {projectType === 'channel' ? (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-green-400">✓</span>
                      <span className="text-white">Manual DOH - Canales</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-green-400">✓</span>
                      <span className="text-white">Código de Aguas</span>
                    </div>
                  </>
                ) : null}
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-green-400">✓</span>
                  <span className="text-white">NCh 1508 - Geotecnia</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-green-400">✓</span>
                  <span className="text-white">Plan Regulador Comunal</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Footer */}
      <div className="bg-gray-800 border-t border-gray-700 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-2xl font-bold text-white">{selectedCount}</span>
              <span className="text-gray-400 ml-2">capas seleccionadas</span>
            </div>
            <div className="h-8 w-px bg-gray-700" />
            <div>
              <span className="text-gray-400">Costo adicional:</span>
              <span className={`ml-2 font-bold ${totalCost === 0 ? 'text-green-400' : 'text-blue-400'}`}>
                {totalCost === 0 ? '$0' : `$${totalCost}`}
              </span>
            </div>
          </div>
          <div className="text-sm text-gray-400">
            Los datos se cargarán automáticamente al crear el proyecto
          </div>
        </div>
      </div>
    </div>
  );
}
