import { evaluateMovement } from '../rules/legalMovement/legalMovement';
import { getMovableCharacters } from '../rules/movableCharacters/movableCharacters';
import { getCharactersFromState } from '../state/characters';
import { POSITION_TYPES } from '../state/positions';
import {
  REWARD_ACTION_TYPES,
  REWARD_LOST_REASONS,
  REWARD_STATUS,
  REWARD_STEPS,
  REWARD_TYPES,
} from './types';

function cloneReward(reward) {
  return { ...reward };
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

function assertCaptureReward(reward) {
  if (!reward || reward.type !== REWARD_TYPES.CAPTURE_REWARD) {
    throw new Error('Expected a captureReward.');
  }

  if (reward.steps !== REWARD_STEPS.CAPTURE) {
    throw new Error(`captureReward.steps must be exactly ${REWARD_STEPS.CAPTURE}.`);
  }

  if (reward.characterId === undefined || reward.characterId === null || reward.characterId === '') {
    throw new Error('captureReward.characterId is required.');
  }
}

function assertGoalReward(reward) {
  if (!reward || reward.type !== REWARD_TYPES.GOAL_REWARD) {
    throw new Error('Expected a goalReward.');
  }

  if (reward.steps !== REWARD_STEPS.GOAL) {
    throw new Error(`goalReward.steps must be exactly ${REWARD_STEPS.GOAL}.`);
  }

  if (
    reward.sourceCharacterId === undefined ||
    reward.sourceCharacterId === null ||
    reward.sourceCharacterId === ''
  ) {
    throw new Error('goalReward.sourceCharacterId is required.');
  }
}

function createCaptureRewardAction({ characterId, movement }) {
  return {
    type: REWARD_ACTION_TYPES.CAPTURE_REWARD_MOVEMENT,
    characterId,
    steps: movement.steps,
    rewardSteps: REWARD_STEPS.CAPTURE,
    movement,
  };
}

function getHighestLegalCaptureRewardMovement({ characterId, characters }) {
  let lastFailure = null;

  for (let steps = REWARD_STEPS.CAPTURE; steps >= 1; steps -= 1) {
    const movement = evaluateMovement({
      characterId,
      steps,
      characters,
    });

    if (movement.legal) {
      return {
        status: REWARD_STATUS.AVAILABLE,
        movement: {
          ...movement,
          steps,
        },
      };
    }

    lastFailure = movement;
  }

  return {
    status: REWARD_STATUS.LOST,
    reason: lastFailure?.reason,
  };
}

function createGoalRewardAction({ characterId, movement }) {
  return {
    type: REWARD_ACTION_TYPES.GOAL_REWARD_MOVEMENT,
    characterId,
    steps: REWARD_STEPS.GOAL,
    movement,
  };
}

function getCaptureRewardAvailability({ state, reward }) {
  assertCaptureReward(reward);

  const characters = getCharactersFromState(state);
  const rewardMovement = getHighestLegalCaptureRewardMovement({
    characterId: reward.characterId,
    characters,
  });

  if (rewardMovement.status === REWARD_STATUS.LOST) {
    return {
      reward: cloneReward(reward),
      status: REWARD_STATUS.LOST,
      mustChooseAction: false,
      availableActions: [],
      reason: rewardMovement.reason,
    };
  }

  return {
    reward: cloneReward(reward),
    status: REWARD_STATUS.AVAILABLE,
    mustChooseAction: false,
    availableActions: [
      createCaptureRewardAction({
        characterId: reward.characterId,
        movement: rewardMovement.movement,
      }),
    ],
  };
}

function getGoalRewardAvailability({ state, reward }) {
  assertGoalReward(reward);

  const characters = getCharactersFromState(state);
  const sourceCharacter = getCharacterById({
    characterId: reward.sourceCharacterId,
    characters,
  });

  if (sourceCharacter.position.type !== POSITION_TYPES.GOAL) {
    throw new Error('goalReward.sourceCharacterId must currently be at GOAL.');
  }

  const { movableCharacters } = getMovableCharacters({
    factionId: sourceCharacter.factionId,
    steps: REWARD_STEPS.GOAL,
    characters,
  });
  const candidates = movableCharacters.filter((candidate) => {
    if (candidate.characterId === reward.sourceCharacterId) {
      return false;
    }

    const character = getCharacterById({ characterId: candidate.characterId, characters });

    return (
      character.position.type !== POSITION_TYPES.HOME &&
      character.position.type !== POSITION_TYPES.GOAL
    );
  });
  const availableActions = candidates.map(createGoalRewardAction);

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
    status:
      availableActions.length === 1 ? REWARD_STATUS.AVAILABLE : REWARD_STATUS.CHOICE_REQUIRED,
    mustChooseAction: availableActions.length > 1,
    availableActions,
  };
}

export function getAvailableRewardActions({ state, reward }) {
  if (!reward || !reward.type) {
    throw new Error('reward is required.');
  }

  if (reward.type === REWARD_TYPES.CAPTURE_REWARD) {
    return getCaptureRewardAvailability({ state, reward });
  }

  if (reward.type === REWARD_TYPES.GOAL_REWARD) {
    return getGoalRewardAvailability({ state, reward });
  }

  throw new Error(`Unknown reward type: ${reward.type}`);
}
