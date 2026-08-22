import { getFactionIds } from '../factions/factions';
import { TURN_PHASES } from './types';

function assertValidFactionId(factionId) {
  if (!getFactionIds().includes(factionId)) {
    throw new Error(`Invalid faction id: ${factionId}`);
  }
}

function assertPlayerId(playerId) {
  if (playerId === undefined || playerId === null || playerId === '') {
    throw new Error('playerId is required.');
  }
}

export function createTurnState({ playerId, factionId }) {
  assertPlayerId(playerId);
  assertValidFactionId(factionId);

  return {
    playerId,
    factionId,
    phase: TURN_PHASES.WAITING_FOR_ROLL,
    consecutiveSixes: 0,
    currentRoll: null,
    availableActions: [],
    pendingReward: null,
    availableRewardActions: [],
    remainingRewards: [],
    diceMoveHistory: [],
    events: [],
    endReason: null,
    afterConsequences: null,
  };
}
