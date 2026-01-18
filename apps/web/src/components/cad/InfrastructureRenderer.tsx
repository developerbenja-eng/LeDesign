// ============================================================
// INFRASTRUCTURE RENDERER
// Specialized renderer for infrastructure entities (pipes, manholes, etc.)
// ============================================================

import type { AnyInfrastructureEntity } from '@/types/infrastructure-entities';
import type { AnyCADEntity, Point2D } from '@/types/cad';

interface RenderContext {
  ctx: CanvasRenderingContext2D;
  worldToScreen: (x: number, y: number) => Point2D;
  zoom: number;
}

/**
 * Check if an entity is an infrastructure entity
 */
export function isInfraEntity(entity: any): entity is AnyInfrastructureEntity {
  const infraTypes = [
    'water_pipe',
    'water_junction',
    'sewer_pipe',
    'manhole',
    'storm_collector',
    'storm_inlet',
    'storm_pipe',
  ];
  return infraTypes.includes(entity.type);
}

/**
 * Render an infrastructure entity on the canvas
 */
export function renderInfrastructureEntity(
  entity: AnyInfrastructureEntity,
  context: RenderContext
) {
  const { ctx, worldToScreen, zoom } = context;

  if (!entity.visible) return;

  ctx.save();

  switch (entity.type) {
    case 'water_pipe':
      renderWaterPipe(entity as any, context);
      break;
    case 'water_junction':
      renderWaterJunction(entity as any, context);
      break;
    case 'sewer_pipe':
      renderSewerPipe(entity as any, context);
      break;
    case 'manhole':
      renderManhole(entity as any, context);
      break;
    case 'storm_collector':
      renderStormCollector(entity as any, context);
      break;
    case 'storm_inlet':
      renderStormInlet(entity as any, context);
      break;
    case 'storm_pipe':
      renderStormPipe(entity as any, context);
      break;
    default:
      // Fallback: render as a simple line if it has start/end points
      if ('start' in entity && 'end' in entity) {
        const start = worldToScreen((entity as any).start.x, (entity as any).start.y);
        const end = worldToScreen((entity as any).end.x, (entity as any).end.y);
        ctx.strokeStyle = entity.color || '#888888';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      }
  }

  ctx.restore();
}

// ============================================================
// INDIVIDUAL ENTITY RENDERERS
// ============================================================

function renderWaterPipe(entity: any, context: RenderContext) {
  const { ctx, worldToScreen } = context;
  const start = worldToScreen(entity.start.x, entity.start.y);
  const end = worldToScreen(entity.end.x, entity.end.y);

  ctx.strokeStyle = entity.color || '#0088ff';
  ctx.lineWidth = entity.selected ? 4 : 2;
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();

  // Draw flow direction arrow
  drawFlowArrow(ctx, start, end, entity.color || '#0088ff');
}

function renderWaterJunction(entity: any, context: RenderContext) {
  const { ctx, worldToScreen } = context;
  const pos = worldToScreen(entity.position.x, entity.position.y);

  ctx.fillStyle = entity.color || '#0088ff';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = entity.selected ? 2 : 1;

  ctx.beginPath();
  ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function renderSewerPipe(entity: any, context: RenderContext) {
  const { ctx, worldToScreen } = context;
  const start = worldToScreen(entity.start.x, entity.start.y);
  const end = worldToScreen(entity.end.x, entity.end.y);

  ctx.strokeStyle = entity.color || '#8B4513';
  ctx.lineWidth = entity.selected ? 4 : 2;
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();

  // Draw flow direction arrow
  drawFlowArrow(ctx, start, end, entity.color || '#8B4513');
}

function renderManhole(entity: any, context: RenderContext) {
  const { ctx, worldToScreen } = context;
  const pos = worldToScreen(entity.position.x, entity.position.y);

  ctx.fillStyle = entity.color || '#8B4513';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = entity.selected ? 2 : 1;

  // Draw as square
  const size = 8;
  ctx.beginPath();
  ctx.rect(pos.x - size / 2, pos.y - size / 2, size, size);
  ctx.fill();
  ctx.stroke();
}

function renderStormCollector(entity: any, context: RenderContext) {
  const { ctx, worldToScreen } = context;
  const start = worldToScreen(entity.start.x, entity.start.y);
  const end = worldToScreen(entity.end.x, entity.end.y);

  ctx.strokeStyle = entity.color || '#1E90FF';
  ctx.lineWidth = entity.selected ? 4 : 2;
  ctx.setLineDash([10, 5]);
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  ctx.setLineDash([]);
}

function renderStormInlet(entity: any, context: RenderContext) {
  const { ctx, worldToScreen } = context;
  const pos = worldToScreen(entity.position.x, entity.position.y);

  ctx.fillStyle = entity.color || '#1E90FF';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = entity.selected ? 2 : 1;

  // Draw as triangle
  const size = 8;
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y - size);
  ctx.lineTo(pos.x + size, pos.y + size);
  ctx.lineTo(pos.x - size, pos.y + size);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function renderStormPipe(entity: any, context: RenderContext) {
  const { ctx, worldToScreen } = context;
  const start = worldToScreen(entity.start.x, entity.start.y);
  const end = worldToScreen(entity.end.x, entity.end.y);

  ctx.strokeStyle = entity.color || '#4169E1';
  ctx.lineWidth = entity.selected ? 4 : 2;
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();

  // Draw flow direction arrow
  drawFlowArrow(ctx, start, end, entity.color || '#4169E1');
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function drawFlowArrow(
  ctx: CanvasRenderingContext2D,
  start: Point2D,
  end: Point2D,
  color: string
) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const angle = Math.atan2(dy, dx);
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;

  const arrowSize = 8;

  ctx.save();
  ctx.fillStyle = color;
  ctx.translate(midX, midY);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(arrowSize, 0);
  ctx.lineTo(-arrowSize / 2, arrowSize / 2);
  ctx.lineTo(-arrowSize / 2, -arrowSize / 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
