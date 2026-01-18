'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const shortcuts: Shortcut[] = [
  // Drawing Tools
  { keys: ['L'], description: 'Line tool', category: 'Drawing Tools' },
  { keys: ['C'], description: 'Circle tool', category: 'Drawing Tools' },
  { keys: ['PL'], description: 'Polyline tool', category: 'Drawing Tools' },
  { keys: ['A'], description: 'Arc tool', category: 'Drawing Tools' },
  { keys: ['REC'], description: 'Rectangle tool', category: 'Drawing Tools' },
  { keys: ['T'], description: 'Text tool', category: 'Drawing Tools' },

  // Editing Tools
  { keys: ['O'], description: 'Offset tool', category: 'Editing Tools' },
  { keys: ['TR'], description: 'Trim tool', category: 'Editing Tools' },
  { keys: ['EX'], description: 'Extend tool', category: 'Editing Tools' },
  { keys: ['F'], description: 'Fillet tool', category: 'Editing Tools' },
  { keys: ['M'], description: 'Move tool', category: 'Editing Tools' },
  { keys: ['CO'], description: 'Copy tool', category: 'Editing Tools' },
  { keys: ['RO'], description: 'Rotate tool', category: 'Editing Tools' },
  { keys: ['AR'], description: 'Array tool', category: 'Editing Tools' },

  // Drawing Aids
  { keys: ['F3'], description: 'Toggle snap', category: 'Drawing Aids' },
  { keys: ['F8'], description: 'Toggle ortho mode', category: 'Drawing Aids' },
  { keys: ['Shift', 'G'], description: 'Toggle grid display', category: 'Drawing Aids' },

  // Selection
  { keys: ['Ctrl', 'A'], description: 'Select all', category: 'Selection' },
  { keys: ['Esc'], description: 'Deselect all', category: 'Selection' },
  { keys: ['Del'], description: 'Delete selected', category: 'Selection' },

  // View Control
  { keys: ['Mouse Wheel'], description: 'Zoom in/out', category: 'View Control' },
  { keys: ['Middle Click + Drag'], description: 'Pan view', category: 'View Control' },
  { keys: ['Shift', 'Z'], description: 'Zoom extents', category: 'View Control' },

  // History
  { keys: ['Ctrl', 'Z'], description: 'Undo', category: 'History' },
  { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo', category: 'History' },

  // General
  { keys: ['⌘', 'K'], description: 'Command palette', category: 'General' },
  { keys: ['F1'], description: 'Show shortcuts help', category: 'General' },
  { keys: ['?'], description: 'Show shortcuts help', category: 'General' },
];

const categories = Array.from(new Set(shortcuts.map((s) => s.category)));

export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F1 or ? to toggle help
      if (e.key === 'F1' || (e.key === '?' && !e.ctrlKey && !e.metaKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      // Escape to close
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => setOpen(false)}
          />

          {/* Help Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed top-[10%] left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl"
          >
            <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-gray-800">
                <div className="flex items-center gap-3">
                  <Keyboard size={20} className="text-blue-400" />
                  <h2 className="text-lg font-semibold text-white">Keyboard Shortcuts</h2>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-700"
                  title="Close (Esc)"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="max-h-[70vh] overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {categories.map((category) => (
                    <div key={category}>
                      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        {category}
                      </h3>
                      <div className="space-y-2">
                        {shortcuts
                          .filter((s) => s.category === category)
                          .map((shortcut, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-800/50 transition-colors"
                            >
                              <span className="text-sm text-gray-300">{shortcut.description}</span>
                              <div className="flex items-center gap-1">
                                {shortcut.keys.map((key, keyIdx) => (
                                  <span key={keyIdx} className="flex items-center gap-1">
                                    <kbd className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-xs text-gray-300 font-mono shadow-sm">
                                      {key}
                                    </kbd>
                                    {keyIdx < shortcut.keys.length - 1 && (
                                      <span className="text-gray-500 text-xs">+</span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-3 border-t border-gray-700 bg-gray-800 text-xs text-gray-500">
                <span>Press <kbd className="px-1.5 py-0.5 bg-gray-700 rounded">F1</kbd> or <kbd className="px-1.5 py-0.5 bg-gray-700 rounded">?</kbd> to toggle</span>
                <span>Press <kbd className="px-1.5 py-0.5 bg-gray-700 rounded">Esc</kbd> to close</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
