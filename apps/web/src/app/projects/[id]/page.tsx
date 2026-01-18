'use client';

// ============================================================
// CIVIL ENGINEERING EDITOR PAGE
// Main page for the CAD/civil engineering editor
// ============================================================

import { use, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CivilEditorLayout } from '@/components/editor/CivilEditorLayout';

interface CivilEditorPageProps {
  params: Promise<{ id: string }>;
}

export default function CivilEditorPage({ params }: CivilEditorPageProps) {
  const { id: projectId } = use(params);
  const searchParams = useSearchParams();
  const [projectName, setProjectName] = useState<string>('Loading...');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialDesignType, setInitialDesignType] = useState<string | null>(null);

  // Load project data
  useEffect(() => {
    async function loadProject() {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/projects/${projectId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Project not found');
        }

        const data = await response.json();
        setProjectName(data.name || 'Untitled Project');

        // Get design type from URL query parameter
        const designType = searchParams.get('designType');
        if (designType) {
          setInitialDesignType(designType);
        }

        setIsLoading(false);
      } catch (err) {
        // For now, allow loading even if project doesn't exist (demo mode)
        setProjectName('New Civil Project');

        // Get design type from URL query parameter
        const designType = searchParams.get('designType');
        if (designType) {
          setInitialDesignType(designType);
        }

        setIsLoading(false);
      }
    }

    loadProject();
  }, [projectId, searchParams]);

  if (isLoading) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-400">Loading project...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-slate-200 mb-2">Error</h1>
          <p className="text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <CivilEditorLayout
      projectId={projectId}
      projectName={projectName}
      initialDesignType={initialDesignType || undefined}
    />
  );
}
