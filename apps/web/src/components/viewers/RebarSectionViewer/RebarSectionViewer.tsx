'use client';

// ============================================================
// REBAR SECTION VIEWER
// 2D cross-section visualization with reinforcement layout
// ============================================================

import { useRef, useEffect, useMemo } from 'react';
import {
  Section,
  RebarConfiguration,
  RectConcreteDimensions,
  CircularConcreteDimensions,
  TBeamConcreteDimensions,
} from '@ledesign/structural';

interface RebarSectionViewerProps {
  section: Section;
  rebarConfig?: RebarConfiguration | null;
  width?: number;
  height?: number;
  showDimensions?: boolean;
  showLabels?: boolean;
}

// Standard rebar bar diameters in inches
const REBAR_DIAMETERS: Record<string, number> = {
  '#3': 0.375,
  '#4': 0.5,
  '#5': 0.625,
  '#6': 0.75,
  '#7': 0.875,
  '#8': 1.0,
  '#9': 1.128,
  '#10': 1.27,
  '#11': 1.41,
  '#14': 1.693,
  '#18': 2.257,
};

export function RebarSectionViewer({
  section,
  rebarConfig,
  width = 200,
  height = 200,
  showDimensions = true,
  showLabels = true,
}: RebarSectionViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Get section dimensions for drawing
  const dims = useMemo(() => {
    const type = section.section_type;

    // Get width and height based on section type
    if (type === 'rect_concrete') {
      const d = section.dimensions as RectConcreteDimensions;
      return { width: d.b || 12, height: d.h || 24 };
    }
    if (type === 'circular_concrete') {
      const d = section.dimensions as CircularConcreteDimensions;
      const diameter = d.d || 12;
      return { width: diameter, height: diameter, isCircular: true };
    }
    if (type === 't_beam_concrete') {
      const d = section.dimensions as TBeamConcreteDimensions;
      return {
        width: d.bf || 24,
        height: d.h || 24,
        bf: d.bf || 24,
        tf: d.hf || 4,
        bw: d.bw || 12,
        hw: (d.h || 24) - (d.hf || 4),
      };
    }

    // Default for other section types - try to get width/height generically
    const d = section.dimensions as Record<string, number>;
    return { width: d.b || d.bf || 12, height: d.h || d.d || 24 };
  }, [section]);

  // Draw the section
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, height);

    // Calculate scale to fit section with padding
    const padding = 30;
    const availableWidth = width - padding * 2;
    const availableHeight = height - padding * 2;
    const scaleX = availableWidth / dims.width;
    const scaleY = availableHeight / dims.height;
    const scale = Math.min(scaleX, scaleY);

    // Center the drawing
    const offsetX = width / 2;
    const offsetY = height / 2;

    // Helper function to convert section coords to canvas coords
    const toCanvas = (x: number, y: number) => ({
      x: offsetX + x * scale,
      y: offsetY - y * scale, // Y is inverted in canvas
    });

    // Draw concrete section
    ctx.fillStyle = '#64748b';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;

    if ('isCircular' in dims && dims.isCircular) {
      // Circular section
      const radius = (dims.width / 2) * scale;
      ctx.beginPath();
      ctx.arc(offsetX, offsetY, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if ('bf' in dims) {
      // T-beam section
      const { bf, tf, bw, hw } = dims as any;
      const halfBf = (bf / 2) * scale;
      const halfBw = (bw / 2) * scale;
      const tfScaled = tf * scale;
      const hwScaled = hw * scale;
      const totalH = tfScaled + hwScaled;
      const topY = offsetY - totalH / 2;

      ctx.beginPath();
      // Top flange
      ctx.moveTo(offsetX - halfBf, topY);
      ctx.lineTo(offsetX + halfBf, topY);
      ctx.lineTo(offsetX + halfBf, topY + tfScaled);
      ctx.lineTo(offsetX + halfBw, topY + tfScaled);
      // Web
      ctx.lineTo(offsetX + halfBw, topY + totalH);
      ctx.lineTo(offsetX - halfBw, topY + totalH);
      ctx.lineTo(offsetX - halfBw, topY + tfScaled);
      ctx.lineTo(offsetX - halfBf, topY + tfScaled);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      // Rectangular section
      const w = dims.width * scale;
      const h = dims.height * scale;
      ctx.fillRect(offsetX - w / 2, offsetY - h / 2, w, h);
      ctx.strokeRect(offsetX - w / 2, offsetY - h / 2, w, h);
    }

    // Draw stirrups/ties if available
    if (rebarConfig?.transverse_bars) {
      const cover = rebarConfig.cover_sides || 1.5;
      const coverScaled = cover * scale;
      const stirrupW = dims.width * scale - coverScaled * 2;
      const stirrupH = dims.height * scale - coverScaled * 2;

      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(
        offsetX - stirrupW / 2,
        offsetY - stirrupH / 2,
        stirrupW,
        stirrupH
      );
      ctx.setLineDash([]);
    }

    // Draw longitudinal bars
    if (rebarConfig?.longitudinal_bars) {
      ctx.fillStyle = '#f97316';
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 1;

      rebarConfig.longitudinal_bars.forEach((bar) => {
        const pos = toCanvas(bar.x, bar.y);
        const diameter = REBAR_DIAMETERS[bar.size] || 0.75;
        const radius = (diameter / 2) * scale * 2; // Scale up for visibility

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    }

    // Draw dimension lines
    if (showDimensions) {
      ctx.strokeStyle = '#64748b';
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 1;

      // Width dimension (bottom)
      const dimY = offsetY + (dims.height * scale) / 2 + 15;
      const leftX = offsetX - (dims.width * scale) / 2;
      const rightX = offsetX + (dims.width * scale) / 2;

      ctx.beginPath();
      ctx.moveTo(leftX, dimY);
      ctx.lineTo(rightX, dimY);
      ctx.stroke();

      // Arrows
      ctx.beginPath();
      ctx.moveTo(leftX, dimY);
      ctx.lineTo(leftX + 5, dimY - 3);
      ctx.lineTo(leftX + 5, dimY + 3);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(rightX, dimY);
      ctx.lineTo(rightX - 5, dimY - 3);
      ctx.lineTo(rightX - 5, dimY + 3);
      ctx.closePath();
      ctx.fill();

      ctx.fillText(`${dims.width}"`, offsetX, dimY + 12);

      // Height dimension (right)
      const dimX = offsetX + (dims.width * scale) / 2 + 15;
      const topY = offsetY - (dims.height * scale) / 2;
      const bottomY = offsetY + (dims.height * scale) / 2;

      ctx.beginPath();
      ctx.moveTo(dimX, topY);
      ctx.lineTo(dimX, bottomY);
      ctx.stroke();

      ctx.save();
      ctx.translate(dimX + 12, offsetY);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(`${dims.height}"`, 0, 0);
      ctx.restore();
    }

    // Draw cover annotation
    if (showLabels && rebarConfig) {
      const coverTop = rebarConfig.cover_top || 1.5;
      const coverSide = rebarConfig.cover_sides || 1.5;

      ctx.fillStyle = '#64748b';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Cover: ${coverTop}"-${coverSide}"`, 5, height - 5);
    }
  }, [section, rebarConfig, dims, width, height, showDimensions, showLabels]);

  return (
    <div className="bg-lele-bg rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="block"
      />
    </div>
  );
}
