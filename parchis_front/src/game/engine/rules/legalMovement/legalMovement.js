import { getFactionIds } from '../../factions/factions';
import { calculateMovementPath } from '../../movement/movement';
import { assertValidMovementSteps } from '../../movement/validation';
import { assertCharactersArray } from '../../occupancy/occupancy';
import { checkPathBlockedByBarrier } from '../barriers/barriers';
import { POSITION_TYPES, isValidPosition } from '../../state/positions';

export const LEGAL_MOVEMENT_FAILURE_REASONS = Object.freeze({
  CHARACTER_AT_HOME: 'characterAtHome',
  CHARACTER_AT_GOAL: 'characterAtGoal',
  BARRIER: 'barrier',
});

function getCharacterById({ characterId, characters }) {
  const matchingCharacters = characters.filter((character) => character.id === characterId);

  if (matchingCharacters.length === 0) {
    throw new Error(`characterId does not match an existing character: ${characterId}`);
  }

  if (matchingCharacters.length > 1) {
    throw new Error(`Duplicate character id: ${characterId}`);
  }

  return matchingCharacters[0];
}

function assertValidCharacterFaction(factionId) {
  if (!getFactionIds().includes(factionId)) {
    throw new Error(`Invalid character faction id: ${factionId}`);
  }
}

function assertCharacterPositionCanUseFaction(position, factionId) {
  if (position.type === POSITION_TYPES.FINAL_LANE && position.factionId !== factionId) {
    throw new Error('Character final lane does not match its faction.');
  }
}

export function evaluateMovement({ characterId, steps, characters }) {
  assertCharactersArray(characters);

  const character = getCharacterById({ characterId, characters });

  assertValidCharacterFaction(character.factionId);

  if (!isValidPosition(character.position)) {
    throw new Error('Character position is invalid.');
  }

  assertCharacterPositionCanUseFaction(character.position, character.factionId);
  assertValidMovementSteps(steps);

  if (character.position.type === POSITION_TYPES.HOME) {
    return {
      legal: false,
      reason: LEGAL_MOVEMENT_FAILURE_REASONS.CHARACTER_AT_HOME,
    };
  }

  if (character.position.type === POSITION_TYPES.GOAL) {
    return {
      legal: false,
      reason: LEGAL_MOVEMENT_FAILURE_REASONS.CHARACTER_AT_GOAL,
    };
  }

  const pathResult = calculateMovementPath({
    factionId: character.factionId,
    from: character.position,
    steps,
  });

  if (!pathResult.ok) {
    return {
      legal: false,
      reason: pathResult.reason,
    };
  }

  const barrierResult = checkPathBlockedByBarrier({
    path: pathResult.path,
    characters,
    movingCharacterId: characterId,
  });

  if (barrierResult.blocked) {
    return {
      legal: false,
      reason: LEGAL_MOVEMENT_FAILURE_REASONS.BARRIER,
      blockedAt: barrierResult.position,
      pathIndex: barrierResult.pathIndex,
    };
  }

  return {
    legal: true,
    destination: pathResult.path[pathResult.path.length - 1],
    path: pathResult.path,
  };
}
