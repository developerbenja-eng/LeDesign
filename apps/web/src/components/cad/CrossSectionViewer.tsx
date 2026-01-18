'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import type { CrossSectionResult, CrossSectionElement, CrownResult } from '@/lib/road-geometry/cross-section';
import { calculateCrown, getElevationAtOffset } from '@/lib/road-geometry/cross-section';
import { X, Maximize2, Minimize2 } from 'lucide-react';

interface CrossSectionViewerProps {
  /** Cross-section data to display */
  section: CrossSectionResult;
  /** Station label */
  station?: number;
  /** Centerline elevation (m) */
  centerlineElevation?: number;
  /** Existing ground elevations at offsets (optional) */
  existingGround?: Array<{ offset: number; elevation: number }>;
  /** Title for the section */
  title?: string;
  /** On close callback */
  onClose?: () => void;
}

// Material colors for different element types
const ELEMENT_COLORS: Record<string, string> = {
  lane: '#4a4a4a', // Dark gray for lanes
  shoulder: '#6a6a6a', // Lighter gray
  median: '#88cc88', // Green for median
  sidewalk: '#cccccc', // Light gray
  bike_lane: '#4a9eff', // Blue
  parking: '#7a7a7a', // Medium gray
  gutter: '#aaaaaa', // Light gray
  curb: '#ffffff', // White
  planting_strip: '#66bb66', // Green
  cut_slope: '#cc8866', // Brown
  fill_slope: '#8866cc', // Purple-brown
  ditch: '#6699cc', // Blue-gray
};

