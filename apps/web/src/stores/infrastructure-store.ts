/**
 * Infrastructure Store
 *
 * Zustand store for managing infrastructure network elements
 * Extends CAD store functionality with network-specific features:
 * - Connectivity tracking (nodes, links, upstream/downstream)
 * - Simulation results storage
 * - Design validation
 * - Network statistics
 */

import { create } from 'zustand';
import type { Point3D } from '@/types/cad';
import type {
  AnyInfrastructureEntity,
  WaterNetworkEntity,
  SewerNetworkEntity,
  StormwaterNetworkEntity,
  InfrastructureCategory,
  WaterPipeEntity,
  WaterJunctionEntity,
  SewerPipeEntity,
  ManholeEntity,
  StormCollectorEntity,
  StormInletEntity,
} from '@/types/infrastructure-entities';
import {
  isNetworkNode,
  isNetworkLink,
  createWaterPipe,
  createWaterJunction,
  createSewerPipe,
  createManhole,
  createStormCollector,
  createStormInlet,
  INFRASTRUCTURE_LAYERS,
} from '@/types/infrastructure-entities';
import { useCADStore } from './cad-store';

// ============================================================================
// Types
// ============================================================================

export interface NetworkConnection {
  sourceId: string;
  targetId: string;
  linkId?: string; // pipe/collector that connects them
}

export interface ValidationMessage {
  type: 'error' | 'warning' | 'info';
  entityId: string;
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface SimulationState {
  status: 'idle' | 'running' | 'completed' | 'error';
  progress: number; // 0-100
  lastRun?: Date;
  duration?: number; // seconds
  errorMessage?: string;
}

export interface NetworkStatistics {
  totalNodes: number;
  totalLinks: number;
  totalLength: number; // m
  isolatedNodes: number;
  disconnectedSegments: number;
  byCategory: {
    water: { nodes: number; links: number; length: number };
    sewer: { nodes: number; links: number; length: number };
    stormwater: { nodes: number; links: number; length: number };
  };
}

// ============================================================================
// Store Interface
// ============================================================================

interface InfrastructureState {
  // Infrastructure entities (stored separately for type safety)
  infrastructureEntities: Map<string, AnyInfrastructureEntity>;

  // Network connectivity
  connections: NetworkConnection[];

  // Validation results
  validationMessages: ValidationMessage[];

  // Simulation state
  simulationState: SimulationState;

  // Active design mode
  activeCategory: InfrastructureCategory | null;

  // Entity CRUD
  addInfraEntity: (entity: AnyInfrastructureEntity) => void;
  removeInfraEntity: (id: string) => void;
  updateInfraEntity: (id: string, updates: Partial<AnyInfrastructureEntity>) => void;
  clearInfraEntities: () => void;

  // Batch operations
  addEntities: (entities: AnyInfrastructureEntity[]) => void;
  removeEntities: (ids: string[]) => void;

  // Network connectivity
  connectEntities: (sourceId: string, targetId: string, linkId?: string) => void;
  disconnectEntities: (sourceId: string, targetId: string) => void;
  getConnectedEntities: (entityId: string) => string[];
  findNearestNode: (point: Point3D, category: InfrastructureCategory, maxDistance?: number) => string | null;
  autoConnectPipe: (pipeId: string) => void;

  // Validation
  validateNetwork: (category?: InfrastructureCategory) => ValidationMessage[];
  clearValidation: () => void;

  // Simulation
  setSimulationState: (state: Partial<SimulationState>) => void;
  storeSimulationResults: (results: Map<string, Record<string, number>>) => void;

  // Queries
  getEntitiesByCategory: (category: InfrastructureCategory) => AnyInfrastructureEntity[];
  getEntitiesByType: (infraType: string) => AnyInfrastructureEntity[];
  getNetworkStatistics: () => NetworkStatistics;

  // Design mode
  setActiveCategory: (category: InfrastructureCategory | null) => void;

  // Sync with CAD store
  syncToCADStore: () => void;
  loadFromCADStore: () => void;

