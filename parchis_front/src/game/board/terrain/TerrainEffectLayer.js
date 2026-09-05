import React from 'react';
import { BOARD_VIEW_BOX_SIZE, getBoardCell } from '../boardGeometry';
import { getTerrainEffectRenderer } from './terrainVisualRegistry';
import './TerrainEffectLayer.css';

export function TerrainEffectLayer({ terrainEffectsByPositionKey = {} }) {
  const renderedEffects = Object.entries(terrainEffectsByPositionKey).flatMap(
    ([positionKey, effects]) => (effects || []).map((effect, effectIndex) => {
      const Renderer = getTerrainEffectRenderer(effect.type);
      const position = effect.data?.position;
      const cell = getBoardCell(position, effect.source?.factionId);

      if (!Renderer || !cell) {
        return null;
      }

      const instanceId = `${positionKey}-${effect.id || effectIndex}`;

      return (
        <Renderer
          key={instanceId}
          effect={effect}
          cell={cell}
          positionKey={positionKey}
          instanceId={instanceId}
        />
      );
    }),
  ).filter(Boolean);

  if (renderedEffects.length === 0) {
    return null;
  }

  return (
    <svg
      className="game-board__terrain-surface"
      viewBox={`0 0 ${BOARD_VIEW_BOX_SIZE} ${BOARD_VIEW_BOX_SIZE}`}
      aria-label="Efectos de terreno"
      focusable="false"
      pointerEvents="none"
    >
      {renderedEffects}
    </svg>
  );
}

export default TerrainEffectLayer;
