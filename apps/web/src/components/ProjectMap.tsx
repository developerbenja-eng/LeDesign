'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Project } from '@/types/user';

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);
const Rectangle = dynamic(
  () => import('react-leaflet').then((mod) => mod.Rectangle),
  { ssr: false }
);

interface ProjectMapProps {
  projects: Project[];
  onProjectClick?: (project: Project) => void;
  selectedProjectId?: string;
  className?: string;
}

// Chile center coordinates
const CHILE_CENTER: [number, number] = [-33.45, -70.65]; // Santiago
const DEFAULT_ZOOM = 6;

// Project type colors
const PROJECT_TYPE_COLORS: Record<string, string> = {
  pavement: '#3B82F6', // blue
  sewer: '#8B5CF6', // purple
  drainage: '#10B981', // green
  mixed: '#F59E0B', // amber
  default: '#6B7280', // gray
};

export default function ProjectMap({
  projects,
  onProjectClick,
  selectedProjectId,
  className = '',
}: ProjectMapProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Import Leaflet CSS - dynamically add to head
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    link.crossOrigin = '';
    if (!document.querySelector('link[href*="leaflet.css"]')) {
      document.head.appendChild(link);
    }
  }, []);

  if (!isMounted) {
    return (
      <div className={`bg-cad-bg flex items-center justify-center ${className}`}>
        <p className="text-gray-400">Loading map...</p>
      </div>
    );
  }

  const projectsWithLocation = projects.filter(
    (p) => p.center_lat !== null && p.center_lon !== null
  );

  return (
    <div className={`relative ${className}`}>
      <MapContainer
        center={CHILE_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: '100%', width: '100%' }}
        className="rounded-lg"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {projectsWithLocation.map((project) => {
          const isSelected = project.id === selectedProjectId;
          const color = PROJECT_TYPE_COLORS[project.project_type || 'default'];

          // Show bounding box if available
          const hasBounds =
            project.bounds_south !== null &&
            project.bounds_north !== null &&
            project.bounds_west !== null &&
            project.bounds_east !== null;

          return (
            <div key={project.id}>
              {hasBounds && (
                <Rectangle
                  bounds={[
                    [project.bounds_south!, project.bounds_west!],
                    [project.bounds_north!, project.bounds_east!],
                  ]}
                  pathOptions={{
                    color: isSelected ? '#FBBF24' : color,
                    weight: isSelected ? 3 : 2,
                    fillOpacity: 0.1,
                  }}
                />
              )}

              <Marker
                position={[project.center_lat!, project.center_lon!]}
                eventHandlers={{
                  click: () => onProjectClick?.(project),
                }}
              >
                <Popup>
                  <div className="min-w-[200px]">
                    <h3 className="font-bold text-lg">{project.name}</h3>
                    {project.description && (
                      <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                    )}
                    <div className="mt-2 text-xs space-y-1">
                      {project.region && (
                        <p>
                          <span className="font-medium">Region:</span> {project.region}
                        </p>
                      )}
                      {project.comuna && (
                        <p>
                          <span className="font-medium">Comuna:</span> {project.comuna}
                        </p>
                      )}
                      {project.project_type && (
                        <p>
                          <span className="font-medium">Type:</span>{' '}
                          <span
                            className="px-2 py-0.5 rounded text-white text-xs"
                            style={{ backgroundColor: color }}
                          >
                            {project.project_type}
                          </span>
                        </p>
                      )}
                      <p>
                        <span className="font-medium">Status:</span>{' '}
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            project.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : project.status === 'completed'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {project.status}
                        </span>
                      </p>
                    </div>
                    {onProjectClick && (
                      <button
                        onClick={() => onProjectClick(project)}
                        className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-3 rounded text-sm"
                      >
                        Open Project
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            </div>
          );
        })}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur rounded-lg p-3 shadow-lg z-[1000]">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">Project Types</h4>
        <div className="space-y-1">
          {Object.entries(PROJECT_TYPE_COLORS)
            .filter(([key]) => key !== 'default')
            .map(([type, color]) => (
              <div key={type} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs text-gray-600 capitalize">{type}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Stats */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur rounded-lg p-3 shadow-lg z-[1000]">
        <p className="text-xs text-gray-600">
          <span className="font-semibold">{projectsWithLocation.length}</span> projects on map
        </p>
        <p className="text-xs text-gray-600">
          <span className="font-semibold">{projects.length - projectsWithLocation.length}</span>{' '}
          without location
        </p>
      </div>
    </div>
  );
}
