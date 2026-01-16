'use client';

// ============================================================
// COLUMN PROPERTIES
// Property editor for structural columns
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { Column } from '@ledesign/structural';
import { useEditorStore } from '@/stores';
import { RebarSectionViewer } from '@/components/viewers';

interface ColumnPropertiesProps {
  column: Column;
}

// Concrete section types that support rebar visualization
const CONCRETE_SECTION_TYPES = ['rect_concrete', 'circular_concrete', 't_beam_concrete', 'l_beam_concrete'];

export function ColumnProperties({ column }: ColumnPropertiesProps) {
  const updateColumn = useEditorStore((state) => state.updateColumn);
  const nodes = useEditorStore((state) => state.nodes);
  const sections = useEditorStore((state) => state.sections);
  const materials = useEditorStore((state) => state.materials);

  const [name, setName] = useState(column.name || '');

  // Get section and material for this column
  const section = useMemo(() => {
    if (!column.section_id) return null;
    return sections.get(column.section_id) || null;
  }, [column.section_id, sections]);

  const material = useMemo(() => {
    if (!section?.material_id) return null;
    return materials.get(section.material_id) || null;
  }, [section, materials]);

  // Check if this is a concrete section
  const isConcreteSection = useMemo(() => {
    if (!section) return false;
    return CONCRETE_SECTION_TYPES.includes(section.section_type);
  }, [section]);

  useEffect(() => {
    setName(column.name || '');
  }, [column]);

  const handleNameChange = (value: string) => {
    setName(value);
    updateColumn(column.id, { name: value || null });
  };

  const bottomNode = nodes.get(column.node_i_id);
  const topNode = nodes.get(column.node_j_id);

  // Calculate column height
  const height = bottomNode && topNode
    ? Math.sqrt(
        Math.pow(topNode.x - bottomNode.x, 2) +
        Math.pow(topNode.y - bottomNode.y, 2) +
        Math.pow(topNode.z - bottomNode.z, 2)
      ).toFixed(2)
    : '—';

  return (
    <div className="space-y-4">
      {/* Element Type Badge */}
      <div className="flex items-center gap-2">
        <span className="px-2 py-0.5 bg-violet-600 rounded text-xs font-medium">
          Column
        </span>
        <span className="text-xs text-slate-500 font-mono">{column.id}</span>
      </div>

      {/* Name */}
      <PropertyGroup label="Name">
        <input
          type="text"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Enter name..."
          className="w-full bg-lele-bg border border-lele-border rounded px-2 py-1.5 text-sm text-slate-200 focus:border-lele-accent focus:outline-none"
        />
      </PropertyGroup>

      {/* Height (read-only) */}
      <PropertyGroup label="Height">
        <div className="bg-lele-bg border border-lele-border rounded px-2 py-1.5 text-sm text-slate-400">
          {height} ft
        </div>
      </PropertyGroup>

      {/* Connectivity */}
      <PropertyGroup label="Connectivity">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-xs text-slate-500 block">Bottom</span>
            <span className="text-slate-300 font-mono text-xs">{column.node_i_id}</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 block">Top</span>
            <span className="text-slate-300 font-mono text-xs">{column.node_j_id}</span>
          </div>
        </div>
      </PropertyGroup>

      {/* Section */}
      <PropertyGroup label="Section">
        <select
          value={column.section_id}
          onChange={(e) => updateColumn(column.id, { section_id: e.target.value })}
          className="w-full bg-lele-bg border border-lele-border rounded px-2 py-1.5 text-sm text-slate-200 focus:border-lele-accent focus:outline-none"
        >
          <option value={column.section_id}>{column.section_id || 'Select Section'}</option>
          <option value="W10X49">W10X49</option>
          <option value="W12X65">W12X65</option>
          <option value="W14X82">W14X82</option>
          <option value="W14X120">W14X120</option>
          <option value="HSS8X8X1/2">HSS8X8X1/2</option>
        </select>
      </PropertyGroup>

      {/* Effective Length Factors */}
      <PropertyGroup label="Effective Length Factors (K)">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-xs text-slate-500 block mb-1">Major Axis</span>
            <input
              type="number"
              step="0.1"
              min="0.5"
              max="2.0"
              value={column.k_major}
              onChange={(e) => updateColumn(column.id, { k_major: parseFloat(e.target.value) })}
              className="w-full bg-lele-bg border border-lele-border rounded px-2 py-1 text-sm text-slate-200 focus:border-lele-accent focus:outline-none"
            />
          </div>
          <div>
            <span className="text-xs text-slate-500 block mb-1">Minor Axis</span>
            <input
              type="number"
              step="0.1"
              min="0.5"
              max="2.0"
              value={column.k_minor}
              onChange={(e) => updateColumn(column.id, { k_minor: parseFloat(e.target.value) })}
              className="w-full bg-lele-bg border border-lele-border rounded px-2 py-1 text-sm text-slate-200 focus:border-lele-accent focus:outline-none"
            />
          </div>
        </div>
      </PropertyGroup>

      {/* End Releases */}
      <PropertyGroup label="End Releases">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-xs text-slate-500 block mb-1">Bottom (I)</span>
            {(['mx', 'my', 'mz'] as const).map((moment) => (
              <label key={`i-${moment}`} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={column.releases_i[moment]}
                  onChange={(e) =>
                    updateColumn(column.id, {
                      releases_i: { ...column.releases_i, [moment]: e.target.checked },
                    })
                  }
                  className="rounded border-lele-border bg-lele-bg"
                />
                <span className="text-slate-400 uppercase text-xs">{moment}</span>
              </label>
            ))}
          </div>
          <div>
            <span className="text-xs text-slate-500 block mb-1">Top (J)</span>
            {(['mx', 'my', 'mz'] as const).map((moment) => (
              <label key={`j-${moment}`} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={column.releases_j[moment]}
                  onChange={(e) =>
                    updateColumn(column.id, {
                      releases_j: { ...column.releases_j, [moment]: e.target.checked },
                    })
                  }
                  className="rounded border-lele-border bg-lele-bg"
                />
                <span className="text-slate-400 uppercase text-xs">{moment}</span>
              </label>
            ))}
          </div>
        </div>
      </PropertyGroup>

      {/* Rebar Section Viewer - only shown for concrete sections */}
      {isConcreteSection && section && (
        <PropertyGroup label="Cross Section">
          <div className="flex justify-center">
            <RebarSectionViewer
              section={section}
              rebarConfig={null}
              width={180}
              height={180}
              showDimensions={true}
              showLabels={true}
            />
          </div>
          {material && (
            <div className="text-xs text-slate-500 text-center mt-2">
              {material.name} • f&apos;c = {(material.properties as { fc?: number })?.fc || '—'} psi
            </div>
          )}
        </PropertyGroup>
      )}
    </div>
  );
}

function PropertyGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
