'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import type { GeoTransform } from '@/types/cad';
import type {
  TransformRequest,
  TransformResponse,
  SerializedEntity,
  TransformedEntityData,
} from '@/lib/workers/geo-transform.worker';

interface UseGeoTransformWorkerResult {
  transformEntities: (
    entities: SerializedEntity[],
    geoTransform: GeoTransform
  ) => Promise<TransformedEntityData[]>;
  isProcessing: boolean;
  lastTiming: number | null;
  error: Error | null;
}

/**
 * Hook for using the geo-transform Web Worker
 * Offloads coordinate transformations to a background thread
 */
export function useGeoTransformWorker(): UseGeoTransformWorkerResult {
  const workerRef = useRef<Worker | null>(null);
  const pendingRequestsRef = useRef<Map<string, {
    resolve: (data: TransformedEntityData[]) => void;
    reject: (error: Error) => void;
  }>>(new Map());

  const [isProcessing, setIsProcessing] = useState(false);
  const [lastTiming, setLastTiming] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Initialize worker
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      workerRef.current = new Worker(
        new URL('../workers/geo-transform.worker.ts', import.meta.url),
        { type: 'module' }
      );

      workerRef.current.onmessage = (event: MessageEvent<TransformResponse>) => {
        const response = event.data;

        if (response.type === 'transform-result') {
          const pending = pendingRequestsRef.current.get(response.id);
          if (pending) {
            pending.resolve(response.transformedEntities);
            pendingRequestsRef.current.delete(response.id);
            setLastTiming(response.timing);
            setIsProcessing(pendingRequestsRef.current.size > 0);
          }
        }
      };

      workerRef.current.onerror = (event) => {
        const err = new Error(`Worker error: ${event.message}`);
        setError(err);

        // Reject all pending requests
        pendingRequestsRef.current.forEach(({ reject }) => reject(err));
        pendingRequestsRef.current.clear();
        setIsProcessing(false);
      };
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create worker'));
    }

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const transformEntities = useCallback(
    (entities: SerializedEntity[], geoTransform: GeoTransform): Promise<TransformedEntityData[]> => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current) {
          reject(new Error('Worker not initialized'));
          return;
        }

        const requestId = `transform-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        pendingRequestsRef.current.set(requestId, { resolve, reject });
        setIsProcessing(true);
        setError(null);

        const request: TransformRequest = {
          type: 'transform',
          id: requestId,
          entities,
          geoTransform,
        };

        workerRef.current.postMessage(request);
      });
    },
    []
  );

  return {
    transformEntities,
    isProcessing,
    lastTiming,
    error,
  };
}

/**
 * Serialize CAD entities for worker transfer
 */
export function serializeEntities(entities: Array<{
  id: string;
  type: string;
  color: string;
  layer: { visible: boolean };
  points?: Array<{ x: number; y: number }>;
  center?: { x: number; y: number };
  radius?: number;
  startAngle?: number;
  endAngle?: number;
  text?: string;
}>): SerializedEntity[] {
  return entities.map((entity) => ({
    id: entity.id,
    entityType: entity.type,
    color: entity.color,
    layerVisible: entity.layer.visible,
    points: entity.points,
    center: entity.center,
    radius: entity.radius,
    startAngle: entity.startAngle,
    endAngle: entity.endAngle,
    text: entity.text,
  }));
}
