'use client';

import { useState, useRef, useEffect } from 'react';
import { useCADStore } from '@/stores/cad-store';
import type { LineEntity, PointEntity, CircleEntity } from '@/types/cad';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIAssistantProps {
  className?: string;
}

// Simple command parser for the POC
function parseCommand(input: string): { action: string; params: Record<string, unknown> } | null {
  const lower = input.toLowerCase().trim();

  // Draw point command
  const pointMatch = lower.match(/(?:draw|add|create)\s+(?:a\s+)?point\s+(?:at\s+)?(\d+(?:\.\d+)?)\s*,?\s*(\d+(?:\.\d+)?)/);
  if (pointMatch) {
    return {
      action: 'draw_point',
      params: { x: parseFloat(pointMatch[1]), y: parseFloat(pointMatch[2]) },
    };
  }

  // Draw line command
  const lineMatch = lower.match(
    /(?:draw|add|create)\s+(?:a\s+)?line\s+(?:from\s+)?(\d+(?:\.\d+)?)\s*,?\s*(\d+(?:\.\d+)?)\s+(?:to\s+)?(\d+(?:\.\d+)?)\s*,?\s*(\d+(?:\.\d+)?)/
  );
  if (lineMatch) {
    return {
      action: 'draw_line',
      params: {
        x1: parseFloat(lineMatch[1]),
        y1: parseFloat(lineMatch[2]),
        x2: parseFloat(lineMatch[3]),
        y2: parseFloat(lineMatch[4]),
      },
    };
  }

  // Draw circle command
  const circleMatch = lower.match(
    /(?:draw|add|create)\s+(?:a\s+)?circle\s+(?:at\s+)?(\d+(?:\.\d+)?)\s*,?\s*(\d+(?:\.\d+)?)\s+(?:with\s+)?(?:radius\s+)?(\d+(?:\.\d+)?)/
  );
  if (circleMatch) {
    return {
      action: 'draw_circle',
      params: {
        x: parseFloat(circleMatch[1]),
        y: parseFloat(circleMatch[2]),
        radius: parseFloat(circleMatch[3]),
      },
    };
  }

  // Draw rectangle command
  const rectMatch = lower.match(
    /(?:draw|add|create)\s+(?:a\s+)?(?:rect(?:angle)?)\s+(?:at\s+)?(\d+(?:\.\d+)?)\s*,?\s*(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/
  );
  if (rectMatch) {
    return {
      action: 'draw_rectangle',
      params: {
        x: parseFloat(rectMatch[1]),
        y: parseFloat(rectMatch[2]),
        width: parseFloat(rectMatch[3]),
        height: parseFloat(rectMatch[4]),
      },
    };
  }

  // Clear command
  if (lower.includes('clear') && (lower.includes('all') || lower.includes('drawing'))) {
    return { action: 'clear_all', params: {} };
  }

  // Zoom commands
  if (lower.includes('zoom in')) {
    return { action: 'zoom_in', params: {} };
  }
  if (lower.includes('zoom out')) {
    return { action: 'zoom_out', params: {} };
  }

  // Select tool commands
  const toolMatch = lower.match(/(?:select|switch to|use)\s+(?:the\s+)?(point|line|circle|select|pan)\s+tool/);
  if (toolMatch) {
    return { action: 'select_tool', params: { tool: toolMatch[1] } };
  }

  // Toggle 3D
  if (lower.includes('3d') && (lower.includes('view') || lower.includes('mode') || lower.includes('switch'))) {
    return { action: 'toggle_3d', params: {} };
  }

  return null;
}

export default function AIAssistant({ className = '' }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        'Hello! I\'m your CAD AI assistant. I can help you draw and design. Try commands like:\n\n• "Draw a point at 100, 200"\n• "Draw a line from 0,0 to 100,100"\n• "Draw a circle at 50,50 with radius 25"\n• "Clear all"\n• "Switch to 3D view"',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { addEntity, clearEntities, setZoom, setActiveTool, toggle3D, viewState, activeLayer } =
    useCADStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const executeCommand = (command: { action: string; params: Record<string, unknown> }): string => {
    switch (command.action) {
      case 'draw_point': {
        const { x, y } = command.params as { x: number; y: number };
        const point: PointEntity = {
          id: `point_${Date.now()}`,
          type: 'point',
          layer: activeLayer,
          visible: true,
          selected: false,
          position: { x, y, z: 0 },
        };
        addEntity(point);
        return `Created point at (${x}, ${y})`;
      }

      case 'draw_line': {
        const { x1, y1, x2, y2 } = command.params as { x1: number; y1: number; x2: number; y2: number };
        const line: LineEntity = {
          id: `line_${Date.now()}`,
          type: 'line',
          layer: activeLayer,
          visible: true,
          selected: false,
          start: { x: x1, y: y1, z: 0 },
          end: { x: x2, y: y2, z: 0 },
        };
        addEntity(line);
        return `Created line from (${x1}, ${y1}) to (${x2}, ${y2})`;
      }

      case 'draw_circle': {
        const { x, y, radius } = command.params as { x: number; y: number; radius: number };
        const circle: CircleEntity = {
          id: `circle_${Date.now()}`,
          type: 'circle',
          layer: activeLayer,
          visible: true,
          selected: false,
          center: { x, y, z: 0 },
          radius,
        };
        addEntity(circle);
        return `Created circle at (${x}, ${y}) with radius ${radius}`;
      }

      case 'draw_rectangle': {
        const { x, y, width, height } = command.params as {
          x: number;
          y: number;
          width: number;
          height: number;
        };
        // Create 4 lines for rectangle
        const lines: LineEntity[] = [
          {
            id: `line_${Date.now()}_1`,
            type: 'line',
            layer: activeLayer,
            visible: true,
            selected: false,
            start: { x, y, z: 0 },
            end: { x: x + width, y, z: 0 },
          },
          {
            id: `line_${Date.now()}_2`,
            type: 'line',
            layer: activeLayer,
            visible: true,
            selected: false,
            start: { x: x + width, y, z: 0 },
            end: { x: x + width, y: y + height, z: 0 },
          },
          {
            id: `line_${Date.now()}_3`,
            type: 'line',
            layer: activeLayer,
            visible: true,
            selected: false,
            start: { x: x + width, y: y + height, z: 0 },
            end: { x, y: y + height, z: 0 },
          },
          {
            id: `line_${Date.now()}_4`,
            type: 'line',
            layer: activeLayer,
            visible: true,
            selected: false,
            start: { x, y: y + height, z: 0 },
            end: { x, y, z: 0 },
          },
        ];
        lines.forEach((line) => addEntity(line));
        return `Created rectangle at (${x}, ${y}) with size ${width}x${height}`;
      }

      case 'clear_all':
        clearEntities();
        return 'Cleared all entities from the drawing';

      case 'zoom_in':
        setZoom(viewState.zoom * 1.5);
        return 'Zoomed in';

      case 'zoom_out':
        setZoom(viewState.zoom / 1.5);
        return 'Zoomed out';

      case 'select_tool': {
        const { tool } = command.params as { tool: string };
        setActiveTool(tool as 'point' | 'line' | 'circle' | 'select' | 'pan');
        return `Switched to ${tool} tool`;
      }

      case 'toggle_3d':
        toggle3D();
        return `Switched to ${viewState.is3D ? '2D' : '3D'} view`;

      default:
        return 'Unknown command';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    // Parse and execute command
    const command = parseCommand(input);
    let responseText: string;

    if (command) {
      responseText = executeCommand(command);
    } else {
      responseText =
        'I didn\'t understand that command. Try:\n• "Draw a point at X, Y"\n• "Draw a line from X1,Y1 to X2,Y2"\n• "Draw a circle at X,Y with radius R"\n• "Draw a rectangle at X,Y 100x50"';
    }

    const assistantMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: responseText,
      timestamp: new Date(),
    };

    setTimeout(() => {
      setMessages((prev) => [...prev, assistantMessage]);
      setIsProcessing(false);
    }, 300);
  };

  return (
    <div className={`flex flex-col bg-cad-panel border-l border-cad-accent ${className}`}>
      {/* Header */}
      <div className="p-3 border-b border-cad-accent">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <span className="text-cad-highlight">AI</span> Assistant
        </h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`p-2 rounded-lg ${
              message.role === 'user'
                ? 'bg-cad-accent text-white ml-4'
                : 'bg-cad-bg text-gray-300 mr-4'
            }`}
          >
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          </div>
        ))}
        {isProcessing && (
          <div className="bg-cad-bg text-gray-400 p-2 rounded-lg mr-4">
            <p className="text-sm animate-pulse">Processing...</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-cad-accent">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a command..."
            className="flex-1 bg-cad-bg border border-cad-accent rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-cad-highlight"
            disabled={isProcessing}
          />
          <button
            type="submit"
            disabled={isProcessing || !input.trim()}
            className="bg-cad-highlight text-white px-4 py-2 rounded text-sm font-medium hover:bg-cad-highlight/80 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
