/**
 * R-tree Spatial Index for O(log n) viewport queries
 * Implements a simple but efficient R-tree for 2D bounding boxes
 */

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface SpatialItem<T = unknown> {
  id: string;
  bounds: BoundingBox;
  data: T;
}

interface RTreeNode<T> {
  bounds: BoundingBox;
  children: RTreeNode<T>[];
  items: SpatialItem<T>[];
  isLeaf: boolean;
}

const MAX_ENTRIES = 16; // Maximum entries per node before split
const MIN_ENTRIES = 4;  // Minimum entries after split

/**
 * R-tree spatial index for fast viewport culling
 */
export class SpatialIndex<T = unknown> {
  private root: RTreeNode<T>;
  private itemCount = 0;

  constructor() {
    this.root = this.createNode(true);
  }

  private createNode(isLeaf: boolean): RTreeNode<T> {
    return {
      bounds: { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
      children: [],
      items: [],
      isLeaf,
    };
  }

  /**
   * Insert an item into the index
   */
  insert(item: SpatialItem<T>): void {
    this.insertItem(this.root, item);
    this.itemCount++;
  }

  private insertItem(node: RTreeNode<T>, item: SpatialItem<T>): void {
    // Expand node bounds to include item
    this.expandBounds(node.bounds, item.bounds);

    if (node.isLeaf) {
      node.items.push(item);

      // Split if overflow
      if (node.items.length > MAX_ENTRIES) {
        this.splitLeaf(node);
      }
    } else {
      // Find best child (one that needs least expansion)
      const child = this.chooseChild(node, item.bounds);
      this.insertItem(child, item);

      // Split if overflow
      if (node.children.length > MAX_ENTRIES) {
        this.splitInternal(node);
      }
    }
  }

  private expandBounds(target: BoundingBox, source: BoundingBox): void {
    target.minX = Math.min(target.minX, source.minX);
    target.minY = Math.min(target.minY, source.minY);
    target.maxX = Math.max(target.maxX, source.maxX);
    target.maxY = Math.max(target.maxY, source.maxY);
  }

  private chooseChild(node: RTreeNode<T>, bounds: BoundingBox): RTreeNode<T> {
    let bestChild = node.children[0];
    let bestExpansion = Infinity;

    for (const child of node.children) {
      const expansion = this.calculateExpansion(child.bounds, bounds);
      if (expansion < bestExpansion) {
        bestExpansion = expansion;
        bestChild = child;
      }
    }

    return bestChild;
  }

  private calculateExpansion(existing: BoundingBox, incoming: BoundingBox): number {
    const expandedMinX = Math.min(existing.minX, incoming.minX);
    const expandedMinY = Math.min(existing.minY, incoming.minY);
    const expandedMaxX = Math.max(existing.maxX, incoming.maxX);
    const expandedMaxY = Math.max(existing.maxY, incoming.maxY);

    const expandedArea = (expandedMaxX - expandedMinX) * (expandedMaxY - expandedMinY);
    const existingArea = (existing.maxX - existing.minX) * (existing.maxY - existing.minY);

    return expandedArea - existingArea;
  }

  private splitLeaf(node: RTreeNode<T>): void {
    // Convert leaf to internal node
    const items = node.items;
    node.items = [];
    node.isLeaf = false;

    // Create two new leaf children using linear split
    const [group1, group2] = this.linearSplitItems(items);

    const child1 = this.createNode(true);
    const child2 = this.createNode(true);

    for (const item of group1) {
      child1.items.push(item);
      this.expandBounds(child1.bounds, item.bounds);
    }

    for (const item of group2) {
      child2.items.push(item);
      this.expandBounds(child2.bounds, item.bounds);
    }

    node.children = [child1, child2];
  }

  private splitInternal(node: RTreeNode<T>): void {
    const children = node.children;
    const [group1, group2] = this.linearSplitNodes(children);

    const child1 = this.createNode(false);
    const child2 = this.createNode(false);

    for (const child of group1) {
      child1.children.push(child);
      this.expandBounds(child1.bounds, child.bounds);
    }

    for (const child of group2) {
      child2.children.push(child);
      this.expandBounds(child2.bounds, child.bounds);
    }

    node.children = [child1, child2];
  }

  private linearSplitItems(items: SpatialItem<T>[]): [SpatialItem<T>[], SpatialItem<T>[]] {
    // Simple split: sort by X and divide in half
    items.sort((a, b) => (a.bounds.minX + a.bounds.maxX) / 2 - (b.bounds.minX + b.bounds.maxX) / 2);
    const mid = Math.floor(items.length / 2);
    return [items.slice(0, mid), items.slice(mid)];
  }

  private linearSplitNodes(nodes: RTreeNode<T>[]): [RTreeNode<T>[], RTreeNode<T>[]] {
    // Simple split: sort by X and divide in half
    nodes.sort((a, b) => (a.bounds.minX + a.bounds.maxX) / 2 - (b.bounds.minX + b.bounds.maxX) / 2);
    const mid = Math.floor(nodes.length / 2);
    return [nodes.slice(0, mid), nodes.slice(mid)];
  }

  /**
   * Query all items that intersect the given viewport
   */
  query(viewport: BoundingBox): SpatialItem<T>[] {
    const results: SpatialItem<T>[] = [];
    this.queryNode(this.root, viewport, results);
    return results;
  }

  private queryNode(node: RTreeNode<T>, viewport: BoundingBox, results: SpatialItem<T>[]): void {
    // Quick reject if node doesn't intersect viewport
    if (!this.intersects(node.bounds, viewport)) {
      return;
    }

    if (node.isLeaf) {
      // Check each item in leaf
      for (const item of node.items) {
        if (this.intersects(item.bounds, viewport)) {
          results.push(item);
        }
      }
    } else {
      // Recurse into children
      for (const child of node.children) {
        this.queryNode(child, viewport, results);
      }
    }
  }

  private intersects(a: BoundingBox, b: BoundingBox): boolean {
    return !(
      a.maxX < b.minX ||
      a.minX > b.maxX ||
      a.maxY < b.minY ||
      a.minY > b.maxY
    );
  }

  /**
   * Bulk load items (more efficient than individual inserts)
   */
  bulkLoad(items: SpatialItem<T>[]): void {
    if (items.length === 0) return;

    // Sort items by Hilbert curve for better spatial locality
    const sortedItems = this.sortByHilbert(items);

    // Build tree bottom-up
    this.root = this.buildBulkTree(sortedItems);
    this.itemCount = items.length;
  }

  private sortByHilbert(items: SpatialItem<T>[]): SpatialItem<T>[] {
    // Calculate overall bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const item of items) {
      minX = Math.min(minX, item.bounds.minX);
      minY = Math.min(minY, item.bounds.minY);
      maxX = Math.max(maxX, item.bounds.maxX);
      maxY = Math.max(maxY, item.bounds.maxY);
    }

    const width = maxX - minX || 1;
    const height = maxY - minY || 1;

    // Sort by Hilbert curve index
    return [...items].sort((a, b) => {
      const ax = Math.floor(((a.bounds.minX + a.bounds.maxX) / 2 - minX) / width * 65535);
      const ay = Math.floor(((a.bounds.minY + a.bounds.maxY) / 2 - minY) / height * 65535);
      const bx = Math.floor(((b.bounds.minX + b.bounds.maxX) / 2 - minX) / width * 65535);
      const by = Math.floor(((b.bounds.minY + b.bounds.maxY) / 2 - minY) / height * 65535);

      return this.hilbert(ax, ay) - this.hilbert(bx, by);
    });
  }

