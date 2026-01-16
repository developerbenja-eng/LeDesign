'use client';

// ============================================================
// PROPERTIES PANEL
// Dynamic property editor for selected elements
// ============================================================

import { useEditorStore } from '@/stores';
import { NodeProperties } from './NodeProperties';
import { BeamProperties } from './BeamProperties';
import { ColumnProperties } from './ColumnProperties';
import { X } from 'lucide-react';
import type { StructuralNode, Beam, Column, Brace } from '@ledesign/structural';

export function PropertiesPanel() {
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const nodes = useEditorStore((state) => state.nodes);
  const beams = useEditorStore((state) => state.beams);
  const columns = useEditorStore((state) => state.columns);
  const braces = useEditorStore((state) => state.braces);
  const togglePanel = useEditorStore((state) => state.togglePanel);

  // Get selected elements with type discrimination
  type SelectedElement =
    | { type: 'node'; data: StructuralNode }
    | { type: 'beam'; data: Beam }
    | { type: 'column'; data: Column }
    | { type: 'brace'; data: Brace };

  const selectedElements: SelectedElement[] = Array.from(selectedIds)
    .map((id): SelectedElement | null => {
      if (id.startsWith('nd_')) {
        const data = nodes.get(id);
        return data ? { type: 'node', data } : null;
      }
      if (id.startsWith('bm_')) {
        const data = beams.get(id);
        return data ? { type: 'beam', data } : null;
      }
      if (id.startsWith('col_')) {
        const data = columns.get(id);
        return data ? { type: 'column', data } : null;
      }
      if (id.startsWith('br_')) {
        const data = braces.get(id);
        return data ? { type: 'brace', data } : null;
      }
      return null;
    })
    .filter((el): el is SelectedElement => el !== null);

  const selectedCount = selectedElements.length;
  const firstElement = selectedElements[0];

  return (
    <div className="h-full bg-lele-panel flex flex-col">
      {/* Header */}
      <div className="h-10 px-3 flex items-center justify-between border-b border-lele-border shrink-0">
        <h2 className="text-sm font-medium text-slate-200">Properties</h2>
        <button
          onClick={() => togglePanel('propertiesPanel')}
          className="p-1 hover:bg-lele-bg rounded transition-colors"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {selectedCount === 0 ? (
          <div className="text-sm text-slate-500 text-center py-8">
            Select an element to view its properties
          </div>
        ) : selectedCount > 1 ? (
          <MultiSelectInfo count={selectedCount} />
        ) : firstElement?.type === 'node' && firstElement.data ? (
          <NodeProperties node={firstElement.data} />
        ) : firstElement?.type === 'beam' && firstElement.data ? (
          <BeamProperties beam={firstElement.data} />
        ) : firstElement?.type === 'column' && firstElement.data ? (
          <ColumnProperties column={firstElement.data} />
        ) : (
          <div className="text-sm text-slate-500 text-center py-8">
            Properties not available for this element type
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MULTI-SELECT INFO
// ============================================================

function MultiSelectInfo({ count }: { count: number }) {
  return (
    <div className="text-center py-8">
      <div className="text-2xl font-bold text-slate-200 mb-1">{count}</div>
      <div className="text-sm text-slate-500">elements selected</div>
      <div className="mt-4 text-xs text-slate-600">
        Select a single element to edit properties
      </div>
    </div>
  );
}
