'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Rectangle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Database, Image, Globe, Satellite, Thermometer, Waves, type LucideIcon } from 'lucide-react';
import { DataResource, DataResourceType } from '@/types/data-resources';

// Fix Leaflet default marker icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon.src,
  shadowUrl: iconShadow.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface DataResourcesMapProps {
  resources: DataResource[];
  onResourceClick?: (resourceId: string) => void;
}

// Component to update map bounds when resources change
function MapBoundsUpdater({ resources }: { resources: DataResource[] }) {
  const map = useMap();
  const hasSetInitialView = useRef(false);

  useEffect(() => {
    if (resources.length === 0) {
      // Default to Biobío and Ñuble regions (south-central Chile)
      map.setView([-36.7, -72.5], 8);
      hasSetInitialView.current = true;
      return;
    }

    // Find resources with bounds or center coordinates
    const resourcesWithLocation = resources.filter(
      (r) => r.center_lat && r.center_lon
    );

    if (resourcesWithLocation.length === 0) {
      if (!hasSetInitialView.current) {
        map.setView([-36.7, -72.5], 8);
        hasSetInitialView.current = true;
      }
      return;
    }

    // Calculate bounds to fit all resources
    const bounds: [number, number][] = resourcesWithLocation
      .filter((r): r is DataResource & { center_lat: number; center_lon: number } =>
        r.center_lat !== null &&
        r.center_lat !== undefined &&
        r.center_lon !== null &&
        r.center_lon !== undefined
      )
      .map((r) => [r.center_lat, r.center_lon]);

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
      hasSetInitialView.current = true;
    }
  }, [resources, map]);

  return null;
}

// Get icon based on resource type
function getResourceIcon(type: DataResourceType): LucideIcon {
  const icons: Record<DataResourceType, LucideIcon> = {
    dem: Satellite,
    imagery: Image,
    api: Globe,
    service: Database,
    dataset: Database,
    sensor: Thermometer,
    weather: Waves,
  };
  return icons[type] || Database;
}

// Get color based on resource type
function getResourceColor(type: DataResourceType): string {
  const colors: Record<DataResourceType, string> = {
    dem: '#10b981',      // emerald
    imagery: '#3b82f6',  // blue
    api: '#8b5cf6',      // purple
    service: '#f59e0b',  // amber
    dataset: '#6366f1',  // indigo
    sensor: '#ec4899',   // pink
    weather: '#06b6d4',  // cyan
  };
  return colors[type] || '#64748b'; // slate as fallback
}

// Custom marker for data resources
function createResourceMarker(type: DataResourceType) {
  const color = getResourceColor(type);

  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        border: 3px solid white;
        transform: rotate(-45deg);
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="transform: rotate(45deg); color: white; font-size: 14px;">
          ${type === 'dem' ? '▲' : type === 'imagery' ? '◉' : type === 'api' ? '⚡' : '●'}
        </div>
      </div>
    `,
    className: 'custom-resource-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

export function DataResourcesMap({ resources, onResourceClick }: DataResourcesMapProps) {
  return (
    <div className="h-full w-full rounded-lg overflow-hidden border border-slate-700">
      <MapContainer
        center={[-36.7, -72.5]}
        zoom={8}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapBoundsUpdater resources={resources} />

        {/* Render resource markers */}
        {resources.map((resource) => {
          // Skip resources without location
          if (!resource.center_lat || !resource.center_lon) {
            return null;
          }

          const ResourceIcon = getResourceIcon(resource.type);

          return (
            <div key={resource.id}>
              {/* Point marker */}
              <Marker
                position={[resource.center_lat, resource.center_lon]}
                icon={createResourceMarker(resource.type)}
                eventHandlers={{
                  click: () => {
                    if (onResourceClick) {
                      onResourceClick(resource.id);
                    }
                  },
                }}
              >
                <Popup className="resource-popup">
                  <div className="min-w-[200px]">
                    <div className="flex items-start gap-2 mb-2">
                      <div
                        className="p-1.5 rounded"
                        style={{ backgroundColor: getResourceColor(resource.type) }}
                      >
                        <ResourceIcon size={16} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm text-slate-900">
                          {resource.name}
                        </h3>
                        <p className="text-xs text-slate-600 capitalize">
                          {resource.type} • {resource.provider}
                        </p>
                      </div>
                    </div>

                    {resource.description && (
                      <p className="text-xs text-slate-700 mb-2">
                        {resource.description}
                      </p>
                    )}

                    <div className="text-xs text-slate-600 space-y-1">
                      {resource.format && (
                        <div>Format: <span className="font-medium">{resource.format}</span></div>
                      )}
                      {resource.resolution && (
                        <div>Resolution: <span className="font-medium">{resource.resolution}</span></div>
                      )}
                      {resource.coverage_area && (
                        <div>Coverage: <span className="font-medium">{resource.coverage_area}</span></div>
                      )}
                      {resource.linked_projects && resource.linked_projects.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-200">
                          Used in {resource.linked_projects.length} project{resource.linked_projects.length !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>

              {/* Bounding box if available */}
              {resource.bounds && (
                <Rectangle
                  bounds={[
                    [resource.bounds.south, resource.bounds.west],
                    [resource.bounds.north, resource.bounds.east],
                  ]}
                  pathOptions={{
                    color: getResourceColor(resource.type),
                    weight: 2,
                    opacity: 0.6,
                    fillOpacity: 0.1,
                  }}
                />
              )}
            </div>
          );
        })}
      </MapContainer>
    </div>
  );
}
