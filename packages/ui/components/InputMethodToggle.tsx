import React from 'react';
import type { InputMethod } from '../types';

interface InputMethodToggleProps {
  method: InputMethod;
  onChange: (method: InputMethod) => void;
}

export const InputMethodToggle: React.FC<InputMethodToggleProps> = ({ method, onChange }) => (
  <div className="inline-flex items-center bg-muted/50 rounded-lg p-0.5 border border-border/30">
    <button
      onClick={() => onChange('drag')}
      className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
        method === 'drag'
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground'
      }`}
      title="Drag to select text"
    >
      {/* Text selection cursor icon */}
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 3h14" />
        <path d="M12 3v18" />
        <path d="M5 21h14" />
      </svg>
      <span className="hidden sm:inline">Drag</span>
    </button>
    <button
      onClick={() => onChange('pinpoint')}
      className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
        method === 'pinpoint'
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground'
      }`}
      title="Click to select elements"
    >
      {/* Crosshair/target icon */}
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v4" />
        <path d="M12 18v4" />
        <path d="M2 12h4" />
        <path d="M18 12h4" />
      </svg>
      <span className="hidden sm:inline">Pinpoint</span>
    </button>
  </div>
);
