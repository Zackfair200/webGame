export const TURN_PHASES = Object.freeze({
  WAITING_FOR_ROLL: 'waitingForRoll',
  WAITING_FOR_ACTION: 'waitingForAction',
  WAITING_FOR_REWARD_CHOICE: 'waitingForRewardChoice',
  ENDED: 'ended',
});

export const TURN_AFTER_CONSEQUENCES = Object.freeze({
  WAIT_FOR_ROLL: 'waitForRoll',
  END_TURN: 'endTurn',
});

export const TURN_END_REASONS = Object.freeze({
  COMPLETED: 'completed',
  NO_LEGAL_ACTION: 'noLegalAction',
  THIRD_SIX_PENALTY: 'thirdSixPenalty',
  STOPPED: 'stopped',
});

export const TURN_EVENT_TYPES = Object.freeze({
  THIRD_SIX_PENALTY: 'thirdSixPenalty',
  THIRD_SIX_PENALTY_SKIPPED: 'thirdSixPenaltySkipped',
});
