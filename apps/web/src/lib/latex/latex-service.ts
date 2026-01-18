/**
 * LaTeX Service
 *
 * Wrapper around latex.js for rendering LaTeX equations
 * and mathematical expressions in the browser.
 *
 * This service provides:
 * - Single equation rendering
 * - Full document rendering
 * - Error handling and fallbacks
 * - Caching for performance
 */

import type { LaTeXRenderOptions, LaTeXRenderResult } from '@/types/documents';

// latex.js types (library doesn't have built-in types)
interface LatexGenerator {
  stylesAndScripts(baseURL?: string): string;
}

interface HtmlGenerator {
  documentFragment(): DocumentFragment;
  htmlDocument(): string;
  stylesAndScripts(baseURL?: string): string;
}

// Cache for rendered equations
const renderCache = new Map<string, LaTeXRenderResult>();
const MAX_CACHE_SIZE = 500;

/**
 * Default render options
 */
const DEFAULT_OPTIONS: LaTeXRenderOptions = {
  displayMode: true,
  throwOnError: false,
  errorColor: '#cc0000',
  maxSize: 500,
  maxExpand: 1000,
};

/**
 * Common LaTeX macros for Chilean engineering
 */
const ENGINEERING_MACROS: Record<string, string> = {
  // Units
  '\\m': '\\text{ m}',
  '\\mm': '\\text{ mm}',
  '\\cm': '\\text{ cm}',
  '\\km': '\\text{ km}',
  '\\m2': '\\text{ m}^2',
  '\\m3': '\\text{ m}^3',
  '\\ls': '\\text{ L/s}',
  '\\m3s': '\\text{ m}^3\\text{/s}',
  '\\ms': '\\text{ m/s}',
  '\\mca': '\\text{ m.c.a.}',
  '\\bar': '\\text{ bar}',
  '\\psi': '\\text{ psi}',
  '\\ha': '\\text{ ha}',
  '\\mmh': '\\text{ mm/h}',

  // Common symbols
  '\\pipe': '\\varnothing',
  '\\diam': '\\varnothing',

  // Flow and hydraulics
  '\\Q': 'Q',
  '\\V': 'V',
  '\\A': 'A',
  '\\R': 'R_h',
  '\\S': 'S',
  '\\n': 'n',
  '\\C': 'C',
  '\\f': 'f',
  '\\hf': 'h_f',
};

/**
 * Initialize latex.js - dynamically imports the library
 * Returns the parse function and Generator classes
 */
let latexJsModule: typeof import('latex.js') | null = null;

async function getLatexJs() {
  if (!latexJsModule) {
    latexJsModule = await import('latex.js');
  }
  return latexJsModule;
}

/**
 * Renders a single LaTeX equation to HTML
 */
export async function renderEquation(
  latex: string,
  options: Partial<LaTeXRenderOptions> = {}
): Promise<LaTeXRenderResult> {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  // Check cache
  const cacheKey = `${latex}:${JSON.stringify(mergedOptions)}`;
  if (renderCache.has(cacheKey)) {
    return renderCache.get(cacheKey)!;
  }

  try {
    // Apply macros
    let processedLatex = latex;
    const macros = { ...ENGINEERING_MACROS, ...options.macros };
    for (const [key, value] of Object.entries(macros)) {
      processedLatex = processedLatex.replace(new RegExp(escapeRegex(key), 'g'), value);
    }

    // Wrap in display math if needed
    if (mergedOptions.displayMode && !processedLatex.includes('\\[') && !processedLatex.includes('$$')) {
      processedLatex = `\\[${processedLatex}\\]`;
    } else if (!mergedOptions.displayMode && !processedLatex.includes('$')) {
      processedLatex = `$${processedLatex}$`;
    }

    // Create full LaTeX document for parsing
    const fullLatex = `
\\documentclass{article}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\begin{document}
${processedLatex}
\\end{document}
`;

    const { parse, HtmlGenerator } = await getLatexJs();

    // Parse the LaTeX
    const generator = parse(fullLatex, { generator: new HtmlGenerator() });

    // Get HTML output
    const html = generator.htmlDocument();

    // Extract just the body content
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const bodyContent = bodyMatch ? bodyMatch[1].trim() : html;

    const result: LaTeXRenderResult = {
      html: bodyContent,
      errors: [],
    };

    // Cache result
    if (renderCache.size >= MAX_CACHE_SIZE) {
      // Remove oldest entries
      const keysToRemove = Array.from(renderCache.keys()).slice(0, 100);
      keysToRemove.forEach((key) => renderCache.delete(key));
    }
    renderCache.set(cacheKey, result);

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown LaTeX error';

    if (options.throwOnError) {
      throw error;
    }

    // Return error display
    return {
      html: `<span style="color: ${mergedOptions.errorColor}; font-family: monospace;">
        LaTeX Error: ${escapeHtml(errorMessage)}
        <br><code>${escapeHtml(latex)}</code>
      </span>`,
      errors: [errorMessage],
    };
  }
}

