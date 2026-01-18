'use client';

import { X, Circle, Container, Droplets, GitBranch } from 'lucide-react';
import {
  useWaterNetworkStore,
  useNetworkActions,
  usePanelActions,
} from '@/stores/water-network/waterNetworkStore';
import type { Junction, Tank, Reservoir, Pipe } from '@ledesign/hydraulics';

export function NetworkPropertiesPanel() {
  const selection = useWaterNetworkStore((s) => s.selection);
  const network = useWaterNetworkStore((s) => s.network);
  const { togglePanel } = usePanelActions();

  // Get selected elements
  const selectedNodeIds = Array.from(selection.selectedNodeIds);
  const selectedLinkIds = Array.from(selection.selectedLinkIds);

  const selectedNode = selectedNodeIds.length === 1
    ? [...network.junctions, ...network.tanks, ...network.reservoirs].find(
        (n) => n.id === selectedNodeIds[0]
      )
    : null;

  const selectedLink = selectedLinkIds.length === 1
    ? [...network.pipes, ...network.pumps, ...network.valves].find(
        (l) => l.id === selectedLinkIds[0]
      )
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <h2 className="text-lg font-semibold text-white">Propiedades</h2>
        <button
          onClick={() => togglePanel('properties')}
          className="p-1 text-slate-400 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {selectedNode && selectedNode.type === 'junction' && (
          <JunctionProperties junction={selectedNode as Junction} />
        )}
        {selectedNode && selectedNode.type === 'tank' && (
          <TankProperties tank={selectedNode as Tank} />
        )}
        {selectedNode && selectedNode.type === 'reservoir' && (
          <ReservoirProperties reservoir={selectedNode as Reservoir} />
        )}
        {selectedLink && selectedLink.type === 'pipe' && (
          <PipeProperties pipe={selectedLink as Pipe} />
        )}
        {!selectedNode && !selectedLink && (
          <div className="text-center text-slate-400 py-8">
            <Circle size={48} className="mx-auto mb-4 opacity-50" />
            <p>Seleccione un elemento para ver sus propiedades</p>
          </div>
        )}
        {(selectedNodeIds.length > 1 || selectedLinkIds.length > 1) && (
          <div className="text-center text-slate-400 py-8">
            <p>{selectedNodeIds.length + selectedLinkIds.length} elementos seleccionados</p>
          </div>
        )}
      </div>

      {/* Network Summary */}
      <div className="p-4 border-t border-slate-700 bg-slate-900/50">
        <h3 className="text-sm font-medium text-slate-300 mb-2">Resumen de Red</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <Circle size={12} className="text-blue-400" />
            <span>{network.junctions.length} nodos</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Container size={12} className="text-cyan-400" />
            <span>{network.tanks.length} estanques</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Droplets size={12} className="text-green-400" />
            <span>{network.reservoirs.length} embalses</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <GitBranch size={12} className="text-blue-400" />
            <span>{network.pipes.length} tuberías</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function JunctionProperties({ junction }: { junction: Junction }) {
  const { updateJunction } = useNetworkActions();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Circle size={20} className="text-blue-400" />
        <h3 className="text-lg font-medium text-white">{junction.id}</h3>
        <span className="text-xs px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded">Nodo</span>
      </div>

      <PropertyInput
        label="ID"
        value={junction.id}
        disabled
      />
      <PropertyInput
        label="Coordenada X (m)"
        value={junction.x}
        type="number"
        onChange={(value) => updateJunction(junction.id, { x: Number(value) })}
      />
      <PropertyInput
        label="Coordenada Y (m)"
        value={junction.y}
        type="number"
        onChange={(value) => updateJunction(junction.id, { y: Number(value) })}
      />
      <PropertyInput
        label="Elevación (m)"
        value={junction.elevation}
        type="number"
        onChange={(value) => updateJunction(junction.id, { elevation: Number(value) })}
      />
      <PropertyInput
        label="Demanda Base (L/s)"
        value={junction.baseDemand}
        type="number"
        step="0.1"
        onChange={(value) => updateJunction(junction.id, { baseDemand: Number(value) })}
      />

      {/* Results */}
      {junction.pressure !== undefined && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          <h4 className="text-sm font-medium text-slate-300 mb-2">Resultados</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-slate-400">
              <span>Presión:</span>
              <span className="text-white">{junction.pressure?.toFixed(2)} m</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Altura:</span>
              <span className="text-white">{junction.head?.toFixed(2)} m</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TankProperties({ tank }: { tank: Tank }) {
  const { updateTank } = useNetworkActions();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Container size={20} className="text-cyan-400" />
        <h3 className="text-lg font-medium text-white">{tank.id}</h3>
        <span className="text-xs px-2 py-0.5 bg-cyan-600/20 text-cyan-400 rounded">Estanque</span>
      </div>

      <PropertyInput
        label="ID"
        value={tank.id}
        disabled
      />
      <PropertyInput
        label="Elevación (m)"
        value={tank.elevation}
        type="number"
        onChange={(value) => updateTank(tank.id, { elevation: Number(value) })}
      />
      <PropertyInput
        label="Diámetro (m)"
        value={tank.diameter}
        type="number"
        step="0.1"
        onChange={(value) => updateTank(tank.id, { diameter: Number(value) })}
      />
      <PropertyInput
        label="Nivel Inicial (m)"
        value={tank.initLevel}
        type="number"
        step="0.1"
        onChange={(value) => updateTank(tank.id, { initLevel: Number(value) })}
      />
      <PropertyInput
        label="Nivel Mínimo (m)"
        value={tank.minLevel}
        type="number"
        step="0.1"
        onChange={(value) => updateTank(tank.id, { minLevel: Number(value) })}
      />
      <PropertyInput
        label="Nivel Máximo (m)"
        value={tank.maxLevel}
        type="number"
        step="0.1"
        onChange={(value) => updateTank(tank.id, { maxLevel: Number(value) })}
      />
    </div>
  );
}

function ReservoirProperties({ reservoir }: { reservoir: Reservoir }) {
  const { updateReservoir } = useNetworkActions();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Droplets size={20} className="text-green-400" />
        <h3 className="text-lg font-medium text-white">{reservoir.id}</h3>
        <span className="text-xs px-2 py-0.5 bg-green-600/20 text-green-400 rounded">Embalse</span>
      </div>

      <PropertyInput
        label="ID"
        value={reservoir.id}
        disabled
      />
      <PropertyInput
        label="Elevación (m)"
        value={reservoir.elevation}
        type="number"
        onChange={(value) => updateReservoir(reservoir.id, { elevation: Number(value) })}
      />
      <PropertyInput
        label="Altura Total (m)"
        value={reservoir.totalHead}
        type="number"
        onChange={(value) => updateReservoir(reservoir.id, { totalHead: Number(value) })}
      />
    </div>
  );
}

