'use client';

import { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useWaterNetworkStore } from '@/stores/water-network/waterNetworkStore';
import type { WaterNetwork } from '@ledesign/hydraulics';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type ImportStatus = 'idle' | 'loading' | 'success' | 'error';

export function ImportDialog({ isOpen, onClose }: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ junctions: number; pipes: number; tanks: number; reservoirs: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setNetwork = useWaterNetworkStore((s) => s.setNetwork);
  const setProjectName = useWaterNetworkStore((s) => s.setProjectName);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setStatus('idle');
      setError(null);
      setStats(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && (droppedFile.name.endsWith('.inp') || droppedFile.name.endsWith('.INP'))) {
      setFile(droppedFile);
      setStatus('idle');
      setError(null);
      setStats(null);
    } else {
      setError('Por favor, seleccione un archivo .inp');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const parseINPFile = async (content: string): Promise<WaterNetwork> => {
    const lines = content.split('\n').map((l) => l.trim());
    let currentSection = '';

    const network: WaterNetwork = {
      title: 'Red Importada',
      junctions: [],
      tanks: [],
      reservoirs: [],
      pipes: [],
      pumps: [],
      valves: [],
      patterns: [],
      curves: {
        pump: [],
        efficiency: [],
        volume: [],
        headloss: [],
      },
      controls: [],
      options: {
        flowUnits: 'LPS',
        headlossFormula: 'H-W',
        specificGravity: 1.0,
        viscosity: 1.0,
        trials: 40,
        accuracy: 0.001,
        unbalanced: 'continue',
        pattern: 1,
        demandMultiplier: 1.0,
      },
    };

    for (const line of lines) {
      // Skip empty lines and comments
      if (!line || line.startsWith(';')) continue;

      // Detect section headers
      if (line.startsWith('[')) {
        currentSection = line.replace(/[\[\]]/g, '').toUpperCase();
        continue;
      }

      const parts = line.split(/\s+/).filter((p) => p && !p.startsWith(';'));
      if (parts.length === 0) continue;

      try {
        switch (currentSection) {
          case 'TITLE':
            network.title = line;
            break;

          case 'JUNCTIONS':
            if (parts.length >= 2) {
              network.junctions.push({
                id: parts[0],
                type: 'junction',
                x: 0, // Will be set from COORDINATES
                y: 0,
                elevation: parseFloat(parts[1]) || 0,
                baseDemand: parseFloat(parts[2]) || 0,
                demandPattern: parts[3] || undefined,
              });
            }
            break;

          case 'RESERVOIRS':
            if (parts.length >= 2) {
              network.reservoirs.push({
                id: parts[0],
                type: 'reservoir',
                x: 0,
                y: 0,
                totalHead: parseFloat(parts[1]) || 0,
                headPattern: parts[2] || undefined,
              });
            }
            break;

          case 'TANKS':
            if (parts.length >= 7) {
              network.tanks.push({
                id: parts[0],
                type: 'tank',
                x: 0,
                y: 0,
                elevation: parseFloat(parts[1]) || 0,
                initLevel: parseFloat(parts[2]) || 0,
                minLevel: parseFloat(parts[3]) || 0,
                maxLevel: parseFloat(parts[4]) || 0,
                diameter: parseFloat(parts[5]) || 0,
                minVolume: parseFloat(parts[6]) || 0,
                volumeCurve: parts[7] || undefined,
              });
            }
            break;

          case 'PIPES':
            if (parts.length >= 6) {
              network.pipes.push({
                id: parts[0],
                type: 'pipe',
                startNode: parts[1],
                endNode: parts[2],
                length: parseFloat(parts[3]) || 0,
                diameter: parseFloat(parts[4]) || 0,
                roughness: parseFloat(parts[5]) || 100,
                minorLoss: parseFloat(parts[6]) || 0,
                status: (parts[7]?.toLowerCase() as 'open' | 'closed' | 'cv') || 'open',
              });
            }
            break;

          case 'PUMPS':
            if (parts.length >= 3) {
              const pump: any = {
                id: parts[0],
                type: 'pump',
                startNode: parts[1],
                endNode: parts[2],
                pumpType: 'head',
                status: 'open',
              };

              // Parse pump properties (HEAD, POWER, SPEED, PATTERN)
              for (let i = 3; i < parts.length; i += 2) {
                const key = parts[i]?.toUpperCase();
                const value = parts[i + 1];
                if (key === 'HEAD') {
                  pump.headCurveId = value;
                } else if (key === 'POWER') {
                  pump.pumpType = 'power';
                  pump.power = parseFloat(value) || 0;
                } else if (key === 'SPEED') {
                  pump.speed = parseFloat(value) || 1;
                } else if (key === 'PATTERN') {
                  pump.pattern = value;
                }
              }

              network.pumps.push(pump);
            }
            break;

          case 'VALVES':
            if (parts.length >= 6) {
              network.valves.push({
                id: parts[0],
                type: 'valve',
                startNode: parts[1],
                endNode: parts[2],
                diameter: parseFloat(parts[3]) || 0,
                valveType: (parts[4] as 'PRV' | 'PSV' | 'PBV' | 'FCV' | 'TCV' | 'GPV') || 'PRV',
                setting: parseFloat(parts[5]) || 0,
                minorLoss: parseFloat(parts[6]) || 0,
                status: 'open',
              });
            }
            break;

          case 'COORDINATES':
            if (parts.length >= 3) {
              const nodeId = parts[0];
              const x = parseFloat(parts[1]) || 0;
              const y = parseFloat(parts[2]) || 0;

              // Find and update node coordinates
              const junction = network.junctions.find((j) => j.id === nodeId);
              if (junction) {
                junction.x = x;
                junction.y = y;
              }
              const tank = network.tanks.find((t) => t.id === nodeId);
              if (tank) {
                tank.x = x;
                tank.y = y;
              }
              const reservoir = network.reservoirs.find((r) => r.id === nodeId);
              if (reservoir) {
                reservoir.x = x;
                reservoir.y = y;
              }
            }
            break;

          case 'OPTIONS':
            if (parts.length >= 2) {
              const key = parts[0].toLowerCase();
              const value = parts[1];
              if (key === 'units') {
                network.options.flowUnits = value as any;
              } else if (key === 'headloss') {
                network.options.headlossFormula = value as any;
              }
            }
            break;
        }
      } catch (err) {
        console.warn(`Error parsing line in ${currentSection}: ${line}`, err);
      }
    }

    return network;
  };

  const handleImport = async () => {
    if (!file) return;

    setStatus('loading');
    setError(null);

    try {
      const content = await file.text();
      const network = await parseINPFile(content);

      // Validate network has some data
      if (
        network.junctions.length === 0 &&
        network.tanks.length === 0 &&
        network.reservoirs.length === 0
      ) {
        throw new Error('El archivo no contiene nodos válidos');
      }

      // Set stats
      setStats({
        junctions: network.junctions.length,
        pipes: network.pipes.length,
        tanks: network.tanks.length,
        reservoirs: network.reservoirs.length,
      });

      // Import to store
      setNetwork(network);
      setProjectName(file.name.replace(/\.inp$/i, ''));

      setStatus('success');
    } catch (err) {
      console.error('Import error:', err);
      setError(err instanceof Error ? err.message : 'Error al importar el archivo');
      setStatus('error');
    }
  };

  const handleClose = () => {
    setFile(null);
    setStatus('idle');
    setError(null);
    setStats(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-slate-800 rounded-lg border border-slate-700 shadow-xl w-[450px] max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Importar Red</h2>
          <button
            onClick={handleClose}
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${file ? 'border-blue-500 bg-blue-500/10' : 'border-slate-600 hover:border-slate-500'}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".inp,.INP"
              onChange={handleFileSelect}
              className="hidden"
            />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <FileText size={40} className="text-blue-400" />
                <p className="text-sm text-white font-medium">{file.name}</p>
                <p className="text-xs text-slate-400">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload size={40} className="text-slate-500" />
                <p className="text-sm text-slate-300">
                  Arrastra un archivo .inp aquí
                </p>
                <p className="text-xs text-slate-500">
                  o haz clic para seleccionar
                </p>
              </div>
            )}
          </div>

          {/* Status Messages */}
          {status === 'loading' && (
            <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <Loader2 size={16} className="text-blue-400 animate-spin" />
              <span className="text-sm text-blue-300">Importando...</span>
            </div>
          )}

          {status === 'error' && error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle size={16} className="text-red-400" />
              <span className="text-sm text-red-300">{error}</span>
            </div>
          )}

          {status === 'success' && stats && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={16} className="text-green-400" />
                <span className="text-sm text-green-300 font-medium">Importación exitosa</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                <div>Nodos: {stats.junctions}</div>
                <div>Tuberías: {stats.pipes}</div>
                <div>Estanques: {stats.tanks}</div>
                <div>Embalses: {stats.reservoirs}</div>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="text-xs text-slate-500 bg-slate-900/50 p-3 rounded">
            <p className="font-medium text-slate-400 mb-1">Formatos soportados:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>EPANET INP (.inp)</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-slate-700">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
          >
            {status === 'success' ? 'Cerrar' : 'Cancelar'}
          </button>
          {status !== 'success' && (
            <button
              onClick={handleImport}
              disabled={!file || status === 'loading'}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
            >
              <Upload size={16} />
              Importar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
