import { getFactionIds } from '../factions/factions';
import {
  TURN_AFTER_CONSEQUENCES,
  TURN_END_REASONS,
  TURN_PHASES,
} from './types';

function isNonEmptyValue(value) {
  return value !== undefined && value !== null && value !== '';
}

function assertArray(value, message) {
  if (!Array.isArray(value)) {
    throw new Error(message);
  }
}

function assertKnownValueOrNull({ value, allowedValues, message }) {
  if (value !== null && !allowedValues.includes(value)) {
    throw new Error(message);
  }
}

function assertCurrentRollForPhase(turnState) {
  if (turnState.phase === TURN_PHASES.WAITING_FOR_ROLL || turnState.phase === TURN_PHASES.ENDED) {
    if (turnState.currentRoll !== null) {
      throw new Error(`turnState.currentRoll must be null while phase is ${turnState.phase}.`);
    }

    return;
  }

  if (!Number.isInteger(turnState.currentRoll) || turnState.currentRoll < 1 || turnState.currentRoll > 6) {
    throw new Error(`turnState.currentRoll must be an integer from 1 to 6 while phase is ${turnState.phase}.`);
  }
}

function assertConsecutiveSixesForPhase(turnState) {
  if (!Number.isInteger(turnState.consecutiveSixes)) {
    throw new Error('turnState.consecutiveSixes must be an integer.');
  }

  if (turnState.phase === TURN_PHASES.ENDED) {
    if (turnState.consecutiveSixes < 0 || turnState.consecutiveSixes > 3) {
      throw new Error('turnState.consecutiveSixes must be an integer from 0 to 3 while phase is ended.');
    }

    return;
  }

  if (turnState.consecutiveSixes < 0 || turnState.consecutiveSixes > 2) {
    throw new Error(`turnState.consecutiveSixes must be an integer from 0 to 2 while phase is ${turnState.phase}.`);
  }
}

function assertDiceMoveHistory(diceMoveHistory) {
  diceMoveHistory.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`turnState.diceMoveHistory[${index}] must be an object.`);
    }

    if (!isNonEmptyValue(entry.characterId)) {
      throw new Error(`turnState.diceMoveHistory[${index}].characterId is required.`);
    }

    if (!isNonEmptyValue(entry.actionType)) {
      throw new Error(`turnState.diceMoveHistory[${index}].actionType is required.`);
    }

    if (!Number.isInteger(entry.roll) || entry.roll < 1 || entry.roll > 6) {
      throw new Error(`turnState.diceMoveHistory[${index}].roll must be an integer from 1 to 6.`);
    }
  });
}

export function assertTurnState(turnState) {
  if (!turnState || typeof turnState !== 'object' || Array.isArray(turnState)) {
    throw new Error('turnState must be an object.');
  }

  if (!isNonEmptyValue(turnState.playerId)) {
    throw new Error('turnState.playerId is required.');
  }

  if (!getFactionIds().includes(turnState.factionId)) {
    throw new Error(`Invalid faction id: ${turnState.factionId}`);
  }

  if (!Object.values(TURN_PHASES).includes(turnState.phase)) {
    throw new Error(`Invalid turn phase: ${turnState.phase}`);
  }

  assertConsecutiveSixesForPhase(turnState);
  assertCurrentRollForPhase(turnState);
  assertArray(turnState.availableActions, 'turnState.availableActions must be an array.');
  assertArray(turnState.availableRewardActions, 'turnState.availableRewardActions must be an array.');
  assertArray(turnState.remainingRewards, 'turnState.remainingRewards must be an array.');
  assertArray(turnState.diceMoveHistory, 'turnState.diceMoveHistory must be an array.');
  assertArray(turnState.events, 'turnState.events must be an array.');
  assertKnownValueOrNull({
    value: turnState.afterConsequences,
    allowedValues: Object.values(TURN_AFTER_CONSEQUENCES),
    message: `Invalid turn afterConsequences: ${turnState.afterConsequences}`,
  });
  assertKnownValueOrNull({
    value: turnState.endReason,
    allowedValues: Object.values(TURN_END_REASONS),
    message: `Invalid turn endReason: ${turnState.endReason}`,
  });

  if (
    (turnState.phase === TURN_PHASES.WAITING_FOR_ACTION ||
      turnState.phase === TURN_PHASES.WAITING_FOR_REWARD_CHOICE) &&
    turnState.afterConsequences === null
  ) {
    throw new Error(`turnState.afterConsequences is required while phase is ${turnState.phase}.`);
  }

  if (turnState.phase === TURN_PHASES.WAITING_FOR_REWARD_CHOICE) {
    if (!turnState.pendingReward || typeof turnState.pendingReward !== 'object') {
      throw new Error('turnState.pendingReward is required while waiting for a reward choice.');
    }
  }

  assertDiceMoveHistory(turnState.diceMoveHistory);
}
