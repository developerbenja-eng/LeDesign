/**
 * Type declarations for latex.js
 *
 * latex.js is a LaTeX to HTML/MathML converter for JavaScript
 * https://github.com/nickstenning/latex.js
 */

declare module 'latex.js' {
  export interface ParserOptions {
    // Generator to use (defaults to HtmlGenerator)
    generator?: Generator;
  }

  export interface Generator {
    reset(): void;
    htmlDocument(): string;
  }

  export class HtmlGenerator implements Generator {
    constructor(options?: HtmlGeneratorOptions);
    reset(): void;
    htmlDocument(): string;
    stylesAndScripts(baseURL?: string): string;
  }

  export interface HtmlGeneratorOptions {
    hyphenate?: boolean;
    languagePatterns?: unknown;
  }

  export function parse(
    latex: string,
    options?: ParserOptions
  ): {
    htmlDocument(): string;
  };

  export default {
    parse,
    HtmlGenerator,
  };
}
