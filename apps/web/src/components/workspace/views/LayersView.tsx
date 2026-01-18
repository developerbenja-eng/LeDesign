'use client';

import type { ViewInstance } from '@/stores/workspace-store';
import { useCADStore } from '@/stores/cad-store';
import { Eye, EyeOff, Lock, Unlock } from 'lucide-react';

interface LayersViewProps {
  view: ViewInstance;
}

export function LayersView({ view }: LayersViewProps) {
  const layers = useCADStore((state) => state.layers);
  const activeLayer = useCADStore((state) => state.activeLayer);
  const setActiveLayer = useCADStore((state) => state.setActiveLayer);

  return (
    <div className="h-full flex flex-col bg-slate-900">
      <div className="px-4 py-3 bg-slate-800/50 border-b border-slate-700">
        <h3 className="font-semibold text-white">Layers</h3>
      </div>

      <div className="flex-1 overflow-auto p-2">
        {layers.map((layer) => (
          <div
            key={layer.id}
            onClick={() => setActiveLayer(layer.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors ${
              layer.id === activeLayer
                ? 'bg-blue-600/30 text-blue-400'
                : 'hover:bg-slate-800/50 text-slate-300'
            }`}
          >
            <div
              className="w-4 h-4 rounded border-2 flex-shrink-0"
              style={{ borderColor: layer.color, backgroundColor: `${layer.color}33` }}
            />
            <span className="flex-1 text-sm">{layer.name}</span>
            <button className="p-1 hover:bg-slate-700 rounded">
              {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
