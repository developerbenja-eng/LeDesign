// ============================================================
// HISTORY SLICE
// Manages undo/redo command history
// ============================================================

import { SliceCreator, HistorySlice, CommandEntry } from './types';

const MAX_HISTORY_SIZE = 100;

export const createHistorySlice: SliceCreator<HistorySlice> = (set, get) => ({
  // Initial state
  undoStack: [],
  redoStack: [],
  maxHistorySize: MAX_HISTORY_SIZE,

  // Actions
  pushCommand: (command: CommandEntry) =>
    set((state) => {
      // Add to undo stack
      state.undoStack.push(command);

      // Trim if exceeds max size
      if (state.undoStack.length > state.maxHistorySize) {
        state.undoStack.shift();
      }

      // Clear redo stack when new command is pushed
      state.redoStack = [];
    }),

  undo: () => {
    const state = get();
    if (state.undoStack.length === 0) return null;

    const command = state.undoStack[state.undoStack.length - 1];

    set((s) => {
      const cmd = s.undoStack.pop();
      if (cmd) {
        s.redoStack.push(cmd);
      }
    });

    return command;
  },

  redo: () => {
    const state = get();
    if (state.redoStack.length === 0) return null;

    const command = state.redoStack[state.redoStack.length - 1];

    set((s) => {
      const cmd = s.redoStack.pop();
      if (cmd) {
        s.undoStack.push(cmd);
      }
    });

    return command;
  },

  clearHistory: () =>
    set((state) => {
      state.undoStack = [];
      state.redoStack = [];
    }),
});
