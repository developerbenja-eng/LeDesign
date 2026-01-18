'use client';

/**
 * LaTeX Preview Component
 *
 * Renders LaTeX equations and document content with live preview.
 * Uses latex.js for browser-based LaTeX rendering.
 */

import { useEffect, useState, useRef } from 'react';
import { renderEquation, getLatexStyles } from '@/lib/latex/latex-service';
import type { LaTeXRenderResult } from '@/types/documents';

interface LatexPreviewProps {
  latex: string;
  displayMode?: boolean;
  className?: string;
  onError?: (errors: string[]) => void;
}

export function LatexPreview({
  latex,
  displayMode = true,
  className = '',
  onError,
}: LatexPreviewProps) {
  const [html, setHtml] = useState<string>('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;

    async function render() {
      if (!latex) {
        setHtml('');
        setErrors([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const result: LaTeXRenderResult = await renderEquation(latex, { displayMode });

        if (mounted) {
          setHtml(result.html);
          setErrors(result.errors || []);

          if (result.errors?.length && onError) {
            onError(result.errors);
          }
        }
      } catch (error) {
        if (mounted) {
          const errorMessage = error instanceof Error ? error.message : 'Render error';
          setErrors([errorMessage]);
          setHtml(`<span class="text-red-500 font-mono text-sm">${errorMessage}</span>`);

          if (onError) {
            onError([errorMessage]);
          }
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    render();

    return () => {
      mounted = false;
    };
  }, [latex, displayMode, onError]);

  if (isLoading) {
    return (
      <div className={`animate-pulse bg-gray-100 rounded h-8 ${className}`}>
        <span className="sr-only">Renderizando ecuación...</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`latex-preview ${errors.length > 0 ? 'has-errors' : ''} ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * Inline LaTeX for text with embedded math
 */
interface InlineLatexProps {
  children: string;
  className?: string;
}

export function InlineLatex({ children, className = '' }: InlineLatexProps) {
  const [rendered, setRendered] = useState<string>(children);

  useEffect(() => {
    let mounted = true;

    async function renderInline() {
      // Find all $...$ patterns
      const pattern = /\$([^$]+)\$/g;
      let result = children;
      const matches = [...children.matchAll(pattern)];

      for (const match of matches) {
        const latex = match[1];
        try {
          const renderResult = await renderEquation(latex, { displayMode: false });
          result = result.replace(match[0], renderResult.html);
        } catch {
          // Keep original on error
        }
      }

      if (mounted) {
        setRendered(result);
      }
    }

    if (children.includes('$')) {
      renderInline();
    } else {
      setRendered(children);
    }

    return () => {
      mounted = false;
    };
  }, [children]);

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
}

/**
 * LaTeX styles provider - adds necessary CSS for latex.js
 */
export function LatexStylesProvider({ children }: { children: React.ReactNode }) {
  const [styles, setStyles] = useState<string>('');

  useEffect(() => {
    getLatexStyles().then(setStyles);
  }, []);

  return (
    <>
      {styles && <style dangerouslySetInnerHTML={{ __html: styles }} />}
      {children}
    </>
  );
}

/**
 * Equation display with label and description
 */
interface EquationDisplayProps {
  latex: string;
  label?: string;
  description?: string;
  number?: number;
  className?: string;
}

export function EquationDisplay({
  latex,
  label,
  description,
  number,
  className = '',
}: EquationDisplayProps) {
  return (
    <div className={`equation-display my-4 ${className}`}>
      <div className="flex items-center gap-4">
        <div className="flex-1 text-center py-2">
          <LatexPreview latex={latex} displayMode />
        </div>
        {number !== undefined && (
          <span className="text-gray-500 text-sm">({number})</span>
        )}
      </div>
      {label && (
        <p className="text-xs text-gray-400 text-center mt-1" id={label}>
          {label}
        </p>
      )}
      {description && (
        <p className="text-sm text-gray-600 text-center mt-2 italic">
          {description}
        </p>
      )}
    </div>
  );
}

export default LatexPreview;
