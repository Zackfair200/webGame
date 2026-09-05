import { createDecisionActionId } from '../decisions/decisionActions';
import { DECISION_TYPES } from '../decisions/types';
import { getFactionIds } from '../factions/factions';
import { MOVEMENT_SOURCE_TYPES, MOVEMENT_TYPES } from '../movement/types';
import { evaluateMovement } from '../rules/legalMovement/legalMovement';
import { createRulesContext } from '../rulesContext/rulesContext';
import { getCharactersFromState } from '../state/characters';
import { POSITION_TYPES } from '../state/positions';
import {
  REWARD_ACTION_TYPES,
  REWARD_LOST_REASONS,
  REWARD_SOURCE_TYPES,
  REWARD_STATUS,
  REWARD_STEPS,
  REWARD_TYPES,
} from './types';

function cloneReward(reward) {
  return {
    ...reward,
    source: reward.source ? { ...reward.source } : reward.source,
    excludedCharacterIds: Array.isArray(reward.excludedCharacterIds)
      ? [...reward.excludedCharacterIds]
      : [],
  };
}

function getCharacterById({ characterId, characters }) {
  const matchingCharacters = characters.filter((character) => character.id === characterId);

  if (matchingCharacters.length === 0) {
    throw new Error(`characterId does not match an existing character: ${characterId}`);
  }

  if (matchingCharacters.length > 1) {
    throw new Error(`Duplicate character id: ${characterId}`);
  }

  return matchingCharacters[0];
}

function assertValidFactionId(factionId) {
  if (!getFactionIds().includes(factionId)) {
    throw new Error(`Invalid reward ownerFactionId: ${factionId}`);
  }
}

function assertMovementReward(reward) {
  if (!reward || reward.type !== REWARD_TYPES.MOVEMENT_REWARD) {
    throw new Error('Expected a movementReward.');
  }

  if (!reward.source || typeof reward.source !== 'object') {
    throw new Error('movementReward.source is required.');
  }

  if (!Object.values(REWARD_SOURCE_TYPES).includes(reward.source.type)) {
    throw new Error(`Unknown movementReward.source.type: ${reward.source.type}`);
  }

  if (
    reward.source.characterId === undefined ||
    reward.source.characterId === null ||
    reward.source.characterId === ''
  ) {
    throw new Error('movementReward.source.characterId is required.');
  }

  assertValidFactionId(reward.ownerFactionId);

  if (reward.source.type === REWARD_SOURCE_TYPES.CAPTURE && reward.steps !== REWARD_STEPS.CAPTURE) {
    throw new Error(`capture movementReward.steps must be exactly ${REWARD_STEPS.CAPTURE}.`);
  }

  if (reward.source.type === REWARD_SOURCE_TYPES.GOAL && reward.steps !== REWARD_STEPS.GOAL) {
    throw new Error(`goal movementReward.steps must be exactly ${REWARD_STEPS.GOAL}.`);
  }

  if (
    reward.excludedCharacterIds !== undefined &&
    !Array.isArray(reward.excludedCharacterIds)
  ) {
    throw new Error('movementReward.excludedCharacterIds must be an array when provided.');
  }
}

function assertGoalRewardSource({ reward, characters }) {
  if (reward.source.type !== REWARD_SOURCE_TYPES.GOAL) {
    return;
  }

  const sourceCharacter = getCharacterById({
    characterId: reward.source.characterId,
    characters,
  });

  if (sourceCharacter.position.type !== POSITION_TYPES.GOAL) {
    throw new Error('goal movementReward source character must currently be at GOAL.');
  }

  if (sourceCharacter.factionId !== reward.ownerFactionId) {
    throw new Error('goal movementReward ownerFactionId must match its source character faction.');
  }
}

function createMovementRewardAction({ reward, characterId, movement }) {
  return {
    id: createDecisionActionId({
      decisionType: DECISION_TYPES.REWARD_RECIPIENT_SELECTION,
      actionType: REWARD_ACTION_TYPES.MOVEMENT_REWARD_MOVEMENT,
      identityParts: [
        reward.source.type,
        reward.source.characterId,
        reward.ownerFactionId,
        reward.steps,
        characterId,
      ],
    }),
    type: REWARD_ACTION_TYPES.MOVEMENT_REWARD_MOVEMENT,
    characterId,
    steps: reward.steps,
    rewardSteps: reward.steps,
    rewardSource: { ...reward.source },
    movement,
  };
}

function getMovementRewardCandidates({ state, reward, characters }) {
  const excludedCharacterIds = new Set(reward.excludedCharacterIds || []);

  return characters.flatMap((character) => {
    if (character.factionId !== reward.ownerFactionId) {
      return [];
    }

    if (excludedCharacterIds.has(character.id)) {
      return [];
    }

    if (
      character.position.type === POSITION_TYPES.HOME ||
      character.position.type === POSITION_TYPES.GOAL
    ) {
      return [];
    }

    const rulesContext = createRulesContext({
      gameState: state,
      actorCharacterId: character.id,
      source: {
        type: MOVEMENT_SOURCE_TYPES.REWARD,
        reward,
      },
      movementType: MOVEMENT_TYPES.REWARD,
    });
    const movement = evaluateMovement({
      characterId: character.id,
      steps: reward.steps,
      characters: getCharactersFromState(rulesContext.gameState),
      rulesContext,
    });

    if (!movement.legal) {
      return [];
    }

    return [createMovementRewardAction({ reward, characterId: character.id, movement })];
  });
}

function getMovementRewardAvailability({ state, reward }) {
  assertMovementReward(reward);

  const characters = getCharactersFromState(state);

  assertGoalRewardSource({ reward, characters });

  const availableActions = getMovementRewardCandidates({ state, reward, characters });

  if (availableActions.length === 0) {
    return {
      reward: cloneReward(reward),
      status: REWARD_STATUS.LOST,
      mustChooseAction: false,
      availableActions: [],
      reason: REWARD_LOST_REASONS.NO_LEGAL_RECIPIENT,
    };
  }

  return {
    reward: cloneReward(reward),
    status: availableActions.length === 1 ? REWARD_STATUS.AVAILABLE : REWARD_STATUS.CHOICE_REQUIRED,
    mustChooseAction: availableActions.length > 1,
    availableActions,
  };
}

export function getAvailableRewardActions({ state, reward }) {
  if (!reward || !reward.type) {
    throw new Error('reward is required.');
  }

  if (reward.type === REWARD_TYPES.MOVEMENT_REWARD) {
    return getMovementRewardAvailability({ state, reward });
  }

  throw new Error(`Unknown reward type: ${reward.type}`);
}
