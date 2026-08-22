import { createHomePosition, clonePosition } from '../state/positions';
import { updateCharacterPositionsInState } from '../state/characters';
import { EXECUTION_EVENT_TYPES } from './types';

export function executeExitHomeAction({ state, action, choice }) {
  const positionByCharacterId = {
    [action.characterId]: action.destination,
  };
  const events = [];

  if (action.occupantRemoval.required) {
    const removeCharacterId = choice?.removeCharacterId;

    if (!removeCharacterId) {
      throw new Error('choice.removeCharacterId is required for this exitHome action.');
    }

    if (!action.occupantRemoval.removableCharacterIds.includes(removeCharacterId)) {
      throw new Error('choice.removeCharacterId is not removable in the current state.');
    }

    positionByCharacterId[removeCharacterId] = createHomePosition();
    events.push({
      type: EXECUTION_EVENT_TYPES.CHARACTER_REMOVED_FROM_START,
      characterId: removeCharacterId,
      removedByCharacterId: action.characterId,
      position: clonePosition(action.destination),
    });
  }

  events.push({
    type: EXECUTION_EVENT_TYPES.CHARACTER_EXITED_HOME,
    characterId: action.characterId,
    from: createHomePosition(),
    to: clonePosition(action.destination),
  });

  return {
    state: updateCharacterPositionsInState({ state, positionByCharacterId }),
    events,
  };
}
