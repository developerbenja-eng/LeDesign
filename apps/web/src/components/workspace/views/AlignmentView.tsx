'use client';

import type { ViewInstance } from '@/stores/workspace-store';

interface AlignmentViewProps {
  view: ViewInstance;
}

export function AlignmentView({ view }: AlignmentViewProps) {
  return (
    <div className="h-full flex items-center justify-center bg-slate-900 text-slate-500">
      <div className="text-center">
        <p className="text-lg mb-2">Alignment Editor</p>
        <p className="text-sm">Horizontal/vertical alignment design - Coming soon...</p>
      </div>
    </div>
  );
}
