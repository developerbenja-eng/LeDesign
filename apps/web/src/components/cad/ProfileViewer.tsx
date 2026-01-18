'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import type { VerticalCurveResult, ProfilePoint } from '@/lib/road-geometry/vertical-curves';
import { generateCurveProfile, calculateElevationOnCurve } from '@/lib/road-geometry/vertical-curves';
import { X, Maximize2, Minimize2 } from 'lucide-react';

interface ProfileViewerProps {
  /** Vertical curve data to display */
  curve: VerticalCurveResult;
  /** Optional existing ground profile points */
  existingGround?: ProfilePoint[];
  /** Station interval for profile generation (m) */
  interval?: number;
  /** Extension before and after curve (m) */
  extensionBefore?: number;
  extensionAfter?: number;
  /** Title for the profile */
  title?: string;
  /** Onclose callback */
  onClose?: () => void;
}

export function ProfileViewer({
  curve,
  existingGround,
  interval = 10,
  extensionBefore = 50,
  extensionAfter = 50,
  title = 'Profile View',
  onClose,
}: ProfileViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Generate design profile points
  const designProfile = useMemo(
    () => generateCurveProfile(curve, interval, extensionBefore, extensionAfter),
    [curve, interval, extensionBefore, extensionAfter]
  );

  // Calculate bounds
  const bounds = useMemo(() => {
    const allPoints = [...designProfile, ...(existingGround || [])];
    const stations = allPoints.map((p) => p.station);
    const elevations = allPoints.map((p) => p.elevation);

    const minStation = Math.min(...stations);
    const maxStation = Math.max(...stations);
    const minElevation = Math.min(...elevations) - 2; // Add margin
    const maxElevation = Math.max(...elevations) + 2;

    return {
      minStation,
      maxStation,
      minElevation,
      maxElevation,
      spanStation: maxStation - minStation,
      spanElevation: maxElevation - minElevation,
    };
  }, [designProfile, existingGround]);

  // Draw profile
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    // Margins
    const marginLeft = 60;
    const marginRight = 40;
    const marginTop = 40;
    const marginBottom = 50;
    const plotWidth = dimensions.width - marginLeft - marginRight;
    const plotHeight = dimensions.height - marginTop - marginBottom;

    // Coordinate transformation functions
    const stationToX = (station: number) =>
      marginLeft + ((station - bounds.minStation) / bounds.spanStation) * plotWidth;

    const elevationToY = (elevation: number) =>
      marginTop + plotHeight - ((elevation - bounds.minElevation) / bounds.spanElevation) * plotHeight;

    // Draw grid lines
    ctx.strokeStyle = '#2a2a4a';
    ctx.lineWidth = 0.5;

    // Vertical grid lines (stations)
    const stationStep = Math.max(20, Math.ceil(bounds.spanStation / 10 / 20) * 20);
    for (let st = Math.ceil(bounds.minStation / stationStep) * stationStep; st <= bounds.maxStation; st += stationStep) {
      const x = stationToX(st);
      ctx.beginPath();
      ctx.moveTo(x, marginTop);
      ctx.lineTo(x, marginTop + plotHeight);
      ctx.stroke();
    }

    // Horizontal grid lines (elevations)
    const elevStep = Math.max(2, Math.ceil(bounds.spanElevation / 8 / 2) * 2);
    for (let elev = Math.ceil(bounds.minElevation / elevStep) * elevStep; elev <= bounds.maxElevation; elev += elevStep) {
      const y = elevationToY(elev);
      ctx.beginPath();
      ctx.moveTo(marginLeft, y);
      ctx.lineTo(marginLeft + plotWidth, y);
      ctx.stroke();
    }

    // Draw existing ground profile (if available)
    if (existingGround && existingGround.length > 0) {
      ctx.strokeStyle = '#8b7355';
      ctx.lineWidth = 2;
      ctx.beginPath();
      existingGround.forEach((point, idx) => {
        const x = stationToX(point.station);
        const y = elevationToY(point.elevation);
        if (idx === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // Fill cut/fill areas
      if (designProfile.length > 0) {
        // Create cut area (above design, below existing)
        ctx.fillStyle = 'rgba(255, 100, 100, 0.15)'; // Red for cut
        ctx.beginPath();
        designProfile.forEach((designPt, idx) => {
          const existingPt = existingGround.find((eg) => Math.abs(eg.station - designPt.station) < 0.1);
          if (existingPt && existingPt.elevation > designPt.elevation) {
            const x = stationToX(designPt.station);
            const y1 = elevationToY(designPt.elevation);
            const y2 = elevationToY(existingPt.elevation);
            if (idx === 0) {
              ctx.moveTo(x, y1);
            } else {
              ctx.lineTo(x, y1);
            }
          }
        });
        // Return along existing ground
        for (let idx = designProfile.length - 1; idx >= 0; idx--) {
          const designPt = designProfile[idx];
          const existingPt = existingGround.find((eg) => Math.abs(eg.station - designPt.station) < 0.1);
          if (existingPt && existingPt.elevation > designPt.elevation) {
            const x = stationToX(designPt.station);
            const y = elevationToY(existingPt.elevation);
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        ctx.fill();

        // Create fill area (below design, above existing)
        ctx.fillStyle = 'rgba(100, 255, 100, 0.15)'; // Green for fill
        ctx.beginPath();
        designProfile.forEach((designPt, idx) => {
          const existingPt = existingGround.find((eg) => Math.abs(eg.station - designPt.station) < 0.1);
          if (existingPt && existingPt.elevation < designPt.elevation) {
            const x = stationToX(designPt.station);
            const y1 = elevationToY(designPt.elevation);
            if (idx === 0) {
              ctx.moveTo(x, y1);
            } else {
              ctx.lineTo(x, y1);
            }
          }
        });
        // Return along existing ground
        for (let idx = designProfile.length - 1; idx >= 0; idx--) {
          const designPt = designProfile[idx];
          const existingPt = existingGround.find((eg) => Math.abs(eg.station - designPt.station) < 0.1);
          if (existingPt && existingPt.elevation < designPt.elevation) {
            const x = stationToX(designPt.station);
            const y = elevationToY(existingPt.elevation);
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        ctx.fill();
      }
    }

    // Draw design profile
    ctx.strokeStyle = '#4a90e2';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    designProfile.forEach((point, idx) => {
      const x = stationToX(point.station);
      const y = elevationToY(point.elevation);
      if (idx === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw key points
    const keyPoints = designProfile.filter((p) => p.description);
    keyPoints.forEach((point) => {
      const x = stationToX(point.station);
      const y = elevationToY(point.elevation);

      // Draw marker
      ctx.fillStyle = '#ffaa00';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();

      // Draw label
      ctx.fillStyle = '#ffffff';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(point.description || '', x, y - 10);
      ctx.fillText(`Sta ${point.station.toFixed(1)}`, x, y - 22);
      ctx.fillText(`Elev ${point.elevation.toFixed(2)}m`, x, y + 18);
    });

    // Draw grade labels
    ctx.fillStyle = '#00ffff';
    ctx.font = '12px monospace';

    // Before curve
    const xBefore = stationToX(curve.pvcStation - extensionBefore / 2);
    const yBefore = elevationToY(calculateElevationOnCurve(curve, curve.pvcStation - extensionBefore / 2));
    ctx.fillText(`${curve.g1 > 0 ? '+' : ''}${curve.g1.toFixed(2)}%`, xBefore, yBefore - 5);

    // After curve
    const xAfter = stationToX(curve.pvtStation + extensionAfter / 2);
    const yAfter = elevationToY(calculateElevationOnCurve(curve, curve.pvtStation + extensionAfter / 2));
    ctx.fillText(`${curve.g2 > 0 ? '+' : ''}${curve.g2.toFixed(2)}%`, xAfter, yAfter - 5);

    // Draw axes
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(marginLeft, marginTop);
    ctx.lineTo(marginLeft, marginTop + plotHeight);
    ctx.lineTo(marginLeft + plotWidth, marginTop + plotHeight);
    ctx.stroke();

    // X-axis labels (stations)
    ctx.fillStyle = '#cccccc';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    for (let st = Math.ceil(bounds.minStation / stationStep) * stationStep; st <= bounds.maxStation; st += stationStep) {
      const x = stationToX(st);
      ctx.fillText(st.toFixed(0), x, marginTop + plotHeight + 20);
    }
    ctx.fillText('Station (m)', marginLeft + plotWidth / 2, marginTop + plotHeight + 40);

    // Y-axis labels (elevations)
    ctx.textAlign = 'right';
    for (let elev = Math.ceil(bounds.minElevation / elevStep) * elevStep; elev <= bounds.maxElevation; elev += elevStep) {
      const y = elevationToY(elev);
      ctx.fillText(elev.toFixed(1), marginLeft - 10, y + 4);
    }
    ctx.save();
    ctx.translate(15, marginTop + plotHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Elevation (m)', 0, 0);
    ctx.restore();

    // Draw legend
    if (existingGround) {
      const legendX = marginLeft + 10;
      const legendY = marginTop + 10;

      ctx.strokeStyle = '#8b7355';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(legendX, legendY);
      ctx.lineTo(legendX + 30, legendY);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Existing Ground', legendX + 35, legendY + 4);

      ctx.strokeStyle = '#4a90e2';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(legendX, legendY + 15);
      ctx.lineTo(legendX + 30, legendY + 15);
      ctx.stroke();
      ctx.fillText('Design Profile', legendX + 35, legendY + 19);

      ctx.fillStyle = 'rgba(255, 100, 100, 0.3)';
      ctx.fillRect(legendX, legendY + 25, 15, 10);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('Cut', legendX + 20, legendY + 34);

      ctx.fillStyle = 'rgba(100, 255, 100, 0.3)';
      ctx.fillRect(legendX + 60, legendY + 25, 15, 10);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('Fill', legendX + 80, legendY + 34);
    }
  }, [designProfile, existingGround, curve, bounds, dimensions, extensionBefore, extensionAfter]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const container = canvasRef.current.parentElement;
        if (container) {
          setDimensions({
            width: container.clientWidth,
            height: container.clientHeight,
          });
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isFullscreen]);

  return (
    <div
      className={`bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden flex flex-col ${
        isFullscreen ? 'fixed inset-4 z-50' : 'w-full h-96'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-gray-800 shrink-0">
        <h3 className="text-white font-semibold text-sm">{title}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700"
              title="Close"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>

      {/* Info Panel */}
      <div className="px-4 py-2 border-t border-gray-700 bg-gray-800 shrink-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-gray-500">Curve Type:</span>
            <span className="ml-2 text-white font-medium capitalize">{curve.type}</span>
          </div>
          <div>
            <span className="text-gray-500">Length:</span>
            <span className="ml-2 text-white font-medium">{curve.length.toFixed(1)}m</span>
          </div>
          <div>
            <span className="text-gray-500">K-value:</span>
            <span className="ml-2 text-white font-medium">{curve.kValue.toFixed(2)}</span>
            {!curve.meetsMinimumK && <span className="ml-1 text-red-400">⚠</span>}
          </div>
          <div>
            <span className="text-gray-500">Grade Change:</span>
            <span className="ml-2 text-white font-medium">{curve.A.toFixed(2)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
