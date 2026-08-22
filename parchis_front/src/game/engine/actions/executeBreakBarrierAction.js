import { getBarrierAtPosition } from '../rules/barriers/barriers';
import { getCharactersFromState } from '../state/characters';
import { clonePosition } from '../state/positions';
import { applyMovementToState } from './applyMovement';
import { EXECUTION_EVENT_TYPES } from './types';

export function executeBreakBarrierAction({ state, characters, action, movement, steps }) {
  const result = applyMovementToState({
    state,
    characters,
    actionType: action.type,
    characterId: action.characterId,
    movement,
    steps,
  });
  const nextCharacters = getCharactersFromState(result.state);
  const barrierAfterMovement = getBarrierAtPosition({
    position: action.barrier.position,
    characters: nextCharacters,
  });

  if (!barrierAfterMovement.exists) {
    return {
      state: result.state,
      events: [
        ...result.events,
        {
          type: EXECUTION_EVENT_TYPES.BARRIER_BROKEN,
          characterId: action.characterId,
          position: clonePosition(action.barrier.position),
          occupantCharacterIds: [...action.barrier.occupantCharacterIds],
        },
      ],
    };
  }

  return result;
}
