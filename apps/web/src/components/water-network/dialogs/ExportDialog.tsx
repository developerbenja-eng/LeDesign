'use client';

import { useState } from 'react';
import { X, Download, FileText, FileCode, CheckCircle } from 'lucide-react';
import { useWaterNetworkStore, useNetwork } from '@/stores/water-network/waterNetworkStore';
import type { WaterNetwork } from '@ledesign/hydraulics';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type ExportFormat = 'inp' | 'dxf' | 'json';

export function ExportDialog({ isOpen, onClose }: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('inp');
  const [includeResults, setIncludeResults] = useState(false);
  const [exported, setExported] = useState(false);

  const network = useNetwork();
  const projectName = useWaterNetworkStore((s) => s.projectName);
  const solver = useWaterNetworkStore((s) => s.solver);

  const generateINP = (network: WaterNetwork): string => {
    const lines: string[] = [];

    // Title
    lines.push('[TITLE]');
    lines.push(network.title || projectName || 'Red de Agua Potable');
    lines.push('');

    // Junctions
    lines.push('[JUNCTIONS]');
    lines.push(';ID              Elev        Demand      Pattern');
    network.junctions.forEach((j) => {
      lines.push(`${j.id.padEnd(16)} ${j.elevation.toFixed(2).padStart(10)} ${(j.baseDemand || 0).toFixed(4).padStart(10)} ${j.demandPattern || ''}`);
    });
    lines.push('');

    // Reservoirs
    lines.push('[RESERVOIRS]');
    lines.push(';ID              Head        Pattern');
    network.reservoirs.forEach((r) => {
      lines.push(`${r.id.padEnd(16)} ${r.totalHead.toFixed(2).padStart(10)} ${r.headPattern || ''}`);
    });
    lines.push('');

    // Tanks
    lines.push('[TANKS]');
    lines.push(';ID              Elevation   InitLevel   MinLevel    MaxLevel    Diameter    MinVol      VolCurve');
    network.tanks.forEach((t) => {
      lines.push(`${t.id.padEnd(16)} ${t.elevation.toFixed(2).padStart(10)} ${t.initLevel.toFixed(2).padStart(10)} ${t.minLevel.toFixed(2).padStart(10)} ${t.maxLevel.toFixed(2).padStart(10)} ${t.diameter.toFixed(2).padStart(10)} ${(t.minVolume || 0).toFixed(2).padStart(10)} ${t.volumeCurve || ''}`);
    });
    lines.push('');

    // Pipes
    lines.push('[PIPES]');
    lines.push(';ID              Node1           Node2           Length      Diameter    Roughness   MinorLoss   Status');
    network.pipes.forEach((p) => {
      lines.push(`${p.id.padEnd(16)} ${p.startNode.padEnd(16)} ${p.endNode.padEnd(16)} ${p.length.toFixed(2).padStart(10)} ${p.diameter.toFixed(2).padStart(10)} ${p.roughness.toFixed(4).padStart(10)} ${(p.minorLoss || 0).toFixed(4).padStart(10)} ${p.status || 'Open'}`);
    });
    lines.push('');

    // Pumps
    if (network.pumps.length > 0) {
      lines.push('[PUMPS]');
      lines.push(';ID              Node1           Node2           Parameters');
      network.pumps.forEach((pump) => {
        let params = '';
        if (pump.pumpType === 'power' && pump.power) {
          params = `POWER ${pump.power}`;
        } else if (pump.headCurveId) {
          params = `HEAD ${pump.headCurveId}`;
        }
        if (pump.speed && pump.speed !== 1) {
          params += ` SPEED ${pump.speed}`;
        }
        lines.push(`${pump.id.padEnd(16)} ${pump.startNode.padEnd(16)} ${pump.endNode.padEnd(16)} ${params}`);
      });
      lines.push('');
    }

    // Valves
    if (network.valves.length > 0) {
      lines.push('[VALVES]');
      lines.push(';ID              Node1           Node2           Diameter    Type    Setting     MinorLoss');
      network.valves.forEach((v) => {
        lines.push(`${v.id.padEnd(16)} ${v.startNode.padEnd(16)} ${v.endNode.padEnd(16)} ${v.diameter.toFixed(2).padStart(10)} ${v.valveType.padStart(6)} ${v.setting.toFixed(2).padStart(10)} ${(v.minorLoss || 0).toFixed(4).padStart(10)}`);
      });
      lines.push('');
    }

    // Coordinates
    lines.push('[COORDINATES]');
    lines.push(';Node            X-Coord         Y-Coord');
    [...network.junctions, ...network.tanks, ...network.reservoirs].forEach((node) => {
      lines.push(`${node.id.padEnd(16)} ${node.x.toFixed(6).padStart(14)} ${node.y.toFixed(6).padStart(14)}`);
    });
    lines.push('');

    // Options
    lines.push('[OPTIONS]');
    lines.push(`Units             ${network.options.flowUnits || 'LPS'}`);
    lines.push(`Headloss          ${network.options.headlossFormula || 'H-W'}`);
    lines.push(`Specific Gravity  ${network.options.specificGravity || 1.0}`);
    lines.push(`Viscosity         ${network.options.viscosity || 1.0}`);
    lines.push(`Trials            ${network.options.trials || 40}`);
    lines.push(`Accuracy          ${network.options.accuracy || 0.001}`);
    lines.push('');

    // End
    lines.push('[END]');

    return lines.join('\n');
  };

  const generateDXF = (network: WaterNetwork): string => {
    const lines: string[] = [];

    // DXF Header
    lines.push('0');
    lines.push('SECTION');
    lines.push('2');
    lines.push('HEADER');
    lines.push('0');
    lines.push('ENDSEC');

    // Entities section
    lines.push('0');
    lines.push('SECTION');
    lines.push('2');
    lines.push('ENTITIES');

    // Draw pipes as lines
    network.pipes.forEach((pipe) => {
      const startNode = [...network.junctions, ...network.tanks, ...network.reservoirs].find(
        (n) => n.id === pipe.startNode
      );
      const endNode = [...network.junctions, ...network.tanks, ...network.reservoirs].find(
        (n) => n.id === pipe.endNode
      );

      if (startNode && endNode) {
        lines.push('0');
        lines.push('LINE');
        lines.push('8'); // Layer
        lines.push('PIPES');
        lines.push('10'); // Start X
        lines.push(startNode.x.toString());
        lines.push('20'); // Start Y
        lines.push(startNode.y.toString());
        lines.push('11'); // End X
        lines.push(endNode.x.toString());
        lines.push('21'); // End Y
        lines.push(endNode.y.toString());
      }
    });

    // Draw junctions as circles
    network.junctions.forEach((junction) => {
      lines.push('0');
      lines.push('CIRCLE');
      lines.push('8'); // Layer
      lines.push('JUNCTIONS');
      lines.push('10'); // Center X
      lines.push(junction.x.toString());
      lines.push('20'); // Center Y
      lines.push(junction.y.toString());
      lines.push('40'); // Radius
      lines.push('2');
    });

    // Draw tanks as larger circles
    network.tanks.forEach((tank) => {
      lines.push('0');
      lines.push('CIRCLE');
      lines.push('8'); // Layer
      lines.push('TANKS');
      lines.push('10');
      lines.push(tank.x.toString());
      lines.push('20');
      lines.push(tank.y.toString());
      lines.push('40');
      lines.push('5');
    });

    // Draw reservoirs as squares (polyline)
    network.reservoirs.forEach((reservoir) => {
      const size = 5;
      lines.push('0');
      lines.push('LWPOLYLINE');
      lines.push('8');
      lines.push('RESERVOIRS');
      lines.push('90'); // Number of vertices
      lines.push('4');
      lines.push('70'); // Closed polyline flag
      lines.push('1');
      // Vertices
      lines.push('10');
      lines.push((reservoir.x - size).toString());
      lines.push('20');
      lines.push((reservoir.y - size).toString());
      lines.push('10');
      lines.push((reservoir.x + size).toString());
      lines.push('20');
      lines.push((reservoir.y - size).toString());
      lines.push('10');
      lines.push((reservoir.x + size).toString());
      lines.push('20');
      lines.push((reservoir.y + size).toString());
      lines.push('10');
      lines.push((reservoir.x - size).toString());
      lines.push('20');
      lines.push((reservoir.y + size).toString());
    });

    lines.push('0');
    lines.push('ENDSEC');
    lines.push('0');
    lines.push('EOF');

    return lines.join('\n');
  };

  const generateJSON = (network: WaterNetwork): string => {
    const exportData: any = {
      ...network,
      exportDate: new Date().toISOString(),
      exportVersion: '1.0',
    };

    if (includeResults && solver?.converged) {
      exportData.results = {
        status: solver.status,
        iterations: solver.iterations,
        totalDemand: solver.totalDemand,
        totalSupply: solver.totalSupply,
        nodeResults: Object.fromEntries(solver.nodeResults),
        linkResults: Object.fromEntries(solver.linkResults),
      };
    }

    return JSON.stringify(exportData, null, 2);
  };

  const handleExport = () => {
    let content: string;
    let filename: string;
    let mimeType: string;

    switch (format) {
      case 'inp':
        content = generateINP(network);
        filename = `${projectName || 'red'}.inp`;
        mimeType = 'text/plain';
        break;
      case 'dxf':
        content = generateDXF(network);
        filename = `${projectName || 'red'}.dxf`;
        mimeType = 'application/dxf';
        break;
      case 'json':
        content = generateJSON(network);
        filename = `${projectName || 'red'}.json`;
        mimeType = 'application/json';
        break;
      default:
        return;
    }

    // Create blob and download
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExported(true);
  };

  const handleClose = () => {
    setExported(false);
    onClose();
  };

  if (!isOpen) return null;

  const stats = {
    junctions: network.junctions.length,
    pipes: network.pipes.length,
    tanks: network.tanks.length,
    reservoirs: network.reservoirs.length,
    pumps: network.pumps.length,
    valves: network.valves.length,
  };

  const formatInfo: Record<ExportFormat, { icon: React.ReactNode; name: string; desc: string }> = {
    inp: {
      icon: <FileText size={20} />,
      name: 'EPANET INP',
      desc: 'Formato estándar EPANET 2.x',
    },
    dxf: {
      icon: <FileCode size={20} />,
      name: 'AutoCAD DXF',
      desc: 'Dibujo vectorial para CAD',
    },
    json: {
      icon: <FileCode size={20} />,
      name: 'JSON',
      desc: 'Formato de datos estructurado',
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-slate-800 rounded-lg border border-slate-700 shadow-xl w-[450px] max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Exportar Red</h2>
          <button
            onClick={handleClose}
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Network Stats */}
          <div className="bg-slate-900/50 p-3 rounded-lg">
            <p className="text-xs text-slate-400 mb-2">Red a exportar</p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className="text-lg font-semibold text-white">{stats.junctions}</div>
                <div className="text-slate-400">Nodos</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-white">{stats.pipes}</div>
                <div className="text-slate-400">Tuberías</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-white">
                  {stats.tanks + stats.reservoirs}
                </div>
                <div className="text-slate-400">Fuentes</div>
              </div>
            </div>
          </div>

          {/* Format Selection */}
          <div>
            <p className="text-xs text-slate-400 mb-2">Formato de exportación</p>
            <div className="space-y-2">
              {(Object.keys(formatInfo) as ExportFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setFormat(fmt)}
                  className={`
                    w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left
                    ${format === fmt
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-slate-600 hover:border-slate-500 bg-slate-700/50'
                    }
                  `}
                >
                  <div className={format === fmt ? 'text-blue-400' : 'text-slate-400'}>
                    {formatInfo[fmt].icon}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">
                      {formatInfo[fmt].name}
                    </div>
                    <div className="text-xs text-slate-400">{formatInfo[fmt].desc}</div>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border-2 ${
                      format === fmt
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-slate-500'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          {format === 'json' && (
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeResults}
                  onChange={(e) => setIncludeResults(e.target.checked)}
                  disabled={!solver?.converged}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
                />
                <span className={`text-sm ${solver?.converged ? 'text-slate-300' : 'text-slate-500'}`}>
                  Incluir resultados del solver
                </span>
              </label>
              {!solver?.converged && (
                <p className="text-xs text-slate-500 mt-1 ml-6">
                  Ejecuta el solver para incluir resultados
                </p>
              )}
            </div>
          )}

          {/* Success Message */}
          {exported && (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <CheckCircle size={16} className="text-green-400" />
              <span className="text-sm text-green-300">Archivo exportado correctamente</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-slate-700">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={handleExport}
            disabled={stats.junctions + stats.tanks + stats.reservoirs === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
          >
            <Download size={16} />
            Exportar {formatInfo[format].name}
          </button>
        </div>
      </div>
    </div>
  );
}
