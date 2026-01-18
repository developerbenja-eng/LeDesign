'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import {
  useWaterNetworkStore,
  useMapState,
  useDrawingState,
  useVisualization,
  usePropertiesPanel,
  useAIPanel,
  useResultsPanel,
} from '@/stores/water-network/waterNetworkStore';

import { DrawingToolbar } from './drawing/DrawingToolbar';
import { NetworkMapEvents } from './map/NetworkMapEvents';
import { MapControls } from './map/MapControls';
import { JunctionMarkers } from './overlays/JunctionMarkers';
import { PipePolylines } from './overlays/PipePolylines';
import { TankMarkers } from './overlays/TankMarkers';
import { ReservoirMarkers } from './overlays/ReservoirMarkers';
import { PumpMarkers } from './overlays/PumpMarkers';
import { ValveMarkers } from './overlays/ValveMarkers';
import { DemandZonePolygons } from './overlays/DemandZonePolygons';
import { NetworkPropertiesPanel } from './panels/NetworkPropertiesPanel';
import { AIAssistantPanel } from './panels/AIAssistantPanel';
import { ResultsDashboard } from './panels/ResultsDashboard';
import { ProfileViewPanel } from './panels/ProfileViewPanel';
import { ImportDialog } from './dialogs/ImportDialog';
import { ExportDialog } from './dialogs/ExportDialog';
import { useRealtimeSolver } from './hooks/useRealtimeSolver';

// Tile layer URLs
const TILE_LAYERS = {
  streets: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  terrain: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
};

const TILE_ATTRIBUTIONS = {
  streets: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  satellite: '&copy; Esri',
  terrain: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
  dark: '&copy; <a href="https://carto.com/">CARTO</a>',
};

