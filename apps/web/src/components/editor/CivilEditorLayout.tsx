'use client';

// ============================================================
// CIVIL EDITOR LAYOUT
// Main layout for civil/CAD engineering editor
// ============================================================

import { useEffect, useState } from 'react';
import { useCADStore } from '@/stores/cad-store';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import dynamic from 'next/dynamic';
import {
  Settings,
  Layers,
  FileText,
  Wrench,
  Droplets,
  Building2,
  Map,
  Save,
  Undo,
  Redo,
  Home,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Grid3x3,
  Crosshair,
  Lock,
  Eye,
  EyeOff,
  Plus,
  Terminal,
  LayoutGrid,
  Sidebar,
  Columns,
  Maximize,
} from 'lucide-react';
import Link from 'next/link';

// Dynamically import canvas and workspace components to avoid SSR issues
const DrawingCanvas2D = dynamic(() => import('@/components/cad/DrawingCanvas2D').then((mod) => mod.default), { ssr: false });
const GeoCanvas = dynamic(() => import('@/components/cad/GeoCanvas').then((mod) => mod.default), { ssr: false });
const WorkspaceManager = dynamic(() => import('@/components/workspace/WorkspaceManager').then((mod) => mod.WorkspaceManager), { ssr: false });

// Import panels
const Toolbar = dynamic(() => import('@/components/cad/Toolbar').then((mod) => mod.default), { ssr: false });
const ViewModeSelector = dynamic(() => import('@/components/cad/ViewModeSelector').then((mod) => mod.default), { ssr: false });
const LayersPanel = dynamic(() => import('@/components/cad/LayersPanel').then((mod) => mod.LayersPanel), { ssr: false });
const ElementPropertiesPanel = dynamic(() => import('@/components/cad/ElementPropertiesPanel').then((mod) => mod.ElementPropertiesPanel), { ssr: false });
const SettingsPanel = dynamic(() => import('@/components/cad/SettingsPanel').then((mod) => mod.SettingsPanel), { ssr: false });
const WaterNetworkPanel = dynamic(() => import('@/components/cad/WaterNetworkPanel').then((mod) => mod.WaterNetworkPanel), { ssr: false });
const SewerPanel = dynamic(() => import('@/components/cad/SewerPanel').then((mod) => mod.SewerPanel), { ssr: false });
const RoadGeometryPanel = dynamic(() => import('@/components/cad/RoadGeometryPanel').then((mod) => mod.RoadGeometryPanel), { ssr: false });
const TerrainControlPanel = dynamic(() => import('@/components/cad/TerrainControlPanel').then((mod) => mod.TerrainControlPanel), { ssr: false });
const SurfaceGeneratorPanel = dynamic(() => import('@/components/cad/SurfaceGeneratorPanel').then((mod) => mod.SurfaceGeneratorPanel), { ssr: false });
const HydrologyPanel = dynamic(() => import('@/components/cad/HydrologyPanel').then((mod) => mod.HydrologyPanel), { ssr: false });
const StormwaterPanel = dynamic(() => import('@/components/cad/StormwaterPanel').then((mod) => mod.StormwaterPanel), { ssr: false });
const SiteLocationPanel = dynamic(() => import('@/components/cad/SiteLocationPanel').then((mod) => mod.SiteLocationPanel), { ssr: false });
const StructuralDesignPanel = dynamic(() => import('@/components/cad/StructuralDesignPanel').then((mod) => mod.StructuralDesignPanel), { ssr: false });

// Import new panels
const DesignTypesBottomPanel = dynamic(() => import('@/components/editor/DesignTypesBottomPanel').then((mod) => mod.DesignTypesBottomPanel), { ssr: false });
const ViewsPanel = dynamic(() => import('@/components/editor/ViewsPanel').then((mod) => mod.ViewsPanel), { ssr: false });

interface CivilEditorLayoutProps {
  projectId: string;
  projectName?: string;
  initialDesignType?: string;
}

type ActivePanel =
  | 'properties'
  | 'settings'
  | 'location'
  | 'structural'
  | 'water'
  | 'sewer'
  | 'roads'
  | 'terrain'
  | 'surfaces'
  | 'hydrology'
  | 'stormwater'
  | 'layers'
  | null;

