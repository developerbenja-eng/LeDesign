'use client';

// ============================================================
// TABBED LAYOUT
// Browser-style tabs for view navigation
// ============================================================

import { useWorkspaceStore } from '@/stores/workspace-store';
import { ViewRenderer } from '../ViewRenderer';
import { X, Plus } from 'lucide-react';

export function TabbedLayout() {
  const views = useWorkspaceStore((state) => state.views);
  const activeViewId = useWorkspaceStore((state) => state.activeViewId);
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);
  const removeView = useWorkspaceStore((state) => state.removeView);
  const addView = useWorkspaceStore((state) => state.addView);

  const activeView = views.find((v) => v.id === activeViewId);

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Tab Bar */}
      <div className="flex items-center gap-1 px-2 py-1 bg-slate-800/50 border-b border-slate-700 overflow-x-auto">
        {views.map((view) => (
          <button
            key={view.id}
            onClick={() => setActiveView(view.id)}
            className={`group flex items-center gap-2 px-3 py-1.5 rounded-t text-sm transition-colors min-w-[120px] ${
              view.isActive
                ? 'bg-slate-900 text-white border-t border-l border-r border-slate-700'
                : 'bg-slate-800/30 text-slate-400 hover:bg-slate-800/50 hover:text-slate-300'
            }`}
          >
            <span className="flex-1 truncate">{view.title}</span>
            {view.isDirty && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Unsaved changes" />
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeView(view.id);
              }}
              className="opacity-0 group-hover:opacity-100 hover:bg-slate-700 rounded p-0.5 transition-opacity"
            >
              <X size={12} />
            </button>
          </button>
        ))}

        {/* Add View Button */}
        <button
          onClick={() => {
            // TODO: Show view selector menu
            addView('plan', 'New Plan View');
          }}
          className="flex items-center gap-1 px-2 py-1.5 rounded text-xs text-slate-400 hover:text-slate-300 hover:bg-slate-800/50 transition-colors"
          title="Add new view"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Active View Content */}
      <div className="flex-1 relative overflow-hidden">
        {activeView ? (
          <ViewRenderer view={activeView} />
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500">
            <div className="text-center">
              <p className="text-lg mb-2">No view selected</p>
              <button
                onClick={() => addView('plan')}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Create Plan View
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
