'use client';

// ============================================================
// PROFILE VIEW
// Longitudinal profile view for roads/alignments
// ============================================================

import { useRef, useEffect, useState } from 'react';
import type { ViewInstance } from '@/stores/workspace-store';
import { useCADStore } from '@/stores/cad-store';
import type { CADEntity } from '@/types/cad';

interface ProfileViewProps {
  view: ViewInstance;
}

interface ProfilePoint {
  station: number;  // Distance along alignment
  elevation: number;
  label?: string;
}

export function ProfileView({ view }: ProfileViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const entities = useCADStore((state) => state.entities);
  const [profileData, setProfileData] = useState<ProfilePoint[]>([]);

  // Extract profile data from entities
  useEffect(() => {
    // TODO: Extract polylines/lines and convert to profile
    // For now, create sample data
    const sampleProfile: ProfilePoint[] = [];

    for (let station = 0; station <= 1000; station += 10) {
      // Generate sample terrain profile
      const elevation = 100 + Math.sin(station / 100) * 20 + Math.random() * 5;
      sampleProfile.push({ station, elevation });
    }

    setProfileData(sampleProfile);
  }, [entities]);

  // Draw profile
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || profileData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    // Clear canvas
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate bounds
    const minStation = Math.min(...profileData.map((p) => p.station));
    const maxStation = Math.max(...profileData.map((p) => p.station));
    const minElev = Math.min(...profileData.map((p) => p.elevation));
    const maxElev = Math.max(...profileData.map((p) => p.elevation));

    const padding = 60;
    const graphWidth = canvas.width - padding * 2;
    const graphHeight = canvas.height - padding * 2;

    // Scale functions
    const scaleX = (station: number) =>
      padding + ((station - minStation) / (maxStation - minStation)) * graphWidth;

    const scaleY = (elevation: number) =>
      canvas.height - padding - ((elevation - minElev) / (maxElev - minElev)) * graphHeight;

    // Draw grid
    ctx.strokeStyle = '#334155'; // slate-700
    ctx.lineWidth = 1;

    // Vertical grid lines (stations)
    const stationStep = 100;
    for (let station = Math.ceil(minStation / stationStep) * stationStep; station <= maxStation; station += stationStep) {
      const x = scaleX(station);
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, canvas.height - padding);
      ctx.stroke();

      // Station label
      ctx.fillStyle = '#94a3b8'; // slate-400
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${station}m`, x, canvas.height - padding + 20);
    }

    // Horizontal grid lines (elevation)
    const elevStep = 10;
    for (let elev = Math.ceil(minElev / elevStep) * elevStep; elev <= maxElev; elev += elevStep) {
      const y = scaleY(elev);
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(canvas.width - padding, y);
      ctx.stroke();

      // Elevation label
      ctx.fillStyle = '#94a3b8'; // slate-400
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${elev.toFixed(1)}`, padding - 10, y + 3);
    }

    // Draw axes
    ctx.strokeStyle = '#64748b'; // slate-500
    ctx.lineWidth = 2;

    // X axis
    ctx.beginPath();
    ctx.moveTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();

    // Y axis
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#e2e8f0'; // slate-200
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Station (m)', canvas.width / 2, canvas.height - 10);

    ctx.save();
    ctx.translate(15, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Elevation (m)', 0, 0);
    ctx.restore();

    // Draw terrain profile
    ctx.beginPath();
    ctx.strokeStyle = '#10b981'; // green-500
    ctx.lineWidth = 2;

    profileData.forEach((point, i) => {
      const x = scaleX(point.station);
      const y = scaleY(point.elevation);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Fill under curve
    const firstPoint = profileData[0];
    const lastPoint = profileData[profileData.length - 1];

    ctx.lineTo(scaleX(lastPoint.station), canvas.height - padding);
    ctx.lineTo(scaleX(firstPoint.station), canvas.height - padding);
    ctx.closePath();

    ctx.fillStyle = 'rgba(16, 185, 129, 0.1)'; // green-500 with transparency
    ctx.fill();

  }, [profileData, canvasRef.current?.clientWidth, canvasRef.current?.clientHeight]);

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Toolbar */}
      <div className="px-3 py-2 bg-slate-800/50 border-b border-slate-700 flex items-center gap-2">
        <span className="text-xs text-slate-400">Profile View</span>
        <div className="flex-1" />
        <button className="px-2 py-1 text-xs bg-slate-700 text-slate-300 rounded hover:bg-slate-600">
          Add Design Line
        </button>
        <button className="px-2 py-1 text-xs bg-slate-700 text-slate-300 rounded hover:bg-slate-600">
          Export
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
        />
      </div>

      {/* Info Panel */}
      <div className="px-3 py-2 bg-slate-800/50 border-t border-slate-700 flex items-center gap-4 text-xs">
        <div className="text-slate-400">
          Points: <span className="text-white">{profileData.length}</span>
        </div>
        <div className="text-slate-400">
          Length: <span className="text-white">{profileData[profileData.length - 1]?.station.toFixed(2) || 0}m</span>
        </div>
        <div className="text-slate-400">
          Elev Range: <span className="text-white">
            {Math.min(...profileData.map((p) => p.elevation)).toFixed(2)} -
            {Math.max(...profileData.map((p) => p.elevation)).toFixed(2)}m
          </span>
        </div>
      </div>
    </div>
  );
}
