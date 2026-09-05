import { getFactionIds } from '../factions/factions';
import { GAME_PHASES } from '../state/initialState';
import { assertTurnState } from '../turns/turnValidation';
import { getCurrentPlayer } from './playerOrder';
import { getWinningPlayerId } from './victory';

function isNonEmptyValue(value) {
  return value !== undefined && value !== null && value !== '';
}

function assertValidPlayers(players) {
  if (!Array.isArray(players) || players.length < 2 || players.length > 4) {
    throw new Error('GameFlow requires 2, 3, or 4 players.');
  }

  const validFactionIds = getFactionIds();
  const playerIds = new Set();
  const factionIds = new Set();

  players.forEach((player) => {
    if (!isNonEmptyValue(player.id)) {
      throw new Error('Every player requires an id.');
    }

    if (playerIds.has(player.id)) {
      throw new Error(`Duplicate player id: ${player.id}`);
    }

    if (!validFactionIds.includes(player.factionId)) {
      throw new Error(`Invalid faction id: ${player.factionId}`);
    }

    if (factionIds.has(player.factionId)) {
      throw new Error(`Duplicate faction id: ${player.factionId}`);
    }

    if (!Array.isArray(player.characters) || player.characters.length !== 4) {
      throw new Error(`Player must have exactly four characters: ${player.id}`);
    }

    player.characters.forEach((character) => {
      if (character.factionId !== player.factionId) {
        throw new Error(`Character faction does not match player faction: ${character.id}`);
      }
    });

    playerIds.add(player.id);
    factionIds.add(player.factionId);
  });
}

function assertValidTurnOrder(gameState) {
  if (!Array.isArray(gameState.turnOrder) || gameState.turnOrder.length !== gameState.players.length) {
    throw new Error('turnOrder must contain exactly the participating players.');
  }

  const playerIds = gameState.players.map((player) => player.id);
  const uniqueTurnOrderIds = new Set(gameState.turnOrder);

  if (uniqueTurnOrderIds.size !== gameState.turnOrder.length) {
    throw new Error('turnOrder cannot contain duplicate players.');
  }

  gameState.turnOrder.forEach((playerId) => {
    if (!playerIds.includes(playerId)) {
      throw new Error(`turnOrder contains a non-participating player: ${playerId}`);
    }
  });
}

function assertOptionalExtensionState(gameState) {
  ['characterStatesById', 'factionStatesById', 'terrainEffectsByPositionKey'].forEach((field) => {
    const value = gameState[field];

    if (value !== undefined && (!value || typeof value !== 'object' || Array.isArray(value))) {
      throw new Error(`${field} must be an object when provided.`);
    }
  });

  if (gameState.globalEffects !== undefined && !Array.isArray(gameState.globalEffects)) {
    throw new Error('globalEffects must be an array when provided.');
  }
}

export function assertGameStateForFlow(gameState) {
  if (!gameState || typeof gameState !== 'object' || Array.isArray(gameState)) {
    throw new Error('gameState must be an object.');
  }

  if (!Object.values(GAME_PHASES).includes(gameState.phase)) {
    throw new Error(`Invalid game phase: ${gameState.phase}`);
  }

  assertValidPlayers(gameState.players);
  assertValidTurnOrder(gameState);
  assertOptionalExtensionState(gameState);
  getCurrentPlayer(gameState);

  const winningPlayerId = getWinningPlayerId(gameState);

  if (gameState.phase === GAME_PHASES.FINISHED && !isNonEmptyValue(gameState.winnerPlayerId)) {
    throw new Error('winnerPlayerId is required when gameState.phase is finished.');
  }

  if (gameState.phase === GAME_PHASES.FINISHED) {
    if (!gameState.players.some((player) => player.id === gameState.winnerPlayerId)) {
      throw new Error(`winnerPlayerId does not match a player: ${gameState.winnerPlayerId}`);
    }

    if (winningPlayerId !== gameState.winnerPlayerId) {
      throw new Error('winnerPlayerId must match the player that satisfies the victory condition.');
    }

    return;
  }

  if (gameState.phase !== GAME_PHASES.FINISHED && gameState.winnerPlayerId !== null) {
    throw new Error('winnerPlayerId must be null unless gameState.phase is finished.');
  }

  if (winningPlayerId !== null) {
    throw new Error('A non-finished gameState cannot already satisfy the victory condition.');
  }
}

export function assertGameFlowInProgress(gameFlow) {
  if (!gameFlow || typeof gameFlow !== 'object' || Array.isArray(gameFlow)) {
    throw new Error('gameFlow must be an object.');
  }

  assertGameStateForFlow(gameFlow.gameState);

  if (gameFlow.gameState.phase === GAME_PHASES.FINISHED) {
    throw new Error('Cannot operate on a finished game.');
  }

  if (gameFlow.gameState.phase !== GAME_PHASES.IN_PROGRESS) {
    throw new Error('gameState.phase must be inProgress.');
  }

  assertTurnState(gameFlow.turnState);

  const currentPlayer = getCurrentPlayer(gameFlow.gameState);

  if (gameFlow.turnState.playerId !== currentPlayer.id) {
    throw new Error('turnState.playerId must match gameState.currentPlayerId.');
  }

  if (gameFlow.turnState.factionId !== currentPlayer.factionId) {
    throw new Error('turnState.factionId must match the current player faction.');
  }
}
