'use client';

// ============================================================
// LAYERS PANEL
// Simple layer management (AutoCAD-style)
// ============================================================

import { useState } from 'react';
import { useCADStore } from '@/stores/cad-store';
import { Eye, EyeOff, Lock, Unlock, Plus, Check } from 'lucide-react';

export function LayersPanel() {
  const layers = useCADStore((state) => state.layers);
  const activeLayer = useCADStore((state) => state.activeLayer);
  const setActiveLayer = useCADStore((state) => state.setActiveLayer);
  const toggleLayerVisibility = useCADStore((state) => state.toggleLayerVisibility);
  const addLayer = useCADStore((state) => state.addLayer);

  const [isAddingLayer, setIsAddingLayer] = useState(false);
  const [newLayerName, setNewLayerName] = useState('');
  const [newLayerColor, setNewLayerColor] = useState('#ffffff');

  const handleAddLayer = () => {
    if (!newLayerName.trim()) return;

    addLayer({
      name: newLayerName,
      color: newLayerColor,
      visible: true,
      locked: false,
    });

    setNewLayerName('');
    setNewLayerColor('#ffffff');
    setIsAddingLayer(false);
  };

  const layerArray = Array.from(layers.values());

  return (
    <div className="h-full flex flex-col bg-slate-900 text-slate-200">
      {/* Header */}
      <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase text-slate-400">Layers</h3>
        <button
          onClick={() => setIsAddingLayer(true)}
          className="p-1 hover:bg-slate-800 rounded transition-colors"
          title="Add Layer"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Layers List */}
      <div className="flex-1 overflow-y-auto">
        {layerArray.map((layer) => (
          <div
            key={layer.name}
            className={`
              px-3 py-2 border-b border-slate-800/50 flex items-center gap-2
              hover:bg-slate-800/50 cursor-pointer transition-colors
              ${activeLayer === layer.name ? 'bg-blue-900/30 border-l-2 border-l-blue-500' : ''}
            `}
            onClick={() => setActiveLayer(layer.name)}
          >
            {/* Active Indicator */}
            <div className="w-4 flex items-center justify-center">
              {activeLayer === layer.name && (
                <Check size={14} className="text-blue-400" />
              )}
            </div>

            {/* Color Swatch */}
            <div
              className="w-4 h-4 rounded border border-slate-700"
              style={{ backgroundColor: layer.color }}
            />

            {/* Layer Name */}
            <div className="flex-1 text-sm">
              {layer.name}
              {layer.name === '0' && (
                <span className="ml-2 text-[10px] text-slate-500">(default)</span>
              )}
            </div>

            {/* Visibility Toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleLayerVisibility(layer.name);
              }}
              className="p-1 hover:bg-slate-700 rounded transition-colors"
              title={layer.visible ? 'Hide Layer' : 'Show Layer'}
            >
              {layer.visible ? (
                <Eye size={14} className="text-slate-400" />
              ) : (
                <EyeOff size={14} className="text-slate-600" />
              )}
            </button>

            {/* Lock Toggle (placeholder for future) */}
            <button
              onClick={(e) => e.stopPropagation()}
              className="p-1 hover:bg-slate-700 rounded transition-colors opacity-30"
              title="Lock/Unlock (coming soon)"
              disabled
            >
              {layer.locked ? (
                <Lock size={14} className="text-slate-600" />
              ) : (
                <Unlock size={14} className="text-slate-600" />
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Add Layer Form */}
      {isAddingLayer && (
        <div className="p-3 border-t border-slate-800 bg-slate-900">
          <div className="space-y-2">
            <input
              type="text"
              value={newLayerName}
              onChange={(e) => setNewLayerName(e.target.value)}
              placeholder="Layer name..."
              className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm focus:outline-none focus:border-blue-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddLayer();
                if (e.key === 'Escape') setIsAddingLayer(false);
              }}
            />

            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400">Color:</label>
              <input
                type="color"
                value={newLayerColor}
                onChange={(e) => setNewLayerColor(e.target.value)}
                className="w-12 h-6 bg-slate-800 border border-slate-700 rounded cursor-pointer"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleAddLayer}
                className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setIsAddingLayer(false);
                  setNewLayerName('');
                  setNewLayerColor('#ffffff');
                }}
                className="px-3 py-1.5 bg-slate-800 text-slate-400 rounded text-xs hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Tip */}
      <div className="px-3 py-2 border-t border-slate-800 bg-slate-900/50">
        <p className="text-[10px] text-slate-500">
          Click layer to make active • Eye icon to toggle visibility
        </p>
      </div>
    </div>
  );
}
