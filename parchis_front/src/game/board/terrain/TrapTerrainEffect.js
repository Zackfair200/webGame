import React from 'react';

export function TrapTerrainEffect({ effect, cell, positionKey, instanceId }) {
  const inset = Math.min(cell.width, cell.height) * 0.055;
  const radius = Math.min(cell.width, cell.height) * 0.13;
  const safeInstanceId = instanceId.replace(/[^a-zA-Z0-9_-]/g, '-');
  const clipId = `terrain-trap-clip-${safeInstanceId}`;
  const gradientId = `terrain-trap-gradient-${safeInstanceId}`;
  const glowId = `terrain-trap-glow-${safeInstanceId}`;
  const left = cell.x + inset;
  const top = cell.y + inset;
  const width = cell.width - (inset * 2);
  const height = cell.height - (inset * 2);

  return (
    <g
      className="terrain-effect terrain-effect--trap"
      data-terrain-effect-type={effect.type}
      data-terrain-position-key={positionKey}
      data-terrain-source-character-id={effect.source?.sourceCharacterId}
      pointerEvents="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e8e8e8" stopOpacity="0.55" />
          <stop offset="48%" stopColor="#9a9a9a" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#4a4a4a" stopOpacity="0.4" />
        </linearGradient>
        <filter
          id={glowId}
          x="-35%"
          y="-35%"
          width="170%"
          height="170%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.8" result="blur" />
          <feFlood floodColor="#c8c8c8" floodOpacity="0.5" result="glowColor" />
          <feComposite in="glowColor" in2="blur" operator="in" result="softGlow" />
          <feMerge>
            <feMergeNode in="softGlow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <clipPath id={clipId}>
          <rect x={left} y={top} width={width} height={height} rx={radius} />
        </clipPath>
      </defs>
      <rect
        className="terrain-effect__trap-glow"
        x={left}
        y={top}
        width={width}
        height={height}
        rx={radius}
        fill={`url(#${gradientId})`}
        filter={`url(#${glowId})`}
      />
      <rect
        className="terrain-effect__trap-wash"
        x={left}
        y={top}
        width={width}
        height={height}
        rx={radius}
        fill={`url(#${gradientId})`}
        data-terrain-cell-x={cell.x}
        data-terrain-cell-y={cell.y}
        data-terrain-cell-width={cell.width}
        data-terrain-cell-height={cell.height}
      />
      <g className="terrain-effect__trap-teeth" clipPath={`url(#${clipId})`}>
        <path d={`M ${left + (width * 0.15)} ${top + (height * 0.55)} L ${left + (width * 0.28)} ${top + (height * 0.25)} L ${left + (width * 0.41)} ${top + (height * 0.55)} L ${left + (width * 0.54)} ${top + (height * 0.22)} L ${left + (width * 0.67)} ${top + (height * 0.55)} L ${left + (width * 0.8)} ${top + (height * 0.28)}`} />
      </g>
      <g className="terrain-effect__trap-plate" clipPath={`url(#${clipId})`}>
        <ellipse
          cx={cell.x + (cell.width * 0.5)}
          cy={cell.y + (cell.height * 0.5)}
          rx={Math.max(4, cell.width * 0.16)}
          ry={Math.max(3, cell.height * 0.12)}
        />
        <ellipse
          cx={cell.x + (cell.width * 0.5)}
          cy={cell.y + (cell.height * 0.5)}
          rx={Math.max(2, cell.width * 0.08)}
          ry={Math.max(1.5, cell.height * 0.06)}
        />
      </g>
      <rect
        className="terrain-effect__trap-border"
        x={left}
        y={top}
        width={width}
        height={height}
        rx={radius}
      />
    </g>
  );
}

export default TrapTerrainEffect;