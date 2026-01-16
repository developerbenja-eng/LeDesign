'use client';

// ============================================================
// AI CHAT PANEL
// Natural language interface for model creation and modification
// ============================================================

import { useState, useRef, useEffect } from 'react';
import { useEditorStore } from '@/stores';
import { X, Send, Bot, User, Sparkles } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  command?: string;
}

export function AIChatPanel() {
  const togglePanel = useEditorStore((state) => state.togglePanel);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I can help you create and modify your structural model. Try saying things like:\n\n- "Create a 20ft x 30ft frame"\n- "Add a pinned support at node 1"\n- "Change all beam sections to W14X30"\n- "Run analysis"',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    // Simulate AI processing (replace with actual AI integration)
    setTimeout(() => {
      const response = processCommand(input);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        command: response.command,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsProcessing(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full bg-lele-panel flex flex-col">
      {/* Header */}
      <div className="h-10 px-3 flex items-center justify-between border-b border-lele-border shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-lele-accent" />
          <h2 className="text-sm font-medium text-slate-200">AI Assistant</h2>
        </div>
        <button
          onClick={() => togglePanel('aiChatPanel')}
          className="p-1 hover:bg-lele-bg rounded transition-colors"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {isProcessing && (
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-lele-accent/20 flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-lele-accent" />
            </div>
            <div className="flex items-center gap-1 py-2">
              <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-lele-border">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Describe what you want to create..."
            rows={2}
            className="flex-1 bg-lele-bg border border-lele-border rounded-lg px-3 py-2 text-sm text-slate-200 resize-none focus:border-lele-accent focus:outline-none placeholder:text-slate-600"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className="p-2 bg-lele-accent hover:bg-blue-600 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-2 text-xs text-slate-600">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CHAT MESSAGE
// ============================================================

function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
          isUser ? 'bg-emerald-600/20' : 'bg-lele-accent/20'
        }`}
      >
        {isUser ? (
          <User className="w-3.5 h-3.5 text-emerald-500" />
        ) : (
          <Bot className="w-3.5 h-3.5 text-lele-accent" />
        )}
      </div>
      <div
        className={`rounded-lg px-3 py-2 max-w-[85%] ${
          isUser
            ? 'bg-emerald-600/20 text-slate-200'
            : 'bg-lele-bg text-slate-300'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        {message.command && (
          <div className="mt-2 px-2 py-1 bg-slate-800 rounded text-xs font-mono text-slate-400">
            {message.command}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// COMMAND PROCESSOR (PLACEHOLDER)
// Replace with actual AI command parsing
// ============================================================

function processCommand(input: string): { message: string; command?: string } {
  const lower = input.toLowerCase();

  if (lower.includes('create') && lower.includes('frame')) {
    return {
      message: "I'll create a frame structure for you. This will include nodes at the corners and beams connecting them.",
      command: 'CreateFrameCommand { width: 20, length: 30 }',
    };
  }

  if (lower.includes('support') || lower.includes('pin') || lower.includes('fix')) {
    return {
      message: "I can help you set support conditions. Please select a node first, then I'll apply the support type you specify.",
      command: 'SetSupportCommand { type: "pinned" }',
    };
  }

  if (lower.includes('section') || lower.includes('w14') || lower.includes('w12')) {
    return {
      message: "I'll update the section for the selected elements. Make sure you have beams or columns selected.",
      command: 'UpdateSectionCommand { section: "W14X30" }',
    };
  }

  if (lower.includes('analysis') || lower.includes('run')) {
    return {
      message: "Starting structural analysis. This will calculate displacements, reactions, and member forces.",
      command: 'RunAnalysisCommand { type: "static" }',
    };
  }

  return {
    message: "I understand you want to modify the model, but I need a bit more context. Try being more specific about what you'd like to create or change.",
  };
}
