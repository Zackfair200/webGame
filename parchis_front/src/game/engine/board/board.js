import { FACTION_IDS, getFactionIds } from '../factions/factions';
import { createFinalLanePosition, createGoalPosition } from '../state/positions';
import { COMMON_SQUARE_COUNT, FINAL_LANE_LENGTH } from './constants';

export { COMMON_SQUARE_COUNT, FINAL_LANE_LENGTH } from './constants';

export const COMMON_SQUARES = Object.freeze(
  Array.from({ length: COMMON_SQUARE_COUNT }, (_, index) => index + 1),
);

export const SAFE_SQUARES = Object.freeze([5, 12, 17, 22, 29, 34, 39, 46, 51, 56, 63, 68]);

export const START_SQUARE_BY_FACTION = Object.freeze({
  [FACTION_IDS.YELLOW]: 39,
  [FACTION_IDS.GREEN]: 22,
  [FACTION_IDS.BLUE]: 56,
  [FACTION_IDS.RED]: 5,
});

export const LAST_COMMON_SQUARE_BY_FACTION = Object.freeze({
  [FACTION_IDS.YELLOW]: 38,
  [FACTION_IDS.GREEN]: 21,
  [FACTION_IDS.BLUE]: 55,
  [FACTION_IDS.RED]: 4,
});

export const FINAL_LANES_BY_FACTION = Object.freeze(
  getFactionIds().reduce((lanes, factionId) => {
    return {
      ...lanes,
      [factionId]: Object.freeze(
        Array.from({ length: FINAL_LANE_LENGTH }, (_, index) =>
          createFinalLanePosition(factionId, index + 1),
        ),
      ),
    };
  }, {}),
);

export const GOAL_POSITION = Object.freeze(createGoalPosition());
