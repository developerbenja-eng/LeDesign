/**
 * WebGL Renderer for GPU-accelerated CAD entity rendering
 * Handles rendering of lines, polylines, circles, arcs, and points
 */

import type { LatLng } from '@/types/cad';

// Vertex shader - transforms lat/lng to clip space
const VERTEX_SHADER = `
  attribute vec2 a_position;
  attribute vec4 a_color;

  uniform mat4 u_matrix;

  varying vec4 v_color;

  void main() {
    gl_Position = u_matrix * vec4(a_position, 0.0, 1.0);
    gl_PointSize = 4.0;
    v_color = a_color;
  }
`;

// Fragment shader - outputs color
const FRAGMENT_SHADER = `
  precision mediump float;

  varying vec4 v_color;

  void main() {
    gl_FragColor = v_color;
  }
`;

export interface WebGLEntity {
  id: string;
  type: 'point' | 'line' | 'polyline' | 'circle' | 'arc';
  vertices: Float32Array;  // [lng, lat, lng, lat, ...]
  color: [number, number, number, number];  // RGBA normalized
  vertexCount: number;
}

export interface ViewportBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Parse CSS/hex color to RGBA array
 */
export function parseColor(color: string): [number, number, number, number] {
  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16) / 255;
      const g = parseInt(hex[1] + hex[1], 16) / 255;
      const b = parseInt(hex[2] + hex[2], 16) / 255;
      return [r, g, b, 1];
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      return [r, g, b, 1];
    }
  }

  // Handle rgb/rgba
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbMatch) {
    return [
      parseInt(rgbMatch[1]) / 255,
      parseInt(rgbMatch[2]) / 255,
      parseInt(rgbMatch[3]) / 255,
      rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1,
    ];
  }

  // Default to white
  return [1, 1, 1, 1];
}

/**
 * WebGL Renderer Class
 */
