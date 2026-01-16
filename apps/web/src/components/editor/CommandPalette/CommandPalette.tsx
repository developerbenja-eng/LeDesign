'use client';

// ============================================================
// COMMAND PALETTE
// ⌘K powered command palette for quick actions
// ============================================================

import { useEffect, useMemo, useCallback, useState } from 'react';
import { Command as Cmdk } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MousePointer2,
  Hand,
  RotateCcw,
  Circle,
  Minus,
  Square,
  Triangle,
  Box,
  Grid3X3,
  Magnet,
  Undo2,
  Redo2,
  XCircle,
  PanelLeft,
  PanelRight,
  MessageSquare,
  Play,
  Eye,
  Layers,
  ArrowUp,
  ArrowRight,
} from 'lucide-react';
import { useEditorStore } from '@/stores';
import { createCommands, groupCommands, type Command, type CommandCategory } from './commands';

// Icon mapping for commands
const categoryIcons: Record<CommandCategory, React.ReactNode> = {
  tools: <MousePointer2 size={14} />,
  view: <Eye size={14} />,
  edit: <Undo2 size={14} />,
  create: <Box size={14} />,
  analysis: <Play size={14} />,
  file: <Layers size={14} />,
  panels: <PanelLeft size={14} />,
};

const commandIcons: Record<string, React.ReactNode> = {
  'tool-select': <MousePointer2 size={16} />,
  'tool-pan': <Hand size={16} />,
  'tool-orbit': <RotateCcw size={16} />,
  'tool-node': <Circle size={16} />,
  'tool-beam': <Minus size={16} />,
  'tool-column': <Square size={16} />,
  'tool-brace': <Triangle size={16} />,
  'view-3d': <Box size={16} />,
  'view-plan': <Grid3X3 size={16} />,
  'view-elevation-x': <ArrowUp size={16} />,
  'view-elevation-y': <ArrowRight size={16} />,
  'view-toggle-grid': <Grid3X3 size={16} />,
  'view-toggle-snap': <Magnet size={16} />,
  'edit-undo': <Undo2 size={16} />,
  'edit-redo': <Redo2 size={16} />,
  'edit-deselect': <XCircle size={16} />,
  'panel-properties': <PanelRight size={16} />,
  'panel-tree': <PanelLeft size={16} />,
  'panel-ai': <MessageSquare size={16} />,
  'analysis-run': <Play size={16} />,
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Get store actions
  const setActiveTool = useEditorStore((state) => state.setActiveTool);
  const setViewMode = useEditorStore((state) => state.setViewMode);
  const togglePanel = useEditorStore((state) => state.togglePanel);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const clearSelection = useEditorStore((state) => state.clearSelection);
  const setShowGrid = useEditorStore((state) => state.setShowGrid);
  const setSnapToGrid = useEditorStore((state) => state.setSnapToGrid);
  const showGrid = useEditorStore((state) => state.showGrid);
  const snapToGrid = useEditorStore((state) => state.snapToGrid);

  // Create commands with current store state
  const commands = useMemo(
    () =>
      createCommands({
        setActiveTool,
        setViewMode,
        togglePanel,
        undo,
        redo,
        clearSelection,
        setShowGrid,
        setSnapToGrid,
        showGrid,
        snapToGrid,
      }),
    [
      setActiveTool,
      setViewMode,
      togglePanel,
      undo,
      redo,
      clearSelection,
      setShowGrid,
      setSnapToGrid,
      showGrid,
      snapToGrid,
    ]
  );

  const commandGroups = useMemo(() => groupCommands(commands), [commands]);

  // Keyboard shortcut to open palette
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      // Escape to close
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open]);

  // Execute command and close palette
  const executeCommand = useCallback((command: Command) => {
    command.action();
    setOpen(false);
    setSearch('');
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => setOpen(false)}
          />

          {/* Command Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 z-50 w-full max-w-xl"
          >
            <Cmdk
              className="bg-lele-panel border border-lele-border rounded-xl shadow-2xl overflow-hidden"
              loop
            >
              {/* Search Input */}
              <div className="flex items-center px-4 border-b border-lele-border">
                <svg
                  className="w-4 h-4 text-slate-400 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <Cmdk.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Type a command or search..."
                  className="flex-1 py-4 bg-transparent text-slate-200 placeholder-slate-500 outline-none text-sm"
                  autoFocus
                />
                <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 bg-lele-bg rounded text-xs text-slate-500">
                  ESC
                </kbd>
              </div>

              {/* Command List */}
              <Cmdk.List className="max-h-80 overflow-y-auto p-2">
                <Cmdk.Empty className="py-6 text-center text-slate-500 text-sm">
                  No commands found.
                </Cmdk.Empty>

                {commandGroups.map((group) => (
                  <Cmdk.Group
                    key={group.category}
                    heading={
                      <div className="flex items-center gap-2 px-2 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                        {categoryIcons[group.category]}
                        {group.label}
                      </div>
                    }
                  >
                    {group.commands.map((command) => (
                      <Cmdk.Item
                        key={command.id}
                        value={`${command.label} ${command.description || ''} ${command.keywords?.join(' ') || ''}`}
                        onSelect={() => executeCommand(command)}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-slate-300
                                   data-[selected=true]:bg-lele-accent/20 data-[selected=true]:text-white
                                   transition-colors duration-75"
                      >
                        <span className="flex-shrink-0 text-slate-400">
                          {commandIcons[command.id] || categoryIcons[command.category]}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{command.label}</div>
                          {command.description && (
                            <div className="text-xs text-slate-500 truncate">
                              {command.description}
                            </div>
                          )}
                        </div>
                        {command.shortcut && (
                          <kbd className="flex-shrink-0 px-2 py-0.5 bg-lele-bg rounded text-xs text-slate-500 font-mono">
                            {command.shortcut}
                          </kbd>
                        )}
                      </Cmdk.Item>
                    ))}
                  </Cmdk.Group>
                ))}
              </Cmdk.List>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-2 border-t border-lele-border text-xs text-slate-500">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-lele-bg rounded">↑↓</kbd>
                    navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-lele-bg rounded">↵</kbd>
                    select
                  </span>
                </div>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-lele-bg rounded">⌘K</kbd>
                  to toggle
                </span>
              </div>
            </Cmdk>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
