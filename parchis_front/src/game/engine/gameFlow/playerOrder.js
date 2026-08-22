export function getCurrentPlayer(gameState) {
  if (!gameState || !Array.isArray(gameState.players)) {
    throw new Error('gameState must be a GameState with players.');
  }

  const player = gameState.players.find((candidate) => candidate.id === gameState.currentPlayerId);

  if (!player) {
    throw new Error(`currentPlayerId does not match a player: ${gameState.currentPlayerId}`);
  }

  return player;
}

export function getNextPlayerId(gameState) {
  if (!Array.isArray(gameState.turnOrder)) {
    throw new Error('gameState.turnOrder must be an array.');
  }

  const currentIndex = gameState.turnOrder.indexOf(gameState.currentPlayerId);

  if (currentIndex === -1) {
    throw new Error(`currentPlayerId is not present in turnOrder: ${gameState.currentPlayerId}`);
  }

  return gameState.turnOrder[(currentIndex + 1) % gameState.turnOrder.length];
}
