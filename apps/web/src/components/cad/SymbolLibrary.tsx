'use client';

import React, { useState } from 'react';
import { useCADStore } from '@/stores/cad-store';
import type { DrawingTool } from '@/types/cad';
import type { InfrastructureCategory } from '@/types/infrastructure-entities';

interface SymbolLibraryProps {
  onClose: () => void;
}

// Symbol definition
interface SymbolDefinition {
  id: string;
  name: string;
  icon: string;
  tool: DrawingTool;
  category: InfrastructureCategory | 'basic';
  description: string;
  defaultLayer: string;
  shortcuts?: string[];
}

// Symbol categories
const SYMBOL_CATEGORIES: { id: InfrastructureCategory | 'basic' | 'all'; label: string; icon: string }[] = [
  { id: 'all', label: 'All', icon: '📋' },
  { id: 'water', label: 'Water', icon: '💧' },
  { id: 'sewer', label: 'Sewer', icon: '🚰' },
  { id: 'stormwater', label: 'Storm', icon: '🌧️' },
  { id: 'road', label: 'Road', icon: '🛣️' },
  { id: 'basic', label: 'Basic', icon: '📐' },
];

// All available symbols
const SYMBOLS: SymbolDefinition[] = [
  // Water Distribution
  {
    id: 'water_pipe',
    name: 'Water Pipe',
    icon: '━━━',
    tool: 'water_pipe',
    category: 'water',
    description: 'Pressure pipe for water distribution',
    defaultLayer: 'WATER-PIPE',
  },
  {
    id: 'water_junction',
    name: 'Junction',
    icon: '⊕',
    tool: 'water_junction',
    category: 'water',
    description: 'Network node (tee, cross, elbow)',
    defaultLayer: 'WATER-NODE',
  },
  {
    id: 'water_valve',
    name: 'Valve',
    icon: '⋈',
    tool: 'water_valve',
    category: 'water',
    description: 'Gate, butterfly, or control valve',
    defaultLayer: 'WATER-VALVE',
  },
  {
    id: 'water_tank',
    name: 'Tank',
    icon: '▣',
    tool: 'water_tank',
    category: 'water',
    description: 'Storage tank or reservoir',
    defaultLayer: 'WATER-TANK',
  },
  {
    id: 'water_pump',
    name: 'Pump',
    icon: '⬡',
    tool: 'water_pump',
    category: 'water',
    description: 'Booster or main pump station',
    defaultLayer: 'WATER-PUMP',
  },
  {
    id: 'hydrant',
    name: 'Hydrant',
    icon: '🔴',
    tool: 'hydrant',
    category: 'water',
    description: 'Fire hydrant',
    defaultLayer: 'WATER-HYDRANT',
  },

  // Sanitary Sewer
  {
    id: 'sewer_pipe',
    name: 'Sewer Pipe',
    icon: '┅┅┅',
    tool: 'sewer_pipe',
    category: 'sewer',
    description: 'Gravity sewer collector',
    defaultLayer: 'SEWER-PIPE',
  },
  {
    id: 'manhole',
    name: 'Manhole',
    icon: '◉',
    tool: 'manhole',
    category: 'sewer',
    description: 'Inspection chamber',
    defaultLayer: 'SEWER-MANHOLE',
  },
  {
    id: 'house_connection',
    name: 'House Conn.',
    icon: '┄',
    tool: 'house_connection',
    category: 'sewer',
    description: 'Domiciliary connection',
    defaultLayer: 'SEWER-CONNECTION',
  },

  // Stormwater
  {
    id: 'storm_collector',
    name: 'Storm Collector',
    icon: '═══',
    tool: 'storm_collector',
    category: 'stormwater',
    description: 'Stormwater collector pipe',
    defaultLayer: 'STORM-COLLECTOR',
  },
  {
    id: 'storm_inlet',
    name: 'Storm Inlet',
    icon: '▦',
    tool: 'storm_inlet',
    category: 'stormwater',
    description: 'Catch basin / sumidero',
    defaultLayer: 'STORM-INLET',
  },
  {
    id: 'gutter',
    name: 'Gutter',
    icon: '⌒',
    tool: 'gutter',
    category: 'stormwater',
    description: 'Curb gutter or channel',
    defaultLayer: 'STORM-GUTTER',
  },

  // Road
  {
    id: 'road_segment',
    name: 'Road',
    icon: '▬▬▬',
    tool: 'road_segment',
    category: 'road',
    description: 'Road centerline',
    defaultLayer: 'ROAD-CENTERLINE',
  },
  {
    id: 'curb',
    name: 'Curb',
    icon: '▐',
    tool: 'curb',
    category: 'road',
    description: 'Curb and gutter',
    defaultLayer: 'ROAD-CURB',
  },

  // Basic CAD
  {
    id: 'line',
    name: 'Line',
    icon: '╱',
    tool: 'line',
    category: 'basic',
    description: 'Simple line',
    defaultLayer: '0',
    shortcuts: ['L'],
  },
  {
    id: 'polyline',
    name: 'Polyline',
    icon: '⟋⟍',
    tool: 'polyline',
    category: 'basic',
    description: 'Connected line segments',
    defaultLayer: '0',
    shortcuts: ['PL'],
  },
  {
    id: 'circle',
    name: 'Circle',
    icon: '○',
    tool: 'circle',
    category: 'basic',
    description: 'Circle by center and radius',
    defaultLayer: '0',
    shortcuts: ['C'],
  },
  {
    id: 'arc',
    name: 'Arc',
    icon: '⌒',
    tool: 'arc',
    category: 'basic',
    description: 'Circular arc',
    defaultLayer: '0',
    shortcuts: ['A'],
  },
  {
    id: 'point',
    name: 'Point',
    icon: '•',
    tool: 'point',
    category: 'basic',
    description: 'Single point',
    defaultLayer: '0',
    shortcuts: ['PO'],
  },
  {
    id: 'text',
    name: 'Text',
    icon: 'T',
    tool: 'text',
    category: 'basic',
    description: 'Text annotation',
    defaultLayer: '0',
    shortcuts: ['T', 'DT'],
  },
];

