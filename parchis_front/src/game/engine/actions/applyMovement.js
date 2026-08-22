import { createHomePosition, clonePosition } from '../state/positions';
import { updateCharacterPositionsInState } from '../state/characters';
import { DESTINATION_OUTCOME_TYPES } from '../rules/destinationRules/destinationRules';
import { EXECUTION_EVENT_TYPES } from './types';

function getCharacterById({ characterId, characters }) {
  const character = characters.find((candidate) => candidate.id === characterId);

  if (!character) {
    throw new Error(`characterId does not match an existing character: ${characterId}`);
  }

  return character;
}

export function applyMovementToState({ state, characters, actionType, characterId, movement, steps }) {
  const character = getCharacterById({ characterId, characters });
  const positionByCharacterId = {
    [characterId]: movement.destination,
  };
  const events = [
    {
      type: EXECUTION_EVENT_TYPES.CHARACTER_MOVED,
      characterId,
      from: clonePosition(character.position),
      to: clonePosition(movement.destination),
      steps,
      actionType,
    },
  ];

  if (movement.outcome.type === DESTINATION_OUTCOME_TYPES.CAPTURE) {
    positionByCharacterId[movement.outcome.capturedCharacterId] = createHomePosition();
    events.push({
      type: EXECUTION_EVENT_TYPES.CHARACTER_CAPTURED,
      characterId,
      capturedCharacterId: movement.outcome.capturedCharacterId,
    });
  }

  if (movement.outcome.type === DESTINATION_OUTCOME_TYPES.GOAL) {
    events.push({
      type: EXECUTION_EVENT_TYPES.CHARACTER_REACHED_GOAL,
      characterId,
    });
  }

  return {
    state: updateCharacterPositionsInState({ state, positionByCharacterId }),
    events,
  };
}
