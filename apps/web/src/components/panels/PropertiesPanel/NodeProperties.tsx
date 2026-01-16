'use client';

// ============================================================
// NODE PROPERTIES
// Property editor for structural nodes
// ============================================================

import { useState, useEffect } from 'react';
import { StructuralNode, SupportType } from '@ledesign/structural';
import { useEditorStore } from '@/stores';

interface NodePropertiesProps {
  node: StructuralNode;
}

export function NodeProperties({ node }: NodePropertiesProps) {
  const updateNode = useEditorStore((state) => state.updateNode);

  // Local state for form
  const [x, setX] = useState(node.x.toString());
  const [y, setY] = useState(node.y.toString());
  const [z, setZ] = useState(node.z.toString());
  const [name, setName] = useState(node.name || '');

  // Sync when node changes
  useEffect(() => {
    setX(node.x.toString());
    setY(node.y.toString());
    setZ(node.z.toString());
    setName(node.name || '');
  }, [node]);

  const handleCoordinateChange = (axis: 'x' | 'y' | 'z', value: string) => {
    const setter = { x: setX, y: setY, z: setZ }[axis];
    setter(value);

    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      updateNode(node.id, { [axis]: numValue });
    }
  };

  const handleNameChange = (value: string) => {
    setName(value);
    updateNode(node.id, { name: value || null });
  };

  const handleSupportChange = (supportType: SupportType) => {
    // Define restraints based on support type
    const restraints = {
      free: { dx: false, dy: false, dz: false, rx: false, ry: false, rz: false },
      pinned: { dx: true, dy: true, dz: true, rx: false, ry: false, rz: false },
      fixed: { dx: true, dy: true, dz: true, rx: true, ry: true, rz: true },
      roller_x: { dx: false, dy: true, dz: true, rx: false, ry: false, rz: false },
      roller_y: { dx: true, dy: false, dz: true, rx: false, ry: false, rz: false },
      roller_z: { dx: true, dy: true, dz: false, rx: false, ry: false, rz: false },
      spring: { dx: false, dy: false, dz: false, rx: false, ry: false, rz: false },
      custom: node.restraints,
    }[supportType];

    updateNode(node.id, { support_type: supportType, restraints });
  };

  return (
    <div className="space-y-4">
      {/* Element Type Badge */}
      <div className="flex items-center gap-2">
        <span className="px-2 py-0.5 bg-slate-700 rounded text-xs font-medium">
          Node
        </span>
        <span className="text-xs text-slate-500 font-mono">{node.id}</span>
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

      {/* Coordinates */}
      <PropertyGroup label="Coordinates">
        <div className="grid grid-cols-3 gap-2">
          <CoordinateInput label="X" value={x} onChange={(v) => handleCoordinateChange('x', v)} />
          <CoordinateInput label="Y" value={y} onChange={(v) => handleCoordinateChange('y', v)} />
          <CoordinateInput label="Z" value={z} onChange={(v) => handleCoordinateChange('z', v)} />
        </div>
      </PropertyGroup>

      {/* Support Type */}
      <PropertyGroup label="Support">
        <select
          value={node.support_type}
          onChange={(e) => handleSupportChange(e.target.value as SupportType)}
          className="w-full bg-lele-bg border border-lele-border rounded px-2 py-1.5 text-sm text-slate-200 focus:border-lele-accent focus:outline-none"
        >
          <option value="free">Free</option>
          <option value="pinned">Pinned</option>
          <option value="fixed">Fixed</option>
          <option value="roller_x">Roller X</option>
          <option value="roller_y">Roller Y</option>
          <option value="roller_z">Roller Z</option>
          <option value="custom">Custom</option>
        </select>
      </PropertyGroup>

      {/* Restraints (for custom) */}
      {node.support_type === 'custom' && (
        <PropertyGroup label="Restraints">
          <div className="grid grid-cols-2 gap-2">
            {(['dx', 'dy', 'dz', 'rx', 'ry', 'rz'] as const).map((dof) => (
              <label key={dof} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={node.restraints[dof]}
                  onChange={(e) =>
                    updateNode(node.id, {
                      restraints: { ...node.restraints, [dof]: e.target.checked },
                    })
                  }
                  className="rounded border-lele-border bg-lele-bg"
                />
                <span className="text-slate-400 uppercase">{dof}</span>
              </label>
            ))}
          </div>
        </PropertyGroup>
      )}
    </div>
  );
}

// ============================================================
// HELPER COMPONENTS
// ============================================================

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

function CoordinateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <span className="text-xs text-slate-500 mb-0.5 block">{label}</span>
      <input
        type="number"
        step="0.1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-lele-bg border border-lele-border rounded px-2 py-1 text-sm text-slate-200 focus:border-lele-accent focus:outline-none"
      />
    </div>
  );
}
