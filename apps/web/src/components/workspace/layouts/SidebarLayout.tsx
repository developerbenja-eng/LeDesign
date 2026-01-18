'use client';

// ============================================================
// SIDEBAR LAYOUT
// Tree navigation with expandable sections
// ============================================================

import { useWorkspaceStore, type ViewType } from '@/stores/workspace-store';
import { ViewRenderer } from '../ViewRenderer';
import {
  ChevronRight,
  ChevronDown,
  Map,
  TrendingUp,
  Mountain,
  Box,
  Calculator,
  FileText,
  Route,
  Layers,
  Settings,
  Plus,
} from 'lucide-react';
import { useState } from 'react';

// View type icons
const viewIcons: Record<ViewType, React.ComponentType<{ size?: number; className?: string }>> = {
  plan: Map,
  profile: TrendingUp,
  'cross-section': Mountain,
  '3d': Box,
  cubicaciones: Calculator,
  details: FileText,
  alignment: Route,
  layers: Layers,
  properties: Settings,
};

// View categories
interface ViewCategory {
  name: string;
  views: ViewType[];
}

const categories: ViewCategory[] = [
  {
    name: 'Design Views',
    views: ['plan', 'profile', 'cross-section', '3d'],
  },
  {
    name: 'Analysis',
    views: ['cubicaciones', 'alignment'],
  },
  {
    name: 'Resources',
    views: ['details', 'layers', 'properties'],
  },
];

export function SidebarLayout() {
  const views = useWorkspaceStore((state) => state.views);
  const activeViewId = useWorkspaceStore((state) => state.activeViewId);
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);
  const addView = useWorkspaceStore((state) => state.addView);
  const sidebarExpanded = useWorkspaceStore((state) => state.sidebarExpanded);
  const toggleSidebar = useWorkspaceStore((state) => state.toggleSidebar);

  const [expandedCategories, setExpandedCategories] = useState<string[]>([
    'Design Views',
    'Analysis',
  ]);

  const activeView = views.find((v) => v.id === activeViewId);

  const toggleCategory = (name: string) => {
    setExpandedCategories((prev) =>
      prev.includes(name)
        ? prev.filter((c) => c !== name)
        : [...prev, name]
    );
  };

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <div className={`bg-slate-800/50 border-r border-slate-700 flex flex-col transition-all ${
        sidebarExpanded ? 'w-64' : 'w-12'
      }`}>
        {/* Sidebar Header */}
        <div className="px-3 py-2 border-b border-slate-700 flex items-center justify-between">
          {sidebarExpanded && (
            <span className="text-sm font-medium text-white">Views</span>
          )}
          <button
            onClick={toggleSidebar}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
            title={sidebarExpanded ? 'Collapse' : 'Expand'}
          >
            <ChevronRight
              size={16}
              className={`text-slate-400 transition-transform ${
                sidebarExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto">
          {sidebarExpanded ? (
            // Expanded view with categories
            <div className="p-2 space-y-1">
              {categories.map((category) => {
                const isExpanded = expandedCategories.includes(category.name);

                return (
                  <div key={category.name}>
                    {/* Category Header */}
                    <button
                      onClick={() => toggleCategory(category.name)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-300 hover:bg-slate-800/50 rounded transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown size={12} />
                      ) : (
                        <ChevronRight size={12} />
                      )}
                      {category.name}
                    </button>

                    {/* Category Views */}
                    {isExpanded && (
                      <div className="ml-4 mt-1 space-y-0.5">
                        {category.views.map((viewType) => {
                          const Icon = viewIcons[viewType];
                          const existingViews = views.filter((v) => v.type === viewType);

                          return (
                            <div key={viewType}>
                              {/* Existing views of this type */}
                              {existingViews.map((view) => (
                                <button
                                  key={view.id}
                                  onClick={() => setActiveView(view.id)}
                                  className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded transition-colors ${
                                    view.isActive
                                      ? 'bg-blue-600/30 text-blue-400'
                                      : 'text-slate-300 hover:bg-slate-800/50'
                                  }`}
                                >
                                  <Icon size={14} />
                                  <span className="flex-1 truncate text-left">{view.title}</span>
                                  {view.isDirty && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                  )}
                                </button>
                              ))}

                              {/* Add new view button */}
                              {existingViews.length === 0 && (
                                <button
                                  onClick={() => addView(viewType)}
                                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-slate-400 hover:text-slate-300 hover:bg-slate-800/50 rounded transition-colors"
                                >
                                  <Icon size={14} />
                                  <span className="flex-1 text-left capitalize">
                                    {viewType.replace('-', ' ')}
                                  </span>
                                  <Plus size={12} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            // Collapsed view with icons only
            <div className="p-2 space-y-2">
              {views.map((view) => {
                const Icon = viewIcons[view.type];
                return (
                  <button
                    key={view.id}
                    onClick={() => setActiveView(view.id)}
                    className={`w-full p-2 rounded transition-colors ${
                      view.isActive
                        ? 'bg-blue-600/30 text-blue-400'
                        : 'text-slate-400 hover:bg-slate-800/50'
                    }`}
                    title={view.title}
                  >
                    <Icon size={18} />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {activeView ? (
          <ViewRenderer view={activeView} />
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500">
            <p>Select or create a view from the sidebar</p>
          </div>
        )}
      </div>
    </div>
  );
}
