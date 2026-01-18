/**
 * Sewer Network Layout Module
 *
 * Manhole design, network layout, and profile generation
 * Based on Chilean standards: NCh 1105, SISS regulations, MINVU guidelines
 */

// ============================================================================
// Types
// ============================================================================

export type ManholeType =
  | 'standard'      // Standard inspection manhole
  | 'drop'          // Drop manhole for steep slopes
  | 'junction'      // Junction of multiple pipes
  | 'terminal'      // End of line
  | 'flush'         // Flushing manhole
  | 'lamp_hole';    // Small inspection point

export type ManholeShape = 'circular' | 'rectangular';

export interface ManholeSpecs {
  type: ManholeType;
  shape: ManholeShape;
  internalDiameter: number;      // mm (for circular)
  internalWidth?: number;        // mm (for rectangular)
  internalLength?: number;       // mm (for rectangular)
  wallThickness: number;         // mm
  minimumDepth: number;          // m
  maximumDepth: number;          // m
  standardDepths: number[];      // m - available prefab depths
  coverType: 'heavy_duty' | 'medium_duty' | 'light_duty';
  material: 'concrete' | 'brick' | 'hdpe' | 'frp';
}

export interface ManholePosition {
  id: string;
  x: number;                     // m - coordinate
  y: number;                     // m - coordinate
  groundElevation: number;       // m
  invertElevation: number;       // m - lowest pipe invert
  rimElevation: number;          // m - cover elevation
  depth: number;                 // m
}

export interface ManholeDesign {
  position: ManholePosition;
  specs: ManholeSpecs;
  incomingPipes: PipeConnection[];
  outgoingPipe?: PipeConnection;
  dropHeight?: number;           // m - for drop manholes
  benchingAngle: number;         // degrees
  stepIrons: boolean;
  ventilation: boolean;
  notes: string[];
}

export interface PipeConnection {
  pipeId: string;
  diameter: number;              // mm
  invertElevation: number;       // m
  direction: number;             // degrees from north
  slope: number;                 // %
  material: string;
}

export interface NetworkNode {
  id: string;
  type: 'manhole' | 'inlet' | 'outlet' | 'connection';
  x: number;
  y: number;
  groundElevation: number;
  invertElevation?: number;
  upstreamNodes: string[];
  downstreamNode?: string;
}

export interface NetworkLink {
  id: string;
  fromNode: string;
  toNode: string;
  length: number;                // m
  diameter: number;              // mm
  material: string;
  slope: number;                 // %
  flowCapacity: number;          // L/s
  designFlow: number;            // L/s
}

export interface NetworkLayout {
  nodes: NetworkNode[];
  links: NetworkLink[];
  totalLength: number;           // m
  manholeCount: number;
  outletNode: string;
}

export interface ProfilePoint {
  station: number;               // m - chainage
  groundElevation: number;       // m
  pipeInvert: number;            // m
  pipeCrown: number;             // m
  depth: number;                 // m - cover depth
  nodeId?: string;
  nodeType?: string;
  diameter?: number;             // mm
  slope?: number;                // %
}

export interface ProfileData {
  name: string;
  startNode: string;
  endNode: string;
  totalLength: number;
  points: ProfilePoint[];
  verticalExaggeration: number;
  manholes: ManholePosition[];
  pipes: {
    fromStation: number;
    toStation: number;
    diameter: number;
    material: string;
    slope: number;
  }[];
}

export interface ManholeLayoutInput {
  alignment: { x: number; y: number; groundElevation: number }[];
  sewerType: 'storm' | 'sanitary' | 'combined';
  pipeDiameter: number;          // mm
  startInvert: number;           // m - upstream invert
  targetSlope: number;           // %
  maxSpacing?: number;           // m
  constraints?: {
    minDepth?: number;           // m
    maxDepth?: number;           // m
    minSlope?: number;           // %
    maxSlope?: number;           // %
  };
}

export interface ManholeLayoutResult {
  manholes: ManholeDesign[];
  pipes: NetworkLink[];
  profile: ProfileData;
  totalLength: number;
  warnings: string[];
  compliance: {
    spacingOk: boolean;
    depthsOk: boolean;
    slopesOk: boolean;
    allOk: boolean;
  };
}

// ============================================================================
// Constants - Chilean Standards
// ============================================================================

/**
 * Standard manhole specifications per Chilean norms
 */
