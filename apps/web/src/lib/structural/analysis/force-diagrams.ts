// ============================================================
// FORCE DIAGRAM CALCULATIONS
// Processes member results into diagram data for 3D visualization
// ============================================================

import { MemberResult } from '@/types/structural/results';
import { Beam, Column, Brace } from '@/types/structural/elements';

export type DiagramType = 'moment' | 'shear' | 'axial';

export interface DiagramPoint {
  station: number; // 0.0 to 1.0
  value: number; // Force/moment value
  position: [number, number, number]; // 3D position along member
}

export interface MemberDiagram {
  memberId: string;
  memberType: 'beam' | 'column' | 'brace';
  points: DiagramPoint[];
  maxValue: number;
  minValue: number;
}

/**
 * Extract force values from member results based on diagram type
 */
function extractForceValue(result: MemberResult, type: DiagramType): number {
  switch (type) {
    case 'moment':
      // Use major axis moment for most cases (M33)
      return result.moment_major;
    case 'shear':
      // Use major axis shear (V2)
      return result.shear_major;
    case 'axial':
      // Axial force (P)
      return result.axial;
    default:
      return 0;
  }
}

/**
 * Interpolate 3D position along member at given station
 */
function interpolatePosition(
  startPos: [number, number, number],
  endPos: [number, number, number],
  station: number
): [number, number, number] {
  return [
    startPos[0] + (endPos[0] - startPos[0]) * station,
    startPos[1] + (endPos[1] - startPos[1]) * station,
    startPos[2] + (endPos[2] - startPos[2]) * station,
  ];
}

/**
 * Build force diagram for a single member
 */
export function buildMemberDiagram(
  memberId: string,
  memberType: 'beam' | 'column' | 'brace',
  startPos: [number, number, number],
  endPos: [number, number, number],
  results: MemberResult[],
  diagramType: DiagramType
): MemberDiagram {
  // Filter results for this member
  const memberResults = results.filter((r) => r.member_id === memberId);

  if (memberResults.length === 0) {
    return {
      memberId,
      memberType,
      points: [],
      maxValue: 0,
      minValue: 0,
    };
  }

  // Sort by station
  const sortedResults = [...memberResults].sort((a, b) => a.station - b.station);

  // Build diagram points
  const points: DiagramPoint[] = sortedResults.map((result) => ({
    station: result.station,
    value: extractForceValue(result, diagramType),
    position: interpolatePosition(startPos, endPos, result.station),
  }));

  // Find max/min for scaling
  const values = points.map((p) => p.value);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);

  return {
    memberId,
    memberType,
    points,
    maxValue,
    minValue,
  };
}

/**
 * Build force diagrams for all members
 */
export interface BuildDiagramsInput {
  beams: Map<string, Beam>;
  columns: Map<string, Column>;
  braces: Map<string, Brace>;
  nodes: Map<string, { x: number; y: number; z: number }>;
  memberResults: MemberResult[];
  diagramType: DiagramType;
  combinationId: string;
}

export function buildForceDiagrams(input: BuildDiagramsInput): MemberDiagram[] {
  const { beams, columns, braces, nodes, memberResults, diagramType, combinationId } = input;

  // Filter results by combination
  const comboResults = memberResults.filter((r) => r.combination_id === combinationId);

  const diagrams: MemberDiagram[] = [];

  // Process beams
  for (const beam of beams.values()) {
    const nodeI = nodes.get(beam.node_i_id);
    const nodeJ = nodes.get(beam.node_j_id);
    if (!nodeI || !nodeJ) continue;

    const diagram = buildMemberDiagram(
      beam.id,
      'beam',
      [nodeI.x, nodeI.y, nodeI.z],
      [nodeJ.x, nodeJ.y, nodeJ.z],
      comboResults,
      diagramType
    );

    if (diagram.points.length > 0) {
      diagrams.push(diagram);
    }
  }

  // Process columns
  for (const column of columns.values()) {
    const nodeI = nodes.get(column.node_i_id);
    const nodeJ = nodes.get(column.node_j_id);
    if (!nodeI || !nodeJ) continue;

    const diagram = buildMemberDiagram(
      column.id,
      'column',
      [nodeI.x, nodeI.y, nodeI.z],
      [nodeJ.x, nodeJ.y, nodeJ.z],
      comboResults,
      diagramType
    );

    if (diagram.points.length > 0) {
      diagrams.push(diagram);
    }
  }

  // Process braces
  for (const brace of braces.values()) {
    const nodeI = nodes.get(brace.node_i_id);
    const nodeJ = nodes.get(brace.node_j_id);
    if (!nodeI || !nodeJ) continue;

    const diagram = buildMemberDiagram(
      brace.id,
      'brace',
      [nodeI.x, nodeI.y, nodeI.z],
      [nodeJ.x, nodeJ.y, nodeJ.z],
      comboResults,
      diagramType
    );

    if (diagram.points.length > 0) {
      diagrams.push(diagram);
    }
  }

  return diagrams;
}

/**
 * Get global max/min values across all diagrams for consistent scaling
 */
export function getGlobalRange(diagrams: MemberDiagram[]): { max: number; min: number } {
  if (diagrams.length === 0) {
    return { max: 0, min: 0 };
  }

  const allMax = diagrams.map((d) => d.maxValue);
  const allMin = diagrams.map((d) => d.minValue);

  return {
    max: Math.max(...allMax),
    min: Math.min(...allMin),
  };
}

/**
 * Calculate offset vector perpendicular to member axis
 * Used to offset diagram from member centerline
 */
export function calculateOffsetVector(
  startPos: [number, number, number],
  endPos: [number, number, number],
  value: number,
  scale: number
): [number, number, number] {
  // Member direction vector
  const dx = endPos[0] - startPos[0];
  const dy = endPos[1] - startPos[1];
  const dz = endPos[2] - startPos[2];
  const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

  if (length === 0) return [0, 0, 0];

  // Normalized member axis
  const axisX = dx / length;
  const axisY = dy / length;
  const axisZ = dz / length;

  // Find perpendicular vector
  // If member is vertical, use X axis as reference
  // Otherwise use Z axis as reference
  let perpX: number, perpY: number, perpZ: number;

  if (Math.abs(axisY) > 0.9) {
    // Nearly vertical - use X axis
    perpX = 1;
    perpY = 0;
    perpZ = 0;
  } else {
    // Use Z axis (vertical)
    perpX = 0;
    perpY = 0;
    perpZ = 1;
  }

  // Cross product: perp = axis × reference
  const crossX = axisY * perpZ - axisZ * perpY;
  const crossY = axisZ * perpX - axisX * perpZ;
  const crossZ = axisX * perpY - axisY * perpX;

  // Normalize
  const crossLength = Math.sqrt(crossX * crossX + crossY * crossY + crossZ * crossZ);
  if (crossLength === 0) return [0, 0, 0];

  const normX = crossX / crossLength;
  const normY = crossY / crossLength;
  const normZ = crossZ / crossLength;

  // Scale by value and scale factor
  const offset = value * scale;

  return [normX * offset, normY * offset, normZ * offset];
}
