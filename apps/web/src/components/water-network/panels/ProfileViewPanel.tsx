'use client';

import { X, Mountain, TrendingDown, Droplets } from 'lucide-react';
import {
  useWaterNetworkStore,
  useNetwork,
  usePanelActions,
} from '@/stores/water-network/waterNetworkStore';
import { useMemo } from 'react';

interface ProfilePoint {
  distance: number;
  elevation: number;
  hydraulicGrade?: number;
  nodeId: string;
  nodeType: 'junction' | 'tank' | 'reservoir';
  pressure?: number;
}

export function ProfileViewPanel() {
  const network = useNetwork();
  const solver = useWaterNetworkStore((s) => s.solver);
  const selectedLinkIds = useWaterNetworkStore((s) => s.selection.selectedLinkIds);
  const { togglePanel } = usePanelActions();

  // Build profile data from selected pipes
  const profileData = useMemo((): ProfilePoint[] => {
    if (selectedLinkIds.size === 0) return [];

    const selectedPipes = network.pipes.filter((p) => selectedLinkIds.has(p.id));
    if (selectedPipes.length === 0) return [];

    // For simplicity, take the first selected pipe and its connected path
    const startPipe = selectedPipes[0];
    const points: ProfilePoint[] = [];
    let cumulativeDistance = 0;

    // Get start node
    const startNode = [...network.junctions, ...network.tanks, ...network.reservoirs].find(
      (n) => n.id === startPipe.startNode
    );

    if (startNode) {
      const result = solver?.nodeResults.get(startNode.id);
      points.push({
        distance: 0,
        elevation: startNode.type === 'junction' ? startNode.elevation :
                   startNode.type === 'tank' ? startNode.elevation : startNode.totalHead,
        hydraulicGrade: result?.head,
        nodeId: startNode.id,
        nodeType: startNode.type,
        pressure: result?.pressure,
      });
    }

    // Get end node
    const endNode = [...network.junctions, ...network.tanks, ...network.reservoirs].find(
      (n) => n.id === startPipe.endNode
    );

    if (endNode) {
      cumulativeDistance += startPipe.length;
      const result = solver?.nodeResults.get(endNode.id);
      points.push({
        distance: cumulativeDistance,
        elevation: endNode.type === 'junction' ? endNode.elevation :
                   endNode.type === 'tank' ? endNode.elevation : endNode.totalHead,
        hydraulicGrade: result?.head,
        nodeId: endNode.id,
        nodeType: endNode.type,
        pressure: result?.pressure,
      });
    }

    return points;
  }, [selectedLinkIds, network, solver]);

  // Calculate SVG path for profile
  const { groundPath, hglPath, minElev, maxElev, totalDistance } = useMemo(() => {
    if (profileData.length < 2) {
      return { groundPath: '', hglPath: '', minElev: 0, maxElev: 100, totalDistance: 0 };
    }

    const minElev = Math.min(...profileData.map((p) => p.elevation)) - 5;
    const maxElev = Math.max(
      ...profileData.map((p) => Math.max(p.elevation, p.hydraulicGrade || 0))
    ) + 10;
    const totalDistance = profileData[profileData.length - 1].distance;

    const width = 600;
    const height = 250;
    const padding = { top: 30, right: 40, bottom: 40, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const scaleX = (dist: number) => padding.left + (dist / totalDistance) * chartWidth;
    const scaleY = (elev: number) =>
      padding.top + chartHeight - ((elev - minElev) / (maxElev - minElev)) * chartHeight;

    // Ground profile path
    let groundPath = `M ${scaleX(0)} ${scaleY(profileData[0].elevation)}`;
    for (let i = 1; i < profileData.length; i++) {
      groundPath += ` L ${scaleX(profileData[i].distance)} ${scaleY(profileData[i].elevation)}`;
    }

    // Hydraulic grade line path
    let hglPath = '';
    if (profileData[0].hydraulicGrade !== undefined) {
      hglPath = `M ${scaleX(0)} ${scaleY(profileData[0].hydraulicGrade!)}`;
      for (let i = 1; i < profileData.length; i++) {
        if (profileData[i].hydraulicGrade !== undefined) {
          hglPath += ` L ${scaleX(profileData[i].distance)} ${scaleY(profileData[i].hydraulicGrade!)}`;
        }
      }
    }

    return { groundPath, hglPath, minElev, maxElev, totalDistance };
  }, [profileData]);

  const hasProfile = profileData.length >= 2;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Mountain size={20} className="text-emerald-400" />
          <h2 className="text-lg font-semibold text-white">Perfil Longitudinal</h2>
        </div>
        <button
          onClick={() => togglePanel('profile')}
          className="p-1 text-slate-400 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {hasProfile ? (
          <div className="space-y-4">
            {/* SVG Profile Chart */}
            <div className="bg-slate-900 rounded-lg p-4">
              <svg width="600" height="250" className="mx-auto">
                {/* Grid */}
                <defs>
                  <pattern id="profile-grid" width="50" height="25" patternUnits="userSpaceOnUse">
                    <path d="M 50 0 L 0 0 0 25" fill="none" stroke="#334155" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect
                  x="60"
                  y="30"
                  width="540"
                  height="180"
                  fill="url(#profile-grid)"
                />

                {/* Axes */}
                <line x1="60" y1="210" x2="600" y2="210" stroke="#64748b" strokeWidth="2" />
                <line x1="60" y1="30" x2="60" y2="210" stroke="#64748b" strokeWidth="2" />

                {/* Y-axis label */}
                <text
                  x="20"
                  y="120"
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="12"
                  transform="rotate(-90, 20, 120)"
                >
                  Elevación (m)
                </text>

                {/* X-axis label */}
                <text x="330" y="245" textAnchor="middle" fill="#94a3b8" fontSize="12">
                  Distancia (m)
                </text>

                {/* Y-axis ticks */}
                {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
                  const elev = minElev + fraction * (maxElev - minElev);
                  const y = 210 - fraction * 180;
                  return (
                    <g key={fraction}>
                      <line x1="55" y1={y} x2="60" y2={y} stroke="#64748b" strokeWidth="1" />
                      <text x="50" y={y + 4} textAnchor="end" fill="#64748b" fontSize="10">
                        {elev.toFixed(0)}
                      </text>
                    </g>
                  );
                })}

                {/* X-axis ticks */}
                {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
                  const dist = fraction * totalDistance;
                  const x = 60 + fraction * 540;
                  return (
                    <g key={fraction}>
                      <line x1={x} y1="210" x2={x} y2="215" stroke="#64748b" strokeWidth="1" />
                      <text x={x} y="230" textAnchor="middle" fill="#64748b" fontSize="10">
                        {dist.toFixed(0)}
                      </text>
                    </g>
                  );
                })}

                {/* Ground profile */}
                <path d={groundPath} fill="none" stroke="#78716c" strokeWidth="3" />

                {/* Fill below ground */}
                <path
                  d={`${groundPath} L ${60 + (totalDistance / totalDistance) * 540} 210 L 60 210 Z`}
                  fill="#78716c"
                  fillOpacity="0.2"
                />

                {/* Hydraulic grade line */}
                {hglPath && (
                  <>
                    <path d={hglPath} fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="5,5" />

                    {/* Fill between HGL and ground (pressure zone) */}
                    <path
                      d={`${groundPath} L ${profileData[profileData.length - 1].distance} ${profileData[profileData.length - 1].hydraulicGrade} ${hglPath.split('M')[1]} Z`}
                      fill="#3b82f6"
                      fillOpacity="0.1"
                    />
                  </>
                )}

                {/* Node markers */}
                {profileData.map((point, i) => {
                  const x = 60 + (point.distance / totalDistance) * 540;
                  const y = 210 - ((point.elevation - minElev) / (maxElev - minElev)) * 180;

                  const color = point.nodeType === 'junction' ? '#3b82f6' :
                                point.nodeType === 'tank' ? '#06b6d4' : '#10b981';

                  return (
                    <g key={i}>
                      <circle cx={x} cy={y} r="5" fill={color} stroke="white" strokeWidth="2" />
                      <text x={x} y={y - 12} textAnchor="middle" fill="#cbd5e1" fontSize="10">
                        {point.nodeId}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Legend */}
              <div className="flex items-center justify-center gap-6 mt-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-stone-500"></div>
                  <span className="text-slate-400">Terreno</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-blue-500 border-dashed border-t-2 border-blue-500"></div>
                  <span className="text-slate-400">Línea Piezométrica</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-slate-400">Nodo</span>
                </div>
              </div>
            </div>

            {/* Node Details Table */}
            <div className="bg-slate-900/50 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-3 font-medium">Detalles de Nodos</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-slate-400 border-b border-slate-700">
                    <tr>
                      <th className="text-left py-2">Nodo</th>
                      <th className="text-right py-2">Distancia (m)</th>
                      <th className="text-right py-2">Elevación (m)</th>
                      <th className="text-right py-2">Cota Piez. (m)</th>
                      <th className="text-right py-2">Presión (m)</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300">
                    {profileData.map((point, i) => (
                      <tr key={i} className="border-b border-slate-800">
                        <td className="py-2">
                          <span className="font-mono">{point.nodeId}</span>
                        </td>
                        <td className="text-right font-mono">{point.distance.toFixed(2)}</td>
                        <td className="text-right font-mono">{point.elevation.toFixed(2)}</td>
                        <td className="text-right font-mono">
                          {point.hydraulicGrade !== undefined ? point.hydraulicGrade.toFixed(2) : '-'}
                        </td>
                        <td className="text-right font-mono">
                          {point.pressure !== undefined ? (
                            <span className={point.pressure < 10 ? 'text-yellow-400' : 'text-green-400'}>
                              {point.pressure.toFixed(2)}
                            </span>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown size={14} className="text-slate-400" />
                  <span className="text-xs text-slate-400">Desnivel</span>
                </div>
                <p className="text-lg font-semibold text-white">
                  {(profileData[profileData.length - 1].elevation - profileData[0].elevation).toFixed(2)} m
                </p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Mountain size={14} className="text-slate-400" />
                  <span className="text-xs text-slate-400">Pendiente</span>
                </div>
                <p className="text-lg font-semibold text-white">
                  {(((profileData[profileData.length - 1].elevation - profileData[0].elevation) / totalDistance) * 100).toFixed(3)}%
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
            <Mountain size={48} className="mb-4 opacity-50" />
            <p className="text-sm">Sin perfil seleccionado</p>
            <p className="text-xs mt-2 text-slate-500">
              Selecciona una o más tuberías para ver el perfil longitudinal
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700 bg-slate-900/50">
        <p className="text-xs text-slate-500">
          El perfil muestra la elevación del terreno y la línea piezométrica calculada.
        </p>
      </div>
    </div>
  );
}
