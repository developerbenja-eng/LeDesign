'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  IDE_SERVICES,
  IDE_CATEGORIES,
  IDE_PROVIDERS,
  getServicesByCategory,
  searchServices,
  buildQueryUrl,
  buildWmsUrl,
  type IDEService,
  type IDECategory,
  type IDEServiceLayer,
  type GeoJSONFeature,
} from '@ledesign/terrain';

interface IDEDataBrowserProps {
  projectBounds?: {
    south: number;
    north: number;
    west: number;
    east: number;
  };
  onDataImport: (data: ImportedData) => void;
  onWmsLayerAdd?: (url: string, layerName: string) => void;
  onClose?: () => void;
}

export interface ImportedData {
  serviceId: string;
  serviceName: string;
  layerId: number;
  layerName: string;
  features: GeoJSONFeature[];
  metadata: {
    importedAt: string;
    featureCount: number;
    bbox?: { west: number; south: number; east: number; north: number };
  };
}

type ViewMode = 'browse' | 'preview' | 'loading';

export function IDEDataBrowser({
  projectBounds,
  onDataImport,
  onWmsLayerAdd,
  onClose,
}: IDEDataBrowserProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('browse');
  const [selectedCategory, setSelectedCategory] = useState<IDECategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedService, setSelectedService] = useState<IDEService | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<IDEServiceLayer | null>(null);
  const [layerDetails, setLayerDetails] = useState<{ fields: Array<{ name: string; type: string; alias?: string }> } | null>(null);
  const [previewData, setPreviewData] = useState<GeoJSONFeature[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Filter services
  const filteredServices = searchQuery
    ? searchServices(searchQuery)
    : selectedCategory === 'all'
      ? IDE_SERVICES
      : getServicesByCategory(selectedCategory);

  // Fetch layer details when a service/layer is selected
  const fetchLayerDetails = useCallback(async (service: IDEService, layerId: number) => {
    try {
      setLoading(true);
      setError(null);

      const url = `${service.baseUrl}/${layerId}?f=json`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch layer details: ${response.statusText}`);
      }

      const data = await response.json();
      setLayerDetails({
        fields: data.fields || [],
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch preview data
  const fetchPreviewData = useCallback(async (service: IDEService, layerId: number, maxRecords = 10) => {
    try {
      setLoading(true);
      setError(null);
      setViewMode('loading');

      const queryUrl = buildQueryUrl(service, layerId, {
        bbox: projectBounds,
        maxRecords,
        returnGeometry: true,
        format: 'geojson',
      });

      const response = await fetch(queryUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }

      const data = await response.json();
      setPreviewData(data.features || []);
      setViewMode('preview');
    } catch (err) {
      setError((err as Error).message);
      setViewMode('browse');
    } finally {
      setLoading(false);
    }
  }, [projectBounds]);

  // Import full data
  const importData = useCallback(async (service: IDEService, layer: IDEServiceLayer, maxRecords = 1000) => {
    try {
      setLoading(true);
      setError(null);

      const queryUrl = buildQueryUrl(service, layer.id, {
        bbox: projectBounds,
        maxRecords,
        returnGeometry: true,
        format: 'geojson',
      });

      const response = await fetch(queryUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }

      const data = await response.json();

      const importedData: ImportedData = {
        serviceId: service.id,
        serviceName: service.nameEs,
        layerId: layer.id,
        layerName: layer.name,
        features: data.features || [],
        metadata: {
          importedAt: new Date().toISOString(),
          featureCount: data.features?.length || 0,
          bbox: projectBounds,
        },
      };

      onDataImport(importedData);
      setViewMode('browse');
      setSelectedService(null);
      setSelectedLayer(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [projectBounds, onDataImport]);

  // Handle layer selection
  useEffect(() => {
    if (selectedService && selectedLayer) {
      fetchLayerDetails(selectedService, selectedLayer.id);
    } else {
      setLayerDetails(null);
    }
  }, [selectedService, selectedLayer, fetchLayerDetails]);

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 max-h-[80vh] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">IDE Chile Data Browser</h2>
          <p className="text-sm text-gray-400">Import official Chilean government geospatial data</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Search and Filter */}
      <div className="p-4 border-b border-gray-700 space-y-3">
        <input
          type="text"
          placeholder="Search services... (e.g., roads, bridges, water)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
        />

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            All ({IDE_SERVICES.length})
          </button>
          {(Object.entries(IDE_CATEGORIES) as [IDECategory, typeof IDE_CATEGORIES[IDECategory]][]).map(([key, cat]) => {
            const count = getServicesByCategory(key).length;
            if (count === 0) return null;
            return (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`px-3 py-1 rounded-full text-sm transition-colors flex items-center gap-1 ${
                  selectedCategory === key
                    ? 'text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                style={selectedCategory === key ? { backgroundColor: cat.color } : undefined}
              >
                <span>{cat.icon}</span>
                <span>{cat.nameEs}</span>
                <span className="text-xs opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Service List */}
        <div className="w-1/2 border-r border-gray-700 overflow-y-auto">
          <div className="p-2">
            {filteredServices.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No services found</p>
            ) : (
              filteredServices.map((service) => (
                <div
                  key={service.id}
                  onClick={() => {
                    setSelectedService(service);
                    setSelectedLayer(null);
                    setPreviewData(null);
                    setViewMode('browse');
                  }}
                  className={`p-3 rounded-lg cursor-pointer mb-2 transition-colors ${
                    selectedService?.id === service.id
                      ? 'bg-blue-900/50 border border-blue-600'
                      : 'bg-gray-800 hover:bg-gray-750 border border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg">
                      {IDE_CATEGORIES[service.category].icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">{service.nameEs}</h3>
                      <p className="text-gray-400 text-sm truncate">{service.name}</p>
                      <p className="text-gray-500 text-xs mt-1 line-clamp-2">{service.descriptionEs}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">
                          {service.provider.ministry}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">
                          {service.serviceType}
                        </span>
                        {service.layers && (
                          <span className="text-xs text-gray-400">
                            {service.layers.length} layers
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Service Details Panel */}
        <div className="w-1/2 overflow-y-auto bg-gray-850">
          {selectedService ? (
            <div className="p-4">
              {/* Service Header */}
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white">{selectedService.nameEs}</h3>
                <p className="text-gray-400 text-sm">{selectedService.descriptionEs}</p>

                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-300">
                    <span className="text-gray-500">Provider:</span>
                    <span>{selectedService.provider.nameEs}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <span className="text-gray-500">URL:</span>
                    <code className="text-xs bg-gray-800 px-2 py-1 rounded truncate max-w-xs">
                      {selectedService.baseUrl}
                    </code>
                  </div>
                  {selectedService.lastUpdated && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <span className="text-gray-500">Last Updated:</span>
                      <span>{selectedService.lastUpdated}</span>
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="mt-4 flex gap-2">
                  {onWmsLayerAdd && (
                    <button
                      onClick={() => onWmsLayerAdd(buildWmsUrl(selectedService), selectedService.nameEs)}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded"
                    >
                      Add as WMS Layer
                    </button>
                  )}
                  <a
                    href={selectedService.baseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded"
                  >
                    View API
                  </a>
                </div>
              </div>

              {/* Layers */}
              {selectedService.layers && selectedService.layers.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-white font-medium mb-2">Layers</h4>
                  <div className="space-y-2">
                    {selectedService.layers.map((layer) => (
                      <div
                        key={layer.id}
                        onClick={() => setSelectedLayer(layer)}
                        className={`p-3 rounded cursor-pointer transition-colors ${
                          selectedLayer?.id === layer.id
                            ? 'bg-blue-800/50 border border-blue-600'
                            : 'bg-gray-800 hover:bg-gray-750 border border-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-white">{layer.name}</span>
                            {layer.geometryType && (
                              <span className="ml-2 text-xs text-gray-400">
                                ({layer.geometryType})
                              </span>
                            )}
                          </div>
                          <span className="text-gray-500 text-xs">ID: {layer.id}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Layer Details */}
              {selectedLayer && (
                <div className="border-t border-gray-700 pt-4">
                  <h4 className="text-white font-medium mb-3">
                    Layer: {selectedLayer.name}
                  </h4>

                  {loading && viewMode !== 'preview' && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <div className="animate-spin w-4 h-4 border-2 border-gray-500 border-t-blue-500 rounded-full" />
                      <span>Loading...</span>
                    </div>
                  )}

                  {/* Fields */}
                  {layerDetails?.fields && layerDetails.fields.length > 0 && (
                    <div className="mb-4">
                      <h5 className="text-gray-300 text-sm mb-2">Available Fields:</h5>
                      <div className="max-h-40 overflow-y-auto bg-gray-800 rounded p-2">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-gray-400">
                              <th className="text-left py-1">Field</th>
                              <th className="text-left py-1">Type</th>
                            </tr>
                          </thead>
                          <tbody>
                            {layerDetails.fields.slice(0, 20).map((field) => (
                              <tr key={field.name} className="text-gray-300 border-t border-gray-700">
                                <td className="py-1">{field.alias || field.name}</td>
                                <td className="py-1 text-gray-500">{field.type.replace('esriFieldType', '')}</td>
                              </tr>
                            ))}
                            {layerDetails.fields.length > 20 && (
                              <tr className="text-gray-500">
                                <td colSpan={2} className="py-1 text-center">
                                  ... and {layerDetails.fields.length - 20} more fields
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Preview */}
                  {viewMode === 'preview' && previewData && (
                    <div className="mb-4">
                      <h5 className="text-gray-300 text-sm mb-2">
                        Preview ({previewData.length} features):
                      </h5>
                      <div className="max-h-40 overflow-y-auto bg-gray-800 rounded p-2 text-xs">
                        <pre className="text-gray-300 whitespace-pre-wrap">
                          {JSON.stringify(previewData.slice(0, 3), null, 2)}
                        </pre>
                        {previewData.length > 3 && (
                          <p className="text-gray-500 mt-2">
                            ... and {previewData.length - 3} more features
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => fetchPreviewData(selectedService, selectedLayer.id, 10)}
                      disabled={loading}
                      className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-white text-sm rounded"
                    >
                      {viewMode === 'loading' ? 'Loading...' : 'Preview Data'}
                    </button>
                    <button
                      onClick={() => importData(selectedService, selectedLayer, 1000)}
                      disabled={loading}
                      className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-800 disabled:text-gray-500 text-white text-sm rounded"
                    >
                      Import to Project
                    </button>
                  </div>

                  {projectBounds && (
                    <p className="text-xs text-gray-500 mt-2">
                      Will query within project bounds: {projectBounds.south.toFixed(2)}, {projectBounds.west.toFixed(2)} to {projectBounds.north.toFixed(2)}, {projectBounds.east.toFixed(2)}
                    </p>
                  )}
                </div>
              )}

              {/* No layers - direct query option */}
              {(!selectedService.layers || selectedService.layers.length === 0) && (
                <div className="border-t border-gray-700 pt-4">
                  <p className="text-gray-400 text-sm mb-3">
                    Layer information not pre-loaded. You can still query the service directly.
                  </p>
                  <button
                    onClick={() => {
                      // Create a default layer and query
                      const defaultLayer = { id: 0, name: 'Default Layer' };
                      setSelectedLayer(defaultLayer);
                    }}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
                  >
                    Query Layer 0
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <p className="text-lg mb-2">Select a service to view details</p>
                <p className="text-sm">Browse official Chilean government geospatial data</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-700 bg-gray-850 text-xs text-gray-500">
        <div className="flex items-center justify-between">
          <span>
            Data provided by {Object.values(IDE_PROVIDERS).map(p => p.ministry).join(', ')}
          </span>
          <a
            href="https://www.ide.cl"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300"
          >
            IDE Chile
          </a>
        </div>
      </div>
    </div>
  );
}