export const MANHOLE_SPECS: Record<string, ManholeSpecs> = {
  // Standard circular manhole - most common
  circular_1000: {
    type: 'standard',
    shape: 'circular',
    internalDiameter: 1000,
    wallThickness: 150,
    minimumDepth: 0.8,
    maximumDepth: 4.0,
    standardDepths: [1.0, 1.2, 1.5, 1.8, 2.0, 2.5, 3.0, 3.5, 4.0],
    coverType: 'heavy_duty',
    material: 'concrete',
  },

  // Large circular for deep installations
  circular_1200: {
    type: 'standard',
    shape: 'circular',
    internalDiameter: 1200,
    wallThickness: 150,
    minimumDepth: 2.0,
    maximumDepth: 6.0,
    standardDepths: [2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0],
    coverType: 'heavy_duty',
    material: 'concrete',
  },

  // Extra large for junction manholes
  circular_1500: {
    type: 'junction',
    shape: 'circular',
    internalDiameter: 1500,
    wallThickness: 200,
    minimumDepth: 2.0,
    maximumDepth: 6.0,
    standardDepths: [2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0],
    coverType: 'heavy_duty',
    material: 'concrete',
  },

  // Rectangular for large pipes
  rectangular_1200x1500: {
    type: 'junction',
    shape: 'rectangular',
    internalDiameter: 0,
    internalWidth: 1200,
    internalLength: 1500,
    wallThickness: 200,
    minimumDepth: 2.0,
    maximumDepth: 6.0,
    standardDepths: [2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0],
    coverType: 'heavy_duty',
    material: 'concrete',
  },

  // Drop manhole for steep terrain
  drop_1200: {
    type: 'drop',
    shape: 'circular',
    internalDiameter: 1200,
    wallThickness: 150,
    minimumDepth: 2.0,
    maximumDepth: 8.0,
    standardDepths: [2.5, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0],
    coverType: 'heavy_duty',
    material: 'concrete',
  },

  // Small inspection point (lamp hole)
  lamp_hole_600: {
    type: 'lamp_hole',
    shape: 'circular',
    internalDiameter: 600,
    wallThickness: 100,
    minimumDepth: 0.6,
    maximumDepth: 1.5,
    standardDepths: [0.8, 1.0, 1.2, 1.5],
    coverType: 'light_duty',
    material: 'concrete',
  },
};

/**
 * Maximum manhole spacing per pipe diameter (Chilean standards)
 */
export const MAX_MANHOLE_SPACING: Record<number, number> = {
  150: 60,    // 150mm pipe - max 60m spacing
  200: 80,    // 200mm pipe - max 80m spacing
  250: 100,   // 250mm pipe - max 100m spacing
  300: 100,   // 300mm pipe - max 100m spacing
  400: 120,   // 400mm+ pipe - max 120m spacing
  500: 120,
  600: 120,
  800: 150,   // Large pipes can have up to 150m spacing
  1000: 150,
  1200: 150,
};

/**
 * Minimum cover depth requirements (m)
 */
export const MIN_COVER_DEPTHS = {
  underRoadway: 1.2,        // Under vehicular traffic
  underSidewalk: 0.8,       // Under pedestrian areas
  underGreenArea: 0.6,      // Under landscaped areas
  privateLand: 0.6,         // Private property
};

/**
 * Drop manhole thresholds
 */
export const DROP_MANHOLE_CRITERIA = {
  minDropForInternal: 0.6,  // m - minimum drop for internal drop
  maxDropForInternal: 2.0,  // m - max for internal, above needs external
  minDropForExternal: 2.0,  // m - minimum for external drop pipe
  maxDrop: 6.0,             // m - maximum allowable drop
};

// ============================================================================
// Manhole Design Functions
// ============================================================================

/**
 * Select appropriate manhole type based on conditions
 */
export function selectManholeType(
  depth: number,
  pipeDiameter: number,
  numberOfConnections: number,
  dropHeight?: number
): ManholeSpecs {
  // Drop manhole needed?
  if (dropHeight && dropHeight >= DROP_MANHOLE_CRITERIA.minDropForInternal) {
    return MANHOLE_SPECS.drop_1200;
  }

  // Junction with multiple connections
  if (numberOfConnections >= 3) {
    if (pipeDiameter >= 600) {
      return MANHOLE_SPECS.rectangular_1200x1500;
    }
    return MANHOLE_SPECS.circular_1500;
  }

  // Large pipe requires larger manhole
  if (pipeDiameter >= 600) {
    return MANHOLE_SPECS.circular_1200;
  }

  // Deep installation
  if (depth > 4.0) {
    return MANHOLE_SPECS.circular_1200;
  }

  // Shallow - can use lamp hole
  if (depth <= 1.5 && pipeDiameter <= 200) {
    return MANHOLE_SPECS.lamp_hole_600;
  }

  // Standard case
  return MANHOLE_SPECS.circular_1000;
}

/**
 * Design a single manhole
 */