export default function WaterNetworkStudio() {
  const mapState = useMapState();
  const drawingState = useDrawingState();
  const visualization = useVisualization();
  const propertiesPanel = usePropertiesPanel();
  const aiPanel = useAIPanel();
  const resultsPanel = useResultsPanel();

  const deleteSelected = useWaterNetworkStore((s) => s.deleteSelected);
  const setActiveTool = useWaterNetworkStore((s) => s.setActiveTool);
  const resetNetwork = useWaterNetworkStore((s) => s.resetNetwork);

  // Dialog states
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  // Enable real-time solver
  useRealtimeSolver();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          deleteSelected();
          break;
        case 'Escape':
          setActiveTool('select');
          break;
        case 'v':
        case 'V':
          setActiveTool('select');
          break;
        case 'j':
        case 'J':
          setActiveTool('junction');
          break;
        case 'p':
        case 'P':
          setActiveTool('pipe');
          break;
        case 't':
        case 'T':
          setActiveTool('tank');
          break;
        case 'r':
        case 'R':
          setActiveTool('reservoir');
          break;
        case 'z':
        case 'Z':
          setActiveTool('demandZone');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelected, setActiveTool]);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900 overflow-hidden">
      {/* Header */}
      <header className="h-12 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-white">Water Network Studio</h1>
          <span className="text-xs px-2 py-1 bg-blue-600 text-white rounded">Beta</span>

          {/* File Menu */}
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={() => {
                if (confirm('¿Crear un nuevo proyecto? Se perderá el trabajo actual no guardado.')) {
                  resetNetwork();
                }
              }}
              className="px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
            >
              Nuevo
            </button>
            <button
              onClick={() => setImportDialogOpen(true)}
              className="px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
            >
              Importar
            </button>
            <button
              onClick={() => setExportDialogOpen(true)}
              className="px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
            >
              Exportar
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <MapControls />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbar */}
        <DrawingToolbar />

        {/* Map Container */}
        <div className="flex-1 relative">
          <MapContainer
            center={mapState.center}
            zoom={mapState.zoom}
            zoomControl={false}
            className="h-full w-full"
            style={{ background: '#1e293b' }}
          >
            {/* Tile Layer */}
            <TileLayer
              url={TILE_LAYERS[mapState.style]}
              attribution={TILE_ATTRIBUTIONS[mapState.style]}
            />

            {/* Zoom Control - Bottom Right */}
            <ZoomControl position="bottomright" />

            {/* Map Event Handler */}
            <NetworkMapEvents />

            {/* Overlays */}
            {visualization.showDemandZones && <DemandZonePolygons />}
            <PipePolylines />
            <JunctionMarkers />
            <TankMarkers />
            <ReservoirMarkers />
            <PumpMarkers />
            <ValveMarkers />
          </MapContainer>

          {/* Map Overlay Info */}
          <div className="absolute bottom-4 left-4 bg-slate-800/90 backdrop-blur border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 z-[1000]">
            <div className="flex items-center gap-4">
              <span>
                <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-200">J</kbd> Nodo
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-200">P</kbd> Tubería
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-200">T</kbd> Estanque
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-200">R</kbd> Embalse
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-200">Del</kbd> Eliminar
              </span>
            </div>
          </div>
        </div>

        {/* Right Panels */}
        <div className="flex shrink-0">
          {/* Properties Panel */}
          {propertiesPanel.isOpen && (
            <div className="w-80 bg-slate-800 border-l border-slate-700 overflow-y-auto">
              <NetworkPropertiesPanel />
            </div>
          )}

          {/* AI Panel */}
          {aiPanel.isOpen && (
            <div className="w-72 bg-slate-800 border-l border-slate-700 overflow-y-auto">
              <AIAssistantPanel />
            </div>
          )}

          {/* Results Panel */}
          {resultsPanel.isOpen && (
            <div className="w-96 bg-slate-800 border-l border-slate-700 overflow-y-auto">
              <ResultsDashboard />
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <footer className="h-8 bg-slate-800 border-t border-slate-700 flex items-center justify-between px-4 text-xs text-slate-400 shrink-0">
        <div className="flex items-center gap-4">
          <span>Herramienta: <span className="text-blue-400">{getToolDisplayName(drawingState.activeTool)}</span></span>
          <span>|</span>
          <span>Snap: <span className={drawingState.snapEnabled ? 'text-green-400' : 'text-slate-500'}>{drawingState.snapEnabled ? 'ON' : 'OFF'}</span></span>
        </div>
        <div className="flex items-center gap-4">
          <SolverStatus />
        </div>
      </footer>

      {/* Dialogs */}
      <ImportDialog isOpen={importDialogOpen} onClose={() => setImportDialogOpen(false)} />
      <ExportDialog isOpen={exportDialogOpen} onClose={() => setExportDialogOpen(false)} />
    </div>
  );
}

function getToolDisplayName(tool: string): string {
  const names: Record<string, string> = {
    select: 'Selección',
    pan: 'Mover',
    junction: 'Agregar Nodo',
    pipe: 'Dibujar Tubería',
    tank: 'Agregar Estanque',
    reservoir: 'Agregar Embalse',
    pump: 'Agregar Bomba',
    valve: 'Agregar Válvula',
    demandZone: 'Dibujar Zona de Demanda',
    profilePath: 'Perfil de Ruta',
    delete: 'Eliminar',
  };
  return names[tool] || tool;
}

function SolverStatus() {
  const solver = useWaterNetworkStore((s) => s.solver);

  if (!solver) {
    return <span className="text-slate-500">Solver: Sin ejecutar</span>;
  }

  const statusColors = {
    idle: 'text-slate-400',
    running: 'text-yellow-400',
    converged: 'text-green-400',
    failed: 'text-red-400',
    warning: 'text-orange-400',
  };

  const statusTexts = {
    idle: 'Listo',
    running: 'Calculando...',
    converged: `Convergido (${solver.iterations} iter, ${solver.solveTime}ms)`,
    failed: 'Error',
    warning: 'Advertencias',
  };

  return (
    <span className={statusColors[solver.status]}>
      Solver: {statusTexts[solver.status]}
    </span>
  );
}
