'use client';

import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import { MapPin, FolderOpen } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

interface Project {
  id: string;
  name: string;
  description?: string;
  center_lat?: number;
  center_lon?: number;
  type: 'civil' | 'structural';
  updated_at: string;
}

interface ProjectsMapProps {
  projects: Project[];
  userAddress?: { lat: number; lon: number };
  onProjectClick: (projectId: string) => void;
}

// Fix Leaflet default icon issue with Next.js
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapBoundsUpdater({ projects, userAddress }: { projects: Project[]; userAddress?: { lat: number; lon: number } }) {
  const map = useMap();

  useMemo(() => {
    const locatedProjects = projects.filter(p => p.center_lat && p.center_lon);

    if (locatedProjects.length === 0 && userAddress) {
      // Center on user address if no projects have locations
      map.setView([userAddress.lat, userAddress.lon], 12);
    } else if (locatedProjects.length > 0) {
      // Fit bounds to show all located projects
      const bounds = locatedProjects.map(p => [p.center_lat!, p.center_lon!] as [number, number]);
      if (userAddress) {
        bounds.push([userAddress.lat, userAddress.lon]);
      }
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    } else {
      // Default to Biobío and Ñuble regions (south-central Chile)
      map.setView([-36.7, -72.5], 8);
    }
  }, [projects, userAddress, map]);

  return null;
}

export function ProjectsMap({ projects, userAddress, onProjectClick }: ProjectsMapProps) {
  // Separate located and non-located projects
  const locatedProjects = projects.filter(p => p.center_lat && p.center_lon);
  const nonLocatedProjects = projects.filter(p => !p.center_lat || !p.center_lon);

  // Create custom icons
  const civilIcon = new Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  const structuralIcon = new Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  const unlocatedIcon = new Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  return (
    <div className="h-full w-full relative rounded-lg overflow-hidden border border-slate-700">
      <MapContainer
        center={[-36.7, -72.5]}
        zoom={8}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapBoundsUpdater projects={projects} userAddress={userAddress} />

        {/* Render located projects */}
        {locatedProjects.map((project) => (
          <Marker
            key={project.id}
            position={[project.center_lat!, project.center_lon!]}
            icon={project.type === 'structural' ? structuralIcon : civilIcon}
            eventHandlers={{
              click: () => onProjectClick(project.id),
            }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold text-sm mb-1">{project.name}</h3>
                {project.description && (
                  <p className="text-xs text-slate-600 mb-2">{project.description}</p>
                )}
                <div className="text-xs text-slate-500">
                  {project.type === 'structural' ? 'Structural' : 'Civil'} Project
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Render unlocated projects at user's address if available */}
        {nonLocatedProjects.length > 0 && userAddress && (
          <Marker
            position={[userAddress.lat, userAddress.lon]}
            icon={unlocatedIcon}
          >
            <Popup maxHeight={300}>
              <div className="p-2">
                <div className="flex items-center gap-2 mb-2">
                  <FolderOpen size={16} className="text-slate-500" />
                  <h3 className="font-semibold text-sm">Projects without location</h3>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {nonLocatedProjects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => onProjectClick(project.id)}
                      className="w-full text-left p-2 hover:bg-slate-100 rounded text-xs transition-colors"
                    >
                      <div className="font-medium text-slate-800">{project.name}</div>
                      <div className="text-slate-500">{project.type === 'structural' ? 'Structural' : 'Civil'}</div>
                    </button>
                  ))}
                </div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-slate-900/90 backdrop-blur border border-slate-700 rounded-lg p-3 z-[1000]">
        <div className="text-xs font-semibold text-white mb-2">Legend</div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Civil Projects ({locatedProjects.filter(p => p.type === 'civil').length})</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <span>Structural Projects ({locatedProjects.filter(p => p.type === 'structural').length})</span>
          </div>
          {nonLocatedProjects.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <div className="w-3 h-3 bg-slate-500 rounded-full"></div>
              <span>No location ({nonLocatedProjects.length})</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
