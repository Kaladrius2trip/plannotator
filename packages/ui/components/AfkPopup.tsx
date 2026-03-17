import React from "react";

export interface AfkPopupProps {
  isOpen: boolean;
  remaining: number;
  total: number;
  onDismiss: () => void;
}

export const AfkPopup: React.FC<AfkPopupProps> = ({
  isOpen,
  remaining,
  total,
  onDismiss,
}) => {
  if (!isOpen) return null;

  const size = 180;
  const stroke = 4;
  const padding = 12;
  const radius = (size - padding * 2 - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = radius * 2 * Math.PI;
  const fraction = remaining / total;
  const offset = circumference * (1 - fraction);

  // Dot sits at (cx + radius, cy) in a <g> rotated to the arc's end
  const dotAngle = -90 + fraction * 360;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl p-6 flex flex-col items-center gap-4 max-w-xs w-full">
        {/* Ring */}
        <div
          className="relative flex items-center justify-center"
          style={{ width: size, height: size }}
        >
          <svg
            width={size}
            height={size}
            className="absolute inset-0"
            viewBox={`0 0 ${size} ${size}`}
          >
            <defs>
              <filter
                id="ring-glow"
                x="-50%"
                y="-50%"
                width="200%"
                height="200%"
              >
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter
                id="dot-glow"
                x="-300%"
                y="-300%"
                width="700%"
                height="700%"
              >
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Background track */}
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke="var(--border)"
              strokeWidth={stroke}
              opacity={0.4}
            />

            {/* Active ring */}
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke="var(--success)"
              strokeWidth={stroke}
              strokeDasharray={circumference}
              strokeLinecap="round"
              filter="url(#ring-glow)"
              className="transition-[stroke-dashoffset] duration-1000 ease-linear"
              style={{
                strokeDashoffset: offset,
                transformOrigin: `${cx}px ${cy}px`,
                transform: "rotate(-90deg)",
              }}
            />

            {/* Glowing dot at arc tip */}
            {fraction > 0 && (
              <g
                className="transition-transform duration-1000 ease-linear"
                style={{
                  transformOrigin: `${cx}px ${cy}px`,
                  transform: `rotate(${dotAngle}deg)`,
                }}
              >
                <circle
                  cx={cx + radius}
                  cy={cy}
                  r={5}
                  fill="var(--success)"
                  filter="url(#dot-glow)"
                />
              </g>
            )}
          </svg>

          {/* Center text */}
          <div className="absolute flex flex-col items-center select-none">
            <span className="text-5xl font-bold text-foreground leading-none">
              {remaining}
            </span>
            <span className="text-sm text-muted-foreground mt-1">Seconds</span>
          </div>
        </div>

        {/* Actions */}
        <div className="text-center flex flex-col gap-3 w-full">
          <p className="text-muted-foreground text-xs">
            Plan will be auto-approved
          </p>
          <button
            onClick={onDismiss}
            className="bg-primary text-primary-foreground hover:opacity-90 px-4 py-2 rounded-md text-sm font-medium w-full transition-opacity"
          >
            I'm Reviewing
          </button>
        </div>
      </div>
    </div>
  );
};
