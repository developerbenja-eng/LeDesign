import { XMLParser } from 'fast-xml-parser';
import type { TINSurface, Point3D, LandXMLParseResult, Alignment, Parcel } from '@/types/cad';

/**
 * Parse LandXML file content and extract surfaces, alignments, and parcels
 */
export function parseLandXML(xmlContent: string): LandXMLParseResult {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
  });

  const parsed = parser.parse(xmlContent);
  const landXML = parsed.LandXML;

  if (!landXML) {
    throw new Error('Invalid LandXML file: Missing LandXML root element');
  }

  const result: LandXMLParseResult = {
    surfaces: [],
    alignments: [],
    parcels: [],
  };

  // Parse surfaces
  if (landXML.Surfaces?.Surface) {
    const surfaces = Array.isArray(landXML.Surfaces.Surface)
      ? landXML.Surfaces.Surface
      : [landXML.Surfaces.Surface];

    for (const surface of surfaces) {
      const tinSurface = parseSurface(surface);
      if (tinSurface) {
        result.surfaces.push(tinSurface);
      }
    }
  }

  // Parse alignments
  if (landXML.Alignments?.Alignment) {
    const alignments = Array.isArray(landXML.Alignments.Alignment)
      ? landXML.Alignments.Alignment
      : [landXML.Alignments.Alignment];

    for (const alignment of alignments) {
      const parsedAlignment = parseAlignment(alignment);
      if (parsedAlignment) {
        result.alignments?.push(parsedAlignment);
      }
    }
  }

  // Parse parcels
  if (landXML.Parcels?.Parcel) {
    const parcels = Array.isArray(landXML.Parcels.Parcel)
      ? landXML.Parcels.Parcel
      : [landXML.Parcels.Parcel];

    for (const parcel of parcels) {
      const parsedParcel = parseParcel(parcel);
      if (parsedParcel) {
        result.parcels?.push(parsedParcel);
      }
    }
  }

  return result;
}

/**
 * Parse a single TIN surface from LandXML
 */
function parseSurface(surface: Record<string, unknown>): TINSurface | null {
  const name = (surface['@_name'] as string) || 'Unnamed Surface';
  const id = (surface['@_name'] as string) || `surface_${Date.now()}`;

  // Get Definition node (contains Pnts and Faces)
  const definition = surface.Definition as Record<string, unknown> | undefined;
  if (!definition) {
    console.warn(`Surface ${name} has no Definition`);
    return null;
  }

  const points = new Map<string, Point3D>();
  const faces: [number, number, number][] = [];

  // Parse points
  const pnts = definition.Pnts as Record<string, unknown> | undefined;
  if (pnts?.P) {
    const pointList = Array.isArray(pnts.P) ? pnts.P : [pnts.P];

    for (const p of pointList) {
      let id: string;
      let coords: string;

      if (typeof p === 'object' && p !== null) {
        id = (p as Record<string, unknown>)['@_id'] as string;
        coords = (p as Record<string, unknown>)['#text'] as string;
      } else {
        continue;
      }

      if (id && coords) {
        const [y, x, z] = coords.trim().split(/\s+/).map(Number);
        // LandXML uses Northing, Easting, Elevation order
        points.set(id, { x, y, z: z || 0 });
      }
    }
  }

  // Parse faces (triangles)
  const facesNode = definition.Faces as Record<string, unknown> | undefined;
  if (facesNode?.F) {
    const faceList = Array.isArray(facesNode.F) ? facesNode.F : [facesNode.F];

    for (const f of faceList) {
      let indices: string;

      if (typeof f === 'object' && f !== null) {
        indices = (f as Record<string, unknown>)['#text'] as string;
      } else if (typeof f === 'string') {
        indices = f;
      } else {
        continue;
      }

      if (indices) {
        const [a, b, c] = indices.trim().split(/\s+/).map(Number);
        faces.push([a, b, c]);
      }
    }
  }

  // Calculate bounds
  const pointValues = Array.from(points.values());
  if (pointValues.length === 0) {
    console.warn(`Surface ${name} has no points`);
    return null;
  }

  const bounds = {
    min: {
      x: Math.min(...pointValues.map((p) => p.x)),
      y: Math.min(...pointValues.map((p) => p.y)),
      z: Math.min(...pointValues.map((p) => p.z)),
    },
    max: {
      x: Math.max(...pointValues.map((p) => p.x)),
      y: Math.max(...pointValues.map((p) => p.y)),
      z: Math.max(...pointValues.map((p) => p.z)),
    },
  };

  return {
    id,
    name,
    points,
    faces,
    bounds,
  };
}

