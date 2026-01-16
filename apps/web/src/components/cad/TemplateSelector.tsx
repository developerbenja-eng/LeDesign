'use client';

import { useState, useEffect } from 'react';
import { useCADStore } from '@/stores/cad-store';
import type { AnyCADEntity } from '@/types/cad';

interface DrawingTemplate {
  id: string;
  name: string;
  description: string | null;
  template_type: string;
  paper_size: string | null;
  content_json: string;
  thumbnail_svg: string | null;
}

interface TemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TemplateSelector({ isOpen, onClose }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<DrawingTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<DrawingTemplate | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const { clearEntities, addEntity, setPan, setZoom } = useCADStore();

  // Fetch templates on open
  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/normativa/templates');
      if (!response.ok) {
        throw new Error('Error al cargar las plantillas');
      }
      const data = await response.json();
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const applyTemplate = async () => {
    if (!selectedTemplate) return;

    setIsApplying(true);

    try {
      // Parse the template content
      const content = JSON.parse(selectedTemplate.content_json || '[]');

      // Clear existing entities
      clearEntities();

      // Add template entities to the canvas
      if (Array.isArray(content) && content.length > 0) {
        for (const entity of content) {
          addEntity(entity as AnyCADEntity);
        }

        // Calculate bounds and fit view
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const entity of content) {
          const e = entity as AnyCADEntity;
          if ('position' in e && e.position) {
            minX = Math.min(minX, e.position.x);
            minY = Math.min(minY, e.position.y);
            maxX = Math.max(maxX, e.position.x);
            maxY = Math.max(maxY, e.position.y);
          } else if ('center' in e && e.center) {
            minX = Math.min(minX, e.center.x);
            minY = Math.min(minY, e.center.y);
            maxX = Math.max(maxX, e.center.x);
            maxY = Math.max(maxY, e.center.y);
          } else if ('vertices' in e && e.vertices) {
            for (const v of e.vertices) {
              minX = Math.min(minX, v.x);
              minY = Math.min(minY, v.y);
              maxX = Math.max(maxX, v.x);
              maxY = Math.max(maxY, v.y);
            }
          } else if ('start' in e && 'end' in e && e.start && e.end) {
            minX = Math.min(minX, e.start.x, e.end.x);
            minY = Math.min(minY, e.start.y, e.end.y);
            maxX = Math.max(maxX, e.start.x, e.end.x);
            maxY = Math.max(maxY, e.start.y, e.end.y);
          }
        }

        if (isFinite(minX) && isFinite(minY)) {
          const centerX = (minX + maxX) / 2;
          const centerY = (minY + maxY) / 2;
          setPan(-centerX, -centerY);
          setZoom(0.5);
        }
      } else {
        // Template is empty, create a blank drawing with paper outline
        // Default to A3 size (420mm x 297mm) scaled
        const scale = 50; // 1mm = 50 units
        const width = 420 * scale;
        const height = 297 * scale;

        addEntity({
          id: 'template_border',
          type: 'polyline',
          layer: 'TEMPLATE',
          visible: true,
          selected: false,
          vertices: [
            { x: 0, y: 0, z: 0 },
            { x: width, y: 0, z: 0 },
            { x: width, y: height, z: 0 },
            { x: 0, y: height, z: 0 },
          ],
          closed: true,
        });

        setPan(-width / 2, -height / 2);
        setZoom(0.05);
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al aplicar la plantilla');
    } finally {
      setIsApplying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-cad-panel border border-cad-accent rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-cad-accent">
          <h2 className="text-lg font-semibold text-white">Nuevo Dibujo desde Plantilla</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-140px)]">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
              <span className="ml-3 text-gray-400">Cargando plantillas...</span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-900/30 border border-red-600 rounded text-red-300 text-sm">
              {error}
            </div>
          )}

          {!loading && !error && templates.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              No hay plantillas disponibles.
            </div>
          )}

          {!loading && !error && templates.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedTemplate?.id === template.id
                      ? 'border-blue-500 bg-blue-900/20'
                      : 'border-cad-accent bg-cad-accent/30 hover:border-gray-500'
                  }`}
                >
                  {/* Thumbnail or placeholder */}
                  <div className="w-full h-24 bg-gray-800 rounded mb-3 flex items-center justify-center">
                    {template.thumbnail_svg ? (
                      <div
                        className="w-full h-full"
                        dangerouslySetInnerHTML={{ __html: template.thumbnail_svg }}
                      />
                    ) : (
                      <span className="text-3xl text-gray-600">
                        {template.template_type === 'form' ? '📋' : '📄'}
                      </span>
                    )}
                  </div>

                  <h3 className="font-medium text-white text-sm">{template.name}</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    {template.template_type === 'plan_sheet' && 'Plano de obras'}
                    {template.template_type === 'form' && 'Formulario'}
                    {template.template_type === 'profile_sheet' && 'Perfil longitudinal'}
                    {template.paper_size && ` • ${template.paper_size}`}
                  </p>
                  {template.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {template.description}
                    </p>
                  )}
                </button>
              ))}

              {/* Blank drawing option */}
              <button
                onClick={() =>
                  setSelectedTemplate({
                    id: 'blank',
                    name: 'Dibujo en Blanco',
                    description: 'Comenzar con un lienzo vacío',
                    template_type: 'blank',
                    paper_size: 'A3',
                    content_json: '[]',
                    thumbnail_svg: null,
                  })
                }
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  selectedTemplate?.id === 'blank'
                    ? 'border-blue-500 bg-blue-900/20'
                    : 'border-cad-accent bg-cad-accent/30 hover:border-gray-500'
                }`}
              >
                <div className="w-full h-24 bg-gray-800 rounded mb-3 flex items-center justify-center">
                  <span className="text-3xl text-gray-600">➕</span>
                </div>
                <h3 className="font-medium text-white text-sm">Dibujo en Blanco</h3>
                <p className="text-xs text-gray-400 mt-1">Lienzo vacío • A3</p>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-cad-accent">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={applyTemplate}
            disabled={!selectedTemplate || isApplying}
            className={`px-4 py-2 text-sm rounded font-medium transition-colors ${
              selectedTemplate && !isApplying
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isApplying ? 'Creando...' : 'Crear Dibujo'}
          </button>
        </div>
      </div>
    </div>
  );
}
