import React from 'react';
import type { ResizeHandleProps as BaseProps } from '../hooks/useResizablePanel';

interface Props extends BaseProps {
  className?: string;
  /** Which side of the content the handle is on — extends touch area away from content */
  side?: 'left' | 'right';
}

export const ResizeHandle: React.FC<Props> = ({
  isDragging,
  onMouseDown,
  onTouchStart,
  onDoubleClick,
  className,
  side,
}) => (
  <div
    className={`relative w-1 cursor-col-resize flex-shrink-0 group${className ? ` ${className}` : ''}`}
  >
    {/* Visible track */}
    <div className={`absolute inset-y-0 inset-x-0 transition-colors ${
      isDragging ? 'bg-primary/50' : 'group-hover:bg-border'
    }`} />
    {/* Wider touch area — extends outward from content to avoid covering scrollbar */}
    <div
      className={`absolute inset-y-0 ${
        side === 'left' ? 'right-0 -left-2' :
        side === 'right' ? 'left-0 -right-2' :
        '-inset-x-2'
      }`}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onDoubleClick={onDoubleClick}
    />
  </div>
);
