'use client';

/**
 * Carátula (Cover Page) Editor Component
 *
 * Editor for document header/cover page information.
 * Follows Chilean engineering document standards.
 */

import { useCallback } from 'react';
import type { DocumentCaratula } from '@/types/documents';

interface CaratulaEditorProps {
  caratula: DocumentCaratula;
  onChange: (caratula: DocumentCaratula) => void;
}

export function CaratulaEditor({ caratula, onChange }: CaratulaEditorProps) {
  const updateField = useCallback(<K extends keyof DocumentCaratula>(
    field: K,
    value: DocumentCaratula[K]
  ) => {
    onChange({ ...caratula, [field]: value });
  }, [caratula, onChange]);

  const updateNestedField = useCallback(<
    K extends keyof DocumentCaratula,
    NK extends keyof NonNullable<DocumentCaratula[K]>
  >(
    field: K,
    nestedField: NK,
    value: NonNullable<DocumentCaratula[K]>[NK]
  ) => {
    const current = caratula[field] as Record<string, unknown>;
    onChange({
      ...caratula,
      [field]: { ...current, [nestedField]: value }
    });
  }, [caratula, onChange]);

  return (
    <div className="caratula-editor space-y-6">
      {/* Project Info */}
      <fieldset className="border rounded-lg p-4">
        <legend className="text-sm font-medium text-gray-700 px-2">
          Información del Proyecto
        </legend>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Nombre del Proyecto *
            </label>
            <input
              type="text"
              value={caratula.projectName}
              onChange={(e) => updateField('projectName', e.target.value)}
              placeholder="Ej: Mejoramiento Sistema de Alcantarillado Sector Norte"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Código del Proyecto
            </label>
            <input
              type="text"
              value={caratula.projectCode || ''}
              onChange={(e) => updateField('projectCode', e.target.value)}
              placeholder="Ej: PROY-2024-001"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </fieldset>

      {/* Client Info */}
      <fieldset className="border rounded-lg p-4">
        <legend className="text-sm font-medium text-gray-700 px-2">
          Mandante
        </legend>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Nombre del Mandante *
            </label>
            <input
              type="text"
              value={caratula.clientName}
              onChange={(e) => updateField('clientName', e.target.value)}
              placeholder="Ej: Ilustre Municipalidad de Chillán"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </fieldset>

      {/* Location */}
      <fieldset className="border rounded-lg p-4">
        <legend className="text-sm font-medium text-gray-700 px-2">
          Ubicación
        </legend>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Región *
            </label>
            <input
              type="text"
              value={caratula.location.region}
              onChange={(e) => updateNestedField('location', 'region', e.target.value)}
              placeholder="Ej: Región de Ñuble"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Comuna *
            </label>
            <input
              type="text"
              value={caratula.location.comuna}
              onChange={(e) => updateNestedField('location', 'comuna', e.target.value)}
              placeholder="Ej: Chillán"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </fieldset>

      {/* Designer Info */}
      <fieldset className="border rounded-lg p-4">
        <legend className="text-sm font-medium text-gray-700 px-2">
          Profesional Responsable
        </legend>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Nombre Completo *
              </label>
              <input
                type="text"
                value={caratula.designer.name}
                onChange={(e) => updateNestedField('designer', 'name', e.target.value)}
                placeholder="Ej: Juan Pérez González"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Título Profesional *
              </label>
              <input
                type="text"
                value={caratula.designer.title}
                onChange={(e) => updateNestedField('designer', 'title', e.target.value)}
                placeholder="Ej: Ingeniero Civil"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                N° Registro/Inscripción
              </label>
              <input
                type="text"
                value={caratula.designer.registration || ''}
                onChange={(e) => updateNestedField('designer', 'registration', e.target.value)}
                placeholder="Ej: IC-12345"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Firma Digital (opcional)
              </label>
              <input
                type="text"
                value={caratula.designer.firma || ''}
                onChange={(e) => updateNestedField('designer', 'firma', e.target.value)}
                placeholder="URL o base64 de firma"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </fieldset>

      {/* Document Info */}
      <fieldset className="border rounded-lg p-4">
        <legend className="text-sm font-medium text-gray-700 px-2">
          Información del Documento
        </legend>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Fecha *
            </label>
            <input
              type="date"
              value={caratula.date}
              onChange={(e) => updateField('date', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              N° de Revisión
            </label>
            <input
              type="number"
              value={caratula.revisionNumber}
              onChange={(e) => updateField('revisionNumber', parseInt(e.target.value) || 0)}
              min="0"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </fieldset>

      {/* Preview */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Vista previa de carátula:</h4>
        <div className="bg-white p-4 border rounded shadow-sm text-center space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-wide">
            {caratula.clientName || 'Mandante'}
          </p>
          <h2 className="text-lg font-bold text-gray-800">
            {caratula.projectName || 'Nombre del Proyecto'}
          </h2>
          {caratula.projectCode && (
            <p className="text-sm text-gray-600">Código: {caratula.projectCode}</p>
          )}
          <p className="text-sm text-gray-600">
            {caratula.location.comuna}, {caratula.location.region}
          </p>
          <div className="pt-4 mt-4 border-t">
            <p className="text-sm text-gray-700">
              {caratula.designer.name}
            </p>
            <p className="text-xs text-gray-500">
              {caratula.designer.title}
              {caratula.designer.registration && ` - ${caratula.designer.registration}`}
            </p>
          </div>
          <p className="text-xs text-gray-400 pt-2">
            {caratula.date} | Rev. {caratula.revisionNumber}
          </p>
        </div>
      </div>
    </div>
  );
}

export default CaratulaEditor;