export function designManhole(
  position: ManholePosition,
  incomingPipes: PipeConnection[],
  outgoingPipe?: PipeConnection,
  sewerType: 'storm' | 'sanitary' | 'combined' = 'sanitary'
): ManholeDesign {
  const dropHeight = outgoingPipe
    ? Math.min(...incomingPipes.map(p => p.invertElevation)) - outgoingPipe.invertElevation
    : 0;

  const maxPipeDiameter = Math.max(
    ...incomingPipes.map(p => p.diameter),
    outgoingPipe?.diameter || 0
  );

  const specs = selectManholeType(
    position.depth,
    maxPipeDiameter,
    incomingPipes.length + (outgoingPipe ? 1 : 0),
    dropHeight > 0.3 ? dropHeight : undefined
  );

  const notes: string[] = [];

  // Check minimum manhole size for pipe
  const minManholeSize = maxPipeDiameter + 400; // 200mm clearance each side
  if (specs.internalDiameter < minManholeSize && specs.shape === 'circular') {
    notes.push(`Manhole diameter may be insufficient for ${maxPipeDiameter}mm pipe`);
  }

  // Check depth limits
  if (position.depth < specs.minimumDepth) {
    notes.push(`Depth ${position.depth.toFixed(2)}m below minimum ${specs.minimumDepth}m`);
  }
  if (position.depth > specs.maximumDepth) {
    notes.push(`Depth ${position.depth.toFixed(2)}m exceeds maximum ${specs.maximumDepth}m`);
  }

  // Step irons required for depths > 1.2m
  const stepIrons = position.depth > 1.2;

  // Ventilation for sanitary/combined
  const ventilation = sewerType !== 'storm';

  // Benching angle based on sewer type
  const benchingAngle = sewerType === 'storm' ? 45 : 60;

  return {
    position,
    specs,
    incomingPipes,
    outgoingPipe,
    dropHeight: dropHeight > 0.3 ? dropHeight : undefined,
    benchingAngle,
    stepIrons,
    ventilation,
    notes,
  };
}

/**
 * Calculate maximum manhole spacing based on pipe diameter
 */
export function getMaxManholeSpacing(pipeDiameter: number): number {
  const diameters = Object.keys(MAX_MANHOLE_SPACING)
    .map(Number)
    .sort((a, b) => a - b);

  for (const d of diameters) {
    if (pipeDiameter <= d) {
      return MAX_MANHOLE_SPACING[d];
    }
  }

  return MAX_MANHOLE_SPACING[1200]; // Default to largest
}

// ============================================================================
// Network Layout Functions
// ============================================================================

/**
 * Layout manholes along an alignment
 */