export function CrossSectionViewer({
  section,
  station,
  centerlineElevation = 100.0,
  existingGround,
  title = 'Cross Section View',
  onClose,
}: CrossSectionViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Calculate crown/superelevation
  const crown = useMemo(
    () =>
      calculateCrown(
        section.roadwayWidth,
        section.crossSlope === 0 ? 'tangent_section' : section.crossSlope > 0 ? 'superelevated' : 'normal',
        Math.abs(section.crossSlope),
        section.crossSlope
      ),
    [section]
  );

  // Calculate element positions and elevations
  const elementData = useMemo(() => {
    return section.elements.map((elem) => {
      const innerOffset = elem.position === 'left' ? -elem.offset - elem.width : elem.offset;
      const outerOffset = elem.position === 'left' ? -elem.offset : elem.offset + elem.width;

      const innerElev = getElevationAtOffset(innerOffset, centerlineElevation, crown);
      const outerElev = innerElev - (elem.slope / 100) * elem.width * (elem.position === 'left' ? -1 : 1);

      return {
        element: elem,
        innerOffset,
        outerOffset,
        innerElev,
        outerElev,
      };
    });
  }, [section, centerlineElevation, crown]);

  // Calculate bounds
  const bounds = useMemo(() => {
    const allOffsets = elementData.flatMap((d) => [d.innerOffset, d.outerOffset]);
    const allElevations = elementData.flatMap((d) => [d.innerElev, d.outerElev]);

    if (existingGround) {
      allOffsets.push(...existingGround.map((g) => g.offset));
      allElevations.push(...existingGround.map((g) => g.elevation));
    }

    const minOffset = Math.min(...allOffsets);
    const maxOffset = Math.max(...allOffsets);
    const minElev = Math.min(...allElevations) - 1;
    const maxElev = Math.max(...allElevations) + 1;

    return {
      minOffset,
      maxOffset,
      minElev,
      maxElev,
      spanOffset: maxOffset - minOffset,
      spanElev: maxElev - minElev,
    };
  }, [elementData, existingGround]);

  // Draw cross-section
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
    const marginLeft = 80;
    const marginRight = 80;
    const marginTop = 60;
    const marginBottom = 60;
    const plotWidth = dimensions.width - marginLeft - marginRight;
    const plotHeight = dimensions.height - marginTop - marginBottom;

    // Coordinate transformation
    const offsetToX = (offset: number) =>
      marginLeft + ((offset - bounds.minOffset) / bounds.spanOffset) * plotWidth;

    const elevToY = (elev: number) =>
      marginTop + plotHeight - ((elev - bounds.minElev) / bounds.spanElev) * plotHeight;

    // Draw ground line
    ctx.strokeStyle = '#3a3a5a';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    const groundY = elevToY(bounds.minElev + bounds.spanElev * 0.2);
    ctx.beginPath();
    ctx.moveTo(marginLeft, groundY);
    ctx.lineTo(marginLeft + plotWidth, groundY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw existing ground profile (if available)
    if (existingGround && existingGround.length > 0) {
      ctx.strokeStyle = '#8b7355';
      ctx.lineWidth = 2;
      ctx.beginPath();
      existingGround.forEach((pt, idx) => {
        const x = offsetToX(pt.offset);
        const y = elevToY(pt.elevation);
        if (idx === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // Fill cut/fill areas
      elementData.forEach((data) => {
        const existingInner = existingGround.find((g) => Math.abs(g.offset - data.innerOffset) < 0.1);
        const existingOuter = existingGround.find((g) => Math.abs(g.offset - data.outerOffset) < 0.1);

        if (existingInner && existingOuter) {
          const x1 = offsetToX(data.innerOffset);
          const x2 = offsetToX(data.outerOffset);
          const y1Design = elevToY(data.innerElev);
          const y2Design = elevToY(data.outerElev);
          const y1Existing = elevToY(existingInner.elevation);
          const y2Existing = elevToY(existingOuter.elevation);

          // Check if cut or fill
          const isCut = existingInner.elevation > data.innerElev || existingOuter.elevation > data.outerElev;

          ctx.fillStyle = isCut ? 'rgba(255, 100, 100, 0.2)' : 'rgba(100, 255, 100, 0.2)';
          ctx.beginPath();
          ctx.moveTo(x1, y1Design);
          ctx.lineTo(x2, y2Design);
          ctx.lineTo(x2, y2Existing);
          ctx.lineTo(x1, y1Existing);
          ctx.closePath();
          ctx.fill();
        }
      });
    }

    // Draw road elements
    elementData.forEach((data) => {
      const elem = data.element;
      const color = ELEMENT_COLORS[elem.type] || '#666666';

      // Draw filled element
      ctx.fillStyle = color;
      ctx.beginPath();
      const x1 = offsetToX(data.innerOffset);
      const x2 = offsetToX(data.outerOffset);
      const y1 = elevToY(data.innerElev);
      const y2 = elevToY(data.outerElev);

      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x2, groundY);
      ctx.lineTo(x1, groundY);
      ctx.closePath();
      ctx.fill();

      // Draw outline
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Label element
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;

      if (elem.width > 1.0) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(elem.type.replace('_', ' '), midX, midY - 5);
        ctx.font = '9px sans-serif';
        ctx.fillStyle = '#cccccc';
        ctx.fillText(`${elem.width.toFixed(2)}m`, midX, midY + 8);
      }
    });

    // Draw centerline
    const clX = offsetToX(0);
    const clY = elevToY(centerlineElevation + crown.crownHeight);
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.moveTo(clX, marginTop);
    ctx.lineTo(clX, marginTop + plotHeight);
    ctx.stroke();
    ctx.setLineDash([]);

    // Label centerline
    ctx.fillStyle = '#ffaa00';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('℄', clX, marginTop - 5);

    // Draw axes
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(marginLeft, marginTop);
    ctx.lineTo(marginLeft, marginTop + plotHeight);
    ctx.lineTo(marginLeft + plotWidth, marginTop + plotHeight);
    ctx.stroke();

    // X-axis labels (offsets)
    ctx.fillStyle = '#cccccc';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    const offsetStep = Math.max(5, Math.ceil(bounds.spanOffset / 8 / 5) * 5);
    for (let off = Math.ceil(bounds.minOffset / offsetStep) * offsetStep; off <= bounds.maxOffset; off += offsetStep) {
      const x = offsetToX(off);
      ctx.fillText(off.toFixed(0), x, marginTop + plotHeight + 20);
      ctx.strokeStyle = '#3a3a5a';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x, marginTop);
      ctx.lineTo(x, marginTop + plotHeight);
      ctx.stroke();
    }
    ctx.fillText('Offset from Centerline (m)', marginLeft + plotWidth / 2, marginTop + plotHeight + 45);

    // Y-axis labels (elevations)
    ctx.textAlign = 'right';
    const elevStep = Math.max(1, Math.ceil(bounds.spanElev / 8));
    for (let elev = Math.ceil(bounds.minElev / elevStep) * elevStep; elev <= bounds.maxElev; elev += elevStep) {
      const y = elevToY(elev);
      ctx.fillStyle = '#cccccc';
      ctx.fillText(elev.toFixed(1), marginLeft - 10, y + 4);
      ctx.strokeStyle = '#3a3a5a';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(marginLeft, y);
      ctx.lineTo(marginLeft + plotWidth, y);
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(15, marginTop + plotHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#cccccc';
    ctx.fillText('Elevation (m)', 0, 0);
    ctx.restore();

    // Draw legend
    const legendX = marginLeft + plotWidth - 150;
    const legendY = marginTop + 10;
    const legendEntries = [
      { label: 'Lane', color: ELEMENT_COLORS.lane },
      { label: 'Sidewalk', color: ELEMENT_COLORS.sidewalk },
      { label: 'Bike Lane', color: ELEMENT_COLORS.bike_lane },
      { label: 'Cut', color: 'rgba(255, 100, 100, 0.4)' },
      { label: 'Fill', color: 'rgba(100, 255, 100, 0.4)' },
    ];

    legendEntries.forEach((entry, idx) => {
      const y = legendY + idx * 15;
      ctx.fillStyle = entry.color;
      ctx.fillRect(legendX, y, 15, 10);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(legendX, y, 15, 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(entry.label, legendX + 20, y + 8);
    });

    // Draw station label
    if (station !== undefined) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Station ${station.toFixed(1)}+00`, marginLeft + 10, marginTop - 10);
    }
  }, [elementData, crown, centerlineElevation, bounds, dimensions, existingGround, station]);

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
            <span className="text-gray-500">Total Width:</span>
            <span className="ml-2 text-white font-medium">{section.totalWidth.toFixed(2)}m</span>
          </div>
          <div>
            <span className="text-gray-500">Pavement:</span>
            <span className="ml-2 text-white font-medium">{section.pavementWidth.toFixed(2)}m</span>
          </div>
          <div>
            <span className="text-gray-500">Roadway:</span>
            <span className="ml-2 text-white font-medium">{section.roadwayWidth.toFixed(2)}m</span>
          </div>
          <div>
            <span className="text-gray-500">Cross Slope:</span>
            <span className="ml-2 text-white font-medium">{section.crossSlope.toFixed(2)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
