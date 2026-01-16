'use client';

// ============================================================
// EDITOR LAYOUT
// Main layout orchestrator with resizable panels
// ============================================================

import { useEffect } from 'react';
import {
  Panel,
  Group,
  Separator,
} from 'react-resizable-panels';
import { useEditorStore } from '@/stores';
import { EditorHeader } from './EditorHeader';
import { Toolbar } from './Toolbar/Toolbar';
import { Scene } from './Canvas3D/Scene';
import { CommandPalette } from './CommandPalette';
import { StatusBar } from './StatusBar';
import { PropertiesPanel } from '../panels/PropertiesPanel/PropertiesPanel';
import { TreePanel } from '../panels/TreePanel/TreePanel';
import { AIChatPanel } from '../panels/AIChat/AIChatPanel';
import { ResultsPanel } from '../panels/ResultsPanel/ResultsPanel';

interface EditorLayoutProps {
  projectId: string;
  projectName?: string;
}

export function EditorLayout({ projectId, projectName }: EditorLayoutProps) {
  const treePanel = useEditorStore((state) => state.treePanel);
  const propertiesPanel = useEditorStore((state) => state.propertiesPanel);
  const aiChatPanel = useEditorStore((state) => state.aiChatPanel);
  const resultsPanel = useEditorStore((state) => state.resultsPanel);
  const setProjectId = useEditorStore((state) => state.setProjectId);

  // Set project context on mount
  useEffect(() => {
    setProjectId(projectId);
  }, [projectId, setProjectId]);

  return (
    <div className="flex flex-col h-screen bg-lele-bg text-slate-200 overflow-hidden">
      {/* Command Palette (⌘K) */}
      <CommandPalette />

      {/* Header */}
      <EditorHeader projectId={projectId} projectName={projectName || 'Untitled Project'} />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Toolbar (left side) */}
        <Toolbar />

        {/* Resizable Panel Layout */}
        <Group orientation="horizontal" className="flex-1">
          {/* Left Panel - Tree View */}
          {treePanel.isOpen && (
            <>
              <Panel
                id="tree-panel"
                defaultSize={15}
                minSize={10}
                maxSize={25}
              >
                <TreePanel />
              </Panel>
              <ResizeHandle />
            </>
          )}

          {/* Center - 3D Viewport */}
          <Panel id="viewport" minSize={30}>
            <div className="h-full bg-lele-bg relative">
              <Scene />
            </div>
          </Panel>

          {/* Right Panel - Results, Properties, or AI Chat */}
          {(resultsPanel.isOpen || propertiesPanel.isOpen || aiChatPanel.isOpen) && (
            <>
              <ResizeHandle />
              <Panel
                id="right-panel"
                defaultSize={20}
                minSize={15}
                maxSize={40}
              >
                <RightPanelContent />
              </Panel>
            </>
          )}
        </Group>
      </div>

      {/* Status Bar */}
      <StatusBar />
    </div>
  );
}

// ============================================================
// RIGHT PANEL CONTENT
// Switches between Properties and AI Chat panels
// ============================================================

function RightPanelContent() {
  const resultsPanel = useEditorStore((state) => state.resultsPanel);
  const propertiesPanel = useEditorStore((state) => state.propertiesPanel);
  const aiChatPanel = useEditorStore((state) => state.aiChatPanel);

  // Priority: Results > Properties > AI Chat
  if (resultsPanel.isOpen) {
    return <ResultsPanel />;
  }

  if (propertiesPanel.isOpen) {
    return <PropertiesPanel />;
  }

  if (aiChatPanel.isOpen) {
    return <AIChatPanel />;
  }

  return null;
}

// ============================================================
// RESIZE HANDLE
// Styled handle for panel resizing
// ============================================================

function ResizeHandle() {
  return (
    <Separator className="w-1 bg-lele-border hover:bg-lele-accent transition-colors duration-150 cursor-col-resize" />
  );
}