export function layoutManholes(input: ManholeLayoutInput): ManholeLayoutResult {
  const {
    alignment,
    sewerType,
    pipeDiameter,
    startInvert,
    targetSlope,
    maxSpacing = getMaxManholeSpacing(pipeDiameter),
    constraints = {},
  } = input;

  const {
    minDepth = sewerType === 'storm' ? 0.8 : 1.0,
    maxDepth = 6.0,
    minSlope = 0.3,
    maxSlope = sewerType === 'sanitary' ? 10 : 15,
  } = constraints;

  const warnings: string[] = [];
  const manholes: ManholeDesign[] = [];
  const pipes: NetworkLink[] = [];

  // Calculate total length
  let totalLength = 0;
  for (let i = 1; i < alignment.length; i++) {
    const dx = alignment[i].x - alignment[i - 1].x;
    const dy = alignment[i].y - alignment[i - 1].y;
    totalLength += Math.sqrt(dx * dx + dy * dy);
  }

  // Determine manhole positions
  const manholePositions: ManholePosition[] = [];
  let currentStation = 0;
  let manholeIndex = 0;

  // First manhole at start
  manholePositions.push({
    id: `MH-${manholeIndex++}`,
    x: alignment[0].x,
    y: alignment[0].y,
    groundElevation: alignment[0].groundElevation,
    invertElevation: startInvert,
    rimElevation: alignment[0].groundElevation,
    depth: alignment[0].groundElevation - startInvert,
  });

  // Place manholes at maximum spacing or alignment changes
  let lastManholeStation = 0;
  let segmentIndex = 0;
  let segmentProgress = 0;

  for (let i = 1; i < alignment.length; i++) {
    const dx = alignment[i].x - alignment[i - 1].x;
    const dy = alignment[i].y - alignment[i - 1].y;
    const segmentLength = Math.sqrt(dx * dx + dy * dy);

    currentStation += segmentLength;

    // Check if we need manholes within this segment
    while (currentStation - lastManholeStation > maxSpacing) {
      const newStation = lastManholeStation + maxSpacing;
      const ratio = (newStation - (currentStation - segmentLength)) / segmentLength;

      // Interpolate position
      const x = alignment[i - 1].x + dx * ratio;
      const y = alignment[i - 1].y + dy * ratio;
      const groundEl = alignment[i - 1].groundElevation +
        (alignment[i].groundElevation - alignment[i - 1].groundElevation) * ratio;

      // Calculate invert
      const lastManhole = manholePositions[manholePositions.length - 1];
      const distFromLast = newStation - lastManholeStation;
      const invertDrop = distFromLast * (targetSlope / 100);
      const invertElevation = lastManhole.invertElevation - invertDrop;

      manholePositions.push({
        id: `MH-${manholeIndex++}`,
        x,
        y,
        groundElevation: groundEl,
        invertElevation,
        rimElevation: groundEl,
        depth: groundEl - invertElevation,
      });

      lastManholeStation = newStation;
    }

    // Always place manhole at alignment vertices (direction changes)
    if (i < alignment.length - 1) {
      // Check for direction change
      const dx1 = alignment[i].x - alignment[i - 1].x;
      const dy1 = alignment[i].y - alignment[i - 1].y;
      const dx2 = alignment[i + 1].x - alignment[i].x;
      const dy2 = alignment[i + 1].y - alignment[i].y;

      const angle1 = Math.atan2(dy1, dx1);
      const angle2 = Math.atan2(dy2, dx2);
      const angleDiff = Math.abs(angle2 - angle1);

      // If angle change > 5 degrees, place manhole
      if (angleDiff > 0.087) {
        const lastManhole = manholePositions[manholePositions.length - 1];
        const distFromLast = currentStation - lastManholeStation;

        if (distFromLast > 5) { // Don't place if too close
          const invertDrop = distFromLast * (targetSlope / 100);
          const invertElevation = lastManhole.invertElevation - invertDrop;

          manholePositions.push({
            id: `MH-${manholeIndex++}`,
            x: alignment[i].x,
            y: alignment[i].y,
            groundElevation: alignment[i].groundElevation,
            invertElevation,
            rimElevation: alignment[i].groundElevation,
            depth: alignment[i].groundElevation - invertElevation,
          });

          lastManholeStation = currentStation;
        }
      }
    }
  }

  // Final manhole at end
  const lastManhole = manholePositions[manholePositions.length - 1];
  const lastPoint = alignment[alignment.length - 1];
  const distToEnd = totalLength - lastManholeStation;

  if (distToEnd > 5) { // Don't add if too close
    const invertDrop = distToEnd * (targetSlope / 100);
    manholePositions.push({
      id: `MH-${manholeIndex++}`,
      x: lastPoint.x,
      y: lastPoint.y,
      groundElevation: lastPoint.groundElevation,
      invertElevation: lastManhole.invertElevation - invertDrop,
      rimElevation: lastPoint.groundElevation,
      depth: lastPoint.groundElevation - (lastManhole.invertElevation - invertDrop),
    });
  }

  // Create manhole designs and pipe links
  let spacingOk = true;
  let depthsOk = true;
  let slopesOk = true;

  for (let i = 0; i < manholePositions.length; i++) {
    const pos = manholePositions[i];

    // Check depth
    if (pos.depth < minDepth) {
      warnings.push(`${pos.id}: Depth ${pos.depth.toFixed(2)}m below minimum ${minDepth}m`);
      depthsOk = false;
    }
    if (pos.depth > maxDepth) {
      warnings.push(`${pos.id}: Depth ${pos.depth.toFixed(2)}m exceeds maximum ${maxDepth}m`);
      depthsOk = false;
    }

    // Create pipe to next manhole
    if (i < manholePositions.length - 1) {
      const nextPos = manholePositions[i + 1];
      const dx = nextPos.x - pos.x;
      const dy = nextPos.y - pos.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const slope = ((pos.invertElevation - nextPos.invertElevation) / length) * 100;

      // Check spacing
      if (length > maxSpacing * 1.1) { // 10% tolerance
        warnings.push(`Pipe ${pos.id} to ${nextPos.id}: Length ${length.toFixed(1)}m exceeds max spacing ${maxSpacing}m`);
        spacingOk = false;
      }

      // Check slope
      if (slope < minSlope) {
        warnings.push(`Pipe ${pos.id} to ${nextPos.id}: Slope ${slope.toFixed(2)}% below minimum ${minSlope}%`);
        slopesOk = false;
      }
      if (slope > maxSlope) {
        warnings.push(`Pipe ${pos.id} to ${nextPos.id}: Slope ${slope.toFixed(2)}% exceeds maximum ${maxSlope}%`);
        slopesOk = false;
      }

      pipes.push({
        id: `P-${i}`,
        fromNode: pos.id,
        toNode: nextPos.id,
        length,
        diameter: pipeDiameter,
        material: 'PVC',
        slope,
        flowCapacity: 0, // Would calculate with Manning
        designFlow: 0,
      });

      // Create outgoing pipe connection for manhole design
      const outgoing: PipeConnection = {
        pipeId: `P-${i}`,
        diameter: pipeDiameter,
        invertElevation: pos.invertElevation,
        direction: Math.atan2(dy, dx) * 180 / Math.PI,
        slope,
        material: 'PVC',
      };

      // Create incoming pipe connection for next manhole
      const incoming: PipeConnection = {
        pipeId: `P-${i}`,
        diameter: pipeDiameter,
        invertElevation: nextPos.invertElevation,
        direction: (Math.atan2(dy, dx) * 180 / Math.PI + 180) % 360,
        slope,
        material: 'PVC',
      };

      // Design manholes
      if (i === 0) {
        // First manhole - no incoming pipes
        manholes.push(designManhole(pos, [], outgoing, sewerType));
      } else {
        // Middle manhole - has incoming from previous
        const prevPipe = pipes[i - 1];
        const prevIncoming: PipeConnection = {
          pipeId: prevPipe.id,
          diameter: pipeDiameter,
          invertElevation: pos.invertElevation,
          direction: (Math.atan2(
            pos.y - manholePositions[i - 1].y,
            pos.x - manholePositions[i - 1].x
          ) * 180 / Math.PI + 180) % 360,
          slope: prevPipe.slope,
          material: 'PVC',
        };

        manholes.push(designManhole(pos, [prevIncoming], outgoing, sewerType));
      }
    } else {
      // Last manhole - only incoming
      const prevPipe = pipes[i - 1];
      const prevIncoming: PipeConnection = {
        pipeId: prevPipe.id,
        diameter: pipeDiameter,
        invertElevation: pos.invertElevation,
        direction: (Math.atan2(
          pos.y - manholePositions[i - 1].y,
          pos.x - manholePositions[i - 1].x
        ) * 180 / Math.PI + 180) % 360,
        slope: prevPipe.slope,
        material: 'PVC',
      };

      manholes.push(designManhole(pos, [prevIncoming], undefined, sewerType));
    }
  }

  // Generate profile
  const profile = generateProfile(
    'Main Line',
    manholePositions,
    pipes,
    pipeDiameter
  );

  return {
    manholes,
    pipes,
    profile,
    totalLength,
    warnings,
    compliance: {
      spacingOk,
      depthsOk,
      slopesOk,
      allOk: spacingOk && depthsOk && slopesOk,
    },
  };
}

