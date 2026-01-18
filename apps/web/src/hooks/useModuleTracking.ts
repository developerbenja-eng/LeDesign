// ============================================================
// HOOK: MODULE USAGE TRACKING
// ============================================================
// Automatically track when modules are actively used

import { useEffect, useRef } from 'react';
import type { ModuleType } from '@/lib/modules/module-access';

/**
 * Hook to track module usage automatically
 * Call this in module panels to track when they're actively used
 *
 * Tracks usage when:
 * - Component mounts (panel opened)
 * - User interacts with the panel (optional)
 *
 * @param projectId - The project ID
 * @param module - The module being used
 * @param trackOnMount - Whether to track on mount (default: true)
 * @param trackInterval - How often to update usage in ms (default: 5 minutes)
 */
export function useModuleTracking(
  projectId: string,
  module: ModuleType,
  trackOnMount: boolean = true,
  trackInterval: number = 5 * 60 * 1000 // 5 minutes
) {
  const lastTrackedRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const trackUsage = async () => {
    const now = Date.now();

    // Don't track too frequently
    if (now - lastTrackedRef.current < trackInterval) {
      return;
    }

    try {
      await fetch(`/api/projects/${projectId}/modules/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ module }),
      });

      lastTrackedRef.current = now;
    } catch (error) {
      console.error('Error tracking module usage:', error);
    }
  };

  useEffect(() => {
    if (!projectId) return;

    // Track on mount if enabled
    if (trackOnMount) {
      trackUsage();
    }

    // Set up periodic tracking
    intervalRef.current = setInterval(trackUsage, trackInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [projectId, module, trackOnMount, trackInterval]);

  // Return manual track function for user interactions
  return { trackUsage };
}

/**
 * Hook to get module usage summary
 */
export function useModuleUsageSummary(projectId: string) {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!projectId) return;

    const fetchSummary = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/projects/${projectId}/modules/track`);

        if (!response.ok) {
          throw new Error('Failed to fetch usage summary');
        }

        const data = await response.json();
        setSummary(data.summary);
      } catch (err) {
        console.error('Error fetching usage summary:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [projectId]);

  return { summary, loading, error };
}

// Import useState for the second hook
import { useState } from 'react';
