'use client';

/**
 * Text Editor Component
 *
 * Rich text editor for text sections using contenteditable.
 * Supports basic formatting: bold, italic, lists, headings.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import type { TextContent } from '@/types/documents';

interface TextEditorProps {
  content: TextContent;
  onChange: (content: TextContent) => void;
  placeholder?: string;
}

const TOOLBAR_BUTTONS = [
  { command: 'bold', icon: 'B', title: 'Negrita (Ctrl+B)' },
  { command: 'italic', icon: 'I', title: 'Cursiva (Ctrl+I)' },
  { command: 'underline', icon: 'U', title: 'Subrayado (Ctrl+U)' },
  { separator: true },
  { command: 'insertUnorderedList', icon: '•', title: 'Lista sin orden' },
  { command: 'insertOrderedList', icon: '1.', title: 'Lista ordenada' },
  { separator: true },
  { command: 'formatBlock:H3', icon: 'H3', title: 'Subtítulo' },
  { command: 'formatBlock:H4', icon: 'H4', title: 'Sub-subtítulo' },
  { command: 'formatBlock:P', icon: '¶', title: 'Párrafo normal' },
] as const;

export function TextEditor({ content, onChange, placeholder = 'Escribe aquí...' }: TextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Initialize content
  useEffect(() => {
    if (editorRef.current && content.html !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = content.html || '';
    }
  }, [content.html]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange({ type: 'text', html: editorRef.current.innerHTML });
    }
  }, [onChange]);

  const execCommand = useCallback((command: string) => {
    if (command.startsWith('formatBlock:')) {
      const tag = command.split(':')[1];
      document.execCommand('formatBlock', false, tag);
    } else {
      document.execCommand(command, false);
    }
    editorRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Handle Tab for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand('insertText', false, '\t');
    }
  }, []);

  return (
    <div className="text-editor border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="toolbar flex items-center gap-1 p-2 bg-gray-50 border-b">
        {TOOLBAR_BUTTONS.map((btn, idx) => (
          'separator' in btn ? (
            <div key={idx} className="w-px h-5 bg-gray-300 mx-1" />
          ) : (
            <button
              key={btn.command}
              type="button"
              onClick={() => execCommand(btn.command)}
              title={btn.title}
              className="px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded transition-colors"
            >
              {btn.icon}
            </button>
          )
        ))}
      </div>

      {/* Editor */}
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          className="min-h-[200px] p-4 focus:outline-none prose prose-sm max-w-none"
          onInput={handleInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          suppressContentEditableWarning
        />

        {/* Placeholder */}
        {!content.html && !isFocused && (
          <div className="absolute top-4 left-4 text-gray-400 pointer-events-none">
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
}

export default TextEditor;
