'use client';

// ============================================================
// TREE PANEL
// Model hierarchy tree view
// ============================================================

import { useState } from 'react';
import { useEditorStore } from '@/stores';
import {
  ChevronRight,
  ChevronDown,
  CircleDot,
  Minus,
  ArrowUpFromLine,
  Triangle,
  Square,
  Layers,
  X,
} from 'lucide-react';

export function TreePanel() {
  const togglePanel = useEditorStore((state) => state.togglePanel);

  return (
    <div className="h-full bg-lele-panel flex flex-col">
      {/* Header */}
      <div className="h-10 px-3 flex items-center justify-between border-b border-lele-border shrink-0">
        <h2 className="text-sm font-medium text-slate-200">Model Tree</h2>
        <button
          onClick={() => togglePanel('treePanel')}
          className="p-1 hover:bg-lele-bg rounded transition-colors"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto p-2">
        <TreeSection
          icon={<CircleDot className="w-4 h-4" />}
          label="Nodes"
          elementType="nodes"
          color="#94a3b8"
        />
        <TreeSection
          icon={<Minus className="w-4 h-4" />}
          label="Beams"
          elementType="beams"
          color="#64748b"
        />
        <TreeSection
          icon={<ArrowUpFromLine className="w-4 h-4" />}
          label="Columns"
          elementType="columns"
          color="#8b5cf6"
        />
        <TreeSection
          icon={<Triangle className="w-4 h-4" />}
          label="Braces"
          elementType="braces"
          color="#f59e0b"
        />
        <TreeSection
          icon={<Square className="w-4 h-4" />}
          label="Walls"
          elementType="walls"
          color="#10b981"
        />
        <TreeSection
          icon={<Layers className="w-4 h-4" />}
          label="Slabs"
          elementType="slabs"
          color="#06b6d4"
        />
      </div>
    </div>
  );
}

// ============================================================
// TREE SECTION
// Collapsible section for each element type
// ============================================================

interface TreeSectionProps {
  icon: React.ReactNode;
  label: string;
  elementType: 'nodes' | 'beams' | 'columns' | 'braces' | 'walls' | 'slabs';
  color: string;
}

function TreeSection({ icon, label, elementType, color }: TreeSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const elements = useEditorStore((state) => state[elementType]);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const select = useEditorStore((state) => state.select);

  // Cast to unknown[] first to handle union of Map value types
  const elementList = [...elements.values()] as { id: string; name?: string | null }[];
  const count = elementList.length;

  const handleElementClick = (id: string, event: React.MouseEvent) => {
    if (event.shiftKey) {
      const newSelection = new Set(selectedIds);
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        newSelection.add(id);
      }
      select(Array.from(newSelection));
    } else {
      select([id]);
    }
  };

  return (
    <div className="mb-1">
      {/* Section Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-lele-bg transition-colors text-left"
      >
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
        )}
        <span style={{ color }} className="flex items-center gap-1.5">
          {icon}
        </span>
        <span className="text-sm text-slate-300 flex-1">{label}</span>
        <span className="text-xs text-slate-500">{count}</span>
      </button>

      {/* Element List */}
      {isExpanded && count > 0 && (
        <div className="ml-5 border-l border-lele-border pl-2">
          {elementList.map((element) => (
            <button
              key={element.id}
              onClick={(e) => handleElementClick(element.id, e)}
              className={`
                w-full flex items-center gap-2 px-2 py-1 rounded text-left text-xs transition-colors
                ${selectedIds.has(element.id)
                  ? 'bg-lele-accent/20 text-lele-accent'
                  : 'text-slate-400 hover:bg-lele-bg hover:text-slate-300'
                }
              `}
            >
              <span className="font-mono truncate">
                {element.name || element.id}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Empty State */}
      {isExpanded && count === 0 && (
        <div className="ml-5 px-2 py-1 text-xs text-slate-600 italic">
          No {label.toLowerCase()} yet
        </div>
      )}
    </div>
  );
}
