import { EXECUTION_EVENT_TYPES } from '../actions/types';
import { applyMovementToState } from '../actions/applyMovement';
import { getCharactersFromState } from '../state/characters';
import { MOVEMENT_SOURCE_TYPES, MOVEMENT_TYPES } from '../movement/types';
import {
  REWARD_ACTION_TYPES,
  REWARD_STATUS,
  REWARD_TYPES,
} from './types';
import { getAvailableRewardActions } from './rewardAvailability';

function cloneSource(source) {
  return source ? { ...source } : source;
}

function assertRewardAction(action) {
  if (!action || typeof action !== 'object') {
    throw new Error('reward action is required.');
  }

  if (action.type === REWARD_ACTION_TYPES.LOSE_REWARD) {
    return;
  }

  if (action.type !== REWARD_ACTION_TYPES.MOVEMENT_REWARD_MOVEMENT) {
    throw new Error(`Unknown reward action type: ${action.type}`);
  }

  if (action.characterId === undefined || action.characterId === null || action.characterId === '') {
    throw new Error('reward action.characterId is required.');
  }
}

function createRewardLostResult({ state, reward, reason }) {
  return {
    state,
    events: [
      {
        type: EXECUTION_EVENT_TYPES.REWARD_LOST,
        rewardType: reward.type,
        rewardSource: cloneSource(reward.source),
        ownerFactionId: reward.ownerFactionId,
        characterId: reward.source.characterId,
        steps: reward.steps,
        reason,
      },
    ],
  };
}

function findAvailableAction({ availableActions, action }) {
  return availableActions.find(
    (candidate) => candidate.type === action.type && candidate.characterId === action.characterId,
  );
}

function executeMovementRewardAction({ state, reward, action }) {
  if (action.type !== REWARD_ACTION_TYPES.MOVEMENT_REWARD_MOVEMENT) {
    throw new Error('Action is not available for this reward.');
  }

  const availability = getAvailableRewardActions({ state, reward });
  const availableAction = findAvailableAction({
    availableActions: availability.availableActions,
    action,
  });

  if (!availableAction) {
    throw new Error('Action is not available for this reward.');
  }

  const characters = getCharactersFromState(state);

  return applyMovementToState({
    state,
    characters,
    actionType: availableAction.type,
    movementType: MOVEMENT_TYPES.REWARD,
    source: {
      type: MOVEMENT_SOURCE_TYPES.REWARD,
      rewardType: reward.type,
      rewardSource: cloneSource(reward.source),
      ownerFactionId: reward.ownerFactionId,
    },
    characterId: availableAction.characterId,
    movement: availableAction.movement,
    steps: reward.steps,
  });
}

function executeLoseRewardAction({ state, reward }) {
  const availability = getAvailableRewardActions({ state, reward });

  if (availability.status !== REWARD_STATUS.LOST) {
    throw new Error('Cannot lose a reward that is currently available.');
  }

  return createRewardLostResult({
    state,
    reward,
    reason: availability.reason,
  });
}

export function executeRewardAction({ state, reward, action }) {
  if (!reward || !reward.type) {
    throw new Error('reward is required.');
  }

  assertRewardAction(action);

  if (action.type === REWARD_ACTION_TYPES.LOSE_REWARD) {
    return executeLoseRewardAction({ state, reward });
  }

  if (reward.type === REWARD_TYPES.MOVEMENT_REWARD) {
    return executeMovementRewardAction({ state, reward, action });
  }

  throw new Error(`Unknown reward type: ${reward.type}`);
}
