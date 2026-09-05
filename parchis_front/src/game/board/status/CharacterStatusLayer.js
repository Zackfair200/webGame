import React from 'react';
import { getCharacterStatusPresentation } from './characterStatusVisualRegistry';
import './CharacterStatusLayer.css';

export function getCharacterStatusLabels(effects = []) {
  return effects.flatMap((effect) => {
    const presentation = getCharacterStatusPresentation(effect.type);

    return presentation ? [presentation.label] : [];
  });
}

export function CharacterStatusLayer({ characterId, effects = [] }) {
  const renderedStatuses = effects.flatMap((effect, index) => {
    const presentation = getCharacterStatusPresentation(effect.type);

    if (!presentation) {
      return [];
    }

    const { Renderer } = presentation;

    return [(
      <Renderer
        key={effect.id || `${effect.type}:${index}`}
        effect={effect}
        characterId={characterId}
      />
    )];
  });

  if (renderedStatuses.length === 0) {
    return null;
  }

  return (
    <span className="character-status-layer" data-character-status-layer aria-hidden="true">
      {renderedStatuses}
    </span>
  );
}

export default CharacterStatusLayer;
