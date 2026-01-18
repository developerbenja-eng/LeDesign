'use client';

import { useState } from 'react';
import { Eye, Plus, X, Grid3x3, Box, Ruler, Mountain, Edit2, Check } from 'lucide-react';

interface ViewDefinition {
  id: string;
  name: string;
  type: 'plan' | 'details' | 'profile' | '3d' | 'custom';
  icon: React.ComponentType<{ size?: number; className?: string }>;
  description: string;
  isCustom?: boolean;
}

const defaultViews: ViewDefinition[] = [
  {
    id: 'plan',
    name: 'Plan View',
    type: 'plan',
    icon: Grid3x3,
    description: 'Top-down 2D view',
  },
  {
    id: 'details',
    name: 'Details View',
    type: 'details',
    icon: Ruler,
    description: 'Zoomed sections and details',
  },
  {
    id: 'profile',
    name: 'Profile View',
    type: 'profile',
    icon: Mountain,
    description: 'Longitudinal section',
  },
  {
    id: '3d',
    name: '3D Perspective',
    type: '3d',
    icon: Box,
    description: '3D visualization',
  },
];

interface ViewsPanelProps {
  activeView?: string;
  onViewChange: (viewId: string) => void;
  onAddView?: (viewName: string) => void;
}

export function ViewsPanel({ activeView, onViewChange, onAddView }: ViewsPanelProps) {
  const [customViews, setCustomViews] = useState<ViewDefinition[]>([]);
  const [isAddingView, setIsAddingView] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [editingViewId, setEditingViewId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const allViews = [...defaultViews, ...customViews];

  const handleAddCustomView = () => {
    if (newViewName.trim()) {
      const newView: ViewDefinition = {
        id: `custom-${Date.now()}`,
        name: newViewName.trim(),
        type: 'custom',
        icon: Eye,
        description: 'Custom user-defined view',
        isCustom: true,
      };
      setCustomViews([...customViews, newView]);
      setNewViewName('');
      setIsAddingView(false);
      if (onAddView) {
        onAddView(newView.name);
      }
    }
  };

  const handleRenameView = (viewId: string) => {
    if (editingName.trim()) {
      setCustomViews(customViews.map(v =>
        v.id === viewId ? { ...v, name: editingName.trim() } : v
      ));
      setEditingViewId(null);
      setEditingName('');
    }
  };

  const handleDeleteCustomView = (viewId: string) => {
    setCustomViews(customViews.filter(v => v.id !== viewId));
    if (activeView === viewId) {
      onViewChange('plan');
    }
  };

  return (
    <div className="w-64 bg-slate-900 border-l border-slate-800 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-white">Views</h3>
          <button
            onClick={() => setIsAddingView(true)}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
            title="Add custom view"
          >
            <Plus size={16} />
          </button>
        </div>
        <p className="text-xs text-slate-400">Manage and switch between views</p>
      </div>

      {/* Views List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* Add New View Input */}
        {isAddingView && (
          <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddCustomView();
                  if (e.key === 'Escape') {
                    setIsAddingView(false);
                    setNewViewName('');
                  }
                }}
                placeholder="View name..."
                className="flex-1 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddCustomView}
                disabled={!newViewName.trim()}
                className="flex-1 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setIsAddingView(false);
                  setNewViewName('');
                }}
                className="flex-1 px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Default Views */}
        <div className="space-y-1.5">
          {defaultViews.map((view) => {
            const Icon = view.icon;
            const isActive = activeView === view.id;

            return (
              <button
                key={view.id}
                onClick={() => onViewChange(view.id)}
                className={`
                  group w-full p-3 rounded-lg border transition-all
                  ${isActive
                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-600 hover:bg-slate-800'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`
                    p-2 rounded transition-transform
                    ${isActive ? 'bg-white/20' : 'bg-slate-700/50 group-hover:bg-slate-700'}
                    ${!isActive && 'group-hover:scale-110'}
                  `}>
                    <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400'} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 text-left">
                    <div className={`text-sm font-medium mb-0.5 ${isActive ? 'text-white' : 'text-slate-200'}`}>
                      {view.name}
                    </div>
                    <div className={`text-xs ${isActive ? 'text-white/70' : 'text-slate-500'}`}>
                      {view.description}
                    </div>
                  </div>

                  {/* Active Indicator */}
                  {isActive && (
                    <div className="w-2 h-2 mt-2 bg-green-500 rounded-full" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Custom Views */}
        {customViews.length > 0 && (
          <div className="pt-3">
            <div className="text-xs font-semibold text-slate-400 mb-2 px-1">Custom Views</div>
            <div className="space-y-1.5">
              {customViews.map((view) => {
                const Icon = view.icon;
                const isActive = activeView === view.id;
                const isEditing = editingViewId === view.id;

                return (
                  <div
                    key={view.id}
                    className={`
                      group relative p-3 rounded-lg border transition-all
                      ${isActive
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-600 hover:bg-slate-800'
                      }
                    `}
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameView(view.id);
                            if (e.key === 'Escape') {
                              setEditingViewId(null);
                              setEditingName('');
                            }
                          }}
                          className="flex-1 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-sm text-white focus:outline-none focus:border-blue-500"
                          autoFocus
                        />
                        <button
                          onClick={() => handleRenameView(view.id)}
                          className="p-1 text-green-400 hover:text-green-300"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setEditingViewId(null);
                            setEditingName('');
                          }}
                          className="p-1 text-slate-400 hover:text-white"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => onViewChange(view.id)}
                          className="w-full flex items-start gap-3"
                        >
                          <div className={`
                            p-2 rounded
                            ${isActive ? 'bg-white/20' : 'bg-slate-700/50 group-hover:bg-slate-700'}
                          `}>
                            <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400'} />
                          </div>

                          <div className="flex-1 text-left">
                            <div className={`text-sm font-medium ${isActive ? 'text-white' : 'text-slate-200'}`}>
                              {view.name}
                            </div>
                            <div className={`text-xs ${isActive ? 'text-white/70' : 'text-slate-500'}`}>
                              Custom view
                            </div>
                          </div>

                          {isActive && (
                            <div className="w-2 h-2 mt-2 bg-green-500 rounded-full" />
                          )}
                        </button>

                        {/* Edit/Delete buttons (visible on hover) */}
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingViewId(view.id);
                              setEditingName(view.name);
                            }}
                            className="p-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                            title="Rename view"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCustomView(view.id);
                            }}
                            className="p-1 bg-slate-800 hover:bg-red-600 rounded text-slate-400 hover:text-white transition-colors"
                            title="Delete view"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Preview Section (Placeholder) */}
      <div className="border-t border-slate-800 p-3">
        <div className="text-xs font-semibold text-slate-400 mb-2">Preview</div>
        <div className="aspect-video bg-slate-950 rounded border border-slate-700 flex items-center justify-center">
          <span className="text-xs text-slate-500">View preview</span>
        </div>
      </div>
    </div>
  );
}
