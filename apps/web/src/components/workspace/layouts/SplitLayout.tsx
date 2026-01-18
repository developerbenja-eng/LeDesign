'use client';

// ============================================================
// SPLIT LAYOUT
// Resizable split panes for multiple simultaneous views
// ============================================================

import { useState, useRef, useEffect } from 'react';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { ViewRenderer } from '../ViewRenderer';
import { GripVertical, GripHorizontal } from 'lucide-react';

export function SplitLayout() {
  const views = useWorkspaceStore((state) => state.views);
  const splitLayout = useWorkspaceStore((state) => state.splitLayout);

  // Simple 2-pane split for now (can be extended to nested splits)
  const [splitPercent, setSplitPercent] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get first two views
  const leftView = views[0];
  const rightView = views[1];

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const percent = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPercent(Math.max(20, Math.min(80, percent)));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  if (views.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500">
        <p>No views available</p>
      </div>
    );
  }

  if (views.length === 1) {
    return (
      <div className="h-full">
        <ViewRenderer view={leftView} />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full flex relative">
      {/* Left Pane */}
      <div
        className="relative flex flex-col border-r border-slate-700"
        style={{ width: `${splitPercent}%` }}
      >
        {/* View Header */}
        <div className="px-3 py-2 bg-slate-800/50 border-b border-slate-700">
          <h4 className="text-sm font-medium text-white">{leftView.title}</h4>
        </div>
        {/* View Content */}
        <div className="flex-1 overflow-hidden">
          <ViewRenderer view={leftView} />
        </div>
      </div>

      {/* Resizer */}
      <div
        className={`w-1 bg-slate-700 hover:bg-blue-500 cursor-col-resize flex items-center justify-center transition-colors ${
          isDragging ? 'bg-blue-500' : ''
        }`}
        onMouseDown={() => setIsDragging(true)}
      >
        <GripVertical
          size={16}
          className={`text-slate-400 ${isDragging ? 'text-blue-400' : ''}`}
        />
      </div>

      {/* Right Pane */}
      <div
        className="relative flex flex-col"
        style={{ width: `${100 - splitPercent}%` }}
      >
        {/* View Header */}
        <div className="px-3 py-2 bg-slate-800/50 border-b border-slate-700">
          <h4 className="text-sm font-medium text-white">{rightView.title}</h4>
        </div>
        {/* View Content */}
        <div className="flex-1 overflow-hidden">
          <ViewRenderer view={rightView} />
        </div>
      </div>
    </div>
  );
}