// SVG Symbol representations for better visuals
const SymbolSVG: Record<string, React.ReactNode> = {
  water_pipe: (
    <svg viewBox="0 0 40 20" className="w-full h-full">
      <line x1="2" y1="10" x2="38" y2="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
  water_junction: (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="12" y1="4" x2="12" y2="20" stroke="currentColor" strokeWidth="2" />
      <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  water_valve: (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <polygon points="4,8 12,16 20,8" fill="none" stroke="currentColor" strokeWidth="2" />
      <polygon points="4,16 12,8 20,16" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  water_tank: (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect x="4" y="6" width="16" height="14" fill="none" stroke="currentColor" strokeWidth="2" rx="1" />
      <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="1" strokeDasharray="2,2" />
    </svg>
  ),
  water_pump: (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M 8 12 L 12 8 L 16 12 L 12 16 Z" fill="currentColor" />
    </svg>
  ),
  hydrant: (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect x="8" y="10" width="8" height="10" fill="currentColor" rx="1" />
      <circle cx="12" cy="7" r="4" fill="currentColor" />
      <line x1="4" y1="14" x2="8" y2="14" stroke="currentColor" strokeWidth="2" />
      <line x1="16" y1="14" x2="20" y2="14" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  sewer_pipe: (
    <svg viewBox="0 0 40 20" className="w-full h-full">
      <line x1="2" y1="10" x2="38" y2="10" stroke="currentColor" strokeWidth="3" strokeDasharray="6,3" />
    </svg>
  ),
  manhole: (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" fill="currentColor" />
    </svg>
  ),
  house_connection: (
    <svg viewBox="0 0 40 20" className="w-full h-full">
      <line x1="2" y1="10" x2="38" y2="10" stroke="currentColor" strokeWidth="2" strokeDasharray="4,4" />
      <circle cx="38" cy="10" r="3" fill="currentColor" />
    </svg>
  ),
  storm_collector: (
    <svg viewBox="0 0 40 20" className="w-full h-full">
      <line x1="2" y1="7" x2="38" y2="7" stroke="currentColor" strokeWidth="2" />
      <line x1="2" y1="13" x2="38" y2="13" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  storm_inlet: (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <rect x="4" y="4" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="4" y1="9" x2="20" y2="9" stroke="currentColor" strokeWidth="1" />
      <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="1" />
      <line x1="4" y1="15" x2="20" y2="15" stroke="currentColor" strokeWidth="1" />
    </svg>
  ),
  gutter: (
    <svg viewBox="0 0 40 20" className="w-full h-full">
      <path d="M 2 15 Q 20 5 38 15" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  road_segment: (
    <svg viewBox="0 0 40 20" className="w-full h-full">
      <rect x="2" y="6" width="36" height="8" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="20" y1="6" x2="20" y2="14" stroke="currentColor" strokeWidth="1" strokeDasharray="2,2" />
    </svg>
  ),
  curb: (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <path d="M 4 20 L 4 8 L 8 4 L 20 4" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  line: (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <line x1="4" y1="20" x2="20" y2="4" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  polyline: (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <polyline points="2,18 8,8 16,14 22,4" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  circle: (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  arc: (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <path d="M 4 16 A 10 10 0 0 1 20 16" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  point: (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      <line x1="12" y1="2" x2="12" y2="8" stroke="currentColor" strokeWidth="1" />
      <line x1="12" y1="16" x2="12" y2="22" stroke="currentColor" strokeWidth="1" />
      <line x1="2" y1="12" x2="8" y2="12" stroke="currentColor" strokeWidth="1" />
      <line x1="16" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="1" />
    </svg>
  ),
  text: (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <text x="12" y="17" textAnchor="middle" fontSize="14" fontWeight="bold" fill="currentColor">A</text>
    </svg>
  ),
};

// Color mapping for categories
const CATEGORY_COLORS: Record<string, string> = {
  water: 'text-blue-400 hover:bg-blue-900/30',
  sewer: 'text-amber-600 hover:bg-amber-900/30',
  stormwater: 'text-cyan-400 hover:bg-cyan-900/30',
  road: 'text-gray-400 hover:bg-gray-700/50',
  basic: 'text-white hover:bg-gray-700/50',
};

export function SymbolLibrary({ onClose }: SymbolLibraryProps) {
  const { setActiveTool, activeTool } = useCADStore();
  const [selectedCategory, setSelectedCategory] = useState<InfrastructureCategory | 'basic' | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter symbols
  const filteredSymbols = SYMBOLS.filter((symbol) => {
    const matchesCategory = selectedCategory === 'all' || symbol.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      symbol.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      symbol.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      symbol.shortcuts?.some((s) => s.toLowerCase() === searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Handle symbol selection
  const handleSelectSymbol = (symbol: SymbolDefinition) => {
    setActiveTool(symbol.tool);
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg w-72 overflow-hidden max-h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="bg-gray-700 px-4 py-2 flex justify-between items-center shrink-0">
        <h3 className="text-white font-semibold text-sm">Symbol Library</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-lg">
          ×
        </button>
      </div>

      {/* Search */}
      <div className="p-2 border-b border-gray-700 shrink-0">
        <input
          type="text"
          placeholder="Search symbols..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-gray-700 text-white text-sm rounded px-3 py-1.5 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-gray-700 shrink-0">
        {SYMBOL_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              selectedCategory === cat.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <span className="mr-1">{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Symbol Grid */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredSymbols.length === 0 ? (
          <div className="text-gray-500 text-sm text-center py-4">No symbols found</div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {filteredSymbols.map((symbol) => {
              const isActive = activeTool === symbol.tool;
              const colorClass = CATEGORY_COLORS[symbol.category] || 'text-white hover:bg-gray-700';

              return (
                <button
                  key={symbol.id}
                  onClick={() => handleSelectSymbol(symbol)}
                  title={`${symbol.name}\n${symbol.description}${
                    symbol.shortcuts ? `\nShortcut: ${symbol.shortcuts.join(', ')}` : ''
                  }`}
                  className={`flex flex-col items-center justify-center p-2 rounded transition-all ${colorClass} ${
                    isActive ? 'ring-2 ring-blue-500 bg-blue-900/50' : ''
                  }`}
                >
                  <div className="w-10 h-8 flex items-center justify-center">
                    {SymbolSVG[symbol.id] || <span className="text-lg">{symbol.icon}</span>}
                  </div>
                  <span className="text-xs mt-1 text-center leading-tight">{symbol.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Tool Indicator */}
      <div className="shrink-0 p-2 border-t border-gray-700 bg-gray-800">
        <div className="text-xs text-gray-400">
          Active Tool:{' '}
          <span className="text-white font-medium">
            {SYMBOLS.find((s) => s.tool === activeTool)?.name || activeTool}
          </span>
        </div>
      </div>
    </div>
  );
}

// Export symbol data for use in other components
export { SYMBOLS, SYMBOL_CATEGORIES, SymbolSVG };
