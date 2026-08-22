import { POSITION_TYPES } from '../state/positions';

function hasAllCharactersAtGoal(player) {
  if (!Array.isArray(player.characters)) {
    throw new Error(`Player requires a characters array: ${player.id}`);
  }

  if (player.characters.length !== 4) {
    throw new Error(`Player must have exactly four characters to evaluate victory: ${player.id}`);
  }

  return player.characters.every((character) => character.position?.type === POSITION_TYPES.GOAL);
}

export function getWinningPlayerId(gameState) {
  if (!gameState || !Array.isArray(gameState.players)) {
    throw new Error('gameState must be a GameState with players.');
  }

  const winners = gameState.players.filter(hasAllCharactersAtGoal);

  if (winners.length > 1) {
    throw new Error('GameState is inconsistent: multiple players satisfy the victory condition.');
  }

  return winners.length === 1 ? winners[0].id : null;
}
