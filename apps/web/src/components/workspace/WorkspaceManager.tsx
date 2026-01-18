'use client';

// ============================================================
// WORKSPACE MANAGER
// Multi-view layout system with tabs, split panes, and floating windows
// ============================================================

import { useWorkspaceStore } from '@/stores/workspace-store';
import { TabbedLayout } from './layouts/TabbedLayout';
import { SidebarLayout } from './layouts/SidebarLayout';
import { SplitLayout } from './layouts/SplitLayout';
import { FloatingLayout } from './layouts/FloatingLayout';

export function WorkspaceManager() {
  const layoutMode = useWorkspaceStore((state) => state.layoutMode);

  // Render appropriate layout based on mode
  switch (layoutMode) {
    case 'tabs':
      return <TabbedLayout />;
    case 'sidebar':
      return <SidebarLayout />;
    case 'split':
      return <SplitLayout />;
    case 'floating':
      return <FloatingLayout />;
    default:
      return <TabbedLayout />;
  }
}