// ============================================================================
// Profile Generation
// ============================================================================

/**
 * Generate a longitudinal profile for a pipe run
 */
export function generateProfile(
  name: string,
  manholes: ManholePosition[],
  pipes: NetworkLink[],
  pipeDiameter: number,
  verticalExaggeration: number = 10
): ProfileData {
  const points: ProfilePoint[] = [];
  const pipeData: ProfileData['pipes'] = [];

  let station = 0;
  const pipeRadiusM = pipeDiameter / 2000; // Convert mm to m

  for (let i = 0; i < manholes.length; i++) {
    const mh = manholes[i];

    // Add manhole point
    points.push({
      station,
      groundElevation: mh.groundElevation,
      pipeInvert: mh.invertElevation,
      pipeCrown: mh.invertElevation + pipeDiameter / 1000,
      depth: mh.depth,
      nodeId: mh.id,
      nodeType: 'manhole',
      diameter: pipeDiameter,
    });

    // Add pipe data and intermediate points
    if (i < manholes.length - 1) {
      const pipe = pipes[i];
      const nextMh = manholes[i + 1];

      pipeData.push({
        fromStation: station,
        toStation: station + pipe.length,
        diameter: pipe.diameter,
        material: pipe.material,
        slope: pipe.slope,
      });

      // Add intermediate points every 10m
      const numPoints = Math.floor(pipe.length / 10);
      for (let j = 1; j <= numPoints; j++) {
        const ratio = j / (numPoints + 1);
        const interpStation = station + pipe.length * ratio;
        const interpInvert = mh.invertElevation - (pipe.length * ratio * pipe.slope / 100);
        const interpGround = mh.groundElevation +
          (nextMh.groundElevation - mh.groundElevation) * ratio;

        points.push({
          station: interpStation,
          groundElevation: interpGround,
          pipeInvert: interpInvert,
          pipeCrown: interpInvert + pipeDiameter / 1000,
          depth: interpGround - interpInvert,
          slope: pipe.slope,
        });
      }

      station += pipe.length;
    }
  }

  return {
    name,
    startNode: manholes[0].id,
    endNode: manholes[manholes.length - 1].id,
    totalLength: station,
    points,
    verticalExaggeration,
    manholes,
    pipes: pipeData,
  };
}

/**
 * Generate profile from network path (follow connected nodes)
 */
export function generateNetworkProfile(
  layout: NetworkLayout,
  startNodeId: string,
  endNodeId?: string
): ProfileData {
  const path: NetworkNode[] = [];
  const pathLinks: NetworkLink[] = [];

  // Trace path downstream from start node
  let currentId = startNodeId;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const node = layout.nodes.find(n => n.id === currentId);
    if (!node) break;

    path.push(node);

    if (currentId === endNodeId) break;

    // Find outgoing link
    const outLink = layout.links.find(l => l.fromNode === currentId);
    if (outLink) {
      pathLinks.push(outLink);
      currentId = outLink.toNode;
    } else {
      break;
    }
  }

  // Convert to manhole positions
  let station = 0;
  const manholePositions: ManholePosition[] = path.map((node, i) => {
    if (i > 0) {
      station += pathLinks[i - 1].length;
    }

    return {
      id: node.id,
      x: node.x,
      y: node.y,
      groundElevation: node.groundElevation,
      invertElevation: node.invertElevation || node.groundElevation - 1.5,
      rimElevation: node.groundElevation,
      depth: node.groundElevation - (node.invertElevation || node.groundElevation - 1.5),
    };
  });

  const avgDiameter = pathLinks.length > 0
    ? pathLinks.reduce((sum, l) => sum + l.diameter, 0) / pathLinks.length
    : 300;

  return generateProfile(
    `${startNodeId} to ${endNodeId || 'outlet'}`,
    manholePositions,
    pathLinks,
    avgDiameter
  );
}