  // Simple Hilbert curve implementation
  private hilbert(x: number, y: number): number {
    let d = 0;
    let s = 32768;

    while (s > 0) {
      const rx = (x & s) > 0 ? 1 : 0;
      const ry = (y & s) > 0 ? 1 : 0;
      d += s * s * ((3 * rx) ^ ry);

      // Rotate
      if (ry === 0) {
        if (rx === 1) {
          x = s - 1 - x;
          y = s - 1 - y;
        }
        [x, y] = [y, x];
      }

      s = Math.floor(s / 2);
    }

    return d;
  }

  private buildBulkTree(items: SpatialItem<T>[]): RTreeNode<T> {
    if (items.length <= MAX_ENTRIES) {
      const node = this.createNode(true);
      node.items = items;
      for (const item of items) {
        this.expandBounds(node.bounds, item.bounds);
      }
      return node;
    }

    // Build leaf nodes
    const leafNodes: RTreeNode<T>[] = [];
    for (let i = 0; i < items.length; i += MAX_ENTRIES) {
      const chunk = items.slice(i, i + MAX_ENTRIES);
      const leaf = this.createNode(true);
      leaf.items = chunk;
      for (const item of chunk) {
        this.expandBounds(leaf.bounds, item.bounds);
      }
      leafNodes.push(leaf);
    }

    // Build internal nodes recursively
    return this.buildInternalNodes(leafNodes);
  }

  private buildInternalNodes(nodes: RTreeNode<T>[]): RTreeNode<T> {
    if (nodes.length === 1) {
      return nodes[0];
    }

    const parents: RTreeNode<T>[] = [];
    for (let i = 0; i < nodes.length; i += MAX_ENTRIES) {
      const chunk = nodes.slice(i, i + MAX_ENTRIES);
      const parent = this.createNode(false);
      parent.children = chunk;
      for (const child of chunk) {
        this.expandBounds(parent.bounds, child.bounds);
      }
      parents.push(parent);
    }

    return this.buildInternalNodes(parents);
  }

  /**
   * Clear the index
   */
  clear(): void {
    this.root = this.createNode(true);
    this.itemCount = 0;
  }

  /**
   * Get total number of items
   */
  get size(): number {
    return this.itemCount;
  }

  /**
   * Get all items in the index
   */
  all(): SpatialItem<T>[] {
    const results: SpatialItem<T>[] = [];
    this.collectAll(this.root, results);
    return results;
  }

  private collectAll(node: RTreeNode<T>, results: SpatialItem<T>[]): void {
    if (node.isLeaf) {
      results.push(...node.items);
    } else {
      for (const child of node.children) {
        this.collectAll(child, results);
      }
    }
  }
}

/**
 * Create a spatial index from CAD entities
 */
export function createEntitySpatialIndex<T extends {
  id: string;
  bounds?: { minLat: number; maxLat: number; minLng: number; maxLng: number };
}>(entities: T[]): SpatialIndex<T> {
  const index = new SpatialIndex<T>();

  const items: SpatialItem<T>[] = entities
    .filter((e) => e.bounds)
    .map((entity) => ({
      id: entity.id,
      bounds: {
        minX: entity.bounds!.minLng,
        minY: entity.bounds!.minLat,
        maxX: entity.bounds!.maxLng,
        maxY: entity.bounds!.maxLat,
      },
      data: entity,
    }));

  index.bulkLoad(items);
  return index;
}

/**
 * Query entities visible in a Leaflet bounds
 */
export function queryViewport<T>(
  index: SpatialIndex<T>,
  bounds: { _southWest: { lat: number; lng: number }; _northEast: { lat: number; lng: number } }
): T[] {
  const viewport: BoundingBox = {
    minX: bounds._southWest.lng,
    minY: bounds._southWest.lat,
    maxX: bounds._northEast.lng,
    maxY: bounds._northEast.lat,
  };

  return index.query(viewport).map((item) => item.data);
}
