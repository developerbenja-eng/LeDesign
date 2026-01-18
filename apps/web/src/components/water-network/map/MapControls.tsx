'use client';

import { Map, Layers, Eye, EyeOff, BarChart3, Lightbulb, Settings } from 'lucide-react';
import { useState } from 'react';
import {
  useWaterNetworkStore,
  useMapState,
  useVisualization,
  useMapActions,
  useVisualizationActions,
  usePanelActions,
} from '@/stores/water-network/waterNetworkStore';
import type { MapStyle } from '@/stores/water-network/types';

const mapStyles: { id: MapStyle; label: string }[] = [
  { id: 'streets', label: 'Calles' },
  { id: 'satellite', label: 'Satélite' },
  { id: 'terrain', label: 'Terreno' },
  { id: 'dark', label: 'Oscuro' },
];

export function MapControls() {
  const [showStyleMenu, setShowStyleMenu] = useState(false);
  const [showLayersMenu, setShowLayersMenu] = useState(false);

  const mapState = useMapState();
  const visualization = useVisualization();
  const { setMapStyle } = useMapActions();
  const {
    setShowPressure,
    setShowVelocity,
    setShowFlowDirection,
    setShowDemandZones,
    setAnimateFlow,
  } = useVisualizationActions();
  const { togglePanel } = usePanelActions();

  const propertiesPanel = useWaterNetworkStore((s) => s.propertiesPanel);
  const resultsPanel = useWaterNetworkStore((s) => s.resultsPanel);
  const aiPanel = useWaterNetworkStore((s) => s.aiPanel);

  return (
    <div className="flex items-center gap-2">
      {/* Map Style Selector */}
      <div className="relative">
        <button
          onClick={() => {
            setShowStyleMenu(!showStyleMenu);
            setShowLayersMenu(false);
          }}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm text-slate-200 transition-colors"
        >
          <Map size={16} />
          <span>{mapStyles.find((s) => s.id === mapState.style)?.label}</span>
        </button>

        {showStyleMenu && (
          <div className="absolute top-full right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg py-1 z-[1001] min-w-[120px]">
            {mapStyles.map((style) => (
              <button
                key={style.id}
                onClick={() => {
                  setMapStyle(style.id);
                  setShowStyleMenu(false);
                }}
                className={`
                  w-full px-3 py-2 text-left text-sm transition-colors
                  ${mapState.style === style.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700'
                  }
                `}
              >
                {style.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Layers Menu */}
      <div className="relative">
        <button
          onClick={() => {
            setShowLayersMenu(!showLayersMenu);
            setShowStyleMenu(false);
          }}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm text-slate-200 transition-colors"
        >
          <Layers size={16} />
          <span>Capas</span>
        </button>

        {showLayersMenu && (
          <div className="absolute top-full right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg py-2 z-[1001] min-w-[200px]">
            <div className="px-3 py-1 text-xs text-slate-500 uppercase">Visualización</div>

            <LayerToggle
              label="Presión en nodos"
              checked={visualization.showPressure}
              onChange={setShowPressure}
            />
            <LayerToggle
              label="Velocidad en tuberías"
              checked={visualization.showVelocity}
              onChange={setShowVelocity}
            />
            <LayerToggle
              label="Dirección de flujo"
              checked={visualization.showFlowDirection}
              onChange={setShowFlowDirection}
            />
            <LayerToggle
              label="Zonas de demanda"
              checked={visualization.showDemandZones}
              onChange={setShowDemandZones}
            />
            <LayerToggle
              label="Animar flujo"
              checked={visualization.animateFlow}
              onChange={setAnimateFlow}
            />
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-slate-700" />

      {/* Panel Toggles */}
      <button
        onClick={() => togglePanel('properties')}
        className={`
          p-1.5 rounded transition-colors
          ${propertiesPanel.isOpen
            ? 'bg-blue-600 text-white'
            : 'text-slate-400 hover:bg-slate-700 hover:text-white'
          }
        `}
        title="Panel de Propiedades"
      >
        <Settings size={18} />
      </button>

      <button
        onClick={() => togglePanel('results')}
        className={`
          p-1.5 rounded transition-colors
          ${resultsPanel.isOpen
            ? 'bg-blue-600 text-white'
            : 'text-slate-400 hover:bg-slate-700 hover:text-white'
          }
        `}
        title="Panel de Resultados"
      >
        <BarChart3 size={18} />
      </button>

      <button
        onClick={() => togglePanel('ai')}
        className={`
          p-1.5 rounded transition-colors
          ${aiPanel.isOpen
            ? 'bg-blue-600 text-white'
            : 'text-slate-400 hover:bg-slate-700 hover:text-white'
          }
        `}
        title="Asistente AI"
      >
        <Lightbulb size={18} />
      </button>
    </div>
  );
}

interface LayerToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function LayerToggle({ label, checked, onChange }: LayerToggleProps) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
    >
      {checked ? (
        <Eye size={16} className="text-blue-400" />
      ) : (
        <EyeOff size={16} className="text-slate-500" />
      )}
      <span>{label}</span>
    </button>
  );
}