// ============================================================================
// Cost Estimation
// ============================================================================

export interface ManholeUnitCosts {
  circular_1000: number;
  circular_1200: number;
  circular_1500: number;
  rectangular: number;
  drop: number;
  lampHole: number;
  coverHeavy: number;
  coverMedium: number;
  coverLight: number;
  stepIrons: number;  // Per step
  benching: number;   // Per manhole
  excavationPerM3: number;
  backfillPerM3: number;
}

export const DEFAULT_MANHOLE_COSTS: ManholeUnitCosts = {
  circular_1000: 450000,    // CLP per unit (shallow)
  circular_1200: 650000,    // CLP per unit
  circular_1500: 850000,    // CLP per unit
  rectangular: 1200000,     // CLP per unit
  drop: 950000,             // CLP per unit
  lampHole: 150000,         // CLP per unit
  coverHeavy: 180000,       // CLP per cover
  coverMedium: 120000,      // CLP per cover
  coverLight: 80000,        // CLP per cover
  stepIrons: 15000,         // CLP per step
  benching: 50000,          // CLP per manhole
  excavationPerM3: 25000,   // CLP per m³
  backfillPerM3: 18000,     // CLP per m³
};

export interface ManholeCostResult {
  manholeCount: number;
  itemizedCosts: {
    description: string;
    quantity: number;
    unit: string;
    unitCost: number;
    totalCost: number;
  }[];
  subtotalManholes: number;
  subtotalExcavation: number;
  subtotalCovers: number;
  subtotalAccessories: number;
  total: number;
}

/**
 * Estimate manhole costs for a layout
 */
