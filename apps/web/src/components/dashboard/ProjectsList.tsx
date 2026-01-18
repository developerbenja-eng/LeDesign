'use client';

import Link from 'next/link';
import { Building2, FileText, Calendar, Trash2, MapPin, FolderOpen } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description?: string;
  project_type?: string;
  updated_at: string;
  center_lat?: number;
  center_lon?: number;
}

interface ProjectsListProps {
  projects: Project[];
  onDelete: (projectId: string, projectName: string) => void;
}

export function ProjectsList({ projects, onDelete }: ProjectsListProps) {
  if (projects.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 bg-slate-800/30 rounded-lg border border-slate-700">
        <FolderOpen size={48} className="text-slate-600 mb-3" />
        <h3 className="text-lg font-medium text-slate-300 mb-2">No projects yet</h3>
        <p className="text-sm text-slate-400">Create your first project to get started</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-slate-800/30 rounded-lg border border-slate-700">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700">
        <h3 className="text-sm font-semibold text-white">Recent Projects</h3>
        <p className="text-xs text-slate-400 mt-0.5">{projects.length} total projects</p>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-slate-700">
          {projects.map((project) => (
            <div
              key={project.id}
              className="group relative hover:bg-slate-700/30 transition-colors"
            >
              <Link
                href={`/projects/${project.id}`}
                className="block px-4 py-3"
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="mt-0.5">
                    <FileText size={20} className="text-blue-400" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="text-sm font-medium text-white truncate group-hover:text-blue-400 transition-colors">
                        {project.name}
                      </h4>
                    </div>

                    {project.description && (
                      <p className="text-xs text-slate-400 mb-2 line-clamp-1">
                        {project.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} />
                        <span>{new Date(project.updated_at).toLocaleDateString()}</span>
                      </div>
                      {project.center_lat && project.center_lon && (
                        <div className="flex items-center gap-1 text-green-500">
                          <MapPin size={12} />
                          <span>Located</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>

              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(project.id, project.name);
                }}
                className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                title="Delete project"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
