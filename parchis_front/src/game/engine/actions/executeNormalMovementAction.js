import { applyMovementToState } from './applyMovement';

export function executeNormalMovementAction({ state, characters, action, movement, steps }) {
  return applyMovementToState({
    state,
    characters,
    actionType: action.type,
    characterId: action.characterId,
    movement,
    steps,
  });
}
