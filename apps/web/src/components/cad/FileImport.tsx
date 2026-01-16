'use client';

import { useRef, useState } from 'react';
import { useCADStore } from '@/stores/cad-store';
import { parseLandXML, generateSampleLandXML } from '@/lib/landxml-parser';

// DWGParseResult type defined inline to avoid importing from dwg-parser at module level
// (importing causes webpack to bundle the WASM library which fails in SSR)
interface DWGParseResult {
  entities: import('@/types/cad').AnyCADEntity[];
  layers: import('@/types/cad').CADLayer[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  stats: {
    totalEntities: number;
    byType: Record<string, number>;
    byLayer: Record<string, number>;
    blockCount?: number;
  };
}

interface FileImportProps {
  className?: string;
}

export default function FileImport({ className = '' }: FileImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { addSurface, surfaces, addEntity, entities } = useCADStore();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.dwg')) {
        // DWG import temporarily disabled due to libredwg-web webpack compatibility issues
        // The library contains a 25MB inline WASM that causes webpack stack overflow
        // Standard details are already parsed and available in the database
        setError('DWG import is temporarily unavailable. Use the "Detalles MINVU" panel to insert standard details from the MINVU library.');
      } else if (fileName.endsWith('.xml') || fileName.endsWith('.landxml')) {
        const content = await file.text();
        const result = parseLandXML(content);

        if (result.surfaces.length === 0) {
          setError('No surfaces found in the LandXML file');
          return;
        }

        result.surfaces.forEach((surface) => {
          addSurface(surface);
        });

        setSuccessMessage(
          `Loaded ${result.surfaces.length} surface(s) with ${result.surfaces.reduce(
            (acc, s) => acc + s.points.size,
            0
          )} points`
        );
      } else if (fileName.endsWith('.dxf')) {
        // TODO: Implement DXF parsing
        setError('DXF import coming soon! For now, use DWG or LandXML files.');
      } else {
        setError('Unsupported file format. Please use DWG, LandXML (.xml), or DXF files.');
      }
    } catch (err) {
      console.error('File import error:', err);
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleLoadSample = () => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const sampleXML = generateSampleLandXML();
      const result = parseLandXML(sampleXML);

      result.surfaces.forEach((surface) => {
        addSurface(surface);
      });

      setSuccessMessage(
        `Loaded sample terrain with ${result.surfaces[0].points.size} points and ${result.surfaces[0].faces.length} triangles`
      );
    } catch (err) {
      console.error('Sample load error:', err);
      setError('Failed to load sample terrain');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`bg-cad-panel border-b border-cad-accent p-3 ${className}`}>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xml,.landxml,.dxf,.dwg"
            onChange={handleFileSelect}
            className="hidden"
            id="file-import"
          />
          <label
            htmlFor="file-import"
            className="bg-cad-accent text-white px-4 py-2 rounded text-sm font-medium hover:bg-cad-highlight cursor-pointer transition-colors"
          >
            Import File
          </label>
          <button
            onClick={handleLoadSample}
            disabled={isLoading}
            className="bg-cad-bg text-gray-300 px-4 py-2 rounded text-sm font-medium hover:bg-cad-accent transition-colors disabled:opacity-50"
          >
            Load Sample Terrain
          </button>
        </div>

        {isLoading && <span className="text-gray-400 text-sm animate-pulse">Loading...</span>}

        {error && <span className="text-red-400 text-sm">{error}</span>}

        {successMessage && <span className="text-green-400 text-sm">{successMessage}</span>}

        {surfaces.length > 0 && (
          <span className="text-gray-400 text-sm ml-auto">
            {surfaces.length} surface(s) loaded
          </span>
        )}
      </div>

      {/* Supported formats info */}
      <div className="mt-2 text-xs text-gray-500">
        Supported: DWG (AutoCAD) | LandXML (.xml) for surfaces | DXF coming soon
      </div>
    </div>
  );
}
