'use client';

// ============================================================
// STRUCTURAL EDITOR PAGE
// Main page for the 3D structural modeling editor
// ============================================================

import { use, useEffect, useState } from 'react';
import { EditorLayout } from '@/components/editor/EditorLayout';

interface EditorPageProps {
  params: Promise<{ id: string }>;
}

export default function EditorPage({ params }: EditorPageProps) {
  const { id: projectId } = use(params);
  const [projectName, setProjectName] = useState<string>('Loading...');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load project data
  useEffect(() => {
    async function loadProject() {
      try {
        const response = await fetch(`/api/structural/projects/${projectId}`);
        if (!response.ok) {
          throw new Error('Project not found');
        }
        const data = await response.json();
        setProjectName(data.name || 'Untitled Project');
        setIsLoading(false);
      } catch (err) {
        // For now, allow loading even if project doesn't exist (demo mode)
        setProjectName('New Project');
        setIsLoading(false);
      }
    }

    loadProject();
  }, [projectId]);

  if (isLoading) {
    return (
      <div className="h-screen bg-lele-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-lele-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-400">Loading project...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-lele-bg flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-slate-200 mb-2">Error</h1>
          <p className="text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  return <EditorLayout projectId={projectId} projectName={projectName} />;
}
