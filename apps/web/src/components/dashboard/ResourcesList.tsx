'use client';

import Link from 'next/link';
import { Database, Image, Globe, Satellite, Thermometer, Waves, MapPin, Calendar, ExternalLink, Link as LinkIcon } from 'lucide-react';
import { DataResource, DataResourceType } from '@/types/data-resources';

interface ResourcesListProps {
  resources: DataResource[];
  onResourceClick?: (resourceId: string) => void;
}

// Get icon based on resource type
function getResourceIcon(type: DataResourceType) {
  const icons: Record<DataResourceType, typeof Database> = {
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
    dem: 'text-emerald-400',
    imagery: 'text-blue-400',
    api: 'text-purple-400',
    service: 'text-amber-400',
    dataset: 'text-indigo-400',
    sensor: 'text-pink-400',
    weather: 'text-cyan-400',
  };
  return colors[type] || 'text-slate-400';
}

// Get badge color based on access type
function getAccessBadgeColor(accessType: string): string {
  const colors: Record<string, string> = {
    public: 'bg-green-500/20 text-green-400 border-green-500/30',
    private: 'bg-red-500/20 text-red-400 border-red-500/30',
    shared: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    api_key: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  };
  return colors[accessType] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
}

export function ResourcesList({ resources, onResourceClick }: ResourcesListProps) {
  if (resources.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 bg-slate-800/30 rounded-lg border border-slate-700">
        <Database size={48} className="text-slate-600 mb-3" />
        <h3 className="text-lg font-medium text-slate-300 mb-2">No data resources yet</h3>
        <p className="text-sm text-slate-400">Add data resources to link them to your projects</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-slate-800/30 rounded-lg border border-slate-700">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700">
        <h3 className="text-sm font-semibold text-white">Available Resources</h3>
        <p className="text-xs text-slate-400 mt-0.5">{resources.length} total resources</p>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-slate-700">
          {resources.map((resource) => {
            const ResourceIcon = getResourceIcon(resource.type);
            const iconColor = getResourceColor(resource.type);

            return (
              <div
                key={resource.id}
                className="group relative hover:bg-slate-700/30 transition-colors cursor-pointer"
                onClick={() => onResourceClick && onResourceClick(resource.id)}
              >
                <div className="block px-4 py-3">
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="mt-0.5">
                      <ResourceIcon size={20} className={iconColor} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-sm font-medium text-white truncate group-hover:text-blue-400 transition-colors">
                          {resource.name}
                        </h4>
                      </div>

                      {resource.description && (
                        <p className="text-xs text-slate-400 mb-2 line-clamp-1">
                          {resource.description}
                        </p>
                      )}

                      {/* Metadata row */}
                      <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                        {/* Provider */}
                        <div className="flex items-center gap-1 capitalize">
                          <Globe size={12} />
                          <span>{resource.provider}</span>
                        </div>

                        {/* Type badge */}
                        <div className="px-2 py-0.5 bg-slate-700 rounded text-xs capitalize">
                          {resource.type}
                        </div>

                        {/* Access type badge */}
                        <div className={`px-2 py-0.5 rounded text-xs border capitalize ${getAccessBadgeColor(resource.access_type)}`}>
                          {resource.access_type.replace('_', ' ')}
                        </div>

                        {/* Location indicator */}
                        {resource.center_lat && resource.center_lon && (
                          <div className="flex items-center gap-1 text-green-500">
                            <MapPin size={12} />
                            <span>Located</span>
                          </div>
                        )}

                        {/* Format */}
                        {resource.format && (
                          <div className="text-slate-400">
                            {resource.format}
                          </div>
                        )}

                        {/* Resolution */}
                        {resource.resolution && (
                          <div className="text-slate-400">
                            {resource.resolution}
                          </div>
                        )}
                      </div>

                      {/* Projects using this resource */}
                      {resource.linked_projects && resource.linked_projects.length > 0 && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-blue-400">
                          <LinkIcon size={12} />
                          <span>
                            Used in {resource.linked_projects.length} project{resource.linked_projects.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}

                      {/* Last accessed */}
                      {resource.last_accessed && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                          <Calendar size={12} />
                          <span>
                            Last accessed: {new Date(resource.last_accessed).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* External link indicator */}
                {resource.url && (
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink size={14} className="text-slate-400" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
