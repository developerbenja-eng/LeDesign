'use client';

/**
 * Section Editor Component
 *
 * Dynamic section editor that renders the appropriate editor
 * based on the section type (text, equation, table, calculation, etc.)
 */

import { useCallback } from 'react';
import { useDocumentStore, selectSelectedSection } from '@/stores/document-store';
import type {
  DocumentSection,
  SectionContent,
  TextContent,
  EquationContent,
  TableContent,
  CalculationContent,
  ReferenceContent,
  ListContent,
  ImageContent,
  NormativeReference,
  StudyAreaContent,
  DesignCriteriaContent,
  PopulationDemandContent,
  InfrastructureSummaryContent,
} from '@/types/documents';
import { TextEditor } from './TextEditor';
import { TableEditor } from './TableEditor';
import { EquationEditor } from './EquationEditor';
import { CalculationDisplay } from './CalculationDisplay';
import { StudyAreaEditor } from './StudyAreaEditor';
import { DesignCriteriaEditor } from './DesignCriteriaEditor';
import { PopulationDemandEditor } from './PopulationDemandEditor';
import { InfrastructureSummaryDisplay } from './InfrastructureSummaryDisplay';

// Section type labels
const SECTION_TYPE_LABELS: Record<string, string> = {
  text: 'Texto',
  equation: 'Ecuación',
  table: 'Tabla',
  calculation: 'Cálculo',
  image: 'Imagen',
  reference: 'Referencias',
  list: 'Lista',
  study_area: 'Área de Estudio',
  design_criteria: 'Criterios de Diseño',
  population_demand: 'Población y Demanda',
  infrastructure_summary: 'Resumen Infraestructura',
};

interface SectionEditorProps {
  section?: DocumentSection;
  onUpdate?: (updates: Partial<DocumentSection>) => void;
}

