'use client';

// ============================================================
// CUBICACIONES VIEW
// Earthwork volume calculations (cut/fill analysis)
// ============================================================

import { useState, useEffect } from 'react';
import type { ViewInstance } from '@/stores/workspace-store';
import { useCADStore } from '@/stores/cad-store';
import { Calculator, Download, RefreshCcw, TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface CubicacionesViewProps {
  view: ViewInstance;
}

interface VolumeData {
  station: string;
  cut: number;
  fill: number;
  net: number;
  cumCut: number;
  cumFill: number;
  cumNet: number;
}

export function CubicacionesView({ view }: CubicacionesViewProps) {
  const entities = useCADStore((state) => state.entities);
  const [volumeData, setVolumeData] = useState<VolumeData[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  // Calculate volumes
  const calculateVolumes = () => {
    setIsCalculating(true);

    // Simulate calculation
    setTimeout(() => {
      const data: VolumeData[] = [];
      let cumCut = 0;
      let cumFill = 0;

      for (let i = 0; i <= 50; i++) {
        const station = `0+${i * 20}`.padStart(5, '0');
        const cut = Math.max(0, Math.random() * 100 - 50);
        const fill = Math.max(0, Math.random() * 100 - 50);
        const net = cut - fill;

        cumCut += cut;
        cumFill += fill;
        const cumNet = cumCut - cumFill;

        data.push({
          station,
          cut,
          fill,
          net,
          cumCut,
          cumFill,
          cumNet,
        });
      }

      setVolumeData(data);
      setIsCalculating(false);
    }, 1000);
  };

  useEffect(() => {
    calculateVolumes();
  }, []);

  const totalCut = volumeData.reduce((sum, d) => sum + d.cut, 0);
  const totalFill = volumeData.reduce((sum, d) => sum + d.fill, 0);
  const totalNet = totalCut - totalFill;

  const exportToCSV = () => {
    const headers = ['Station', 'Cut (m³)', 'Fill (m³)', 'Net (m³)', 'Cum. Cut', 'Cum. Fill', 'Cum. Net'];
    const rows = volumeData.map((d) => [
      d.station,
      d.cut.toFixed(2),
      d.fill.toFixed(2),
      d.net.toFixed(2),
      d.cumCut.toFixed(2),
      d.cumFill.toFixed(2),
      d.cumNet.toFixed(2),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cubicaciones.csv';
    a.click();
  };

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-800/50 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator size={18} className="text-blue-400" />
            <h3 className="font-semibold text-white">Earthwork Volumes</h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={calculateVolumes}
              disabled={isCalculating}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
            >
              <RefreshCcw size={14} className={isCalculating ? 'animate-spin' : ''} />
              {isCalculating ? 'Calculating...' : 'Recalculate'}
            </button>

            <button
              onClick={exportToCSV}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition-colors text-sm"
            >
              <Download size={14} />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-slate-800/30">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={16} className="text-red-400" />
            <span className="text-xs text-red-300">Total Cut</span>
          </div>
          <p className="text-2xl font-bold text-red-400">{totalCut.toFixed(0)} m³</p>
        </div>

        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-green-400" />
            <span className="text-xs text-green-300">Total Fill</span>
          </div>
          <p className="text-2xl font-bold text-green-400">{totalFill.toFixed(0)} m³</p>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Minus size={16} className="text-blue-400" />
            <span className="text-xs text-blue-300">Net Volume</span>
          </div>
          <p className={`text-2xl font-bold ${totalNet >= 0 ? 'text-red-400' : 'text-green-400'}`}>
            {totalNet >= 0 ? '+' : ''}{totalNet.toFixed(0)} m³
          </p>
        </div>
      </div>

      {/* Volume Table */}
      <div className="flex-1 overflow-auto p-4">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-800 text-slate-300">
            <tr>
              <th className="px-3 py-2 text-left font-medium border-b border-slate-700">Station</th>
              <th className="px-3 py-2 text-right font-medium border-b border-slate-700">Cut (m³)</th>
              <th className="px-3 py-2 text-right font-medium border-b border-slate-700">Fill (m³)</th>
              <th className="px-3 py-2 text-right font-medium border-b border-slate-700">Net (m³)</th>
              <th className="px-3 py-2 text-right font-medium border-b border-slate-700">Cum. Cut</th>
              <th className="px-3 py-2 text-right font-medium border-b border-slate-700">Cum. Fill</th>
              <th className="px-3 py-2 text-right font-medium border-b border-slate-700">Cum. Net</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            {volumeData.map((row, index) => (
              <tr
                key={index}
                className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
              >
                <td className="px-3 py-2 font-mono">{row.station}</td>
                <td className="px-3 py-2 text-right font-mono text-red-400">
                  {row.cut > 0 ? row.cut.toFixed(2) : '-'}
                </td>
                <td className="px-3 py-2 text-right font-mono text-green-400">
                  {row.fill > 0 ? row.fill.toFixed(2) : '-'}
                </td>
                <td className={`px-3 py-2 text-right font-mono ${row.net >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {row.net >= 0 ? '+' : ''}{row.net.toFixed(2)}
                </td>
                <td className="px-3 py-2 text-right font-mono text-slate-400">
                  {row.cumCut.toFixed(2)}
                </td>
                <td className="px-3 py-2 text-right font-mono text-slate-400">
                  {row.cumFill.toFixed(2)}
                </td>
                <td className={`px-3 py-2 text-right font-mono ${row.cumNet >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {row.cumNet >= 0 ? '+' : ''}{row.cumNet.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
