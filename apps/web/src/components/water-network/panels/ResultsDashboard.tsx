'use client';

import { X, BarChart3, Droplets, Gauge, Wind, AlertTriangle, CheckCircle } from 'lucide-react';
import {
  useWaterNetworkStore,
  useJunctions,
  usePipes,
  useTanks,
  useReservoirs,
  usePanelActions,
} from '@/stores/water-network/waterNetworkStore';

export function ResultsDashboard() {
  const solver = useWaterNetworkStore((s) => s.solver);
  const junctions = useJunctions();
  const pipes = usePipes();
  const tanks = useTanks();
  const reservoirs = useReservoirs();
  const { togglePanel } = usePanelActions();

  // Calculate statistics from solver results
  const stats = calculateStatistics(solver, junctions.length, pipes.length);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <BarChart3 size={20} className="text-blue-400" />
          <h2 className="text-lg font-semibold text-white">Resultados</h2>
        </div>
        <button
          onClick={() => togglePanel('results')}
          className="p-1 text-slate-400 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Solver Status */}
      <div className="p-4 border-b border-slate-700">
        <SolverStatusCard solver={solver} />
      </div>

      {/* Network Summary */}
      <div className="p-4 border-b border-slate-700">
        <h3 className="text-sm font-medium text-slate-300 mb-3">Resumen de Red</h3>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Nodos" value={junctions.length} icon={<div className="w-2 h-2 rounded-full bg-blue-400" />} />
          <StatCard label="Tuberías" value={pipes.length} icon={<div className="w-4 h-0.5 bg-cyan-400" />} />
          <StatCard label="Estanques" value={tanks.length} icon={<div className="w-2 h-2 rounded bg-cyan-400" />} />
          <StatCard label="Embalses" value={reservoirs.length} icon={<div className="w-2 h-2 rounded bg-green-400" />} />
        </div>
      </div>

      {/* Flow Balance */}
      {solver && solver.status === 'converged' && (
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-sm font-medium text-slate-300 mb-3">Balance de Flujo</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Demanda Total</span>
              <span className="text-sm text-white font-mono">{solver.totalDemand.toFixed(2)} L/s</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Suministro Total</span>
              <span className="text-sm text-white font-mono">{solver.totalSupply.toFixed(2)} L/s</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Balance</span>
              <span className={`text-sm font-mono ${Math.abs(solver.totalSupply - solver.totalDemand) < 0.01 ? 'text-green-400' : 'text-yellow-400'}`}>
                {(solver.totalSupply - solver.totalDemand).toFixed(3)} L/s
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Pressure Statistics */}
      {solver && solver.status === 'converged' && (
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
            <Gauge size={14} />
            Presiones
          </h3>
          <div className="space-y-2">
            <StatRow label="Mínima" value={`${stats.minPressure.toFixed(1)} m`} color={stats.minPressure < 10 ? 'text-red-400' : 'text-white'} />
            <StatRow label="Máxima" value={`${stats.maxPressure.toFixed(1)} m`} color={stats.maxPressure > 70 ? 'text-yellow-400' : 'text-white'} />
            <StatRow label="Promedio" value={`${stats.avgPressure.toFixed(1)} m`} color="text-white" />
          </div>

          {/* Pressure Bar */}
          <div className="mt-3">
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-500 via-green-500 to-blue-500"
                style={{ width: '100%' }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>0 m</span>
              <span>Óptimo: 15-50 m</span>
              <span>80 m</span>
            </div>
          </div>
        </div>
      )}

      {/* Velocity Statistics */}
      {solver && solver.status === 'converged' && (
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
            <Wind size={14} />
            Velocidades
          </h3>
          <div className="space-y-2">
            <StatRow label="Mínima" value={`${stats.minVelocity.toFixed(2)} m/s`} color={stats.minVelocity < 0.3 ? 'text-yellow-400' : 'text-white'} />
            <StatRow label="Máxima" value={`${stats.maxVelocity.toFixed(2)} m/s`} color={stats.maxVelocity > 3 ? 'text-red-400' : 'text-white'} />
            <StatRow label="Promedio" value={`${stats.avgVelocity.toFixed(2)} m/s`} color="text-white" />
          </div>

          {/* Velocity Bar */}
          <div className="mt-3">
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-green-500 to-red-500"
                style={{ width: '100%' }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>0 m/s</span>
              <span>Óptimo: 0.6-2.0 m/s</span>
              <span>4 m/s</span>
            </div>
          </div>
        </div>
      )}

      {/* Warnings & Errors */}
      {solver && (solver.warnings.length > 0 || solver.errors.length > 0) && (
        <div className="p-4 flex-1 overflow-y-auto">
          <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
            <AlertTriangle size={14} className="text-yellow-400" />
            Alertas
          </h3>
          <div className="space-y-2">
            {solver.errors.map((error, i) => (
              <div key={`error-${i}`} className="p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-300">
                {error}
              </div>
            ))}
            {solver.warnings.map((warning, i) => (
              <div key={`warning-${i}`} className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-300">
                {warning}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results State */}
      {!solver && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center text-slate-400">
            <Droplets size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-sm">Sin resultados</p>
            <p className="text-xs mt-1 text-slate-500">
              Agrega elementos a la red para calcular
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 border-t border-slate-700 bg-slate-900/50 mt-auto">
        <p className="text-xs text-slate-500">
          Cálculos basados en NCh 691 y buenas prácticas de diseño.
        </p>
      </div>
    </div>
  );
}

interface SolverStatusCardProps {
  solver: ReturnType<typeof useWaterNetworkStore>['solver'];
}

function SolverStatusCard({ solver }: SolverStatusCardProps) {
  if (!solver) {
    return (
      <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
        <div className="w-3 h-3 rounded-full bg-slate-500" />
        <div>
          <p className="text-sm text-slate-300">Sin ejecutar</p>
          <p className="text-xs text-slate-500">Agrega elementos para calcular</p>
        </div>
      </div>
    );
  }

  const statusConfig = {
    idle: { color: 'bg-slate-400', text: 'Listo', desc: 'Esperando cambios' },
    running: { color: 'bg-yellow-400 animate-pulse', text: 'Calculando...', desc: 'Procesando red' },
    converged: { color: 'bg-green-400', text: 'Convergido', desc: `${solver.iterations} iteraciones en ${solver.solveTime}ms` },
    failed: { color: 'bg-red-400', text: 'Error', desc: 'No se pudo resolver' },
    warning: { color: 'bg-orange-400', text: 'Advertencias', desc: 'Revisa las alertas' },
  };

  const config = statusConfig[solver.status];

  return (
    <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
      <div className={`w-3 h-3 rounded-full ${config.color}`} />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <p className="text-sm text-white">{config.text}</p>
          {solver.status === 'converged' && (
            <CheckCircle size={14} className="text-green-400" />
          )}
        </div>
        <p className="text-xs text-slate-400">{config.desc}</p>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
}

function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="p-3 bg-slate-700/50 rounded-lg">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <p className="text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

interface StatRowProps {
  label: string;
  value: string;
  color: string;
}

function StatRow({ label, value, color }: StatRowProps) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={`text-sm font-mono ${color}`}>{value}</span>
    </div>
  );
}

function calculateStatistics(
  solver: ReturnType<typeof useWaterNetworkStore>['solver'],
  junctionCount: number,
  pipeCount: number
) {
  const defaultStats = {
    minPressure: 0,
    maxPressure: 0,
    avgPressure: 0,
    minVelocity: 0,
    maxVelocity: 0,
    avgVelocity: 0,
  };

  if (!solver || solver.status !== 'converged') {
    return defaultStats;
  }

  // Calculate pressure stats from node results
  const pressures: number[] = [];
  solver.nodeResults.forEach((result) => {
    if (result.pressure !== undefined) {
      pressures.push(result.pressure);
    }
  });

  // Calculate velocity stats from link results
  const velocities: number[] = [];
  solver.linkResults.forEach((result) => {
    if (result.velocity !== undefined) {
      velocities.push(Math.abs(result.velocity));
    }
  });

  return {
    minPressure: pressures.length > 0 ? Math.min(...pressures) : 0,
    maxPressure: pressures.length > 0 ? Math.max(...pressures) : 0,
    avgPressure: pressures.length > 0 ? pressures.reduce((a, b) => a + b, 0) / pressures.length : 0,
    minVelocity: velocities.length > 0 ? Math.min(...velocities) : 0,
    maxVelocity: velocities.length > 0 ? Math.max(...velocities) : 0,
    avgVelocity: velocities.length > 0 ? velocities.reduce((a, b) => a + b, 0) / velocities.length : 0,
  };
}
