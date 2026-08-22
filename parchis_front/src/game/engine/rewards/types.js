export const REWARD_TYPES = Object.freeze({
  CAPTURE_REWARD: 'captureReward',
  GOAL_REWARD: 'goalReward',
});

export const REWARD_ACTION_TYPES = Object.freeze({
  CAPTURE_REWARD_MOVEMENT: 'captureRewardMovement',
  GOAL_REWARD_MOVEMENT: 'goalRewardMovement',
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