export function SectionEditor({ section: propSection, onUpdate: propOnUpdate }: SectionEditorProps) {
  const storeSection = useDocumentStore(selectSelectedSection);
  const { updateSection, updateSectionContent } = useDocumentStore();

  // Use prop section if provided, otherwise use store selection
  const section = propSection || storeSection;

  const handleUpdate = useCallback((updates: Partial<DocumentSection>) => {
    if (!section) return;
    if (propOnUpdate) {
      propOnUpdate(updates);
    } else {
      updateSection(section.id, updates);
    }
  }, [section, propOnUpdate, updateSection]);

  const handleContentUpdate = useCallback((content: SectionContent) => {
    if (!section) return;
    if (propOnUpdate) {
      propOnUpdate({ content });
    } else {
      updateSectionContent(section.id, content);
    }
  }, [section, propOnUpdate, updateSectionContent]);

  if (!section) {
    return (
      <div className="section-editor flex items-center justify-center h-full text-gray-400">
        <div className="text-center">
          <p className="text-4xl mb-2">📄</p>
          <p>Selecciona una sección para editar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="section-editor h-full flex flex-col">
      {/* Section Header */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
            {SECTION_TYPE_LABELS[section.type] || section.type}
          </span>
          <span className="text-xs text-gray-400 font-mono">
            {section.number || 'Sin número'}
          </span>
        </div>

        <input
          type="text"
          value={section.title}
          onChange={(e) => handleUpdate({ title: e.target.value })}
          placeholder="Título de la sección"
          className="w-full text-lg font-medium px-0 py-1 border-0 border-b-2 border-transparent focus:border-blue-500 focus:outline-none bg-transparent"
        />
      </div>

      {/* Section Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {renderSectionContent(section, handleContentUpdate)}
      </div>
    </div>
  );
}

// Render appropriate editor based on section type
function renderSectionContent(
  section: DocumentSection,
  onContentUpdate: (content: SectionContent) => void
) {
  const { type, content } = section;

  switch (type) {
    case 'text':
      return (
        <TextEditor
          content={content as TextContent}
          onChange={onContentUpdate}
          placeholder="Escribe el contenido de esta sección..."
        />
      );

    case 'equation':
      return (
        <EquationEditor
          content={content as EquationContent}
          onChange={onContentUpdate}
        />
      );

    case 'table':
      return (
        <TableEditor
          content={content as TableContent}
          onChange={onContentUpdate}
        />
      );

    case 'calculation':
      return (
        <CalculationDisplay
          content={content as CalculationContent}
          onChange={onContentUpdate}
        />
      );

    case 'reference':
      return (
        <ReferenceEditor
          content={content as ReferenceContent}
          onChange={onContentUpdate}
        />
      );

    case 'list':
      return (
        <ListEditor
          content={content as ListContent}
          onChange={onContentUpdate}
        />
      );

    case 'image':
      return (
        <ImageEditor
          content={content as ImageContent}
          onChange={onContentUpdate}
        />
      );

    case 'study_area':
      return (
        <StudyAreaEditor
          content={content as StudyAreaContent}
          onChange={onContentUpdate}
        />
      );

    case 'design_criteria':
      return (
        <DesignCriteriaEditor
          content={content as DesignCriteriaContent}
          onChange={onContentUpdate}
        />
      );

    case 'population_demand':
      return (
        <PopulationDemandEditor
          content={content as PopulationDemandContent}
          onChange={onContentUpdate}
        />
      );

    case 'infrastructure_summary':
      return (
        <InfrastructureSummaryDisplay
          content={content as InfrastructureSummaryContent}
          onChange={onContentUpdate}
          readOnly={false}
        />
      );

    default:
      return (
        <div className="text-gray-500 text-center py-8">
          Editor no disponible para este tipo de sección
        </div>
      );
  }
}

// Simple Reference Editor
function ReferenceEditor({
  content,
  onChange
}: {
  content: ReferenceContent;
  onChange: (content: ReferenceContent) => void;
}) {
  const addReference = () => {
    const newRef: NormativeReference = {
      code: '',
      title: '',
    };
    onChange({
      ...content,
      references: [...content.references, newRef]
    });
  };

  const updateReference = (index: number, updates: Partial<NormativeReference>) => {
    const newRefs = content.references.map((ref, i) =>
      i === index ? { ...ref, ...updates } : ref
    );
    onChange({ ...content, references: newRefs });
  };

  const removeReference = (index: number) => {
    onChange({
      ...content,
      references: content.references.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Lista de normas y referencias técnicas aplicables:
      </p>

      {content.references.map((ref, idx) => (
        <div key={idx} className="p-3 border rounded-lg space-y-2">
          <div className="flex justify-end">
            <button
              onClick={() => removeReference(idx)}
              className="text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <input
              type="text"
              value={ref.code}
              onChange={(e) => updateReference(idx, { code: e.target.value })}
              placeholder="Código (ej: NCh 1105)"
              className="px-2 py-1 text-sm border rounded"
            />
            <input
              type="text"
              value={ref.title}
              onChange={(e) => updateReference(idx, { title: e.target.value })}
              placeholder="Título"
              className="col-span-2 px-2 py-1 text-sm border rounded"
            />
          </div>

          <input
            type="text"
            value={ref.description || ''}
            onChange={(e) => updateReference(idx, { description: e.target.value })}
            placeholder="Descripción (opcional)"
            className="w-full px-2 py-1 text-sm border rounded"
          />
        </div>
      ))}

      <button
        onClick={addReference}
        className="w-full py-2 text-sm text-gray-600 border border-dashed rounded hover:bg-gray-50"
      >
        + Agregar referencia
      </button>
    </div>
  );
}

// Simple List Editor
function ListEditor({
  content,
  onChange
}: {
  content: ListContent;
  onChange: (content: ListContent) => void;
}) {
  const addItem = () => {
    onChange({
      ...content,
      items: [...content.items, '']
    });
  };

  const updateItem = (index: number, value: string) => {
    const newItems = content.items.map((item, i) => i === index ? value : item);
    onChange({ ...content, items: newItems });
  };

  const removeItem = (index: number) => {
    onChange({
      ...content,
      items: content.items.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={content.ordered}
            onChange={(e) => onChange({ ...content, ordered: e.target.checked })}
            className="rounded"
          />
          Lista numerada
        </label>
      </div>

      <div className="space-y-2">
        {content.items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-gray-400 w-6 text-right">
              {content.ordered ? `${idx + 1}.` : '•'}
            </span>
            <input
              type="text"
              value={item}
              onChange={(e) => updateItem(idx, e.target.value)}
              placeholder="Elemento de lista..."
              className="flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={() => removeItem(idx)}
              className="text-gray-400 hover:text-red-500"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addItem}
        className="w-full py-2 text-sm text-gray-600 border border-dashed rounded hover:bg-gray-50"
      >
        + Agregar elemento
      </button>
    </div>
  );
}

// Simple Image Editor
function ImageEditor({
  content,
  onChange
}: {
  content: ImageContent;
  onChange: (content: ImageContent) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-gray-600 mb-1">URL de imagen</label>
        <input
          type="text"
          value={content.url}
          onChange={(e) => onChange({ ...content, url: e.target.value })}
          placeholder="https://..."
          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-600 mb-1">Pie de imagen</label>
        <input
          type="text"
          value={content.caption || ''}
          onChange={(e) => onChange({ ...content, caption: e.target.value })}
          placeholder="Figura 1: Descripción..."
          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {content.url && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <img
            src={content.url}
            alt={content.caption || 'Imagen'}
            className="max-w-full max-h-64 mx-auto rounded"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="50" x="25" font-size="14">Error</text></svg>';
            }}
          />
          {content.caption && (
            <p className="text-center text-sm text-gray-500 mt-2">{content.caption}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default SectionEditor;