/**
 * Renders a full LaTeX document to HTML
 */
export async function renderDocument(
  latexDocument: string,
  options: Partial<LaTeXRenderOptions> = {}
): Promise<LaTeXRenderResult> {
  try {
    const { parse, HtmlGenerator } = await getLatexJs();

    // Apply macros
    let processedLatex = latexDocument;
    const macros = { ...ENGINEERING_MACROS, ...options.macros };
    for (const [key, value] of Object.entries(macros)) {
      processedLatex = processedLatex.replace(new RegExp(escapeRegex(key), 'g'), value);
    }

    // Parse the document
    const generator = parse(processedLatex, { generator: new HtmlGenerator() });

    // Get full HTML document
    const html = generator.htmlDocument();

    return {
      html,
      errors: [],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown LaTeX error';

    if (options.throwOnError) {
      throw error;
    }

    return {
      html: `<div style="color: ${options.errorColor || '#cc0000'}; padding: 20px; border: 1px solid #cc0000;">
        <h3>LaTeX Rendering Error</h3>
        <pre>${escapeHtml(errorMessage)}</pre>
      </div>`,
      errors: [errorMessage],
    };
  }
}

/**
 * Renders inline LaTeX (for text with embedded math)
 */
export async function renderInline(
  text: string,
  options: Partial<LaTeXRenderOptions> = {}
): Promise<string> {
  // Find all inline math: $...$ or \(...\)
  const inlinePattern = /\$([^$]+)\$|\\\(([^)]+)\\\)/g;

  let result = text;
  const matches = text.matchAll(inlinePattern);

  for (const match of matches) {
    const latex = match[1] || match[2];
    const rendered = await renderEquation(latex, { ...options, displayMode: false });
    result = result.replace(match[0], rendered.html);
  }

  return result;
}

/**
 * Get CSS styles needed for latex.js rendering
 */
export async function getLatexStyles(): Promise<string> {
  try {
    const { HtmlGenerator } = await getLatexJs();
    const generator = new HtmlGenerator();
    return generator.stylesAndScripts();
  } catch {
    return '';
  }
}

/**
 * Validate LaTeX syntax without rendering
 */
export async function validateLatex(latex: string): Promise<{ valid: boolean; errors: string[] }> {
  try {
    const { parse, HtmlGenerator } = await getLatexJs();

    const fullLatex = `
\\documentclass{article}
\\usepackage{amsmath}
\\begin{document}
${latex}
\\end{document}
`;

    parse(fullLatex, { generator: new HtmlGenerator() });
    return { valid: true, errors: [] };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { valid: false, errors: [errorMessage] };
  }
}

/**
 * Clear the render cache
 */
export function clearCache(): void {
  renderCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; maxSize: number } {
  return {
    size: renderCache.size,
    maxSize: MAX_CACHE_SIZE,
  };
}