export function estimateManholeCosts(
  manholes: ManholeDesign[],
  costs: ManholeUnitCosts = DEFAULT_MANHOLE_COSTS
): ManholeCostResult {
  const items: ManholeCostResult['itemizedCosts'] = [];

  // Count manholes by type
  const counts = {
    circular_1000: 0,
    circular_1200: 0,
    circular_1500: 0,
    rectangular: 0,
    drop: 0,
    lampHole: 0,
    coverHeavy: 0,
    coverMedium: 0,
    coverLight: 0,
  };

  let totalExcavation = 0;
  let totalStepIrons = 0;

  for (const mh of manholes) {
    const specs = mh.specs;

    // Count by type
    if (specs.type === 'drop') {
      counts.drop++;
    } else if (specs.type === 'lamp_hole') {
      counts.lampHole++;
    } else if (specs.shape === 'rectangular') {
      counts.rectangular++;
    } else if (specs.internalDiameter >= 1500) {
      counts.circular_1500++;
    } else if (specs.internalDiameter >= 1200) {
      counts.circular_1200++;
    } else {
      counts.circular_1000++;
    }

    // Count covers
    if (specs.coverType === 'heavy_duty') counts.coverHeavy++;
    else if (specs.coverType === 'medium_duty') counts.coverMedium++;
    else counts.coverLight++;

    // Calculate excavation volume
    const outerDiameter = (specs.internalDiameter + 2 * specs.wallThickness) / 1000;
    const excavationDiameter = outerDiameter + 0.6; // 0.3m clearance each side
    const area = specs.shape === 'circular'
      ? Math.PI * Math.pow(excavationDiameter / 2, 2)
      : ((specs.internalWidth || 0) / 1000 + 0.8) * ((specs.internalLength || 0) / 1000 + 0.8);
    totalExcavation += area * (mh.position.depth + 0.2); // +0.2m for base

    // Count step irons (every 0.3m for depths > 1.2m)
    if (mh.stepIrons) {
      totalStepIrons += Math.ceil((mh.position.depth - 0.6) / 0.3);
    }
  }

  // Add manhole items
  if (counts.circular_1000 > 0) {
    items.push({
      description: 'Cámara circular Ø1000mm',
      quantity: counts.circular_1000,
      unit: 'un',
      unitCost: costs.circular_1000,
      totalCost: counts.circular_1000 * costs.circular_1000,
    });
  }
  if (counts.circular_1200 > 0) {
    items.push({
      description: 'Cámara circular Ø1200mm',
      quantity: counts.circular_1200,
      unit: 'un',
      unitCost: costs.circular_1200,
      totalCost: counts.circular_1200 * costs.circular_1200,
    });
  }
  if (counts.circular_1500 > 0) {
    items.push({
      description: 'Cámara circular Ø1500mm',
      quantity: counts.circular_1500,
      unit: 'un',
      unitCost: costs.circular_1500,
      totalCost: counts.circular_1500 * costs.circular_1500,
    });
  }
  if (counts.rectangular > 0) {
    items.push({
      description: 'Cámara rectangular 1200x1500mm',
      quantity: counts.rectangular,
      unit: 'un',
      unitCost: costs.rectangular,
      totalCost: counts.rectangular * costs.rectangular,
    });
  }
  if (counts.drop > 0) {
    items.push({
      description: 'Cámara de caída',
      quantity: counts.drop,
      unit: 'un',
      unitCost: costs.drop,
      totalCost: counts.drop * costs.drop,
    });
  }
  if (counts.lampHole > 0) {
    items.push({
      description: 'Boca de registro Ø600mm',
      quantity: counts.lampHole,
      unit: 'un',
      unitCost: costs.lampHole,
      totalCost: counts.lampHole * costs.lampHole,
    });
  }

  // Covers
  if (counts.coverHeavy > 0) {
    items.push({
      description: 'Tapa HD tráfico pesado',
      quantity: counts.coverHeavy,
      unit: 'un',
      unitCost: costs.coverHeavy,
      totalCost: counts.coverHeavy * costs.coverHeavy,
    });
  }
  if (counts.coverMedium > 0) {
    items.push({
      description: 'Tapa MD tráfico medio',
      quantity: counts.coverMedium,
      unit: 'un',
      unitCost: costs.coverMedium,
      totalCost: counts.coverMedium * costs.coverMedium,
    });
  }
  if (counts.coverLight > 0) {
    items.push({
      description: 'Tapa LD tráfico liviano',
      quantity: counts.coverLight,
      unit: 'un',
      unitCost: costs.coverLight,
      totalCost: counts.coverLight * costs.coverLight,
    });
  }

  // Excavation
  items.push({
    description: 'Excavación para cámaras',
    quantity: Math.round(totalExcavation * 10) / 10,
    unit: 'm³',
    unitCost: costs.excavationPerM3,
    totalCost: Math.round(totalExcavation * costs.excavationPerM3),
  });

  // Backfill (assume 30% of excavation)
  const backfillVolume = totalExcavation * 0.3;
  items.push({
    description: 'Relleno compactado',
    quantity: Math.round(backfillVolume * 10) / 10,
    unit: 'm³',
    unitCost: costs.backfillPerM3,
    totalCost: Math.round(backfillVolume * costs.backfillPerM3),
  });

  // Step irons
  if (totalStepIrons > 0) {
    items.push({
      description: 'Peldaños de acceso',
      quantity: totalStepIrons,
      unit: 'un',
      unitCost: costs.stepIrons,
      totalCost: totalStepIrons * costs.stepIrons,
    });
  }

  // Benching
  items.push({
    description: 'Mediacaña (benching)',
    quantity: manholes.length,
    unit: 'un',
    unitCost: costs.benching,
    totalCost: manholes.length * costs.benching,
  });

  // Calculate subtotals
  const subtotalManholes = items
    .filter(i => i.description.includes('Cámara') || i.description.includes('Boca'))
    .reduce((sum, i) => sum + i.totalCost, 0);

  const subtotalCovers = items
    .filter(i => i.description.includes('Tapa'))
    .reduce((sum, i) => sum + i.totalCost, 0);

  const subtotalExcavation = items
    .filter(i => i.description.includes('Excavación') || i.description.includes('Relleno'))
    .reduce((sum, i) => sum + i.totalCost, 0);

  const subtotalAccessories = items
    .filter(i => i.description.includes('Peldaño') || i.description.includes('Mediacaña'))
    .reduce((sum, i) => sum + i.totalCost, 0);

  const total = items.reduce((sum, i) => sum + i.totalCost, 0);

  return {
    manholeCount: manholes.length,
    itemizedCosts: items,
    subtotalManholes,
    subtotalExcavation,
    subtotalCovers,
    subtotalAccessories,
    total,
  };
}

// ============================================================================
// Formatting Functions
// ============================================================================

/**
 * Format manhole layout result for display
 */
