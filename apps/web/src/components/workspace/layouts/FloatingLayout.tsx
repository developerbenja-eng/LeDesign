'use client';

// ============================================================
// FLOATING LAYOUT
// Independent draggable windows
// ============================================================

import { useState, useRef } from 'react';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { ViewRenderer } from '../ViewRenderer';
import { X, Maximize2, Minimize2, Move } from 'lucide-react';

export function FloatingLayout() {
  const views = useWorkspaceStore((state) => state.views);
  const removeView = useWorkspaceStore((state) => state.removeView);
  const updateView = useWorkspaceStore((state) => state.updateView);
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent, viewId: string, currentX: number, currentY: number) => {
    setDraggingId(viewId);
    setDragOffset({
      x: e.clientX - currentX,
      y: e.clientY - currentY,
    });
    setActiveView(viewId);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!draggingId) return;

    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;

    updateView(draggingId, {
      position: {
        x: Math.max(0, newX),
        y: Math.max(0, newY),
        width: views.find((v) => v.id === draggingId)?.position?.width || 600,
        height: views.find((v) => v.id === draggingId)?.position?.height || 400,
      },
    });
  };

  const handleMouseUp = () => {
    setDraggingId(null);
  };

  // Attach global mouse listeners
  React.useEffect(() => {
    if (!draggingId) return;

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingId, dragOffset]);

  return (
    <div className="h-full relative bg-slate-900">
      {views.map((view, index) => {
        const position = view.position || {
          x: 50 + index * 30,
          y: 50 + index * 30,
          width: 600,
          height: 400,
        };

        return (
          <div
            key={view.id}
            className={`absolute rounded-lg overflow-hidden shadow-2xl border ${
              view.isActive
                ? 'border-blue-500 z-50'
                : 'border-slate-700 z-40'
            }`}
            style={{
              left: position.x,
              top: position.y,
              width: position.width,
              height: position.height,
            }}
            onClick={() => setActiveView(view.id)}
          >
            {/* Window Header */}
            <div
              className={`flex items-center gap-2 px-3 py-2 cursor-move ${
                view.isActive ? 'bg-blue-600/20' : 'bg-slate-800/50'
              } border-b border-slate-700`}
              onMouseDown={(e) => handleMouseDown(e, view.id, position.x, position.y)}
            >
              <Move size={14} className="text-slate-400" />
              <span className="flex-1 text-sm font-medium text-white truncate">
                {view.title}
              </span>
              {view.isDirty && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeView(view.id);
                }}
                className="hover:bg-slate-700 rounded p-1 transition-colors"
              >
                <X size={14} className="text-slate-400" />
              </button>
            </div>

            {/* Window Content */}
            <div className="h-[calc(100%-40px)] bg-slate-900">
              <ViewRenderer view={view} />
            </div>
          </div>
        );
      })}

      {views.length === 0 && (
        <div className="h-full flex items-center justify-center text-slate-500">
          <p>No floating windows</p>
        </div>
      )}
    </div>
  );
}
