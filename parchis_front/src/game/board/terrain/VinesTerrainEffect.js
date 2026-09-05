import React from 'react';

function createCurvePoints(cell) {
  const { x, y, width, height } = cell;

  return {
    first: `M ${x + (width * 0.08)} ${y + (height * 0.82)} C ${x + (width * 0.28)} ${y + (height * 0.38)}, ${x + (width * 0.62)} ${y + (height * 0.72)}, ${x + (width * 0.92)} ${y + (height * 0.16)}`,
    second: `M ${x + (width * 0.12)} ${y + (height * 0.22)} C ${x + (width * 0.42)} ${y + (height * 0.58)}, ${x + (width * 0.64)} ${y + (height * 0.28)}, ${x + (width * 0.88)} ${y + (height * 0.78)}`,
  };
}

export function VinesTerrainEffect({ effect, cell, positionKey, instanceId }) {
  const inset = Math.min(cell.width, cell.height) * 0.055;
  const radius = Math.min(cell.width, cell.height) * 0.13;
  const curves = createCurvePoints(cell);
  const safeInstanceId = instanceId.replace(/[^a-zA-Z0-9_-]/g, '-');
  const clipId = `terrain-vines-clip-${safeInstanceId}`;
  const gradientId = `terrain-vines-gradient-${safeInstanceId}`;
  const glowId = `terrain-vines-glow-${safeInstanceId}`;

  return (
    <g
      className="terrain-effect terrain-effect--vines"
      data-terrain-effect-type={effect.type}
      data-terrain-position-key={positionKey}
      data-terrain-source-character-id={effect.source?.sourceCharacterId}
      pointerEvents="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8cf5aa" stopOpacity="0.3" />
          <stop offset="48%" stopColor="#2fd36f" stopOpacity="0.62" />
          <stop offset="100%" stopColor="#08743b" stopOpacity="0.44" />
        </linearGradient>
        <filter
          id={glowId}
          x="-45%"
          y="-45%"
          width="190%"
          height="190%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
          <feFlood floodColor="#42ed83" floodOpacity="0.7" result="glowColor" />
          <feComposite in="glowColor" in2="blur" operator="in" result="softGlow" />
          <feMerge>
            <feMergeNode in="softGlow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <clipPath id={clipId}>
          <rect
            x={cell.x + inset}
            y={cell.y + inset}
            width={cell.width - (inset * 2)}
            height={cell.height - (inset * 2)}
            rx={radius}
          />
        </clipPath>
      </defs>
      <rect
        className="terrain-effect__vines-glow"
        x={cell.x + inset}
        y={cell.y + inset}
        width={cell.width - (inset * 2)}
        height={cell.height - (inset * 2)}
        rx={radius}
        fill={`url(#${gradientId})`}
        filter={`url(#${glowId})`}
      />
      <rect
        className="terrain-effect__vines-wash"
        x={cell.x + inset}
        y={cell.y + inset}
        width={cell.width - (inset * 2)}
        height={cell.height - (inset * 2)}
        rx={radius}
        fill={`url(#${gradientId})`}
        data-terrain-cell-x={cell.x}
        data-terrain-cell-y={cell.y}
        data-terrain-cell-width={cell.width}
        data-terrain-cell-height={cell.height}
      />
      <g clipPath={`url(#${clipId})`}>
        <path className="terrain-effect__vine terrain-effect__vine--primary" d={curves.first} />
        <path className="terrain-effect__vine terrain-effect__vine--secondary" d={curves.second} />
        <ellipse
          className="terrain-effect__leaf"
          cx={cell.x + (cell.width * 0.31)}
          cy={cell.y + (cell.height * 0.47)}
          rx={Math.max(3, cell.width * 0.075)}
          ry={Math.max(2, cell.height * 0.045)}
          transform={`rotate(-28 ${cell.x + (cell.width * 0.31)} ${cell.y + (cell.height * 0.47)})`}
        />
        <ellipse
          className="terrain-effect__leaf terrain-effect__leaf--pale"
          cx={cell.x + (cell.width * 0.7)}
          cy={cell.y + (cell.height * 0.55)}
          rx={Math.max(3, cell.width * 0.075)}
          ry={Math.max(2, cell.height * 0.045)}
          transform={`rotate(32 ${cell.x + (cell.width * 0.7)} ${cell.y + (cell.height * 0.55)})`}
        />
      </g>
      <rect
        className="terrain-effect__vines-border"
        x={cell.x + inset}
        y={cell.y + inset}
        width={cell.width - (inset * 2)}
        height={cell.height - (inset * 2)}
        rx={radius}
      />
    </g>
  );
}

export default VinesTerrainEffect;
