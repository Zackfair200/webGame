export const REWARD_TYPES = Object.freeze({
  MOVEMENT_REWARD: 'movementReward',
});

export const REWARD_SOURCE_TYPES = Object.freeze({
  CAPTURE: 'capture',
  GOAL: 'goal',
});

export const REWARD_ACTION_TYPES = Object.freeze({
  MOVEMENT_REWARD_MOVEMENT: 'movementRewardMovement',
  LOSE_REWARD: 'loseReward',
});

export const REWARD_STATUS = Object.freeze({
  AVAILABLE: 'available',
  CHOICE_REQUIRED: 'choiceRequired',
  LOST: 'lost',
});

export const REWARD_LOST_REASONS = Object.freeze({
  NO_LEGAL_RECIPIENT: 'noLegalRecipient',
});

export const REWARD_STEPS = Object.freeze({
  CAPTURE: 20,
  GOAL: 10,
});