// Utility functions

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(text: string): string {
  const div = typeof document !== 'undefined' ? document.createElement('div') : null;
  if (div) {
    div.textContent = text;
    return div.innerHTML;
  }
  // Fallback for server-side
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Pre-built equation renderers for common hydraulic calculations
 */
export const hydraulicEquations = {
  /**
   * Manning equation: Q = (1/n) * A * R^(2/3) * S^(1/2)
   */
  manning: async (values?: { Q?: number; n?: number; A?: number; R?: number; S?: number }) => {
    let latex = 'Q = \\frac{1}{n} \\cdot A \\cdot R^{2/3} \\cdot S^{1/2}';

    if (values) {
      latex = `Q = \\frac{1}{${values.n || 'n'}} \\cdot ${values.A || 'A'} \\cdot ${values.R || 'R'}^{2/3} \\cdot ${values.S || 'S'}^{1/2}`;
      if (values.Q) {
        latex += ` = ${values.Q.toFixed(4)} \\text{ m}^3\\text{/s}`;
      }
    }

    return renderEquation(latex);
  },

  /**
   * Hazen-Williams: hf = 10.67 * L / (C^1.852 * D^4.87) * Q^1.852
   */
  hazenWilliams: async (values?: { hf?: number; L?: number; C?: number; D?: number; Q?: number }) => {
    let latex = 'h_f = 10.67 \\cdot \\frac{L}{C^{1.852} \\cdot D^{4.87}} \\cdot Q^{1.852}';

    if (values && values.hf) {
      latex = `h_f = 10.67 \\cdot \\frac{${values.L}}{${values.C}^{1.852} \\cdot ${values.D}^{4.87}} \\cdot ${values.Q}^{1.852} = ${values.hf.toFixed(3)} \\text{ m}`;
    }

    return renderEquation(latex);
  },

  /**
   * Rational Method: Q = C * i * A * 2.78
   */
  rational: async (values?: { Q?: number; C?: number; i?: number; A?: number }) => {
    let latex = 'Q = C \\cdot i \\cdot A \\cdot 2.78';

    if (values && values.Q) {
      latex = `Q = ${values.C} \\cdot ${values.i} \\cdot ${values.A} \\cdot 2.78 = ${values.Q.toFixed(2)} \\text{ L/s}`;
    }

    return renderEquation(latex);
  },

  /**
   * Harmon Factor: M = 1 + 14/(4 + sqrt(P))
   */
  harmon: async (values?: { M?: number; P?: number }) => {
    let latex = 'M = 1 + \\frac{14}{4 + \\sqrt{P}}';

    if (values && values.M) {
      latex = `M = 1 + \\frac{14}{4 + \\sqrt{${values.P}}} = ${values.M.toFixed(3)}`;
    }

    return renderEquation(latex);
  },

  /**
   * Continuity: Q = V * A
   */
  continuity: async (values?: { Q?: number; V?: number; A?: number }) => {
    let latex = 'Q = V \\cdot A';

    if (values && values.Q) {
      latex = `Q = ${values.V} \\cdot ${values.A} = ${values.Q.toFixed(4)} \\text{ m}^3\\text{/s}`;
    }

    return renderEquation(latex);
  },

  /**
   * Hydraulic Radius: R = A / Pm
   */
  hydraulicRadius: async (values?: { R?: number; A?: number; Pm?: number }) => {
    let latex = 'R_h = \\frac{A}{P_m}';

    if (values && values.R) {
      latex = `R_h = \\frac{${values.A}}{${values.Pm}} = ${values.R.toFixed(4)} \\text{ m}`;
    }

    return renderEquation(latex);
  },

  /**
   * Froude Number: Fr = V / sqrt(g * yh)
   */
  froude: async (values?: { Fr?: number; V?: number; yh?: number }) => {
    let latex = 'Fr = \\frac{V}{\\sqrt{g \\cdot y_h}}';

    if (values && values.Fr) {
      latex = `Fr = \\frac{${values.V}}{\\sqrt{9.81 \\cdot ${values.yh}}} = ${values.Fr.toFixed(3)}`;
    }

    return renderEquation(latex);
  },
};