function PipeProperties({ pipe }: { pipe: Pipe }) {
  const { updatePipe } = useNetworkActions();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <GitBranch size={20} className="text-blue-400" />
        <h3 className="text-lg font-medium text-white">{pipe.id}</h3>
        <span className="text-xs px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded">Tubería</span>
      </div>

      <PropertyInput
        label="ID"
        value={pipe.id}
        disabled
      />
      <PropertyInput
        label="Nodo Inicio"
        value={pipe.startNode}
        disabled
      />
      <PropertyInput
        label="Nodo Fin"
        value={pipe.endNode}
        disabled
      />
      <PropertyInput
        label="Longitud (m)"
        value={pipe.length}
        type="number"
        onChange={(value) => updatePipe(pipe.id, { length: Number(value) })}
      />
      <PropertyInput
        label="Diámetro (mm)"
        value={pipe.diameter}
        type="number"
        onChange={(value) => updatePipe(pipe.id, { diameter: Number(value) })}
      />
      <PropertySelect
        label="Material"
        value={pipe.material}
        options={[
          { value: 'pvc', label: 'PVC' },
          { value: 'hdpe', label: 'HDPE' },
          { value: 'ductile_iron', label: 'Hierro Dúctil' },
          { value: 'steel', label: 'Acero' },
          { value: 'concrete', label: 'Hormigón' },
        ]}
        onChange={(value) => updatePipe(pipe.id, { material: value as any })}
      />
      <PropertyInput
        label="Rugosidad (C)"
        value={pipe.roughness}
        type="number"
        onChange={(value) => updatePipe(pipe.id, { roughness: Number(value) })}
      />

      {/* Results */}
      {pipe.flow !== undefined && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          <h4 className="text-sm font-medium text-slate-300 mb-2">Resultados</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-slate-400">
              <span>Caudal:</span>
              <span className="text-white">{pipe.flow?.toFixed(2)} L/s</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Velocidad:</span>
              <span className="text-white">{pipe.velocity?.toFixed(2)} m/s</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Pérdida:</span>
              <span className="text-white">{pipe.headLoss?.toFixed(2)} m</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface PropertyInputProps {
  label: string;
  value: string | number;
  type?: 'text' | 'number';
  step?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
}

function PropertyInput({ label, value, type = 'text', step, disabled, onChange }: PropertyInputProps) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        step={step}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        className={`
          w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-sm text-white
          focus:outline-none focus:border-blue-500
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      />
    </div>
  );
}

interface PropertySelectProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange?: (value: string) => void;
}

function PropertySelect({ label, value, options, onChange }: PropertySelectProps) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-sm text-white focus:outline-none focus:border-blue-500"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
