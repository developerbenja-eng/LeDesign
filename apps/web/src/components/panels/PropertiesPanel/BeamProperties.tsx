'use client';

// ============================================================
// BEAM PROPERTIES
// Property editor for structural beams
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { Beam } from '@ledesign/structural';
import { useEditorStore } from '@/stores';
import { RebarSectionViewer } from '@/components/viewers';

interface BeamPropertiesProps {
  beam: Beam;
}

// Concrete section types that support rebar visualization
const CONCRETE_SECTION_TYPES = ['rect_concrete', 'circular_concrete', 't_beam_concrete', 'l_beam_concrete'];

export function BeamProperties({ beam }: BeamPropertiesProps) {
  const updateBeam = useEditorStore((state) => state.updateBeam);
  const nodes = useEditorStore((state) => state.nodes);
  const sections = useEditorStore((state) => state.sections);
  const materials = useEditorStore((state) => state.materials);

  const [name, setName] = useState(beam.name || '');

  // Get section and material for this beam
  const section = useMemo(() => {
    if (!beam.section_id) return null;
    return sections.get(beam.section_id) || null;
  }, [beam.section_id, sections]);

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
    setName(beam.name || '');
  }, [beam]);

  const handleNameChange = (value: string) => {
    setName(value);
    updateBeam(beam.id, { name: value || null });
  };

  const startNode = nodes.get(beam.node_i_id);
  const endNode = nodes.get(beam.node_j_id);

  // Calculate beam length
  const length = startNode && endNode
    ? Math.sqrt(
        Math.pow(endNode.x - startNode.x, 2) +
        Math.pow(endNode.y - startNode.y, 2) +
        Math.pow(endNode.z - startNode.z, 2)
      ).toFixed(2)
    : '—';

  return (
    <div className="space-y-4">
      {/* Element Type Badge */}
      <div className="flex items-center gap-2">
        <span className="px-2 py-0.5 bg-slate-600 rounded text-xs font-medium">
          Beam
        </span>
        <span className="text-xs text-slate-500 font-mono">{beam.id}</span>
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

      {/* Length (read-only) */}
      <PropertyGroup label="Length">
        <div className="bg-lele-bg border border-lele-border rounded px-2 py-1.5 text-sm text-slate-400">
          {length} ft
        </div>
      </PropertyGroup>

      {/* Connectivity */}
      <PropertyGroup label="Connectivity">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-xs text-slate-500 block">Start Node</span>
            <span className="text-slate-300 font-mono text-xs">{beam.node_i_id}</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 block">End Node</span>
            <span className="text-slate-300 font-mono text-xs">{beam.node_j_id}</span>
          </div>
        </div>
      </PropertyGroup>

      {/* Section (placeholder) */}
      <PropertyGroup label="Section">
        <select
          value={beam.section_id}
          onChange={(e) => updateBeam(beam.id, { section_id: e.target.value })}
          className="w-full bg-lele-bg border border-lele-border rounded px-2 py-1.5 text-sm text-slate-200 focus:border-lele-accent focus:outline-none"
        >
          <option value={beam.section_id}>{beam.section_id || 'Select Section'}</option>
          <option value="W12X26">W12X26</option>
          <option value="W14X30">W14X30</option>
          <option value="W16X36">W16X36</option>
          <option value="W18X50">W18X50</option>
          <option value="W21X50">W21X50</option>
        </select>
      </PropertyGroup>

      {/* End Releases */}
      <PropertyGroup label="End Releases">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-xs text-slate-500 block mb-1">Start (I)</span>
            {(['mx', 'my', 'mz'] as const).map((moment) => (
              <label key={`i-${moment}`} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={beam.releases_i[moment]}
                  onChange={(e) =>
                    updateBeam(beam.id, {
                      releases_i: { ...beam.releases_i, [moment]: e.target.checked },
                    })
                  }
                  className="rounded border-lele-border bg-lele-bg"
                />
                <span className="text-slate-400 uppercase text-xs">{moment}</span>
              </label>
            ))}
          </div>
          <div>
            <span className="text-xs text-slate-500 block mb-1">End (J)</span>
            {(['mx', 'my', 'mz'] as const).map((moment) => (
              <label key={`j-${moment}`} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={beam.releases_j[moment]}
                  onChange={(e) =>
                    updateBeam(beam.id, {
                      releases_j: { ...beam.releases_j, [moment]: e.target.checked },
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
