import { assertCharactersArray, getOccupantsAtPosition } from '../../occupancy/occupancy';
import { getFactionIds } from '../../factions/factions';
import { clonePosition, isPlayablePosition, isSamePosition } from '../../state/positions';

function assertValidFactionId(factionId) {
  if (!getFactionIds().includes(factionId)) {
    throw new Error(`Invalid faction id: ${factionId}`);
  }
}

function hasPosition(positions, position) {
  return positions.some((existingPosition) => isSamePosition(existingPosition, position));
}

function createBarrierResult(barrier) {
  return {
    position: clonePosition(barrier.position),
    factionId: barrier.factionId,
    occupants: barrier.occupants,
  };
}

export function getBarrierAtPosition({ position, characters }) {
  assertCharactersArray(characters);

  if (!isPlayablePosition(position)) {
    return { exists: false };
  }

  const occupants = getOccupantsAtPosition({ position, characters });

  if (occupants.length > 2) {
    throw new Error('Cannot evaluate barrier at a position with more than two occupants.');
  }

  if (occupants.length !== 2 || occupants[0].factionId !== occupants[1].factionId) {
    return { exists: false };
  }

  return {
    exists: true,
    position: clonePosition(position),
    factionId: occupants[0].factionId,
    occupants,
  };
}

export function isBarrierAtPosition({ position, characters }) {
  return getBarrierAtPosition({ position, characters }).exists;
}

export function getBarriersForFaction({ factionId, characters }) {
  assertCharactersArray(characters);
  assertValidFactionId(factionId);

  const candidatePositions = [];

  characters.forEach((character) => {
    if (character.factionId !== factionId || !isPlayablePosition(character.position)) {
      return;
    }

    if (!hasPosition(candidatePositions, character.position)) {
      candidatePositions.push(character.position);
    }
  });

  return candidatePositions
    .map((position) => getBarrierAtPosition({ position, characters }))
    .filter((barrier) => barrier.exists && barrier.factionId === factionId)
    .map(createBarrierResult);
}

export function checkPathBlockedByBarrier({ path, characters, movingCharacterId }) {
  if (!Array.isArray(path)) {
    throw new Error('Path is required to check barrier blocking.');
  }

  assertCharactersArray(characters);

  if (movingCharacterId === undefined || movingCharacterId === null || movingCharacterId === '') {
    throw new Error('movingCharacterId is required to check barrier blocking.');
  }

  if (!characters.some((character) => character.id === movingCharacterId)) {
    throw new Error(`movingCharacterId does not match an existing character: ${movingCharacterId}`);
  }

  const charactersWithoutMovingCharacter = characters.filter(
    (character) => character.id !== movingCharacterId,
  );

  for (let pathIndex = 0; pathIndex < path.length; pathIndex += 1) {
    const position = path[pathIndex];

    if (!isPlayablePosition(position)) {
      continue;
    }

    const barrier = getBarrierAtPosition({
      position,
      characters: charactersWithoutMovingCharacter,
    });

    if (barrier.exists) {
      return {
        blocked: true,
        reason: 'barrier',
        position: clonePosition(barrier.position),
        pathIndex,
      };
    }
  }

  return { blocked: false };
}
