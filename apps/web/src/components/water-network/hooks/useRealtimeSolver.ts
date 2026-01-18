'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useWaterNetworkStore, useNetwork } from '@/stores/water-network/waterNetworkStore';
import type { SolverResults, SolverStatus, NodeResult, LinkResult } from '@/stores/water-network/types';

/**
 * Hook that runs the hydraulic solver in real-time when the network changes.
 * Uses debouncing to avoid excessive calculations during rapid edits.
 */
export function useRealtimeSolver(debounceMs: number = 300) {
  const network = useNetwork();
  const autoSolve = useWaterNetworkStore((s) => s.autoSolve);
  const setSolverResults = useWaterNetworkStore((s) => s.setSolverResults);
  const setAISuggestions = useWaterNetworkStore((s) => s.setAISuggestions);
  const aiEnabled = useWaterNetworkStore((s) => s.aiEnabled);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const solveCountRef = useRef(0);

  const runSolver = useCallback(async () => {
    // Check if we have enough elements to solve
    const hasJunctions = network.junctions.length > 0;
    const hasSources = network.reservoirs.length > 0 || network.tanks.length > 0;
    const hasPipes = network.pipes.length > 0;

    if (!hasJunctions || !hasSources || !hasPipes) {
      // Not enough elements to solve
      setSolverResults(null);
      return;
    }

    // Set status to running
    setSolverResults({
      status: 'running',
      converged: false,
      iterations: 0,
      maxHeadError: 0,
      maxFlowError: 0,
      totalDemand: 0,
      totalSupply: 0,
      nodeResults: new Map(),
      linkResults: new Map(),
      solveTime: 0,
      warnings: [],
      errors: [],
    });

    const startTime = performance.now();
    solveCountRef.current++;
    const currentSolve = solveCountRef.current;

    try {
      // Dynamic import to avoid SSR issues
      const { solveNetwork } = await import('@ledesign/hydraulics');

      // Run the solver
      const result = solveNetwork(network);
      const solveTime = Math.round(performance.now() - startTime);

      // Check if this solve is still relevant (no newer solve started)
      if (currentSolve !== solveCountRef.current) {
        return;
      }

      // Convert results to our format
      const nodeResults = new Map<string, NodeResult>();
      result.nodeResults.forEach((res, id) => {
        nodeResults.set(id, {
          id,
          head: res.head,
          pressure: res.pressure,
          demand: res.demand,
          quality: res.quality,
        });
      });

      const linkResults = new Map<string, LinkResult>();
      result.linkResults.forEach((res, id) => {
        linkResults.set(id, {
          id,
          flow: res.flow,
          velocity: res.velocity,
          headLoss: res.headLoss,
          status: res.status,
        });
      });

      // Determine status
      let status: SolverStatus = result.converged ? 'converged' : 'failed';
      if (result.converged && result.warnings.length > 0) {
        status = 'warning';
      }

      const solverResults: SolverResults = {
        status,
        converged: result.converged,
        iterations: result.iterations,
        maxHeadError: result.maxHeadError,
        maxFlowError: result.maxFlowError,
        totalDemand: result.totalDemand,
        totalSupply: result.totalSupply,
        nodeResults,
        linkResults,
        solveTime,
        warnings: result.warnings,
        errors: result.converged ? [] : ['El solver no convergió'],
      };

      setSolverResults(solverResults);

      // Generate AI suggestions if enabled
      if (aiEnabled && result.converged) {
        const suggestions = generateAISuggestions(solverResults, network);
        setAISuggestions(suggestions);
      }

    } catch (error) {
      console.error('Solver error:', error);

      // Check if this solve is still relevant
      if (currentSolve !== solveCountRef.current) {
        return;
      }

      const solveTime = Math.round(performance.now() - startTime);

      setSolverResults({
        status: 'failed',
        converged: false,
        iterations: 0,
        maxHeadError: 0,
        maxFlowError: 0,
        totalDemand: 0,
        totalSupply: 0,
        nodeResults: new Map(),
        linkResults: new Map(),
        solveTime,
        warnings: [],
        errors: [error instanceof Error ? error.message : 'Error desconocido'],
      });
    }
  }, [network, setSolverResults, setAISuggestions, aiEnabled]);

  // Effect to run solver when network changes
  useEffect(() => {
    if (!autoSolve) {
      return;
    }

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Schedule new solve
    debounceRef.current = setTimeout(() => {
      runSolver();
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [network, autoSolve, runSolver, debounceMs]);

  // Return manual trigger function
  return { triggerSolve: runSolver };
}

// AI suggestion generator
import type { AISuggestion } from '@/stores/water-network/types';
import type { WaterNetwork } from '@ledesign/hydraulics';

function generateAISuggestions(
  results: SolverResults,
  network: WaterNetwork
): AISuggestion[] {
  const suggestions: AISuggestion[] = [];
  let suggestionId = 0;

  // Check for low pressure at junctions (< 10 m per NCh 691)
  results.nodeResults.forEach((result, nodeId) => {
    if (result.pressure < 10) {
      suggestions.push({
        id: `suggestion-${suggestionId++}`,
        type: 'pressure',
        severity: result.pressure < 5 ? 'error' : 'warning',
        elementId: nodeId,
        message: `Presión baja en nodo ${nodeId}: ${result.pressure.toFixed(1)} m`,
        recommendation: result.pressure < 5
          ? 'Considere agregar una bomba o aumentar la altura del estanque de alimentación.'
          : 'Verifique la elevación del nodo y las pérdidas en tuberías conectadas.',
        autoFixAvailable: false,
      });
    }

    // Check for high pressure (> 70 m can cause issues)
    if (result.pressure > 70) {
      suggestions.push({
        id: `suggestion-${suggestionId++}`,
        type: 'pressure',
        severity: 'warning',
        elementId: nodeId,
        message: `Presión alta en nodo ${nodeId}: ${result.pressure.toFixed(1)} m`,
        recommendation: 'Considere instalar una válvula reductora de presión (PRV).',
        autoFixAvailable: false,
      });
    }
  });

  // Check for high velocity in pipes (> 3 m/s per NCh 691)
  results.linkResults.forEach((result, linkId) => {
    const velocity = Math.abs(result.velocity);

    if (velocity > 3) {
      const pipe = network.pipes.find((p) => p.id === linkId);
      suggestions.push({
        id: `suggestion-${suggestionId++}`,
        type: 'velocity',
        severity: velocity > 4 ? 'error' : 'warning',
        elementId: linkId,
        message: `Velocidad alta en tubería ${linkId}: ${velocity.toFixed(2)} m/s`,
        recommendation: pipe
          ? `Considere aumentar el diámetro de ${pipe.diameter} mm a ${getNextDiameter(pipe.diameter)} mm.`
          : 'Considere aumentar el diámetro de la tubería.',
        autoFixAvailable: true,
      });
    }

    // Check for low velocity (< 0.3 m/s can cause sediment)
    if (velocity > 0 && velocity < 0.3) {
      suggestions.push({
        id: `suggestion-${suggestionId++}`,
        type: 'velocity',
        severity: 'info',
        elementId: linkId,
        message: `Velocidad baja en tubería ${linkId}: ${velocity.toFixed(2)} m/s`,
        recommendation: 'Velocidad baja puede causar sedimentación. Considere reducir el diámetro o agregar puntos de descarga.',
        autoFixAvailable: false,
      });
    }
  });

  // Check for disconnected nodes
  const connectedNodes = new Set<string>();
  [...network.pipes, ...network.pumps, ...network.valves].forEach((link) => {
    connectedNodes.add(link.startNode);
    connectedNodes.add(link.endNode);
  });

  // Get all nodes
  const allNodes = [...network.junctions, ...network.tanks, ...network.reservoirs];
  allNodes.forEach((node) => {
    if (!connectedNodes.has(node.id)) {
      suggestions.push({
        id: `suggestion-${suggestionId++}`,
        type: 'layout',
        severity: 'error',
        elementId: node.id,
        message: `Nodo ${node.id} desconectado`,
        recommendation: 'Conecte este nodo a la red mediante una tubería.',
        autoFixAvailable: false,
      });
    }
  });

  // Check for zero demand at junctions
  const junctionsWithDemand = network.junctions.filter((j) => j.baseDemand > 0);
  if (junctionsWithDemand.length === 0 && network.junctions.length > 0) {
    suggestions.push({
      id: `suggestion-${suggestionId++}`,
      type: 'demand',
      severity: 'info',
      message: 'Sin demanda en la red',
      recommendation: 'Asigne demandas a los nodos o dibuje zonas de demanda para distribuir automáticamente.',
      autoFixAvailable: false,
    });
  }

  return suggestions;
}

// Standard pipe diameters in Chile (mm)
const STANDARD_DIAMETERS = [50, 63, 75, 90, 110, 125, 160, 200, 250, 315, 355, 400, 450, 500, 630];

function getNextDiameter(current: number): number {
  const currentIndex = STANDARD_DIAMETERS.findIndex((d) => d >= current);
  if (currentIndex < 0 || currentIndex >= STANDARD_DIAMETERS.length - 1) {
    return current + 50; // Fallback
  }
  return STANDARD_DIAMETERS[currentIndex + 1];
}
