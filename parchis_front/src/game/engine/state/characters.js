import { clonePosition } from './positions';

function assertGameStateWithPlayers(state) {
  if (!state || !Array.isArray(state.players)) {
    throw new Error('state must be a GameState with players.');
  }

  state.players.forEach((player) => {
    if (!Array.isArray(player.characters)) {
      throw new Error('Every player in state requires a characters array.');
    }
  });
}

function cloneCharacter(character) {
  return {
    ...character,
    position: clonePosition(character.position),
  };
}

export function getCharactersFromState(state) {
  assertGameStateWithPlayers(state);

  return state.players.flatMap((player) => player.characters.map(cloneCharacter));
}

export function updateCharacterPositionsInState({ state, positionByCharacterId }) {
  assertGameStateWithPlayers(state);

  if (!positionByCharacterId || typeof positionByCharacterId !== 'object') {
    throw new Error('positionByCharacterId is required.');
  }

  const updateIds = new Set(Object.keys(positionByCharacterId));
  const foundIds = new Set();

  const players = state.players.map((player) => {
    let playerChanged = false;

    const characters = player.characters.map((character) => {
      if (updateIds.has(character.id)) {
        foundIds.add(character.id);
        playerChanged = true;

        return {
          ...character,
          position: clonePosition(positionByCharacterId[character.id]),
        };
      }

      return character;
    });

    if (!playerChanged) {
      return player;
    }

    return {
      ...player,
      characters,
    };
  });

  updateIds.forEach((characterId) => {
    if (!foundIds.has(characterId)) {
      throw new Error(`characterId does not match an existing character: ${characterId}`);
    }
  });

  return {
    ...state,
    players,
  };
}
