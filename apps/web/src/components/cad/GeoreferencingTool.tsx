'use client';

import { useState, useCallback } from 'react';
import { useCADStore } from '@/stores/cad-store';
import { calculateGeoTransform, generateControlPointId } from '@/lib/geo-transform';
import type { Point2D, LatLng, GeoControlPoint } from '@/types/cad';

interface GeoreferencingToolProps {
  isActive: boolean;
  onToggle: () => void;
  onCadPointSelect?: (callback: (point: Point2D) => void) => void;
}

export default function GeoreferencingTool({
  isActive,
  onToggle,
  onCadPointSelect,
}: GeoreferencingToolProps) {
  const geoTransform = useCADStore((state) => state.geoTransform);
  const addControlPoint = useCADStore((state) => state.addControlPoint);
  const removeControlPoint = useCADStore((state) => state.removeControlPoint);
  const clearControlPoints = useCADStore((state) => state.clearControlPoints);
  const setGeoTransform = useCADStore((state) => state.setGeoTransform);

  const [pendingCadPoint, setPendingCadPoint] = useState<Point2D | null>(null);
  const [latInput, setLatInput] = useState('');
  const [lngInput, setLngInput] = useState('');
  const [isWaitingForClick, setIsWaitingForClick] = useState(false);

  const controlPoints = geoTransform?.controlPoints || [];

  // Handle CAD point selection
  const handleStartPointSelection = useCallback(() => {
    setIsWaitingForClick(true);
    if (onCadPointSelect) {
      onCadPointSelect((point: Point2D) => {
        setPendingCadPoint(point);
        setIsWaitingForClick(false);
      });
    }
  }, [onCadPointSelect]);

  // Add a control point
  const handleAddControlPoint = useCallback(() => {
    if (!pendingCadPoint) return;

    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);

    if (isNaN(lat) || isNaN(lng)) {
      alert('Please enter valid latitude and longitude values');
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      alert('Latitude must be between -90 and 90, longitude between -180 and 180');
      return;
    }

    const newPoint: GeoControlPoint = {
      id: generateControlPointId(),
      cadPoint: pendingCadPoint,
      geoPoint: { lat, lng },
    };

    addControlPoint(newPoint);

    // Recalculate transform if we have enough points
    const updatedPoints = [...controlPoints, newPoint];
    if (updatedPoints.length >= 2) {
      const newTransform = calculateGeoTransform(updatedPoints);
      setGeoTransform(newTransform);
    }

    // Reset inputs
    setPendingCadPoint(null);
    setLatInput('');
    setLngInput('');
  }, [pendingCadPoint, latInput, lngInput, controlPoints, addControlPoint, setGeoTransform]);

  // Remove a control point
  const handleRemoveControlPoint = useCallback(
    (id: string) => {
      removeControlPoint(id);

      // Recalculate transform
      const updatedPoints = controlPoints.filter((p) => p.id !== id);
      if (updatedPoints.length >= 2) {
        const newTransform = calculateGeoTransform(updatedPoints);
        setGeoTransform(newTransform);
      } else if (updatedPoints.length > 0) {
        setGeoTransform({
          controlPoints: updatedPoints,
          scale: 1,
          rotation: 0,
          origin: updatedPoints[0].geoPoint,
          cadOrigin: updatedPoints[0].cadPoint,
          isValid: false,
        });
      } else {
        setGeoTransform(null);
      }
    },
    [controlPoints, removeControlPoint, setGeoTransform]
  );

  // Clear all control points
  const handleClearAll = useCallback(() => {
    if (confirm('Remove all control points?')) {
      clearControlPoints();
      setGeoTransform(null);
    }
  }, [clearControlPoints, setGeoTransform]);

  // Paste coordinates from clipboard
  const handlePasteCoords = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      // Try to parse various formats: "lat, lng" or "lat lng" or Google Maps URL
      const googleMapsMatch = text.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (googleMapsMatch) {
        setLatInput(googleMapsMatch[1]);
        setLngInput(googleMapsMatch[2]);
        return;
      }

      const coordMatch = text.match(/(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/);
      if (coordMatch) {
        setLatInput(coordMatch[1]);
        setLngInput(coordMatch[2]);
      }
    } catch {
      // Clipboard access denied
    }
  }, []);

  if (!isActive) {
    return (
      <button
        onClick={onToggle}
        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
      >
        Georeference
      </button>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 w-80 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">Georeferencing</h3>
        <button
          onClick={onToggle}
          className="text-gray-400 hover:text-white text-xl leading-none"
        >
          &times;
        </button>
      </div>

      {/* Status */}
      <div className="mb-4 p-2 rounded bg-gray-700">
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              geoTransform?.isValid ? 'bg-green-500' : 'bg-yellow-500'
            }`}
          />
          <span className="text-sm text-gray-300">
            {geoTransform?.isValid
              ? `Valid (${controlPoints.length} points)`
              : `Need ${Math.max(0, 2 - controlPoints.length)} more points`}
          </span>
        </div>
        {geoTransform?.isValid && (
          <div className="text-xs text-gray-400 mt-1">
            Scale: {geoTransform.scale.toFixed(4)} m/unit
          </div>
        )}
      </div>

      {/* Add new point */}
      <div className="mb-4 border border-gray-600 rounded p-3">
        <div className="text-sm text-gray-300 mb-2">Add Control Point</div>

        {/* Step 1: Select CAD point */}
        <div className="mb-3">
          <div className="text-xs text-gray-400 mb-1">1. CAD Point</div>
          {pendingCadPoint ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-green-400 font-mono">
                ({pendingCadPoint.x.toFixed(2)}, {pendingCadPoint.y.toFixed(2)})
              </span>
              <button
                onClick={() => setPendingCadPoint(null)}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Clear
              </button>
            </div>
          ) : (
            <button
              onClick={handleStartPointSelection}
              disabled={isWaitingForClick}
              className={`w-full py-1.5 text-sm rounded transition-colors ${
                isWaitingForClick
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-600 hover:bg-gray-500 text-white'
              }`}
            >
              {isWaitingForClick ? 'Click on drawing...' : 'Select Point'}
            </button>
          )}
        </div>

        {/* Step 2: Enter geo coordinates */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">2. Geographic Coords</span>
            <button
              onClick={handlePasteCoords}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              Paste
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Latitude"
              value={latInput}
              onChange={(e) => setLatInput(e.target.value)}
              className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-500"
            />
            <input
              type="text"
              placeholder="Longitude"
              value={lngInput}
              onChange={(e) => setLngInput(e.target.value)}
              className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-500"
            />
          </div>
        </div>

        {/* Add button */}
        <button
          onClick={handleAddControlPoint}
          disabled={!pendingCadPoint || !latInput || !lngInput}
          className="w-full py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
        >
          Add Control Point
        </button>
      </div>

      {/* Control points list */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-300">Control Points</span>
          {controlPoints.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Clear All
            </button>
          )}
        </div>

        {controlPoints.length === 0 ? (
          <div className="text-xs text-gray-500 text-center py-2">
            No control points added
          </div>
        ) : (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {controlPoints.map((cp, index) => (
              <div
                key={cp.id}
                className="flex items-center justify-between bg-gray-700 rounded p-2"
              >
                <div className="text-xs">
                  <div className="text-gray-300">Point {index + 1}</div>
                  <div className="text-gray-500 font-mono">
                    CAD: ({cp.cadPoint.x.toFixed(1)}, {cp.cadPoint.y.toFixed(1)})
                  </div>
                  <div className="text-gray-500 font-mono">
                    Geo: ({cp.geoPoint.lat.toFixed(6)}, {cp.geoPoint.lng.toFixed(6)})
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveControlPoint(cp.id)}
                  className="text-red-400 hover:text-red-300 text-lg leading-none px-2"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 text-xs text-gray-500">
        <p>
          Tip: Copy coordinates from Google Maps (right-click on map) and paste
          here.
        </p>
      </div>
    </div>
  );
}
