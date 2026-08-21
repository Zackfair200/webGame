import { getFactionIds } from '../../factions/factions';
import { assertValidMovementSteps } from '../../movement/validation';
import { assertCharactersArray } from '../../occupancy/occupancy';
import { evaluateMovement } from '../legalMovement/legalMovement';

function assertValidFactionId(factionId) {
  if (!getFactionIds().includes(factionId)) {
    throw new Error(`Invalid faction id: ${factionId}`);
  }
}

export function getMovableCharacters({ factionId, steps, characters }) {
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
    });

    if (movement.legal) {
      // This is a snapshot for the state received by this call; execution must revalidate current state.
      movableCharacters.push({ characterId: character.id, movement });
    }
  });

  return { movableCharacters };
}
