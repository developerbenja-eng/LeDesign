'use client';

import { useState } from 'react';
import { ChevronUp, ChevronDown, Droplet, Waves, Building2, Construction, Circle } from 'lucide-react';

interface DesignType {
  id: string;
  name: string;
  nameEn: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  description: string;
}

const designTypes: DesignType[] = [
  {
    id: 'water',
    name: 'Diseño Hidráulico',
    nameEn: 'Hydraulic Design',
    icon: Droplet,
    color: 'blue',
    description: 'Water distribution networks',
  },
  {
    id: 'sewer',
    name: 'Aguas Servidas',
    nameEn: 'Sewer Systems',
    icon: Waves,
    color: 'amber',
    description: 'Sanitary sewer networks',
  },
  {
    id: 'stormwater',
    name: 'Aguas Lluvias',
    nameEn: 'Stormwater',
    icon: Waves,
    color: 'sky',
    description: 'Stormwater drainage',
  },
  {
    id: 'structural',
    name: 'Diseño Estructural',
    nameEn: 'Structural Design',
    icon: Building2,
    color: 'purple',
    description: 'Structural analysis',
  },
  {
    id: 'pavement',
    name: 'Diseño de Pavimentos',
    nameEn: 'Pavement Design',
    icon: Construction,
    color: 'slate',
    description: 'Road and pavement design',
  },
  {
    id: 'channel',
    name: 'Canales Abiertos',
    nameEn: 'Open Channels',
    icon: Circle,
    color: 'cyan',
    description: 'Open channel design',
  },
];

interface DesignTypesBottomPanelProps {
  activeDesignType?: string;
  onDesignTypeChange: (typeId: string) => void;
}

export function DesignTypesBottomPanel({ activeDesignType, onDesignTypeChange }: DesignTypesBottomPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getColorClasses = (color: string, isActive: boolean) => {
    if (isActive) {
      const activeColors: Record<string, string> = {
        blue: 'bg-blue-600 border-blue-500 text-white',
        amber: 'bg-amber-600 border-amber-500 text-white',
        sky: 'bg-sky-600 border-sky-500 text-white',
        purple: 'bg-purple-600 border-purple-500 text-white',
        slate: 'bg-slate-600 border-slate-500 text-white',
        cyan: 'bg-cyan-600 border-cyan-500 text-white',
      };
      return activeColors[color] || activeColors.blue;
    }

    const hoverColors: Record<string, string> = {
      blue: 'hover:border-blue-500 hover:bg-blue-500/10',
      amber: 'hover:border-amber-500 hover:bg-amber-500/10',
      sky: 'hover:border-sky-500 hover:bg-sky-500/10',
      purple: 'hover:border-purple-500 hover:bg-purple-500/10',
      slate: 'hover:border-slate-500 hover:bg-slate-500/10',
      cyan: 'hover:border-cyan-500 hover:bg-cyan-500/10',
    };
    return `bg-slate-800/50 border-slate-700 text-slate-300 ${hoverColors[color]}`;
  };

  return (
    <div
      className={`border-t border-slate-800 bg-slate-900 transition-all duration-300 ${
        isExpanded ? 'h-40' : 'h-10'
      }`}
    >
      {/* Toggle Bar */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full h-10 px-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-300 group-hover:text-white">
            Design Types
          </span>
          {activeDesignType && !isExpanded && (
            <span className="text-xs px-2 py-1 rounded bg-blue-600/20 text-blue-400 border border-blue-500/30">
              {designTypes.find(d => d.id === activeDesignType)?.nameEn || 'None'}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronDown size={18} className="text-slate-400 group-hover:text-white" />
        ) : (
          <ChevronUp size={18} className="text-slate-400 group-hover:text-white" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="h-[calc(100%-40px)] px-4 pb-3 overflow-hidden">
          {/* Horizontally Scrollable Design Types */}
          <div className="h-full flex items-center">
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
              {designTypes.map((type) => {
                const Icon = type.icon;
                const isActive = activeDesignType === type.id;

                return (
                  <button
                    key={type.id}
                    onClick={() => onDesignTypeChange(type.id)}
                    className={`
                      flex-shrink-0 group relative
                      flex flex-col items-center gap-2
                      w-32 p-3 rounded-lg border-2 transition-all
                      ${getColorClasses(type.color, isActive)}
                    `}
                  >
                    {/* Icon */}
                    <div
                      className={`
                        p-2 rounded-lg transition-transform
                        ${isActive ? 'bg-white/20' : 'bg-slate-700/50 group-hover:bg-slate-700'}
                        ${!isActive && 'group-hover:scale-110'}
                      `}
                    >
                      <Icon size={24} className={isActive ? 'text-white' : 'text-slate-300'} />
                    </div>

                    {/* Label */}
                    <div className="text-center">
                      <div className={`text-xs font-semibold mb-0.5 ${isActive ? 'text-white' : 'text-slate-300'}`}>
                        {type.name}
                      </div>
                      <div className={`text-xs ${isActive ? 'text-white/80' : 'text-slate-500'}`}>
                        {type.nameEn}
                      </div>
                    </div>

                    {/* Active Indicator */}
                    {isActive && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
