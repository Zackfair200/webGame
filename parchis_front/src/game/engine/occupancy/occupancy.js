import { clonePosition, isPlayablePosition, isSamePosition } from '../state/positions';

function cloneCharacter(character) {
  return {
    ...character,
    position: clonePosition(character.position),
  };
}

export function assertCharactersArray(characters) {
  if (!Array.isArray(characters)) {
    throw new Error('characters must be an array.');
  }
}

export function getOccupantsAtPosition({ position, characters }) {
  assertCharactersArray(characters);

  if (!isPlayablePosition(position)) {
    return [];
  }

  return characters
    .filter((character) => isSamePosition(character.position, position))
    .map(cloneCharacter);
}
