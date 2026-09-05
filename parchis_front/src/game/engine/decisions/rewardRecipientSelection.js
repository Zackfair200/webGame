import { executeRewardAction } from '../rewards/executeRewardAction';
import { getAvailableRewardActions } from '../rewards/rewardAvailability';
import { DECISION_TYPES } from './types';

export function createRewardRecipientSelectionDecision({ reward }) {
  if (!reward || typeof reward !== 'object' || Array.isArray(reward)) {
    throw new Error('reward is required to create a reward recipient decision.');
  }

  return {
    type: DECISION_TYPES.REWARD_RECIPIENT_SELECTION,
    reward: JSON.parse(JSON.stringify(reward)),
  };
}

export function getRewardRecipientSelectionActions({ state, decision }) {
  return getAvailableRewardActions({ state, reward: decision.reward }).availableActions;
}

export function executeRewardRecipientSelection({ state, decision, action }) {
  return executeRewardAction({ state, reward: decision.reward, action });
}