  // Initialize layers
  initializeLayers: () => void;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useInfrastructureStore = create<InfrastructureState>((set, get) => ({
  // Initial state
  infrastructureEntities: new Map(),
  connections: [],
  validationMessages: [],
  simulationState: { status: 'idle', progress: 0 },
  activeCategory: null,

  // -------------------------------------------------------------------------
  // Entity CRUD
  // -------------------------------------------------------------------------

  addInfraEntity: (entity) => {
    set((state) => {
      const newEntities = new Map(state.infrastructureEntities);
      newEntities.set(entity.id, entity);
      return { infrastructureEntities: newEntities };
    });
    // Also add to CAD store for rendering
    get().syncToCADStore();
  },

  removeInfraEntity: (id) => {
    set((state) => {
      const newEntities = new Map(state.infrastructureEntities);
      newEntities.delete(id);
      // Also remove connections
      const newConnections = state.connections.filter(
        (c) => c.sourceId !== id && c.targetId !== id && c.linkId !== id
      );
      return { infrastructureEntities: newEntities, connections: newConnections };
    });
    // Sync removal to CAD store
    useCADStore.getState().removeEntity(id);
  },

  updateInfraEntity: (id, updates) => {
    set((state) => {
      const newEntities = new Map(state.infrastructureEntities);
      const entity = newEntities.get(id);
      if (entity) {
        newEntities.set(id, { ...entity, ...updates } as AnyInfrastructureEntity);
      }
      return { infrastructureEntities: newEntities };
    });
    get().syncToCADStore();
  },

  clearInfraEntities: () => {
    set({
      infrastructureEntities: new Map(),
      connections: [],
      validationMessages: [],
    });
  },

  addEntities: (entities) => {
    set((state) => {
      const newEntities = new Map(state.infrastructureEntities);
      entities.forEach((e) => newEntities.set(e.id, e));
      return { infrastructureEntities: newEntities };
    });
    get().syncToCADStore();
  },

  removeEntities: (ids) => {
    set((state) => {
      const newEntities = new Map(state.infrastructureEntities);
      ids.forEach((id) => newEntities.delete(id));
      const idSet = new Set(ids);
      const newConnections = state.connections.filter(
        (c) => !idSet.has(c.sourceId) && !idSet.has(c.targetId) && (!c.linkId || !idSet.has(c.linkId))
      );
      return { infrastructureEntities: newEntities, connections: newConnections };
    });
    const cadStore = useCADStore.getState();
    ids.forEach((id) => cadStore.removeEntity(id));
  },

  // -------------------------------------------------------------------------
  // Network Connectivity
  // -------------------------------------------------------------------------

  connectEntities: (sourceId, targetId, linkId) => {
    set((state) => {
      // Check if connection already exists
      const exists = state.connections.some(
        (c) =>
          (c.sourceId === sourceId && c.targetId === targetId) ||
          (c.sourceId === targetId && c.targetId === sourceId)
      );
      if (exists) return state;

      return {
        connections: [...state.connections, { sourceId, targetId, linkId }],
      };
    });
  },

  disconnectEntities: (sourceId, targetId) => {
    set((state) => ({
      connections: state.connections.filter(
        (c) =>
          !(c.sourceId === sourceId && c.targetId === targetId) &&
          !(c.sourceId === targetId && c.targetId === sourceId)
      ),
    }));
  },

  getConnectedEntities: (entityId) => {
    const connections = get().connections;
    const connected: string[] = [];
    connections.forEach((c) => {
      if (c.sourceId === entityId) connected.push(c.targetId);
      else if (c.targetId === entityId) connected.push(c.sourceId);
    });
    return connected;
  },

  findNearestNode: (point, category, maxDistance = 2.0) => {
    const entities = get().getEntitiesByCategory(category);
    let nearestId: string | null = null;
    let nearestDist = maxDistance;

    entities.forEach((entity) => {
      if (!isNetworkNode(entity)) return;

      let nodePoint: Point3D | undefined;
      if ('position' in entity) nodePoint = entity.position;
      else if ('center' in entity) nodePoint = entity.center;

      if (!nodePoint) return;

      const dist = Math.sqrt(
        Math.pow(point.x - nodePoint.x, 2) +
        Math.pow(point.y - nodePoint.y, 2) +
        Math.pow(point.z - nodePoint.z, 2)
      );

      if (dist < nearestDist) {
        nearestDist = dist;
        nearestId = entity.id;
      }
    });

    return nearestId;
  },

  autoConnectPipe: (pipeId) => {
    const state = get();
    const pipe = state.infrastructureEntities.get(pipeId);
    if (!pipe || !isNetworkLink(pipe)) return;

    if (!('vertices' in pipe)) return;
    const vertices = pipe.vertices;
    if (vertices.length < 2) return;

    const startPoint = vertices[0];
    const endPoint = vertices[vertices.length - 1];

    // Find nearest nodes to start and end
    const startNode = state.findNearestNode(startPoint, pipe.category, 2.0);
    const endNode = state.findNearestNode(endPoint, pipe.category, 2.0);

    if (startNode) {
      state.connectEntities(startNode, pipeId, pipeId);
      // Update pipe's upstream reference
      if (pipe.category === 'sewer' && 'upstreamManholeId' in pipe) {
        state.updateInfraEntity(pipeId, { upstreamManholeId: startNode } as Partial<SewerPipeEntity>);
      }
    }

    if (endNode) {
      state.connectEntities(pipeId, endNode, pipeId);
      // Update pipe's downstream reference
      if (pipe.category === 'sewer' && 'downstreamManholeId' in pipe) {
        state.updateInfraEntity(pipeId, { downstreamManholeId: endNode } as Partial<SewerPipeEntity>);
      }
    }
  },

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  validateNetwork: (category) => {
    const entities = category
      ? get().getEntitiesByCategory(category)
      : Array.from(get().infrastructureEntities.values());

    const messages: ValidationMessage[] = [];
    const connections = get().connections;

    // Build adjacency map
    const adjacency = new Map<string, Set<string>>();
    connections.forEach((c) => {
      if (!adjacency.has(c.sourceId)) adjacency.set(c.sourceId, new Set());
      if (!adjacency.has(c.targetId)) adjacency.set(c.targetId, new Set());
      adjacency.get(c.sourceId)!.add(c.targetId);
      adjacency.get(c.targetId)!.add(c.sourceId);
    });

    entities.forEach((entity) => {
      // Check for isolated nodes
      if (isNetworkNode(entity)) {
        const connCount = adjacency.get(entity.id)?.size || 0;
        if (connCount === 0) {
          messages.push({
            type: 'warning',
            entityId: entity.id,
            code: 'ISOLATED_NODE',
            message: `${entity.infrastructureType} '${entity.name || entity.id}' is not connected to any pipe`,
          });
        }
      }

      // Category-specific validation
      if (entity.category === 'water') {
        validateWaterEntity(entity as WaterNetworkEntity, messages);
      } else if (entity.category === 'sewer') {
        validateSewerEntity(entity as SewerNetworkEntity, messages);
      } else if (entity.category === 'stormwater') {
        validateStormwaterEntity(entity as StormwaterNetworkEntity, messages);
      }
    });

    set({ validationMessages: messages });
    return messages;
  },

  clearValidation: () => set({ validationMessages: [] }),

  // -------------------------------------------------------------------------
  // Simulation
  // -------------------------------------------------------------------------

  setSimulationState: (stateUpdate) => {
    set((state) => ({
      simulationState: { ...state.simulationState, ...stateUpdate },
    }));
  },

  storeSimulationResults: (results) => {
    set((state) => {
      const newEntities = new Map(state.infrastructureEntities);
      results.forEach((entityResults, entityId) => {
        const entity = newEntities.get(entityId);
        if (entity) {
          newEntities.set(entityId, {
            ...entity,
            calculationResults: entityResults,
          } as AnyInfrastructureEntity);
        }
      });
      return {
        infrastructureEntities: newEntities,
        simulationState: {
          ...state.simulationState,
          status: 'completed',
          lastRun: new Date(),
        },
      };
    });
  },

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  getEntitiesByCategory: (category) => {
    return Array.from(get().infrastructureEntities.values()).filter(
      (e) => e.category === category
    );
  },

  getEntitiesByType: (infraType) => {
    return Array.from(get().infrastructureEntities.values()).filter(
      (e) => e.infrastructureType === infraType
    );
  },

  getNetworkStatistics: () => {
    const entities = Array.from(get().infrastructureEntities.values());
    const connections = get().connections;

    const stats: NetworkStatistics = {
      totalNodes: 0,
      totalLinks: 0,
      totalLength: 0,
      isolatedNodes: 0,
      disconnectedSegments: 0,
      byCategory: {
        water: { nodes: 0, links: 0, length: 0 },
        sewer: { nodes: 0, links: 0, length: 0 },
        stormwater: { nodes: 0, links: 0, length: 0 },
      },
    };

    // Build connection set for quick lookup
    const connectedIds = new Set<string>();
    connections.forEach((c) => {
      connectedIds.add(c.sourceId);
      connectedIds.add(c.targetId);
    });

    entities.forEach((entity) => {
      const catKey = entity.category as keyof typeof stats.byCategory;
      if (!stats.byCategory[catKey]) return;

      if (isNetworkNode(entity)) {
        stats.totalNodes++;
        stats.byCategory[catKey].nodes++;
        if (!connectedIds.has(entity.id)) {
          stats.isolatedNodes++;
        }
      } else if (isNetworkLink(entity)) {
        stats.totalLinks++;
        stats.byCategory[catKey].links++;
        if ('length' in entity && typeof entity.length === 'number') {
          stats.totalLength += entity.length;
          stats.byCategory[catKey].length += entity.length;
        }
      }
    });

    return stats;
  },

  // -------------------------------------------------------------------------
  // Design Mode
  // -------------------------------------------------------------------------

  setActiveCategory: (category) => set({ activeCategory: category }),

  // -------------------------------------------------------------------------
  // CAD Store Sync
  // -------------------------------------------------------------------------

  syncToCADStore: () => {
    const cadStore = useCADStore.getState();
    const infraEntities = get().infrastructureEntities;

    // Add/update all infrastructure entities in CAD store
    infraEntities.forEach((entity) => {
      // Infrastructure entities extend CAD entities, so they're compatible
      cadStore.addEntity(entity as unknown as import('@/types/cad').AnyCADEntity);
    });
  },

  loadFromCADStore: () => {
    const cadStore = useCADStore.getState();
    const newInfraEntities = new Map<string, AnyInfrastructureEntity>();

    cadStore.entities.forEach((entity) => {
      if ('infrastructureType' in entity) {
        newInfraEntities.set(entity.id, entity as unknown as AnyInfrastructureEntity);
      }
    });

    set({ infrastructureEntities: newInfraEntities });
  },

  initializeLayers: () => {
    const cadStore = useCADStore.getState();
    Object.values(INFRASTRUCTURE_LAYERS).forEach((layer) => {
      cadStore.addLayer(layer);
    });
  },
}));

// ============================================================================
// Validation Helpers
// ============================================================================

function validateWaterEntity(entity: WaterNetworkEntity, messages: ValidationMessage[]): void {
  if (entity.infrastructureType === 'water_pipe') {
    const pipe = entity as WaterPipeEntity;

    // Check velocity limits
    if (pipe.velocity !== undefined) {
      if (pipe.velocity < 0.3) {
        messages.push({
          type: 'warning',
          entityId: pipe.id,
          code: 'LOW_VELOCITY',
          message: `Pipe velocity (${pipe.velocity.toFixed(2)} m/s) is below minimum (0.3 m/s) - risk of sedimentation`,
        });
      } else if (pipe.velocity > 3.0) {
        messages.push({
          type: 'error',
          entityId: pipe.id,
          code: 'HIGH_VELOCITY',
          message: `Pipe velocity (${pipe.velocity.toFixed(2)} m/s) exceeds maximum (3.0 m/s)`,
        });
      }
    }

    // Check pressure limits
    if (pipe.pressureEnd !== undefined) {
      if (pipe.pressureEnd < 15) {
        messages.push({
          type: 'error',
          entityId: pipe.id,
          code: 'LOW_PRESSURE',
          message: `End pressure (${pipe.pressureEnd.toFixed(1)} m.c.a.) is below minimum (15 m.c.a.)`,
        });
      } else if (pipe.pressureEnd > 70) {
        messages.push({
          type: 'warning',
          entityId: pipe.id,
          code: 'HIGH_PRESSURE',
          message: `End pressure (${pipe.pressureEnd.toFixed(1)} m.c.a.) exceeds recommended maximum (70 m.c.a.)`,
        });
      }
    }

    // Check diameter
    if (pipe.diameter < 50) {
      messages.push({
        type: 'error',
        entityId: pipe.id,
        code: 'SMALL_DIAMETER',
        message: `Pipe diameter (${pipe.diameter} mm) is below minimum for distribution (50 mm)`,
      });
    }
  }
}

function validateSewerEntity(entity: SewerNetworkEntity, messages: ValidationMessage[]): void {
  if (entity.infrastructureType === 'sewer_pipe') {
    const pipe = entity as SewerPipeEntity;

    // Check slope
    if (pipe.slope < 0.01) {
      messages.push({
        type: 'error',
        entityId: pipe.id,
        code: 'LOW_SLOPE',
        message: `Pipe slope (${(pipe.slope * 100).toFixed(2)}%) is below minimum (1%)`,
      });
    } else if (pipe.slope > 0.15) {
      messages.push({
        type: 'warning',
        entityId: pipe.id,
        code: 'HIGH_SLOPE',
        message: `Pipe slope (${(pipe.slope * 100).toFixed(2)}%) exceeds 15% - consider drop structure`,
      });
    }

    // Check velocity
    if (pipe.velocity !== undefined) {
      if (pipe.velocity < 0.6) {
        messages.push({
          type: 'warning',
          entityId: pipe.id,
          code: 'LOW_VELOCITY',
          message: `Velocity (${pipe.velocity.toFixed(2)} m/s) is below self-cleansing velocity (0.6 m/s)`,
        });
      } else if (pipe.velocity > 5.0) {
        messages.push({
          type: 'error',
          entityId: pipe.id,
          code: 'HIGH_VELOCITY',
          message: `Velocity (${pipe.velocity.toFixed(2)} m/s) exceeds maximum (5.0 m/s)`,
        });
      }
    }

    // Check fill ratio
    if (pipe.fillRatio > 0.85) {
      messages.push({
        type: 'warning',
        entityId: pipe.id,
        code: 'HIGH_FILL',
        message: `Fill ratio (${(pipe.fillRatio * 100).toFixed(0)}%) exceeds 85% - consider larger diameter`,
      });
    }

    // Check minimum diameter
    if (pipe.diameter < 160) {
      messages.push({
        type: 'error',
        entityId: pipe.id,
        code: 'SMALL_DIAMETER',
        message: `Pipe diameter (${pipe.diameter} mm) is below minimum for public sewer (160 mm)`,
      });
    }
  }

  if (entity.infrastructureType === 'manhole') {
    const mh = entity as ManholeEntity;

    // Check depth
    if (mh.depth > 6.0) {
      messages.push({
        type: 'warning',
        entityId: mh.id,
        code: 'DEEP_MANHOLE',
        message: `Manhole depth (${mh.depth.toFixed(2)} m) exceeds 6m - consider special design`,
      });
    }

    // Check for outlet pipe
    if (!mh.outletPipeId) {
      messages.push({
        type: 'warning',
        entityId: mh.id,
        code: 'NO_OUTLET',
        message: `Manhole has no outlet pipe defined`,
      });
    }
  }
}

function validateStormwaterEntity(entity: StormwaterNetworkEntity, messages: ValidationMessage[]): void {
  if (entity.infrastructureType === 'storm_collector') {
    const collector = entity as StormCollectorEntity;

    // Check minimum diameter
    if (collector.diameter < 300) {
      messages.push({
        type: 'error',
        entityId: collector.id,
        code: 'SMALL_DIAMETER',
        message: `Collector diameter (${collector.diameter} mm) is below minimum (300 mm)`,
      });
    }

    // Check capacity
    if (collector.capacity !== undefined && collector.actualFlow !== undefined) {
      if (collector.actualFlow > collector.capacity) {
        messages.push({
          type: 'error',
          entityId: collector.id,
          code: 'OVERCAPACITY',
          message: `Flow (${collector.actualFlow.toFixed(1)} L/s) exceeds capacity (${collector.capacity.toFixed(1)} L/s)`,
        });
      }
    }
  }

  if (entity.infrastructureType === 'storm_inlet') {
    const inlet = entity as StormInletEntity;

    // Check capture efficiency
    if (inlet.captureEfficiency < 50) {
      messages.push({
        type: 'warning',
        entityId: inlet.id,
        code: 'LOW_EFFICIENCY',
        message: `Inlet capture efficiency (${inlet.captureEfficiency}%) is below recommended (50%)`,
      });
    }
  }
}

// ============================================================================
// Selectors
// ============================================================================

export const selectWaterEntities = (state: InfrastructureState) =>
  Array.from(state.infrastructureEntities.values()).filter(
    (e) => e.category === 'water'
  ) as WaterNetworkEntity[];

export const selectSewerEntities = (state: InfrastructureState) =>
  Array.from(state.infrastructureEntities.values()).filter(
    (e) => e.category === 'sewer'
  ) as SewerNetworkEntity[];

export const selectStormwaterEntities = (state: InfrastructureState) =>
  Array.from(state.infrastructureEntities.values()).filter(
    (e) => e.category === 'stormwater'
  ) as StormwaterNetworkEntity[];

export const selectValidationErrors = (state: InfrastructureState) =>
  state.validationMessages.filter((m) => m.type === 'error');

export const selectValidationWarnings = (state: InfrastructureState) =>
  state.validationMessages.filter((m) => m.type === 'warning');
