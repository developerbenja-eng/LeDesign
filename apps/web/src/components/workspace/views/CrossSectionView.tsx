'use client';

// ============================================================
// CROSS SECTION VIEW
// Transverse sections along alignment
// ============================================================

import type { ViewInstance } from '@/stores/workspace-store';

interface CrossSectionViewProps {
  view: ViewInstance;
}

export function CrossSectionView({ view }: CrossSectionViewProps) {
  return (
    <div className="h-full flex items-center justify-center bg-slate-900 text-slate-500">
      <div className="text-center">
        <p className="text-lg mb-2">Cross Section View</p>
        <p className="text-sm">Coming soon...</p>
      </div>
    </div>
  );
}
