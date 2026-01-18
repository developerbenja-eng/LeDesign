'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';

interface CurvePoint {
  flow: number;  // L/s
  head: number;  // m
}

interface PumpCurveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  curveId: string;
  initialPoints?: CurvePoint[];
  onSave: (curveId: string, points: CurvePoint[]) => void;
}

export function PumpCurveDialog({
  isOpen,
  onClose,
  curveId,
  initialPoints = [],
  onSave,
}: PumpCurveDialogProps) {
  const [points, setPoints] = useState<CurvePoint[]>(
    initialPoints.length > 0
      ? initialPoints
      : [
          { flow: 0, head: 50 },
          { flow: 10, head: 45 },
          { flow: 20, head: 35 },
          { flow: 30, head: 20 },
        ]
  );
  const [editingCurveId, setEditingCurveId] = useState(curveId);

  useEffect(() => {
    setEditingCurveId(curveId);
    if (initialPoints.length > 0) {
      setPoints(initialPoints);
    }
  }, [curveId, initialPoints]);

  const addPoint = () => {
    const lastPoint = points[points.length - 1];
    setPoints([
      ...points,
      {
        flow: lastPoint ? lastPoint.flow + 5 : 0,
        head: lastPoint ? Math.max(0, lastPoint.head - 5) : 50,
      },
    ]);
  };

  const removePoint = (index: number) => {
    if (points.length <= 2) return; // Need at least 2 points
    setPoints(points.filter((_, i) => i !== index));
  };

  const updatePoint = (index: number, field: 'flow' | 'head', value: number) => {
    const newPoints = [...points];
    newPoints[index] = { ...newPoints[index], [field]: value };
    setPoints(newPoints);
  };

  const handleSave = () => {
    // Sort points by flow
    const sortedPoints = [...points].sort((a, b) => a.flow - b.flow);
    onSave(editingCurveId, sortedPoints);
    onClose();
  };

  // Calculate SVG path for curve preview
  const curvePath = useMemo(() => {
    if (points.length < 2) return '';

    const sortedPoints = [...points].sort((a, b) => a.flow - b.flow);
    const maxFlow = Math.max(...sortedPoints.map((p) => p.flow), 1);
    const maxHead = Math.max(...sortedPoints.map((p) => p.head), 1);

    const width = 280;
    const height = 150;
    const padding = 30;

    const scaleX = (flow: number) =>
      padding + ((flow / maxFlow) * (width - 2 * padding));
    const scaleY = (head: number) =>
      height - padding - ((head / maxHead) * (height - 2 * padding));

    // Create smooth curve using quadratic bezier
    let path = `M ${scaleX(sortedPoints[0].flow)} ${scaleY(sortedPoints[0].head)}`;

    for (let i = 1; i < sortedPoints.length; i++) {
      const x = scaleX(sortedPoints[i].flow);
      const y = scaleY(sortedPoints[i].head);
      path += ` L ${x} ${y}`;
    }

    return path;
  }, [points]);

  // Calculate axis labels
  const axisInfo = useMemo(() => {
    const sortedPoints = [...points].sort((a, b) => a.flow - b.flow);
    const maxFlow = Math.max(...sortedPoints.map((p) => p.flow), 1);
    const maxHead = Math.max(...sortedPoints.map((p) => p.head), 1);
    return { maxFlow, maxHead };
  }, [points]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-slate-800 rounded-lg border border-slate-700 shadow-xl w-[500px] max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Curva de Bomba</h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-130px)]">
          {/* Curve ID */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">ID de Curva</label>
            <input
              type="text"
              value={editingCurveId}
              onChange={(e) => setEditingCurveId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Curve Preview */}
          <div className="bg-slate-900 rounded-lg p-3">
            <p className="text-xs text-slate-400 mb-2">Vista Previa</p>
            <svg width="280" height="150" className="mx-auto">
              {/* Grid */}
              <defs>
                <pattern id="grid" width="28" height="15" patternUnits="userSpaceOnUse">
                  <path d="M 28 0 L 0 0 0 15" fill="none" stroke="#334155" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect x="30" y="0" width="220" height="120" fill="url(#grid)" />

              {/* Axes */}
              <line x1="30" y1="120" x2="260" y2="120" stroke="#64748b" strokeWidth="1" />
              <line x1="30" y1="0" x2="30" y2="120" stroke="#64748b" strokeWidth="1" />

              {/* Axis Labels */}
              <text x="145" y="145" textAnchor="middle" fill="#94a3b8" fontSize="10">
                Caudal (L/s)
              </text>
              <text x="10" y="60" textAnchor="middle" fill="#94a3b8" fontSize="10" transform="rotate(-90, 10, 60)">
                Altura (m)
              </text>

              {/* Scale Labels */}
              <text x="30" y="135" textAnchor="middle" fill="#64748b" fontSize="8">0</text>
              <text x="260" y="135" textAnchor="middle" fill="#64748b" fontSize="8">{axisInfo.maxFlow.toFixed(0)}</text>
              <text x="25" y="120" textAnchor="end" fill="#64748b" fontSize="8">0</text>
              <text x="25" y="10" textAnchor="end" fill="#64748b" fontSize="8">{axisInfo.maxHead.toFixed(0)}</text>

              {/* Curve */}
              <path d={curvePath} fill="none" stroke="#3b82f6" strokeWidth="2" />

              {/* Points */}
              {points.map((point, i) => {
                const x = 30 + ((point.flow / axisInfo.maxFlow) * 220);
                const y = 120 - ((point.head / axisInfo.maxHead) * 120);
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r="4"
                    fill="#3b82f6"
                    stroke="#fff"
                    strokeWidth="1"
                  />
                );
              })}
            </svg>
          </div>

          {/* Points Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-400">Puntos de la Curva</p>
              <button
                onClick={addPoint}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
              >
                <Plus size={12} />
                Agregar
              </button>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_1fr_40px] gap-2 text-xs text-slate-400">
                <span>Caudal (L/s)</span>
                <span>Altura (m)</span>
                <span></span>
              </div>
              {points.map((point, index) => (
                <div key={index} className="grid grid-cols-[1fr_1fr_40px] gap-2">
                  <input
                    type="number"
                    value={point.flow}
                    onChange={(e) => updatePoint(index, 'flow', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.1"
                    className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="number"
                    value={point.head}
                    onChange={(e) => updatePoint(index, 'head', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.1"
                    className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={() => removePoint(index)}
                    disabled={points.length <= 2}
                    className="p-1 text-slate-400 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="text-xs text-slate-500 bg-slate-900/50 p-3 rounded">
            <p className="font-medium text-slate-400 mb-1">Nota:</p>
            <p>La curva debe ser decreciente (mayor caudal = menor altura). Se requieren al menos 2 puntos.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
          >
            <Save size={16} />
            Guardar Curva
          </button>
        </div>
      </div>
    </div>
  );
}
