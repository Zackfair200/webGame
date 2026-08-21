import { getCharactersForFaction, getFactionIds } from '../factions/factions';
import { createHomePosition } from './positions';

export const GAME_PHASES = Object.freeze({
  READY: 'ready',
});

function assertValidPlayers(players) {
  if (!Array.isArray(players) || players.length < 2 || players.length > 4) {
    throw new Error('Initial game state requires 2, 3, or 4 players.');
  }

  const validFactionIds = getFactionIds();
  const playerIds = new Set();
  const factionIds = new Set();

  players.forEach((player) => {
    if (!player.id) {
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

    playerIds.add(player.id);
    factionIds.add(player.factionId);
  });
}

function assertValidTurnOrder(players, turnOrder) {
  if (!Array.isArray(turnOrder) || turnOrder.length !== players.length) {
    throw new Error('Turn order must contain exactly the participating players.');
  }

  const playerIds = players.map((player) => player.id);
  const uniqueTurnOrderIds = new Set(turnOrder);

  if (uniqueTurnOrderIds.size !== turnOrder.length) {
    throw new Error('Turn order cannot contain duplicate players.');
  }

  turnOrder.forEach((playerId) => {
    if (!playerIds.includes(playerId)) {
      throw new Error(`Turn order contains a non-participating player: ${playerId}`);
    }
  });
}

function createInitialCharactersForPlayer(player) {
  return getCharactersForFaction(player.factionId).map((character) => ({
    id: `${player.factionId}.${character.id}`,
    characterId: character.id,
    name: character.name,
    factionId: player.factionId,
    position: createHomePosition(),
  }));
}

export function createInitialGameState({ players, turnOrder }) {
  assertValidPlayers(players);
  assertValidTurnOrder(players, turnOrder);

  return {
    phase: GAME_PHASES.READY,
    players: players.map((player) => ({
      id: player.id,
      name: player.name || player.id,
      factionId: player.factionId,
      characters: createInitialCharactersForPlayer(player),
    })),
    turnOrder: [...turnOrder],
    currentPlayerId: turnOrder[0],
  };
}
