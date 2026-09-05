import {
  createRewardRecipientSelectionDecision,
  executeRewardRecipientSelection,
  getRewardRecipientSelectionActions,
} from './rewardRecipientSelection';
import { assertDecisionAction, assertDecisionActionSelection } from './decisionActions';
import { DECISION_TYPES } from './types';
import {
  createOptionalAbilityActivationDecision,
  executeOptionalAbilityActivation,
  getOptionalAbilityActivationActions,
} from './optionalAbilityActivation';

export function assertDecision(decision) {
  if (!decision || typeof decision !== 'object' || Array.isArray(decision)) {
    throw new Error('decision is required.');
  }

  if (!Object.values(DECISION_TYPES).includes(decision.type)) {
    throw new Error(`Unknown decision type: ${decision.type}`);
  }
}

export function isSameDecisionAction(left, right) {
  return typeof left?.id === 'string' && left.id !== '' && left.id === right?.id;
}

export function createDecision(input) {
  if (input?.type === DECISION_TYPES.REWARD_RECIPIENT_SELECTION) {
    return createRewardRecipientSelectionDecision({ reward: input.reward });
  }

  if (input?.type === DECISION_TYPES.OPTIONAL_ABILITY_ACTIVATION) {
    return createOptionalAbilityActivationDecision(input);
  }

  throw new Error(`Unknown decision type: ${input?.type}`);
}

export function getAvailableDecisionActions({ state, decision }) {
  assertDecision(decision);

  if (decision.type === DECISION_TYPES.REWARD_RECIPIENT_SELECTION) {
    const actions = getRewardRecipientSelectionActions({ state, decision });
    actions.forEach(assertDecisionAction);
    return actions;
  }

  if (decision.type === DECISION_TYPES.OPTIONAL_ABILITY_ACTIVATION) {
    const actions = getOptionalAbilityActivationActions({ state, decision });
    actions.forEach(assertDecisionAction);
    return actions;
  }

  throw new Error(`Decision type is not executable yet: ${decision.type}`);
}

export function validateDecisionAction({ state, decision, action }) {
  assertDecisionActionSelection(action);
  const availableActions = getAvailableDecisionActions({ state, decision });
  const availableAction = availableActions.find((candidate) => isSameDecisionAction(candidate, action));

  if (!availableAction) {
    throw new Error('Action is not available for the pending decision.');
  }

  return JSON.parse(JSON.stringify(availableAction));
}

export function executeDecision({ state, decision, action }) {
  assertDecision(decision);
  const revalidatedAction = validateDecisionAction({ state, decision, action });

  if (decision.type === DECISION_TYPES.REWARD_RECIPIENT_SELECTION) {
    return executeRewardRecipientSelection({
      state,
      decision,
      action: revalidatedAction,
    });
  }

  if (decision.type === DECISION_TYPES.OPTIONAL_ABILITY_ACTIVATION) {
    return executeOptionalAbilityActivation({
      state,
      decision,
      action: revalidatedAction,
    });
  }

  throw new Error(`Decision type is not executable yet: ${decision.type}`);
}