/**
 * Parse alignment from LandXML
 */
function parseAlignment(alignment: Record<string, unknown>): Alignment | null {
  const name = (alignment['@_name'] as string) || 'Unnamed Alignment';
  const id = name;

  // TODO: Parse CoordGeom for alignment geometry
  // This is a simplified version
  return {
    id,
    name,
    stations: [],
  };
}

/**
 * Parse parcel from LandXML
 */
function parseParcel(parcel: Record<string, unknown>): Parcel | null {
  const name = (parcel['@_name'] as string) || 'Unnamed Parcel';
  const id = name;
  const area = parcel['@_area'] ? Number(parcel['@_area']) : undefined;

  // TODO: Parse CoordGeom for parcel boundary
  return {
    id,
    name,
    boundary: [],
    area,
  };
}

/**
 * Convert TIN surface to Three.js BufferGeometry data
 */
export function surfaceToGeometry(surface: TINSurface): {
  positions: Float32Array;
  indices: Uint32Array;
  colors: Float32Array;
} {
  const pointArray = Array.from(surface.points.entries());
  const pointIndexMap = new Map<string, number>();

  // Create position array and index mapping
  const positions = new Float32Array(pointArray.length * 3);
  const colors = new Float32Array(pointArray.length * 3);

  // Calculate elevation range for coloring
  const { min, max } = surface.bounds;
  const elevRange = max.z - min.z || 1;

  pointArray.forEach(([id, point], index) => {
    pointIndexMap.set(id, index);

    // Positions (centered)
    const centerX = (max.x + min.x) / 2;
    const centerY = (max.y + min.y) / 2;

    positions[index * 3] = point.x - centerX;
    positions[index * 3 + 1] = point.z; // Z becomes Y in Three.js
    positions[index * 3 + 2] = point.y - centerY;

    // Color based on elevation (green to brown gradient)
    const t = (point.z - min.z) / elevRange;
    colors[index * 3] = 0.2 + t * 0.5; // R
    colors[index * 3 + 1] = 0.6 - t * 0.3; // G
    colors[index * 3 + 2] = 0.2; // B
  });

  // Create index array for triangles
  const indices = new Uint32Array(surface.faces.length * 3);
  surface.faces.forEach((face, faceIndex) => {
    const [a, b, c] = face;
    // LandXML uses 1-based indexing, convert to 0-based
    indices[faceIndex * 3] = pointIndexMap.get(String(a)) || 0;
    indices[faceIndex * 3 + 1] = pointIndexMap.get(String(b)) || 0;
    indices[faceIndex * 3 + 2] = pointIndexMap.get(String(c)) || 0;
  });

  return { positions, indices, colors };
}

/**
 * Generate a sample LandXML surface for testing
 */
export function generateSampleLandXML(): string {
  const points: string[] = [];
  const faces: string[] = [];
  const gridSize = 10;
  const spacing = 100;

  // Generate a wavy terrain
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const id = i * gridSize + j + 1;
      const x = j * spacing;
      const y = i * spacing;
      const z = Math.sin(x / 200) * 20 + Math.cos(y / 200) * 15 + 100;
      points.push(`      <P id="${id}">${y.toFixed(3)} ${x.toFixed(3)} ${z.toFixed(3)}</P>`);
    }
  }

  // Generate triangles
  for (let i = 0; i < gridSize - 1; i++) {
    for (let j = 0; j < gridSize - 1; j++) {
      const tl = i * gridSize + j + 1;
      const tr = tl + 1;
      const bl = tl + gridSize;
      const br = bl + 1;

      faces.push(`      <F>${tl} ${bl} ${tr}</F>`);
      faces.push(`      <F>${tr} ${bl} ${br}</F>`);
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<LandXML xmlns="http://www.landxml.org/schema/LandXML-1.2" version="1.2">
  <Surfaces>
    <Surface name="Sample Terrain">
      <Definition surfType="TIN">
        <Pnts>
${points.join('\n')}
        </Pnts>
        <Faces>
${faces.join('\n')}
        </Faces>
      </Definition>
    </Surface>
  </Surfaces>
</LandXML>`;
}
