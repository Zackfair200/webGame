import { getFactionIds } from '../../factions/factions';
import { assertValidMovementSteps } from '../../movement/validation';
import { assertCharactersArray } from '../../occupancy/occupancy';
import { MOVEMENT_SOURCE_TYPES, MOVEMENT_TYPES } from '../../movement/types';
import { createMovementRulesContext } from '../../rulesContext/rulesContext';
import { evaluateMovement } from '../legalMovement/legalMovement';

function assertValidFactionId(factionId) {
  if (!getFactionIds().includes(factionId)) {
    throw new Error(`Invalid faction id: ${factionId}`);
  }
}

export function getMovableCharacters({
  factionId,
  steps,
  characters,
  gameState = null,
  movementType = MOVEMENT_TYPES.NORMAL,
  source = { type: MOVEMENT_SOURCE_TYPES.DICE, roll: steps },
}) {
  assertCharactersArray(characters);
  assertValidMovementSteps(steps);
  assertValidFactionId(factionId);

  const movableCharacters = [];

  characters.forEach((character) => {
    if (character.factionId !== factionId) {
      return;
    }

    const movement = evaluateMovement({
      characterId: character.id,
      steps,
      characters,
      rulesContext: createMovementRulesContext({
        gameState,
        characters,
        actorCharacterId: character.id,
        source,
        movementType,
      }),
    });

    if (movement.legal) {
      // This is a snapshot for the state received by this call; execution must revalidate current state.
      movableCharacters.push({ characterId: character.id, movement });
    }
  });

  return { movableCharacters };
}
