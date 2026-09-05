import { getOptionalPostMovementAbilities } from '../abilities/abilityModifiers';
import { EXECUTION_EVENT_TYPES } from '../actions/types';
import { createDecision, executeDecision, getAvailableDecisionActions } from '../decisions/decisions';
import { DECISION_TYPES, OPTIONAL_ABILITY_ACTION_TYPES } from '../decisions/types';
import { createRulesContext } from '../rulesContext/rulesContext';
import { executeRewardAction } from '../rewards/executeRewardAction';
import { getAvailableRewardActions } from '../rewards/rewardAvailability';
import { deriveRewardsFromEvents } from '../rewards/rewardDetection';
import { REWARD_STATUS } from '../rewards/types';
import { CONSEQUENCE_ITEM_TYPES } from './types';

export function createRewardConsequence(reward) {
  if (!reward || typeof reward !== 'object' || Array.isArray(reward)) {
    throw new Error('reward is required to create a consequence.');
  }

  return {
    type: CONSEQUENCE_ITEM_TYPES.REWARD,
    payload: JSON.parse(JSON.stringify(reward)),
  };
}

export function createOptionalAbilityActivationConsequence(payload) {
  return {
    type: CONSEQUENCE_ITEM_TYPES.OPTIONAL_ABILITY_ACTIVATION,
    payload: JSON.parse(JSON.stringify(payload)),
  };
}

export function cloneConsequence(consequence) {
  if (!consequence || !Object.values(CONSEQUENCE_ITEM_TYPES).includes(consequence.type)) {
    throw new Error(`Unknown consequence type: ${consequence?.type}`);
  }

  return JSON.parse(JSON.stringify(consequence));
}

function deriveOptionalAbilityActivationConsequences({ state, events }) {
  return events.flatMap((event) => {
    if (
      event?.type !== EXECUTION_EVENT_TYPES.CHARACTER_MOVED
    ) {
      return [];
    }

    const rulesContext = createRulesContext({
      gameState: state,
      actorCharacterId: event.characterId,
      source: event.source,
      movementType: event.movementType,
    });

    return getOptionalPostMovementAbilities({ rulesContext }).flatMap((ability) => {
      const payload = {
        type: DECISION_TYPES.OPTIONAL_ABILITY_ACTIVATION,
        abilityId: ability.id,
        characterId: event.characterId,
        position: event.to,
        previousPosition: event.previousPosition,
        movementType: event.movementType,
      };
      const decision = createDecision(payload);
      const actions = getAvailableDecisionActions({ state, decision });

      return actions.some((action) => action.type === OPTIONAL_ABILITY_ACTION_TYPES.ACTIVATE)
        ? [createOptionalAbilityActivationConsequence(payload)]
        : [];
    });
  });
}

export function deriveConsequencesFromEvents({ state, events }) {
  return [
    ...deriveOptionalAbilityActivationConsequences({ state, events }),
    ...deriveRewardsFromEvents({ events }).map(createRewardConsequence),
  ];
}

export function getConsequenceAvailability({ state, consequence }) {
  if (consequence.type === CONSEQUENCE_ITEM_TYPES.REWARD) {
    return getAvailableRewardActions({ state, reward: consequence.payload });
  }

  if (consequence.type === CONSEQUENCE_ITEM_TYPES.OPTIONAL_ABILITY_ACTIVATION) {
    const decision = createDecision(consequence.payload);
    const availableActions = getAvailableDecisionActions({ state, decision });

    return {
      status: availableActions.length > 1 ? REWARD_STATUS.CHOICE_REQUIRED : REWARD_STATUS.AVAILABLE,
      availableActions,
    };
  }

  throw new Error(`Unknown consequence type: ${consequence.type}`);
}

export function createDecisionForConsequence(consequence) {
  if (consequence.type === CONSEQUENCE_ITEM_TYPES.REWARD) {
    return createDecision({
      type: DECISION_TYPES.REWARD_RECIPIENT_SELECTION,
      reward: consequence.payload,
    });
  }

  if (consequence.type === CONSEQUENCE_ITEM_TYPES.OPTIONAL_ABILITY_ACTIVATION) {
    return createDecision(consequence.payload);
  }

  throw new Error(`Unknown consequence type: ${consequence.type}`);
}

export function executeConsequence({ state, consequence, action }) {
  if (consequence.type === CONSEQUENCE_ITEM_TYPES.REWARD) {
    return executeRewardAction({ state, reward: consequence.payload, action });
  }

  if (consequence.type === CONSEQUENCE_ITEM_TYPES.OPTIONAL_ABILITY_ACTIVATION) {
    return executeDecision({
      state,
      decision: createDecision(consequence.payload),
      action,
    });
  }

  throw new Error(`Unknown consequence type: ${consequence.type}`);
}
