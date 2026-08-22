export const EXECUTABLE_ACTION_TYPES = Object.freeze({
  NORMAL_MOVEMENT: 'normalMovement',
  EXIT_HOME: 'exitHome',
  BREAK_BARRIER: 'breakBarrier',
});

export const EXECUTION_EVENT_TYPES = Object.freeze({
  CHARACTER_MOVED: 'characterMoved',
  CHARACTER_CAPTURED: 'characterCaptured',
  CHARACTER_REACHED_GOAL: 'characterReachedGoal',
  CHARACTER_EXITED_HOME: 'characterExitedHome',
  CHARACTER_REMOVED_FROM_START: 'characterRemovedFromStart',
  BARRIER_BROKEN: 'barrierBroken',
});
