'use client';

import { useState } from 'react';
import { useCADStore } from '@/stores/cad-store';
import type { MapStyle } from '@/types/cad';

const MAP_STYLES: { style: MapStyle; label: string; icon: string }[] = [
  { style: 'satellite', label: 'Satellite', icon: '🛰️' },
  { style: 'streets', label: 'Streets', icon: '🗺️' },
  { style: 'terrain', label: 'Terrain', icon: '⛰️' },
  { style: 'dark', label: 'Dark', icon: '🌙' },
  { style: 'none', label: 'None', icon: '⬛' },
];

export default function MapStyleSelector() {
  const mapStyle = useCADStore((state) => state.mapStyle);
  const setMapStyle = useCADStore((state) => state.setMapStyle);
  const viewMode = useCADStore((state) => state.viewMode);

  const [isOpen, setIsOpen] = useState(false);

  // Only show in reference/analysis modes
  if (viewMode === 'design') {
    return null;
  }

  const currentStyle = MAP_STYLES.find((s) => s.style === mapStyle);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors"
      >
        <span>{currentStyle?.icon}</span>
        <span>{currentStyle?.label}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-1 bg-gray-800 rounded-lg shadow-xl z-20 py-1 min-w-[140px]">
            {MAP_STYLES.map(({ style, label, icon }) => (
              <button
                key={style}
                onClick={() => {
                  setMapStyle(style);
                  setIsOpen(false);
                }}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors
                  ${
                    style === mapStyle
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }
                `}
              >
                <span>{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
