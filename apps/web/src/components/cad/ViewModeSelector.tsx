'use client';

import { useCADStore } from '@/stores/cad-store';
import type { ViewMode } from '@/types/cad';

const VIEW_MODES: { mode: ViewMode; label: string; description: string }[] = [
  {
    mode: 'design',
    label: 'Design',
    description: 'CAD drawing only',
  },
  {
    mode: 'reference',
    label: 'Reference',
    description: 'CAD over satellite map',
  },
  {
    mode: 'analysis',
    label: 'Analysis',
    description: 'CAD + map + data layers',
  },
];

export default function ViewModeSelector() {
  const viewMode = useCADStore((state) => state.viewMode);
  const setViewMode = useCADStore((state) => state.setViewMode);
  const geoTransform = useCADStore((state) => state.geoTransform);

  return (
    <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
      {VIEW_MODES.map(({ mode, label, description }) => {
        const isActive = viewMode === mode;
        const needsGeoref = mode !== 'design' && !geoTransform?.isValid;

        return (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            disabled={needsGeoref}
            title={needsGeoref ? 'Georeferencing required' : description}
            className={`
              px-3 py-1.5 text-sm rounded-md transition-colors
              ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : needsGeoref
                  ? 'text-gray-500 cursor-not-allowed'
                  : 'text-gray-300 hover:bg-gray-700'
              }
            `}
          >
            {label}
            {needsGeoref && mode !== 'design' && (
              <span className="ml-1 text-yellow-500">*</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
