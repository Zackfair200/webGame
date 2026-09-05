import { applyMovementToState } from './applyMovement';
import { MOVEMENT_SOURCE_TYPES, MOVEMENT_TYPES } from '../movement/types';

export function executeNormalMovementAction({ state, characters, action, movement, steps }) {
  return applyMovementToState({
    state,
    characters,
    actionType: action.type,
    movementType: MOVEMENT_TYPES.NORMAL,
    source: { type: MOVEMENT_SOURCE_TYPES.DICE, roll: steps },
    characterId: action.characterId,
    movement,
    steps,
  });
}
