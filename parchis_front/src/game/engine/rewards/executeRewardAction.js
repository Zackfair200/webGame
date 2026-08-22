import { EXECUTION_EVENT_TYPES } from '../actions/types';
import { applyMovementToState } from '../actions/applyMovement';
import { evaluateMovement } from '../rules/legalMovement/legalMovement';
import { getCharactersFromState } from '../state/characters';
import {
  REWARD_ACTION_TYPES,
  REWARD_STATUS,
  REWARD_STEPS,
  REWARD_TYPES,
} from './types';
import { getAvailableRewardActions } from './rewardAvailability';

function assertRewardAction(action) {
  if (!action || typeof action !== 'object') {
    throw new Error('reward action is required.');
  }

  if (action.type === REWARD_ACTION_TYPES.LOSE_REWARD) {
    return;
  }

  if (action.characterId === undefined || action.characterId === null || action.characterId === '') {
    throw new Error('reward action.characterId is required.');
  }
}

function assertRewardSteps(reward) {
  if (reward.type === REWARD_TYPES.CAPTURE_REWARD && reward.steps !== REWARD_STEPS.CAPTURE) {
    throw new Error(`captureReward.steps must be exactly ${REWARD_STEPS.CAPTURE}.`);
  }

  if (reward.type === REWARD_TYPES.GOAL_REWARD && reward.steps !== REWARD_STEPS.GOAL) {
    throw new Error(`goalReward.steps must be exactly ${REWARD_STEPS.GOAL}.`);
  }
}

function createRewardLostResult({ state, rewardType, characterId, steps, reason }) {
  return {
    state,
    events: [
      {
        type: EXECUTION_EVENT_TYPES.REWARD_LOST,
        rewardType,
        characterId,
        steps,
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

function executeCaptureRewardAction({ state, reward, action }) {
  if (action.type !== REWARD_ACTION_TYPES.CAPTURE_REWARD_MOVEMENT) {
    throw new Error('Action is not available for this reward.');
  }

  if (action.characterId !== reward.characterId) {
    throw new Error('captureReward must be executed by the capturing character.');
  }

  const characters = getCharactersFromState(state);
  const movement = evaluateMovement({
    characterId: reward.characterId,
    steps: REWARD_STEPS.CAPTURE,
    characters,
  });

  if (!movement.legal) {
    return createRewardLostResult({
      state,
      rewardType: REWARD_TYPES.CAPTURE_REWARD,
      characterId: reward.characterId,
      steps: REWARD_STEPS.CAPTURE,
      reason: movement.reason,
    });
  }

  return applyMovementToState({
    state,
    characters,
    actionType: REWARD_TYPES.CAPTURE_REWARD,
    characterId: reward.characterId,
    movement,
    steps: REWARD_STEPS.CAPTURE,
  });
}

function executeGoalRewardAction({ state, reward, action }) {
  if (action.type !== REWARD_ACTION_TYPES.GOAL_REWARD_MOVEMENT) {
    throw new Error('Action is not available for this reward.');
  }

  const availability = getAvailableRewardActions({ state, reward });

  if (availability.status === REWARD_STATUS.LOST) {
    return createRewardLostResult({
      state,
      rewardType: REWARD_TYPES.GOAL_REWARD,
      characterId: reward.sourceCharacterId,
      steps: REWARD_STEPS.GOAL,
      reason: availability.reason,
    });
  }

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
    actionType: REWARD_TYPES.GOAL_REWARD,
    characterId: availableAction.characterId,
    movement: availableAction.movement,
    steps: REWARD_STEPS.GOAL,
  });
}

function getRewardLostCharacterId(reward) {
  if (reward.type === REWARD_TYPES.CAPTURE_REWARD) {
    return reward.characterId;
  }

  if (reward.type === REWARD_TYPES.GOAL_REWARD) {
    return reward.sourceCharacterId;
  }

  throw new Error(`Unknown reward type: ${reward.type}`);
}

function executeLoseRewardAction({ state, reward }) {
  const availability = getAvailableRewardActions({ state, reward });

  if (availability.status !== REWARD_STATUS.LOST) {
    throw new Error('Cannot lose a reward that is currently available.');
  }

  return createRewardLostResult({
    state,
    rewardType: reward.type,
    characterId: getRewardLostCharacterId(reward),
    steps: reward.steps,
    reason: availability.reason,
  });
}

export function executeRewardAction({ state, reward, action }) {
  if (!reward || !reward.type) {
    throw new Error('reward is required.');
  }

  assertRewardSteps(reward);
  assertRewardAction(action);

  if (action.type === REWARD_ACTION_TYPES.LOSE_REWARD) {
    return executeLoseRewardAction({ state, reward });
  }

  if (reward.type === REWARD_TYPES.CAPTURE_REWARD) {
    return executeCaptureRewardAction({ state, reward, action });
  }

  if (reward.type === REWARD_TYPES.GOAL_REWARD) {
    return executeGoalRewardAction({ state, reward, action });
  }

  throw new Error(`Unknown reward type: ${reward.type}`);
}
