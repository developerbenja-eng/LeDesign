'use client';

// ============================================================
// DETAILS VIEW
// Standard details library for reusable drawings
// ============================================================

import { useState } from 'react';
import type { ViewInstance } from '@/stores/workspace-store';
import { FileText, Plus, Search, Download, FolderOpen, Grid3x3 } from 'lucide-react';

interface DetailsViewProps {
  view: ViewInstance;
}

interface StandardDetail {
  id: string;
  name: string;
  category: string;
  description: string;
  thumbnail: string;
  scale: string;
  tags: string[];
}

// Sample standard details
const sampleDetails: StandardDetail[] = [
  {
    id: 'DET-001',
    name: 'Sidewalk Ramp',
    category: 'Accessibility',
    description: 'ADA compliant curb ramp detail',
    thumbnail: '/details/sidewalk-ramp.png',
    scale: '1:10',
    tags: ['sidewalk', 'accessibility', 'ada', 'ramp'],
  },
  {
    id: 'DET-002',
    name: 'Retaining Wall Section',
    category: 'Structures',
    description: 'Typical concrete retaining wall cross-section',
    thumbnail: '/details/retaining-wall.png',
    scale: '1:20',
    tags: ['retaining wall', 'concrete', 'structure'],
  },
  {
    id: 'DET-003',
    name: 'Storm Drain Inlet',
    category: 'Drainage',
    description: 'Standard storm drain inlet grate and frame',
    thumbnail: '/details/storm-drain.png',
    scale: '1:25',
    tags: ['drainage', 'storm', 'inlet'],
  },
  {
    id: 'DET-004',
    name: 'Pavement Section',
    category: 'Pavement',
    description: 'Typical roadway pavement layers',
    thumbnail: '/details/pavement.png',
    scale: '1:10',
    tags: ['pavement', 'road', 'asphalt', 'base'],
  },
  {
    id: 'DET-005',
    name: 'Concrete Curb & Gutter',
    category: 'Drainage',
    description: 'Standard curb and gutter profile',
    thumbnail: '/details/curb-gutter.png',
    scale: '1:5',
    tags: ['curb', 'gutter', 'drainage', 'concrete'],
  },
  {
    id: 'DET-006',
    name: 'Traffic Sign Foundation',
    category: 'Traffic',
    description: 'Sign post foundation detail',
    thumbnail: '/details/sign-foundation.png',
    scale: '1:15',
    tags: ['traffic', 'sign', 'foundation'],
  },
];

const categories = ['All', 'Accessibility', 'Structures', 'Drainage', 'Pavement', 'Traffic'];

export function DetailsView({ view }: DetailsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredDetails = sampleDetails.filter((detail) => {
    const matchesSearch =
      detail.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      detail.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      detail.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'All' || detail.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-800/50 border-b border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-blue-400" />
            <h3 className="font-semibold text-white">Standard Details Library</h3>
          </div>

          <button className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm">
            <Plus size={14} />
            Add Detail
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900/50 border border-slate-700 rounded text-white placeholder-slate-500 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-900/50 border border-slate-700 rounded p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded transition-colors ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <Grid3x3 size={14} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1 rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <FolderOpen size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Category Filters */}
      <div className="px-4 py-2 bg-slate-800/30 border-b border-slate-700 flex items-center gap-2 overflow-x-auto">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              selectedCategory === category
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800/50 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Details Grid/List */}
      <div className="flex-1 overflow-auto p-4">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredDetails.map((detail) => (
              <div
                key={detail.id}
                className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden hover:border-blue-500 transition-colors cursor-pointer group"
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-slate-900 flex items-center justify-center border-b border-slate-700">
                  <FileText size={48} className="text-slate-600 group-hover:text-blue-500 transition-colors" />
                </div>

                {/* Info */}
                <div className="p-3">
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="text-sm font-medium text-white">{detail.name}</h4>
                    <span className="text-xs text-slate-500 font-mono">{detail.id}</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-2 line-clamp-2">{detail.description}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Scale: {detail.scale}</span>
                    <button
                      className="text-blue-400 hover:text-blue-300"
                      title="Insert detail"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredDetails.map((detail) => (
              <div
                key={detail.id}
                className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 hover:border-blue-500 transition-colors cursor-pointer flex items-center gap-3"
              >
                {/* Thumbnail */}
                <div className="w-16 h-16 bg-slate-900 rounded flex items-center justify-center flex-shrink-0">
                  <FileText size={24} className="text-slate-600" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium text-white truncate">{detail.name}</h4>
                    <span className="text-xs text-slate-500 font-mono flex-shrink-0">{detail.id}</span>
                    <span className="text-xs px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded">
                      {detail.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-1">{detail.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {detail.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-xs text-slate-500">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-slate-500">{detail.scale}</span>
                  <button
                    className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    title="Insert detail"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredDetails.length === 0 && (
          <div className="h-full flex items-center justify-center text-slate-500">
            <div className="text-center">
              <FileText size={48} className="mx-auto mb-2 opacity-50" />
              <p>No details found</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
