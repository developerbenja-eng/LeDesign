'use client';

import type { ViewInstance } from '@/stores/workspace-store';
import { useCADStore } from '@/stores/cad-store';

interface PropertiesViewProps {
  view: ViewInstance;
}

export function PropertiesView({ view }: PropertiesViewProps) {
  const selectedEntities = useCADStore((state) =>
    state.entities.filter((e) => e.isSelected)
  );

  return (
    <div className="h-full flex flex-col bg-slate-900">
      <div className="px-4 py-3 bg-slate-800/50 border-b border-slate-700">
        <h3 className="font-semibold text-white">Properties</h3>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {selectedEntities.length === 0 ? (
          <div className="text-center text-slate-500 py-8">
            <p>No entities selected</p>
            <p className="text-xs mt-1">Select an object to view its properties</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400">Selected</label>
              <p className="text-sm text-white">{selectedEntities.length} entities</p>
            </div>

            {selectedEntities.length === 1 && (
              <>
                <div>
                  <label className="text-xs text-slate-400">Type</label>
                  <p className="text-sm text-white capitalize">{selectedEntities[0].type}</p>
                </div>

                <div>
                  <label className="text-xs text-slate-400">Layer</label>
                  <p className="text-sm text-white">{selectedEntities[0].layer}</p>
                </div>

                {selectedEntities[0].type === 'line' && (
                  <>
                    <div>
                      <label className="text-xs text-slate-400">Start</label>
                      <p className="text-sm text-white font-mono">
                        ({selectedEntities[0].start.x.toFixed(2)}, {selectedEntities[0].start.y.toFixed(2)})
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">End</label>
                      <p className="text-sm text-white font-mono">
                        ({selectedEntities[0].end?.x.toFixed(2)}, {selectedEntities[0].end?.y.toFixed(2)})
                      </p>
                    </div>
                  </>
                )}

                {selectedEntities[0].type === 'circle' && (
                  <div>
                    <label className="text-xs text-slate-400">Radius</label>
                    <p className="text-sm text-white">{selectedEntities[0].radius?.toFixed(2)}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
