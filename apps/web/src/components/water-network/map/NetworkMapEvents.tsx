'use client';

import { useMapEvents, useMap } from 'react-leaflet';
import { useCallback, useEffect } from 'react';
import {
  useWaterNetworkStore,
  useDrawingState,
  useNetworkActions,
  useDrawingActions,
  useSelectionActions,
  useMapActions,
} from '@/stores/water-network/waterNetworkStore';

// Convert lat/lng to simple x/y coordinates (in meters from origin)
// Using a simple approximation for local projects
function latLngToXY(lat: number, lng: number, originLat: number, originLng: number) {
  const metersPerDegreeLat = 111320; // Approximate
  const metersPerDegreeLng = 111320 * Math.cos((originLat * Math.PI) / 180);

  return {
    x: (lng - originLng) * metersPerDegreeLng,
    y: (lat - originLat) * metersPerDegreeLat,
  };
}

// Find the nearest node to a given position
function findNearestNode(
  x: number,
  y: number,
  junctions: Array<{ id: string; x: number; y: number }>,
  tanks: Array<{ id: string; x: number; y: number }>,
  reservoirs: Array<{ id: string; x: number; y: number }>,
  tolerance: number
): { id: string; distance: number } | null {
  let nearest: { id: string; distance: number } | null = null;

  const allNodes = [...junctions, ...tanks, ...reservoirs];

  for (const node of allNodes) {
    const dx = node.x - x;
    const dy = node.y - y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= tolerance && (!nearest || distance < nearest.distance)) {
      nearest = { id: node.id, distance };
    }
  }

  return nearest;
}

// Calculate distance between two points
function calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export function NetworkMapEvents() {
  const map = useMap();
  const drawingState = useDrawingState();
  const { addJunction, addTank, addReservoir, addPipe } = useNetworkActions();
  const { setIsDrawing, setDrawingStartNode, setGhostPipe, setActiveTool } = useDrawingActions();
  const { clearSelection, selectNode, selectLink } = useSelectionActions();
  const { setMapCenter, setMapZoom } = useMapActions();

  const junctions = useWaterNetworkStore((s) => s.network.junctions);
  const tanks = useWaterNetworkStore((s) => s.network.tanks);
  const reservoirs = useWaterNetworkStore((s) => s.network.reservoirs);

  // Use the map center as origin for coordinate conversion
  const mapCenter = useWaterNetworkStore((s) => s.map.center);

  // Convert click position to network coordinates
  const getNetworkCoords = useCallback((lat: number, lng: number) => {
    return latLngToXY(lat, lng, mapCenter[0], mapCenter[1]);
  }, [mapCenter]);

  // Find snap point if snap is enabled
  const getSnappedCoords = useCallback((x: number, y: number) => {
    if (!drawingState.snapEnabled || !drawingState.snapToNodes) {
      return { x, y, snappedToNode: null };
    }

    const nearest = findNearestNode(
      x, y,
      junctions, tanks, reservoirs,
      drawingState.snapTolerance * 5 // Convert tolerance to meters
    );

    if (nearest) {
      const node = [...junctions, ...tanks, ...reservoirs].find((n) => n.id === nearest.id);
      if (node) {
        return { x: node.x, y: node.y, snappedToNode: node.id };
      }
    }

    return { x, y, snappedToNode: null };
  }, [drawingState, junctions, tanks, reservoirs]);

  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      const coords = getNetworkCoords(lat, lng);
      const snapped = getSnappedCoords(coords.x, coords.y);

      switch (drawingState.activeTool) {
        case 'select':
          // Clear selection on empty click (handled by overlays for element clicks)
          clearSelection();
          break;

        case 'junction':
          // Add a new junction at click location
          addJunction({
            x: snapped.x,
            y: snapped.y,
            elevation: 0, // TODO: Get from DEM
            baseDemand: 0,
          });
          break;

        case 'tank':
          // Add a new tank at click location
          addTank({
            x: snapped.x,
            y: snapped.y,
            elevation: 0,
            diameter: 10,
            initLevel: 3,
            minLevel: 0,
            maxLevel: 5,
          });
          break;

        case 'reservoir':
          // Add a new reservoir at click location
          addReservoir({
            x: snapped.x,
            y: snapped.y,
            elevation: 0,
            totalHead: 100, // Default head
          });
          break;

        case 'pipe':
          // Handle pipe drawing
          if (!drawingState.isDrawing) {
            // Start drawing - need to click on an existing node or create one
            if (snapped.snappedToNode) {
              // Start from existing node
              setDrawingStartNode(snapped.snappedToNode);
              setIsDrawing(true);
              setGhostPipe({
                startLat: lat,
                startLng: lng,
                endLat: lat,
                endLng: lng,
              });
            } else {
              // Create a new junction and start from it
              const newId = addJunction({
                x: snapped.x,
                y: snapped.y,
                elevation: 0,
                baseDemand: 0,
              });
              setDrawingStartNode(newId);
              setIsDrawing(true);
              setGhostPipe({
                startLat: lat,
                startLng: lng,
                endLat: lat,
                endLng: lng,
              });
            }
          } else {
            // Finish drawing - connect to existing node or create new one
            let endNodeId: string;

            if (snapped.snappedToNode) {
              endNodeId = snapped.snappedToNode;
            } else {
              // Create a new junction at the end point
              endNodeId = addJunction({
                x: snapped.x,
                y: snapped.y,
                elevation: 0,
                baseDemand: 0,
              });
            }

            // Get start node coordinates
            const startNode = [...junctions, ...tanks, ...reservoirs].find(
              (n) => n.id === drawingState.drawingStartNode
            );

            if (startNode && drawingState.drawingStartNode !== endNodeId) {
              // Calculate pipe length
              const length = calculateDistance(startNode.x, startNode.y, snapped.x, snapped.y);

              // Create the pipe
              addPipe({
                startNode: drawingState.drawingStartNode!,
                endNode: endNodeId,
                length: Math.max(1, length), // Minimum 1m
                diameter: 100, // Default 100mm
                material: 'pvc',
                roughness: 140,
                status: 'open',
              });
            }

            // Reset drawing state but continue from the end node
            setDrawingStartNode(endNodeId);
            setGhostPipe({
              startLat: lat,
              startLng: lng,
              endLat: lat,
              endLng: lng,
            });
          }
          break;
      }
    },

    mousemove: (e) => {
      // Update ghost pipe preview during pipe drawing
      if (drawingState.activeTool === 'pipe' && drawingState.isDrawing && drawingState.ghostPipe) {
        setGhostPipe({
          ...drawingState.ghostPipe,
          endLat: e.latlng.lat,
          endLng: e.latlng.lng,
        });
      }
    },

    contextmenu: (e) => {
      // Right-click to cancel drawing
      if (drawingState.isDrawing) {
        e.originalEvent.preventDefault();
        setIsDrawing(false);
        setDrawingStartNode(null);
        setGhostPipe(null);
      }
    },

    moveend: () => {
      const center = map.getCenter();
      setMapCenter([center.lat, center.lng]);
      setMapZoom(map.getZoom());
    },
  });

  // Cancel drawing on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drawingState.isDrawing) {
        setIsDrawing(false);
        setDrawingStartNode(null);
        setGhostPipe(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawingState.isDrawing, setIsDrawing, setDrawingStartNode, setGhostPipe]);

  return null;
}