export function formatManholeLayout(result: ManholeLayoutResult): string {
  const lines: string[] = [];

  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('                    DISEÑO DE CÁMARAS DE INSPECCIÓN');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');

  // Summary
  lines.push('RESUMEN');
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push(`  Longitud total:      ${result.totalLength.toFixed(1)} m`);
  lines.push(`  Número de cámaras:   ${result.manholes.length}`);
  lines.push(`  Tramos de tubería:   ${result.pipes.length}`);
  lines.push('');

  // Compliance
  lines.push('VERIFICACIÓN DE NORMAS');
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push(`  Espaciamiento:       ${result.compliance.spacingOk ? '✓ OK' : '✗ NO CUMPLE'}`);
  lines.push(`  Profundidades:       ${result.compliance.depthsOk ? '✓ OK' : '✗ NO CUMPLE'}`);
  lines.push(`  Pendientes:          ${result.compliance.slopesOk ? '✓ OK' : '✗ NO CUMPLE'}`);
  lines.push('');

  // Manholes table
  lines.push('LISTADO DE CÁMARAS');
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push('  ID        Tipo       Ø(mm)   Prof(m)   Cota Rad(m)');
  lines.push('  ────────  ─────────  ──────  ────────  ───────────');

  for (const mh of result.manholes) {
    const type = mh.specs.type === 'drop' ? 'Caída' :
                 mh.specs.type === 'lamp_hole' ? 'B.Reg.' :
                 mh.specs.type === 'junction' ? 'Unión' : 'Estándar';
    const diameter = mh.specs.shape === 'circular'
      ? mh.specs.internalDiameter.toString()
      : `${mh.specs.internalWidth}x${mh.specs.internalLength}`;

    lines.push(`  ${mh.position.id.padEnd(8)}  ${type.padEnd(9)}  ${diameter.padStart(6)}  ${mh.position.depth.toFixed(2).padStart(8)}  ${mh.position.invertElevation.toFixed(2).padStart(11)}`);
  }
  lines.push('');

  // Pipes table
  lines.push('TRAMOS DE TUBERÍA');
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push('  ID      De → A           Long(m)   Ø(mm)   Pend(%)');
  lines.push('  ──────  ───────────────  ────────  ──────  ───────');

  for (const pipe of result.pipes) {
    const fromTo = `${pipe.fromNode} → ${pipe.toNode}`;
    lines.push(`  ${pipe.id.padEnd(6)}  ${fromTo.padEnd(15)}  ${pipe.length.toFixed(1).padStart(8)}  ${pipe.diameter.toString().padStart(6)}  ${pipe.slope.toFixed(2).padStart(7)}`);
  }
  lines.push('');

  // Warnings
  if (result.warnings.length > 0) {
    lines.push('ADVERTENCIAS');
    lines.push('───────────────────────────────────────────────────────────────');
    for (const warning of result.warnings) {
      lines.push(`  ⚠ ${warning}`);
    }
    lines.push('');
  }

  lines.push('═══════════════════════════════════════════════════════════════');

  return lines.join('\n');
}

/**
 * Format profile data for display
 */
export function formatProfile(profile: ProfileData): string {
  const lines: string[] = [];

  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('                    PERFIL LONGITUDINAL');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`  Nombre:           ${profile.name}`);
  lines.push(`  Nodo inicio:      ${profile.startNode}`);
  lines.push(`  Nodo final:       ${profile.endNode}`);
  lines.push(`  Longitud total:   ${profile.totalLength.toFixed(1)} m`);
  lines.push('');

  lines.push('DATOS DEL PERFIL');
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push('  Prog(m)    C.Terr(m)   C.Rad(m)   Prof(m)   Nodo');
  lines.push('  ────────   ──────────  ─────────  ────────  ────────');

  for (const pt of profile.points.filter(p => p.nodeId)) {
    lines.push(`  ${pt.station.toFixed(1).padStart(8)}   ${pt.groundElevation.toFixed(2).padStart(10)}  ${pt.pipeInvert.toFixed(2).padStart(9)}  ${pt.depth.toFixed(2).padStart(8)}  ${pt.nodeId || ''}`);
  }
  lines.push('');

  lines.push('TUBERÍAS');
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push('  De Prog    A Prog     Ø(mm)   Material   Pend(%)');
  lines.push('  ────────   ────────   ──────  ─────────  ───────');

  for (const pipe of profile.pipes) {
    lines.push(`  ${pipe.fromStation.toFixed(1).padStart(8)}   ${pipe.toStation.toFixed(1).padStart(8)}   ${pipe.diameter.toString().padStart(6)}  ${pipe.material.padEnd(9)}  ${pipe.slope.toFixed(2).padStart(7)}`);
  }

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');

  return lines.join('\n');
}

/**
 * Format cost estimate for display
 */
export function formatManholeCosts(costs: ManholeCostResult): string {
  const lines: string[] = [];
  const formatCLP = (n: number) => n.toLocaleString('es-CL');

  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('                    PRESUPUESTO DE CÁMARAS');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`  Cantidad de cámaras: ${costs.manholeCount}`);
  lines.push('');

  lines.push('ITEMIZADO');
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push('  Descripción                    Cant.  Unid.  P.Unit.     Total');
  lines.push('  ────────────────────────────   ─────  ─────  ──────────  ──────────');

  for (const item of costs.itemizedCosts) {
    const qty = typeof item.quantity === 'number' && !Number.isInteger(item.quantity)
      ? item.quantity.toFixed(1)
      : item.quantity.toString();
    lines.push(`  ${item.description.padEnd(30)} ${qty.padStart(5)}  ${item.unit.padEnd(5)}  $${formatCLP(item.unitCost).padStart(9)}  $${formatCLP(item.totalCost).padStart(9)}`);
  }

  lines.push('');
  lines.push('SUBTOTALES');
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push(`  Cámaras y bocas:         $${formatCLP(costs.subtotalManholes).padStart(12)}`);
  lines.push(`  Tapas:                   $${formatCLP(costs.subtotalCovers).padStart(12)}`);
  lines.push(`  Excavación y relleno:    $${formatCLP(costs.subtotalExcavation).padStart(12)}`);
  lines.push(`  Accesorios:              $${formatCLP(costs.subtotalAccessories).padStart(12)}`);
  lines.push('                           ────────────────');
  lines.push(`  TOTAL:                   $${formatCLP(costs.total).padStart(12)}`);
  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');

  return lines.join('\n');
}
