// ============================================================
// COMMAND REGISTRY
// All available commands for the command palette
// ============================================================

import { DrawingTool, ViewMode } from '@/stores/slices/types';

export interface Command {
  id: string;
  label: string;
  description?: string;
  keywords?: string[];
  icon?: string;
  category: CommandCategory;
  shortcut?: string;
  action: () => void | Promise<void>;
}

export type CommandCategory =
  | 'tools'
  | 'view'
  | 'edit'
  | 'create'
  | 'analysis'
  | 'file'
  | 'panels';

export interface CommandGroup {
  category: CommandCategory;
  label: string;
  commands: Command[];
}

// Factory function to create commands with store access
export function createCommands(actions: {
  setActiveTool: (tool: DrawingTool) => void;
  setViewMode: (mode: ViewMode) => void;
  togglePanel: (panel: 'propertiesPanel' | 'treePanel' | 'aiChatPanel') => void;
  undo: () => void;
  redo: () => void;
  clearSelection: () => void;
  setShowGrid: (show: boolean) => void;
  setSnapToGrid: (snap: boolean) => void;
  showGrid: boolean;
  snapToGrid: boolean;
}): Command[] {
  return [
    // ============================================================
    // TOOLS
    // ============================================================
    {
      id: 'tool-select',
      label: 'Select Tool',
      description: 'Select and manipulate elements',
      keywords: ['pointer', 'cursor', 'pick'],
      category: 'tools',
      shortcut: 'V',
      action: () => actions.setActiveTool('select'),
    },
    {
      id: 'tool-pan',
      label: 'Pan Tool',
      description: 'Pan the viewport',
      keywords: ['move', 'drag', 'hand'],
      category: 'tools',
      shortcut: 'H',
      action: () => actions.setActiveTool('pan'),
    },
    {
      id: 'tool-orbit',
      label: 'Orbit Tool',
      description: 'Rotate the 3D view',
      keywords: ['rotate', 'spin', '3d'],
      category: 'tools',
      shortcut: 'O',
      action: () => actions.setActiveTool('orbit'),
    },
    {
      id: 'tool-node',
      label: 'Draw Node',
      description: 'Place structural nodes/joints',
      keywords: ['point', 'joint', 'vertex'],
      category: 'tools',
      shortcut: 'N',
      action: () => actions.setActiveTool('node'),
    },
    {
      id: 'tool-beam',
      label: 'Draw Beam',
      description: 'Draw horizontal beams',
      keywords: ['girder', 'joist', 'horizontal'],
      category: 'tools',
      shortcut: 'B',
      action: () => actions.setActiveTool('beam'),
    },
    {
      id: 'tool-column',
      label: 'Draw Column',
      description: 'Draw vertical columns',
      keywords: ['pillar', 'post', 'vertical'],
      category: 'tools',
      shortcut: 'C',
      action: () => actions.setActiveTool('column'),
    },
    {
      id: 'tool-brace',
      label: 'Draw Brace',
      description: 'Draw diagonal bracing',
      keywords: ['diagonal', 'strut', 'x-brace'],
      category: 'tools',
      shortcut: 'X',
      action: () => actions.setActiveTool('brace'),
    },

    // ============================================================
    // VIEW
    // ============================================================
    {
      id: 'view-3d',
      label: '3D View',
      description: 'Switch to 3D perspective',
      keywords: ['perspective', 'isometric'],
      category: 'view',
      shortcut: '1',
      action: () => actions.setViewMode('3d'),
    },
    {
      id: 'view-plan',
      label: 'Plan View',
      description: 'Top-down view (XY plane)',
      keywords: ['top', 'xy', 'floor'],
      category: 'view',
      shortcut: '2',
      action: () => actions.setViewMode('plan'),
    },
    {
      id: 'view-elevation-x',
      label: 'Elevation X',
      description: 'Front elevation (YZ plane)',
      keywords: ['front', 'yz'],
      category: 'view',
      shortcut: '3',
      action: () => actions.setViewMode('elevation-x'),
    },
    {
      id: 'view-elevation-y',
      label: 'Elevation Y',
      description: 'Side elevation (XZ plane)',
      keywords: ['side', 'xz'],
      category: 'view',
      shortcut: '4',
      action: () => actions.setViewMode('elevation-y'),
    },
    {
      id: 'view-toggle-grid',
      label: 'Toggle Grid',
      description: actions.showGrid ? 'Hide grid' : 'Show grid',
      keywords: ['grid', 'lines'],
      category: 'view',
      shortcut: 'G',
      action: () => actions.setShowGrid(!actions.showGrid),
    },
    {
      id: 'view-toggle-snap',
      label: 'Toggle Snap to Grid',
      description: actions.snapToGrid ? 'Disable snapping' : 'Enable snapping',
      keywords: ['snap', 'align'],
      category: 'view',
      shortcut: 'S',
      action: () => actions.setSnapToGrid(!actions.snapToGrid),
    },

    // ============================================================
    // EDIT
    // ============================================================
    {
      id: 'edit-undo',
      label: 'Undo',
      description: 'Undo last action',
      keywords: ['back', 'revert'],
      category: 'edit',
      shortcut: '⌘Z',
      action: () => actions.undo(),
    },
    {
      id: 'edit-redo',
      label: 'Redo',
      description: 'Redo last undone action',
      keywords: ['forward'],
      category: 'edit',
      shortcut: '⌘⇧Z',
      action: () => actions.redo(),
    },
    {
      id: 'edit-deselect',
      label: 'Deselect All',
      description: 'Clear selection',
      keywords: ['clear', 'none'],
      category: 'edit',
      shortcut: 'Esc',
      action: () => actions.clearSelection(),
    },

    // ============================================================
    // PANELS
    // ============================================================
    {
      id: 'panel-properties',
      label: 'Toggle Properties Panel',
      description: 'Show/hide properties panel',
      keywords: ['inspector', 'details'],
      category: 'panels',
      action: () => actions.togglePanel('propertiesPanel'),
    },
    {
      id: 'panel-tree',
      label: 'Toggle Model Tree',
      description: 'Show/hide model tree panel',
      keywords: ['hierarchy', 'outline', 'explorer'],
      category: 'panels',
      action: () => actions.togglePanel('treePanel'),
    },
    {
      id: 'panel-ai',
      label: 'Toggle AI Assistant',
      description: 'Show/hide AI chat panel',
      keywords: ['chat', 'assistant', 'help'],
      category: 'panels',
      action: () => actions.togglePanel('aiChatPanel'),
    },

    // ============================================================
    // ANALYSIS
    // ============================================================
    {
      id: 'analysis-run',
      label: 'Run Analysis',
      description: 'Run structural analysis on model',
      keywords: ['calculate', 'solve', 'compute'],
      category: 'analysis',
      shortcut: '⌘⏎',
      action: () => {
        // TODO: Trigger analysis
        console.log('Run analysis');
      },
    },
  ];
}

// Group commands by category for display
export function groupCommands(commands: Command[]): CommandGroup[] {
  const categoryLabels: Record<CommandCategory, string> = {
    tools: 'Tools',
    view: 'View',
    edit: 'Edit',
    create: 'Create',
    analysis: 'Analysis',
    file: 'File',
    panels: 'Panels',
  };

  const groups: Map<CommandCategory, Command[]> = new Map();

  for (const command of commands) {
    const existing = groups.get(command.category) || [];
    existing.push(command);
    groups.set(command.category, existing);
  }

  return Array.from(groups.entries()).map(([category, cmds]) => ({
    category,
    label: categoryLabels[category],
    commands: cmds,
  }));
}