export class WebGLRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private positionBuffer: WebGLBuffer;
  private colorBuffer: WebGLBuffer;

  // Attribute locations
  private positionLocation: number;
  private colorLocation: number;
  private matrixLocation: WebGLUniformLocation;

  // Batched rendering data
  private positions: number[] = [];
  private colors: number[] = [];
  private drawCalls: Array<{ mode: number; first: number; count: number }> = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });

    if (!gl) {
      throw new Error('WebGL not supported');
    }

    this.gl = gl;

    // Create shaders
    const vertexShader = this.createShader(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);

    // Create program
    this.program = this.createProgram(vertexShader, fragmentShader);

    // Get attribute and uniform locations
    this.positionLocation = gl.getAttribLocation(this.program, 'a_position');
    this.colorLocation = gl.getAttribLocation(this.program, 'a_color');
    this.matrixLocation = gl.getUniformLocation(this.program, 'u_matrix')!;

    // Create buffers
    this.positionBuffer = gl.createBuffer()!;
    this.colorBuffer = gl.createBuffer()!;

    // Enable blending for alpha
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  private createShader(type: number, source: string): WebGLShader {
    const shader = this.gl.createShader(type)!;
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const info = this.gl.getShaderInfoLog(shader);
      this.gl.deleteShader(shader);
      throw new Error(`Shader compilation error: ${info}`);
    }

    return shader;
  }

  private createProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram {
    const program = this.gl.createProgram()!;
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      const info = this.gl.getProgramInfoLog(program);
      this.gl.deleteProgram(program);
      throw new Error(`Program linking error: ${info}`);
    }

    return program;
  }

  /**
   * Begin a new frame
   */
  beginFrame(): void {
    this.positions = [];
    this.colors = [];
    this.drawCalls = [];
  }

  /**
   * Add a point entity to the batch
   */
  addPoint(point: LatLng, color: [number, number, number, number]): void {
    const first = this.positions.length / 2;

    this.positions.push(point.lng, point.lat);
    this.colors.push(...color);

    this.drawCalls.push({
      mode: this.gl.POINTS,
      first,
      count: 1,
    });
  }

  /**
   * Add a line entity to the batch
   */
  addLine(start: LatLng, end: LatLng, color: [number, number, number, number]): void {
    const first = this.positions.length / 2;

    this.positions.push(start.lng, start.lat);
    this.positions.push(end.lng, end.lat);

    this.colors.push(...color, ...color);

    this.drawCalls.push({
      mode: this.gl.LINES,
      first,
      count: 2,
    });
  }

  /**
   * Add a polyline entity to the batch
   */
  addPolyline(points: LatLng[], color: [number, number, number, number]): void {
    if (points.length < 2) return;

    const first = this.positions.length / 2;

    for (const point of points) {
      this.positions.push(point.lng, point.lat);
      this.colors.push(...color);
    }

    this.drawCalls.push({
      mode: this.gl.LINE_STRIP,
      first,
      count: points.length,
    });
  }

  /**
   * Add a circle entity to the batch (rendered as polygon)
   */
  addCircle(
    center: LatLng,
    radiusMeters: number,
    color: [number, number, number, number],
    segments: number = 32
  ): void {
    const first = this.positions.length / 2;

    // Convert radius to lat/lng offset
    const latOffset = radiusMeters / 111320;
    const lngOffset = radiusMeters / (111320 * Math.cos(center.lat * Math.PI / 180));

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * 2 * Math.PI;
      this.positions.push(
        center.lng + lngOffset * Math.cos(angle),
        center.lat + latOffset * Math.sin(angle)
      );
      this.colors.push(...color);
    }

    this.drawCalls.push({
      mode: this.gl.LINE_STRIP,
      first,
      count: segments + 1,
    });
  }

  /**
   * Add an arc entity to the batch
   */
  addArc(
    center: LatLng,
    radiusMeters: number,
    startAngle: number,
    endAngle: number,
    color: [number, number, number, number],
    segments: number = 24
  ): void {
    const first = this.positions.length / 2;

    // Handle angle wrap-around
    let span = endAngle - startAngle;
    if (span < 0) span += 2 * Math.PI;

    // Convert radius to lat/lng offset
    const latOffset = radiusMeters / 111320;
    const lngOffset = radiusMeters / (111320 * Math.cos(center.lat * Math.PI / 180));

    const arcSegments = Math.max(4, Math.ceil(segments * (span / (2 * Math.PI))));

    for (let i = 0; i <= arcSegments; i++) {
      const angle = startAngle + (span * i) / arcSegments;
      this.positions.push(
        center.lng + lngOffset * Math.cos(angle),
        center.lat + latOffset * Math.sin(angle)
      );
      this.colors.push(...color);
    }

    this.drawCalls.push({
      mode: this.gl.LINE_STRIP,
      first,
      count: arcSegments + 1,
    });
  }

  /**
   * Render all batched entities
   */
  render(viewport: ViewportBounds): void {
    const gl = this.gl;

    // Resize canvas if needed
    const displayWidth = this.canvas.clientWidth;
    const displayHeight = this.canvas.clientHeight;

    if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
      this.canvas.width = displayWidth;
      this.canvas.height = displayHeight;
      gl.viewport(0, 0, displayWidth, displayHeight);
    }

    // Clear
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (this.drawCalls.length === 0) return;

    // Use program
    gl.useProgram(this.program);

    // Create transformation matrix (lat/lng to clip space)
    const matrix = this.createMatrix(viewport);
    gl.uniformMatrix4fv(this.matrixLocation, false, matrix);

    // Upload position data
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.positions), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(this.positionLocation);
    gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Upload color data
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.colors), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(this.colorLocation);
    gl.vertexAttribPointer(this.colorLocation, 4, gl.FLOAT, false, 0, 0);

    // Execute draw calls
    for (const call of this.drawCalls) {
      gl.drawArrays(call.mode, call.first, call.count);
    }
  }

  /**
   * Create orthographic projection matrix for lat/lng to clip space
   */
  private createMatrix(viewport: ViewportBounds): Float32Array {
    const { north, south, east, west } = viewport;

    // Orthographic projection
    const left = west;
    const right = east;
    const bottom = south;
    const top = north;

    const lr = 1 / (left - right);
    const bt = 1 / (bottom - top);

    return new Float32Array([
      -2 * lr, 0, 0, 0,
      0, -2 * bt, 0, 0,
      0, 0, 1, 0,
      (left + right) * lr, (top + bottom) * bt, 0, 1,
    ]);
  }

  /**
   * Dispose of WebGL resources
   */
  dispose(): void {
    const gl = this.gl;
    gl.deleteBuffer(this.positionBuffer);
    gl.deleteBuffer(this.colorBuffer);
    gl.deleteProgram(this.program);
  }

  /**
   * Check if WebGL is available
   */
  static isSupported(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch {
      return false;
    }
  }
}

/**
 * React hook for WebGL renderer
 */
export function createWebGLRenderer(canvas: HTMLCanvasElement): WebGLRenderer | null {
  if (!WebGLRenderer.isSupported()) {
    console.warn('WebGL not supported, falling back to Canvas 2D');
    return null;
  }

  try {
    return new WebGLRenderer(canvas);
  } catch (error) {
    console.error('Failed to create WebGL renderer:', error);
    return null;
  }
}
