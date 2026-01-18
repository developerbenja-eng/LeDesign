// ============================================================
// HOOK: MODULE ACCESS
// ============================================================
// React hook for checking project module access

import { useState, useEffect } from 'react';
import type { ModuleType } from '@/lib/modules/module-access';

interface ModuleAccessResult {
  modules: ModuleType[];
  hasAccess: (module: ModuleType) => boolean;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to check which modules are enabled for a project
 */
export function useModuleAccess(projectId: string): ModuleAccessResult {
  const [modules, setModules] = useState<ModuleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchModules = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/projects/${projectId}/modules`);

      if (!response.ok) {
        throw new Error('Failed to fetch modules');
      }

      const data = await response.json();
      setModules(data.modules || []);
    } catch (err) {
      console.error('Error fetching module access:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setModules([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchModules();
    }
  }, [projectId]);

  const hasAccess = (module: ModuleType): boolean => {
    return modules.includes(module);
  };

  return {
    modules,
    hasAccess,
    loading,
    error,
    refetch: fetchModules,
  };
}

/**
 * Hook to enable/disable a module
 */
export function useModuleToggle(projectId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const toggleModule = async (
    module: ModuleType,
    action: 'enable' | 'disable'
  ): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/projects/${projectId}/modules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ module, action }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} module`);
      }

      return true;
    } catch (err) {
      console.error(`Error ${action}ing module:`, err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    toggleModule,
    loading,
    error,
  };
}
