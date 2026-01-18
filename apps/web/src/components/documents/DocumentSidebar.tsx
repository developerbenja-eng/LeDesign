'use client';

/**
 * Document Sidebar Component
 *
 * Shows document structure with sections that can be selected,
 * reordered, and managed.
 */

import { useState } from 'react';
import { useDocumentStore, selectDocument, selectSelectedSectionId } from '@/stores/document-store';
import type { DocumentSection, SectionType } from '@/types/documents';
import { generateId } from '@/lib/utils';

// Section type icons
const SECTION_ICONS: Record<SectionType, string> = {
  text: '📝',
  equation: '∑',
  table: '📊',
  calculation: '🔢',
  image: '🖼️',
  reference: '📚',
  list: '📋',
};

interface SectionItemProps {
  section: DocumentSection;
  depth: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function SectionItem({ section, depth, isSelected, onSelect, onDelete }: SectionItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = section.subsections && section.subsections.length > 0;

  return (
    <div className="section-item">
      <div
        className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-100 ${
          isSelected ? 'bg-blue-50 border-l-2 border-blue-500' : ''
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={onSelect}
      >
        {hasChildren && (
          <button
            className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        )}
        {!hasChildren && <span className="w-4" />}

        <span className="text-sm">{SECTION_ICONS[section.type]}</span>

        <span className="text-xs text-gray-400 font-mono">{section.number}</span>

        <span className="flex-1 text-sm truncate">{section.title}</span>

        <button
          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Eliminar sección"
        >
          ×
        </button>
      </div>

      {hasChildren && isExpanded && section.subsections && (
        <div className="subsections">
          {section.subsections.map((sub) => (
            <SectionItemWrapper key={sub.id} section={sub} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function SectionItemWrapper({ section, depth }: { section: DocumentSection; depth: number }) {
  const selectedId = useDocumentStore(selectSelectedSectionId);
  const { setSelectedSection, removeSection } = useDocumentStore();

  return (
    <SectionItem
      section={section}
      depth={depth}
      isSelected={selectedId === section.id}
      onSelect={() => setSelectedSection(section.id)}
      onDelete={() => removeSection(section.id)}
    />
  );
}

export function DocumentSidebar() {
  const document = useDocumentStore(selectDocument);
  const { addSection, setSelectedSection } = useDocumentStore();
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionType, setNewSectionType] = useState<SectionType>('text');
  const [newSectionTitle, setNewSectionTitle] = useState('');

  if (!document) {
    return (
      <div className="document-sidebar p-4 text-gray-500 text-sm">
        No hay documento cargado
      </div>
    );
  }

  const handleAddSection = () => {
    if (!newSectionTitle.trim()) return;

    const newSection: DocumentSection = {
      id: generateId(),
      title: newSectionTitle,
      number: '', // Will be assigned by store
      type: newSectionType,
      content: getDefaultContent(newSectionType),
    };

    addSection(newSection);
    setNewSectionTitle('');
    setIsAddingSection(false);
    setSelectedSection(newSection.id);
  };

  return (
    <div className="document-sidebar h-full flex flex-col bg-white border-r">
      {/* Header */}
      <div className="p-3 border-b">
        <h3 className="font-medium text-sm text-gray-700">Estructura del Documento</h3>
        <p className="text-xs text-gray-400 mt-1">{document.sections.length} secciones</p>
      </div>

      {/* Sections list */}
      <div className="flex-1 overflow-y-auto p-2">
        {document.sections.map((section) => (
          <SectionItemWrapper key={section.id} section={section} depth={0} />
        ))}

        {document.sections.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">
            No hay secciones. Agrega una para comenzar.
          </p>
        )}
      </div>

      {/* Add section */}
      <div className="p-3 border-t bg-gray-50">
        {isAddingSection ? (
          <div className="space-y-2">
            <input
              type="text"
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
              placeholder="Título de la sección"
              className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddSection();
                if (e.key === 'Escape') setIsAddingSection(false);
              }}
            />

            <select
              value={newSectionType}
              onChange={(e) => setNewSectionType(e.target.value as SectionType)}
              className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="text">📝 Texto</option>
              <option value="equation">∑ Ecuación</option>
              <option value="table">📊 Tabla</option>
              <option value="calculation">🔢 Cálculo</option>
              <option value="reference">📚 Referencias</option>
              <option value="list">📋 Lista</option>
            </select>

            <div className="flex gap-2">
              <button
                onClick={handleAddSection}
                className="flex-1 px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Agregar
              </button>
              <button
                onClick={() => setIsAddingSection(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAddingSection(true)}
            className="w-full px-3 py-2 text-sm text-gray-600 border border-dashed border-gray-300 rounded hover:bg-gray-100 hover:border-gray-400"
          >
            + Agregar Sección
          </button>
        )}
      </div>
    </div>
  );
}

// Helper to get default content for each section type
function getDefaultContent(type: SectionType) {
  switch (type) {
    case 'text':
      return { type: 'text' as const, html: '<p>Contenido de la sección...</p>' };
    case 'equation':
      return { type: 'equation' as const, latex: 'y = mx + b', description: 'Descripción de la ecuación' };
    case 'table':
      return { type: 'table' as const, headers: ['Columna 1', 'Columna 2'], rows: [], caption: 'Tabla' };
    case 'calculation':
      return {
        type: 'calculation' as const,
        calculationType: 'custom' as const,
        inputs: {},
        results: {},
      };
    case 'reference':
      return { type: 'reference' as const, references: [] };
    case 'list':
      return { type: 'list' as const, ordered: false, items: [] };
    default:
      return { type: 'text' as const, html: '' };
  }
}

export default DocumentSidebar;