export function CivilEditorLayout({ projectId, projectName, initialDesignType }: CivilEditorLayoutProps) {
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [commandInput, setCommandInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [gridEnabled, setGridEnabled] = useState(true);

  // New state for design types and views
  const [activeDesignType, setActiveDesignType] = useState<string>(initialDesignType || '');
  const [activeView, setActiveView] = useState<string>('plan');
  const [showViewsPanel, setShowViewsPanel] = useState(true);

  // Module access control
  const { hasAccess, loading: loadingModules } = useModuleAccess(projectId);

  const viewMode = useCADStore((state) => state.viewMode);
  const geoTransform = useCADStore((state) => state.geoTransform);
  const layers = useCADStore((state) => state.layers);
  const activeLayer = useCADStore((state) => state.activeLayer);
  const setActiveLayer = useCADStore((state) => state.setActiveLayer);
  const selectedIds = useCADStore((state) => state.selectedIds);
  const snapEnabled = useCADStore((state) => state.snapEnabled);
  const toggleSnap = useCADStore((state) => state.toggleSnap);
  const orthoEnabled = useCADStore((state) => state.orthoEnabled);
  const toggleOrtho = useCADStore((state) => state.toggleOrtho);
  const { undo, redo, toggle3D, viewState, setActiveTool } = useCADStore();

  // Workspace state
  const layoutMode = useWorkspaceStore((state) => state.layoutMode);
  const setLayoutMode = useWorkspaceStore((state) => state.setLayoutMode);
  const addView = useWorkspaceStore((state) => state.addView);

  // Sync state
  const initializeSync = useCADStore((state) => state.initializeSync);
  const stopSync = useCADStore((state) => state.stopSync);
  const syncStatus = useCADStore((state) => state.syncStatus);
  const lastSyncTime = useCADStore((state) => state.lastSyncTime);

  // Handle design type change - maps to the appropriate panel
  const handleDesignTypeChange = (typeId: string) => {
    setActiveDesignType(typeId);

    // Map design type to panel
    const panelMap: { [key: string]: ActivePanel } = {
      'water': 'water',
      'sewer': 'sewer',
      'stormwater': 'stormwater',
      'structural': 'structural',
      'pavement': 'roads',
      'channel': 'hydrology',
    };

    const panel = panelMap[typeId];
    if (panel) {
      setActivePanel(panel);
      setIsPanelCollapsed(false);
    }
  };

  // Handle view change
  const handleViewChange = (viewId: string) => {
    setActiveView(viewId);
    // TODO: Implement actual view switching logic in WorkspaceManager
    console.log('Switching to view:', viewId);
  };

  // Initialize sync on mount
  useEffect(() => {
    // TODO: Get actual user ID from auth
    const userId = 'test-user-1';

    console.log(`Initializing sync for project ${projectId}`);
    initializeSync(projectId, userId);

    // Cleanup on unmount
    return () => {
      console.log(`Stopping sync for project ${projectId}`);
      stopSync();
    };
  }, [projectId, initializeSync, stopSync]);

  // Handle initial design type from URL parameter
  useEffect(() => {
    if (initialDesignType) {
      handleDesignTypeChange(initialDesignType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDesignType]);

  // Command line handler (AutoCAD-style)
  const handleCommand = (cmd: string) => {
    const command = cmd.trim().toLowerCase();
    if (!command) return;

    setCommandHistory([...commandHistory, `> ${command}`]);

    // Map commands to tools
    const commandMap: { [key: string]: string } = {
      line: 'line',
      l: 'line',
      circle: 'circle',
      c: 'circle',
      arc: 'arc',
      a: 'arc',
      polyline: 'polyline',
      pl: 'polyline',
      pline: 'polyline',
      point: 'point',
      pt: 'point',
      text: 'text',
      t: 'text',
      measure: 'measure',
      m: 'measure',
      select: 'select',
      s: 'select',
      pan: 'pan',
      p: 'pan',
      zoom: 'zoom',
      z: 'zoom',
    };

    const tool = commandMap[command];
    if (tool) {
      setActiveTool(tool as any);
      setCommandHistory(prev => [...prev, `Tool: ${tool}`]);
    } else if (command === 'u' || command === 'undo') {
      undo();
      setCommandHistory(prev => [...prev, 'Undo']);
    } else if (command === 'redo') {
      redo();
      setCommandHistory(prev => [...prev, 'Redo']);
    } else {
      setCommandHistory(prev => [...prev, `Unknown command: ${command}`]);
    }

    setCommandInput('');
  };

  // Auto-save functionality
  const saveProject = async () => {
    setIsSaving(true);
    try {
      // TODO: Implement project saving to API
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate save
    } catch (error) {
      console.error('Failed to save project:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 overflow-hidden">
      {/* Compact Header */}
      <header className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors">
            <Home size={18} />
          </Link>
          <div className="h-5 w-px bg-slate-700" />
          <h1 className="text-sm font-medium text-white">{projectName || 'Untitled Project'}</h1>
          <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
            Civil
          </span>
        </div>

        <button
          onClick={saveProject}
          disabled={isSaving}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
        >
          <Save size={14} />
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Tool Panels */}
        <div className="w-14 bg-slate-900 border-r border-slate-800 flex flex-col items-center gap-1 py-3">
          <ToolButton
            icon={<Layers size={18} />}
            label="Layers"
            active={activePanel === 'layers'}
            onClick={() => setActivePanel(activePanel === 'layers' ? null : 'layers')}
          />
          <ToolButton
            icon={<FileText size={18} />}
            label="Properties"
            active={activePanel === 'properties'}
            onClick={() => setActivePanel(activePanel === 'properties' ? null : 'properties')}
          />
          <div className="h-px w-8 bg-slate-800 my-2" />
          <ToolButton
            icon={<Map size={18} />}
            label="Site Location"
            active={activePanel === 'location'}
            onClick={() => setActivePanel(activePanel === 'location' ? null : 'location')}
          />
          <div className="h-px w-8 bg-slate-800 my-2" />

          {/* Module Buttons - Conditionally rendered based on subscription */}
          {hasAccess('structural') && (
            <ToolButton
              icon={<Building2 size={18} />}
              label="Structural"
              active={activePanel === 'structural'}
              onClick={() => setActivePanel(activePanel === 'structural' ? null : 'structural')}
            />
          )}
          {hasAccess('hydraulic') && (
            <ToolButton
              icon={<Droplets size={18} />}
              label="Water"
              active={activePanel === 'water'}
              onClick={() => setActivePanel(activePanel === 'water' ? null : 'water')}
            />
          )}
          {hasAccess('hydraulic') && (
            <ToolButton
              icon={<Wrench size={18} />}
              label="Sewer"
              active={activePanel === 'sewer'}
              onClick={() => setActivePanel(activePanel === 'sewer' ? null : 'sewer')}
            />
          )}
          {hasAccess('road') && (
            <ToolButton
              icon={<Building2 size={18} />}
              label="Roads"
              active={activePanel === 'roads'}
              onClick={() => setActivePanel(activePanel === 'roads' ? null : 'roads')}
            />
          )}
          {hasAccess('terrain') && (
            <ToolButton
              icon={<Building2 size={18} />}
              label="Terrain"
              active={activePanel === 'terrain'}
              onClick={() => setActivePanel(activePanel === 'terrain' ? null : 'terrain')}
            />
          )}

          <div className="flex-1" />

          <ToolButton
            icon={<Settings size={18} />}
            label="Settings"
            active={activePanel === 'settings'}
            onClick={() => setActivePanel(activePanel === 'settings' ? null : 'settings')}
          />
        </div>

        {/* Main Area */}
        <div className="flex-1 flex flex-col">
          {/* Unified Top Toolbar */}
          <div className="bg-slate-900 border-b border-slate-800 px-3 py-2 flex items-center gap-2">
            {/* Left Group: View Mode & Drawing Tools */}
            <div className="flex items-center gap-2">
              <ViewModeSelector />
              <div className="h-6 w-px bg-slate-700 mx-1" />
              <Toolbar orientation="horizontal" />
            </div>

            <div className="flex-1" />

            {/* Right Group: Edit & View Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={undo}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                title="Undo (Ctrl+Z)"
              >
                <Undo size={16} />
              </button>
              <button
                onClick={redo}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                title="Redo (Ctrl+Y)"
              >
                <Redo size={16} />
              </button>

              <div className="h-6 w-px bg-slate-700 mx-1" />

              {/* Layout Mode Selector */}
              <div className="flex items-center gap-1 bg-slate-800/50 rounded p-0.5">
                <button
                  onClick={() => setLayoutMode('tabs')}
                  className={`p-1 rounded transition-colors ${
                    layoutMode === 'tabs'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title="Tabbed Layout"
                >
                  <LayoutGrid size={14} />
                </button>
                <button
                  onClick={() => setLayoutMode('sidebar')}
                  className={`p-1 rounded transition-colors ${
                    layoutMode === 'sidebar'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title="Sidebar Layout"
                >
                  <Sidebar size={14} />
                </button>
                <button
                  onClick={() => setLayoutMode('split')}
                  className={`p-1 rounded transition-colors ${
                    layoutMode === 'split'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title="Split Pane Layout"
                >
                  <Columns size={14} />
                </button>
                <button
                  onClick={() => setLayoutMode('floating')}
                  className={`p-1 rounded transition-colors ${
                    layoutMode === 'floating'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title="Floating Windows"
                >
                  <Maximize size={14} />
                </button>
              </div>

              <div className="h-6 w-px bg-slate-700 mx-1" />

              {/* Toggle Views Panel */}
              <button
                onClick={() => setShowViewsPanel(!showViewsPanel)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  showViewsPanel
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
                title="Toggle Views Panel"
              >
                <Eye size={14} className="inline mr-1" />
                Views
              </button>

              {activePanel && !isPanelCollapsed && (
                <>
                  <div className="h-6 w-px bg-slate-700 mx-1" />
                  <button
                    onClick={() => setIsPanelCollapsed(true)}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                    title="Collapse Panel"
                  >
                    <ChevronLeft size={16} />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Canvas Area with Optional Side Panel */}
          <div className="flex-1 flex overflow-hidden">
            {/* Workspace Manager (Multi-View System) */}
            <div className="flex-1 bg-slate-950 relative">
              <WorkspaceManager />
            </div>

            {/* Side Panel (Design Type Panel) */}
            {activePanel && !isPanelCollapsed && (
              <div className="w-80 bg-slate-900 border-l border-slate-800 overflow-y-auto flex-shrink-0">
                <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between z-10">
                  <h2 className="text-sm font-medium text-white">
                    {activePanel === 'layers' && 'Layers'}
                    {activePanel === 'properties' && 'Properties'}
                    {activePanel === 'location' && 'Site Location'}
                    {activePanel === 'structural' && 'Structural Design'}
                    {activePanel === 'water' && 'Water Network'}
                    {activePanel === 'sewer' && 'Sewer System'}
                    {activePanel === 'roads' && 'Road Geometry'}
                    {activePanel === 'terrain' && 'Terrain'}
                    {activePanel === 'surfaces' && 'Surfaces'}
                    {activePanel === 'settings' && 'Settings'}
                    {activePanel === 'hydrology' && 'Hydrology'}
                    {activePanel === 'stormwater' && 'Stormwater'}
                  </h2>
                  <button
                    onClick={() => setActivePanel(null)}
                    className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                <div className="p-4">
                  {/* Layers Panel */}
                  {activePanel === 'layers' && <LayersPanel />}

                  {activePanel === 'properties' && <ElementPropertiesPanel onClose={() => setActivePanel(null)} />}
                  {activePanel === 'settings' && <SettingsPanel />}
                  {activePanel === 'location' && <SiteLocationPanel projectId={projectId} projectName={projectName} />}
                  {activePanel === 'structural' && <StructuralDesignPanel projectId={projectId} />}
                  {activePanel === 'water' && (
                    <WaterNetworkPanel
                      projectId={projectId}
                      projectName={projectName || 'Untitled Project'}
                      onClose={() => setActivePanel(null)}
                    />
                  )}
                  {activePanel === 'sewer' && <SewerPanel />}
                  {activePanel === 'roads' && <RoadGeometryPanel />}
                  {activePanel === 'terrain' && <TerrainControlPanel />}
                  {activePanel === 'surfaces' && <SurfaceGeneratorPanel />}
                  {activePanel === 'hydrology' && <HydrologyPanel />}
                  {activePanel === 'stormwater' && <StormwaterPanel />}
                </div>
              </div>
            )}

            {/* Collapsed Panel Button */}
            {activePanel && isPanelCollapsed && (
              <button
                onClick={() => setIsPanelCollapsed(false)}
                className="w-8 bg-slate-900 border-l border-slate-800 hover:bg-slate-800 transition-colors flex items-center justify-center"
                title="Expand Panel"
              >
                <ChevronLeft size={16} className="text-slate-400" />
              </button>
            )}

            {/* Views Panel (Right Side) */}
            {showViewsPanel && (
              <ViewsPanel
                activeView={activeView}
                onViewChange={handleViewChange}
              />
            )}
          </div>
        </div>
      </div>

      {/* Design Types Bottom Panel */}
      <DesignTypesBottomPanel
        activeDesignType={activeDesignType}
        onDesignTypeChange={handleDesignTypeChange}
      />

      {/* Command Line (AutoCAD-style) */}
      <div className="bg-slate-900 border-t border-slate-800">
        <div className="px-4 py-2 flex items-center gap-3">
          <Terminal size={14} className="text-slate-400" />
          <div className="flex-1">
            <input
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCommand(commandInput);
                if (e.key === 'Escape') setCommandInput('');
              }}
              placeholder="Type command (LINE, CIRCLE, etc.) and press Enter..."
              className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
            />
          </div>
          {selectedIds.size > 0 && (
            <span className="text-xs text-slate-400">
              {selectedIds.size} selected
            </span>
          )}
        </div>

        {/* Command History (last 2 commands) */}
        {commandHistory.length > 0 && (
          <div className="px-4 pb-2 space-y-0.5">
            {commandHistory.slice(-2).map((cmd, i) => (
              <div key={i} className="text-xs text-slate-500 font-mono">
                {cmd}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Enhanced Status Bar */}
      <footer className="px-4 py-1.5 bg-slate-900 border-t border-slate-800 text-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-slate-500">Layer: <span className="text-slate-300">{activeLayer}</span></span>
          <div className="h-3 w-px bg-slate-700" />
          <span className="text-slate-500">
            {viewMode === 'design' && 'Design'}
            {viewMode === 'reference' && 'Reference'}
            {viewMode === 'analysis' && 'Analysis'}
          </span>
          <div className="h-3 w-px bg-slate-700" />

          {/* Sync Status Indicator */}
          <div className="flex items-center gap-2">
            {syncStatus === 'syncing' && (
              <>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-blue-400">Syncing...</span>
              </>
            )}
            {syncStatus === 'idle' && lastSyncTime && (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-green-400">Synced</span>
                <span className="text-slate-500 text-[10px]">
                  {new Date(lastSyncTime).toLocaleTimeString()}
                </span>
              </>
            )}
            {syncStatus === 'error' && (
              <>
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <span className="text-red-400">Sync error</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* SNAP Toggle (F3) */}
          <button
            onClick={toggleSnap}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              snapEnabled
                ? 'bg-blue-600/30 text-blue-400 border border-blue-500/30'
                : 'bg-slate-800/50 text-slate-500 hover:bg-slate-800'
            }`}
            title="Object Snap (F3)"
          >
            <Crosshair size={12} className="inline mr-1" />
            SNAP
          </button>

          {/* ORTHO Toggle (F8) */}
          <button
            onClick={toggleOrtho}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              orthoEnabled
                ? 'bg-amber-600/30 text-amber-400 border border-amber-500/30'
                : 'bg-slate-800/50 text-slate-500 hover:bg-slate-800'
            }`}
            title="Ortho Mode (F8)"
          >
            ORTHO
          </button>

          {/* GRID Toggle */}
          <button
            onClick={() => setGridEnabled(!gridEnabled)}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              gridEnabled
                ? 'bg-green-600/30 text-green-400 border border-green-500/30'
                : 'bg-slate-800/50 text-slate-500 hover:bg-slate-800'
            }`}
            title="Grid Display"
          >
            <Grid3x3 size={12} className="inline mr-1" />
            GRID
          </button>

          <div className="h-3 w-px bg-slate-700" />

          <span className="text-slate-500 tabular-nums">
            Project: {projectId.slice(0, 8)}
          </span>
        </div>
      </footer>
    </div>
  );
}

// ============================================================
// TOOL BUTTON COMPONENT
// ============================================================

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

function ToolButton({ icon, label, active = false, onClick }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`
        w-10 h-10 rounded flex items-center justify-center transition-all
        ${active
          ? 'bg-blue-600 text-white'
          : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }
      `}
    >
      {icon}
    </button>
  );
}
