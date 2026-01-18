'use client';

// ============================================================
// VIEW RENDERER
// Routes to appropriate view component based on type
// ============================================================

import type { ViewInstance } from '@/stores/workspace-store';
import { PlanView } from './views/PlanView';
import { ProfileView } from './views/ProfileView';
import { CrossSectionView } from './views/CrossSectionView';
import { View3D } from './views/View3D';
import { CubicacionesView } from './views/CubicacionesView';
import { DetailsView } from './views/DetailsView';
import { AlignmentView } from './views/AlignmentView';
import { LayersView } from './views/LayersView';
import { PropertiesView } from './views/PropertiesView';

interface ViewRendererProps {
  view: ViewInstance;
}

export function ViewRenderer({ view }: ViewRendererProps) {
  switch (view.type) {
    case 'plan':
      return <PlanView view={view} />;
    case 'profile':
      return <ProfileView view={view} />;
    case 'cross-section':
      return <CrossSectionView view={view} />;
    case '3d':
      return <View3D view={view} />;
    case 'cubicaciones':
      return <CubicacionesView view={view} />;
    case 'details':
      return <DetailsView view={view} />;
    case 'alignment':
      return <AlignmentView view={view} />;
    case 'layers':
      return <LayersView view={view} />;
    case 'properties':
      return <PropertiesView view={view} />;
    default:
      return (
        <div className="h-full flex items-center justify-center text-slate-500">
          <p>Unknown view type: {view.type}</p>
        </div>
      );
  }
}
