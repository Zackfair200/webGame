export const POSITION_TYPES = Object.freeze({
  HOME: 'home',
  COMMON: 'common',
  FINAL_LANE: 'finalLane',
  GOAL: 'goal',
});

export function createHomePosition() {
  return { type: POSITION_TYPES.HOME };
}

export function createCommonPosition(square) {
  return { type: POSITION_TYPES.COMMON, square };
}

export function createFinalLanePosition(factionId, index) {
  return { type: POSITION_TYPES.FINAL_LANE, factionId, index };
}

export function createGoalPosition() {
  return { type: POSITION_TYPES.GOAL };
}
