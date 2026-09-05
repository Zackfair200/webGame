import React from 'react';

export function FrozenCharacterStatus({ effect }) {
  return (
    <span
      className="character-status character-status--frozen"
      data-character-status-type={effect.type}
      data-character-status-id={effect.id}
      aria-hidden="true"
    >
      <span className="character-status__frozen-frame" />
      <span className="character-status__frozen-icon">&#10052;</span>
    </span>
  );
}

export default FrozenCharacterStatus;
