import { getCharactersFromState, updateCharacterPositionsInState } from '../state/characters';
import { clonePosition, createHomePosition, isPlayablePosition } from '../state/positions';
import { TURN_EVENT_TYPES } from './types';
import { assertTurnState } from './turnValidation';

function getLastPenalizableCharacter({ state, factionId, diceMoveHistory }) {
  const characters = getCharactersFromState(state).filter((character) => character.factionId === factionId);

  for (let index = diceMoveHistory.length - 1; index >= 0; index -= 1) {
    const character = characters.find((candidate) => candidate.id === diceMoveHistory[index].characterId);

    if (character && isPlayablePosition(character.position)) {
      return character;
    }
  }

  return null;
}

export function applyThirdSixPenalty({ state, turnState }) {
  assertTurnState(turnState);

  const character = getLastPenalizableCharacter({
    state,
    factionId: turnState.factionId,
    diceMoveHistory: turnState.diceMoveHistory,
  });

  if (!character) {
    return {
      state,
      events: [
        {
          type: TURN_EVENT_TYPES.THIRD_SIX_PENALTY_SKIPPED,
          reason: 'noPenalizableCharacter',
        },
      ],
    };
  }

  return {
    state: updateCharacterPositionsInState({
      state,
      positionByCharacterId: {
        [character.id]: createHomePosition(),
      },
    }),
    events: [
      {
        type: TURN_EVENT_TYPES.THIRD_SIX_PENALTY,
        characterId: character.id,
        from: clonePosition(character.position),
        to: createHomePosition(),
      },
    ],
  };
}
