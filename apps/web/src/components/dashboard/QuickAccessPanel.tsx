'use client';

import { useRouter } from 'next/navigation';
import { Droplet, Waves, Building2, Wrench, Construction, FileText } from 'lucide-react';

interface QuickAccessPanelProps {
  recentProjectId?: string;
}

const designTypes = [
  {
    id: 'water',
    name: 'Diseño Hidráulico',
    nameEn: 'Hydraulic Design',
    description: 'Water distribution networks',
    icon: Droplet,
    color: 'blue',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'sewer',
    name: 'Aguas Servidas',
    nameEn: 'Sewer Networks',
    description: 'Sanitary sewer systems',
    icon: Waves,
    color: 'amber',
    gradient: 'from-amber-500 to-orange-500',
  },
  {
    id: 'stormwater',
    name: 'Aguas Lluvias',
    nameEn: 'Stormwater',
    description: 'Drainage and stormwater',
    icon: Waves,
    color: 'sky',
    gradient: 'from-sky-500 to-blue-500',
  },
  {
    id: 'structural',
    name: 'Diseño Estructural',
    nameEn: 'Structural Design',
    description: 'Structural analysis',
    icon: Building2,
    color: 'purple',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    id: 'pavement',
    name: 'Diseño de Pavimentos',
    nameEn: 'Pavement Design',
    description: 'Road and pavement design',
    icon: Construction,
    color: 'slate',
    gradient: 'from-slate-500 to-slate-600',
  },
  {
    id: 'general',
    name: 'General',
    nameEn: 'General CAD',
    description: 'General CAD drawing',
    icon: FileText,
    color: 'emerald',
    gradient: 'from-emerald-500 to-green-500',
  },
];

export function QuickAccessPanel({ recentProjectId }: QuickAccessPanelProps) {
  const router = useRouter();

  const handleDesignTypeClick = (designTypeId: string) => {
    if (recentProjectId) {
      // Navigate to the unified design room with the design type pre-selected
      // All projects now have access to all design modules
      router.push(`/projects/${recentProjectId}?designType=${designTypeId}`);
    } else {
      // If no recent project, could show a modal to select/create project
      // For now, just show an alert
      alert('Please select or create a project first');
    }
  };

  return (
    <div className="h-full w-full bg-slate-800/30 rounded-lg border border-slate-700 p-4 flex flex-col">
      <div className="flex-shrink-0 mb-4">
        <h3 className="text-sm font-semibold text-white mb-1">Quick Access to Design Room</h3>
        <p className="text-xs text-slate-400">
          {recentProjectId
            ? 'Open design room with selected discipline'
            : 'Select a project to enable quick access'}
        </p>
      </div>

      <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 content-start">
        {designTypes.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.id}
              onClick={() => handleDesignTypeClick(type.id)}
              disabled={!recentProjectId}
              className={`
                group relative flex flex-col items-center gap-2 p-4 rounded-lg
                border-2 transition-all duration-200
                ${recentProjectId
                  ? 'border-slate-700 hover:border-slate-600 hover:bg-slate-700/30 cursor-pointer'
                  : 'border-slate-800 opacity-50 cursor-not-allowed'
                }
              `}
            >
              {/* Icon with gradient background */}
              <div className={`
                relative p-3 rounded-lg bg-gradient-to-br ${type.gradient}
                ${recentProjectId ? 'group-hover:scale-110' : ''}
                transition-transform duration-200
              `}>
                <Icon size={24} className="text-white" />
              </div>

              {/* Label */}
              <div className="text-center">
                <div className="text-xs font-medium text-white mb-0.5">
                  {type.name}
                </div>
                <div className="text-xs text-slate-400">
                  {type.nameEn}
                </div>
              </div>

              {/* Hover effect */}
              {recentProjectId && (
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/0 to-white/0 group-hover:from-white/5 group-hover:to-white/10 transition-all duration-200" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
