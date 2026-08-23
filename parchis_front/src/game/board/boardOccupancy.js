import { getBarrierAtPosition, isPlayablePosition } from '../engine';
import { getPositionKey } from './boardGeometry';

export function getCharactersFromGameState(gameState) {
  return gameState.players.flatMap((player) => player.characters.map((character) => ({
    ...character,
    playerId: player.id,
    playerName: player.name,
  })));
}

export function groupCharactersByPosition(gameState) {
  return getCharactersFromGameState(gameState).reduce((groups, character) => {
    const positionKey = getPositionKey(character.position, character.factionId);
    const currentGroup = groups.get(positionKey) || [];

    groups.set(positionKey, [...currentGroup, character]);

    return groups;
  }, new Map());
}

export function createActionsByCharacterId(actions = []) {
  return actions.reduce((actionsByCharacterId, action) => {
    const currentActions = actionsByCharacterId.get(action.characterId) || [];

    actionsByCharacterId.set(action.characterId, [...currentActions, action]);

    return actionsByCharacterId;
  }, new Map());
}

export function getVisualBarriers(gameState) {
  const characters = getCharactersFromGameState(gameState);
  const groups = groupCharactersByPosition(gameState);
  const barriers = [];

  groups.forEach((occupants) => {
    const position = occupants[0]?.position;

    if (!position || !isPlayablePosition(position) || occupants.length !== 2) {
      return;
    }

    const barrier = getBarrierAtPosition({ position, characters });

    if (barrier.exists) {
      barriers.push(barrier);
    }
  });

  return barriers;
}
