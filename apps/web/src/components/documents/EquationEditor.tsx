'use client';

/**
 * Equation Editor Component
 *
 * LaTeX equation editor with live preview and quick-insert buttons
 * for common hydraulic engineering symbols and equations.
 */

import { useState, useCallback, useMemo } from 'react';
import type { EquationContent } from '@/types/documents';
import { LatexPreview } from './LatexPreview';
import { HYDRAULIC_EQUATIONS } from '@/types/documents';

interface EquationEditorProps {
  content: EquationContent;
  onChange: (content: EquationContent) => void;
}

// Quick insert symbols for engineering
const QUICK_SYMBOLS = [
  { label: 'Fracción', latex: '\\frac{a}{b}', preview: '\\frac{a}{b}' },
  { label: 'Raíz', latex: '\\sqrt{x}', preview: '\\sqrt{x}' },
  { label: 'Potencia', latex: 'x^{n}', preview: 'x^n' },
  { label: 'Subíndice', latex: 'x_{i}', preview: 'x_i' },
  { label: 'Suma', latex: '\\sum_{i=1}^{n}', preview: '\\sum' },
  { label: 'Integral', latex: '\\int_{a}^{b}', preview: '\\int' },
  { label: 'Pi', latex: '\\pi', preview: '\\pi' },
  { label: 'Delta', latex: '\\Delta', preview: '\\Delta' },
  { label: 'Alpha', latex: '\\alpha', preview: '\\alpha' },
  { label: 'Beta', latex: '\\beta', preview: '\\beta' },
  { label: 'Rho', latex: '\\rho', preview: '\\rho' },
  { label: 'Gamma', latex: '\\gamma', preview: '\\gamma' },
] as const;

// Common hydraulic equations for quick insert
const HYDRAULIC_QUICK_INSERT = [
  { name: 'Manning', key: 'manning' as const },
  { name: 'Hazen-Williams', key: 'hazenWilliams' as const },
  { name: 'Darcy-Weisbach', key: 'darcyWeisbach' as const },
  { name: 'Método Racional', key: 'rational' as const },
  { name: 'Froude', key: 'froude' as const },
] as const;

export function EquationEditor({ content, onChange }: EquationEditorProps) {
  const [activeTab, setActiveTab] = useState<'editor' | 'symbols' | 'equations'>('editor');
  const [cursorPosition, setCursorPosition] = useState<number>(0);

  const insertSymbol = useCallback((latex: string) => {
    const before = content.latex.slice(0, cursorPosition);
    const after = content.latex.slice(cursorPosition);
    const newLatex = before + latex + after;
    onChange({ ...content, latex: newLatex });
  }, [content, onChange, cursorPosition]);

  const insertEquation = useCallback((key: keyof typeof HYDRAULIC_EQUATIONS) => {
    const eq = HYDRAULIC_EQUATIONS[key];
    onChange({
      ...content,
      latex: eq.latex,
      description: content.description || eq.name
    });
  }, [content, onChange]);

  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ ...content, latex: e.target.value });
  }, [content, onChange]);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...content, description: e.target.value });
  }, [content, onChange]);

  const handleSelectionChange = useCallback((e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    setCursorPosition(e.currentTarget.selectionStart || 0);
  }, []);

  // Check if latex is valid by attempting to render
  const previewError = useMemo(() => {
    if (!content.latex.trim()) return null;
    // Basic validation - more comprehensive validation happens in LaTeX service
    const openBraces = (content.latex.match(/\{/g) || []).length;
    const closeBraces = (content.latex.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      return 'Llaves desbalanceadas';
    }
    return null;
  }, [content.latex]);

  return (
    <div className="equation-editor space-y-4">
      {/* Tabs */}
      <div className="flex border-b">
        {(['editor', 'symbols', 'equations'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'editor' && 'Editor'}
            {tab === 'symbols' && 'Símbolos'}
            {tab === 'equations' && 'Ecuaciones'}
          </button>
        ))}
      </div>

      {/* Editor Tab */}
      {activeTab === 'editor' && (
        <div className="space-y-3">
          {/* LaTeX input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código LaTeX
            </label>
            <textarea
              value={content.latex}
              onChange={handleTextareaChange}
              onSelect={handleSelectionChange}
              onClick={handleSelectionChange}
              placeholder="Escribe tu ecuación en LaTeX... (ej: Q = \frac{1}{n} A R^{2/3} S^{1/2})"
              className={`w-full h-24 px-3 py-2 font-mono text-sm border rounded-lg focus:outline-none focus:ring-2 ${
                previewError
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
            {previewError && (
              <p className="mt-1 text-sm text-red-500">{previewError}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <input
              type="text"
              value={content.description || ''}
              onChange={handleDescriptionChange}
              placeholder="Ej: Ecuación de Manning para flujo en canales"
              className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Live Preview */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-2">Vista previa:</p>
            {content.latex ? (
              <div className="text-center py-2">
                <LatexPreview latex={content.latex} displayMode />
              </div>
            ) : (
              <p className="text-center text-gray-400 text-sm py-2">
                Ingresa una ecuación para ver la vista previa
              </p>
            )}
          </div>
        </div>
      )}

      {/* Symbols Tab */}
      {activeTab === 'symbols' && (
        <div className="grid grid-cols-4 gap-2">
          {QUICK_SYMBOLS.map((symbol) => (
            <button
              key={symbol.label}
              onClick={() => insertSymbol(symbol.latex)}
              className="flex flex-col items-center gap-1 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-lg">
                <LatexPreview latex={symbol.preview} displayMode={false} />
              </span>
              <span className="text-xs text-gray-500">{symbol.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Equations Tab */}
      {activeTab === 'equations' && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600 mb-3">
            Haz clic para insertar ecuaciones hidráulicas comunes:
          </p>
          {HYDRAULIC_QUICK_INSERT.map((eq) => {
            const equation = HYDRAULIC_EQUATIONS[eq.key];
            return (
              <button
                key={eq.key}
                onClick={() => insertEquation(eq.key)}
                className="w-full p-3 text-left border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm">{equation.name}</p>
                  </div>
                  {'nchReference' in equation && equation.nchReference && (
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                      {equation.nchReference}
                    </span>
                  )}
                </div>
                <div className="mt-2 py-1 text-center bg-gray-50 rounded">
                  <LatexPreview latex={equation.latex} displayMode={false} />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default EquationEditor;
