import { FACTION_IDS, getFactionIds } from '../factions/factions';
import { createFinalLanePosition, createGoalPosition } from '../state/positions';

export const COMMON_SQUARE_COUNT = 68;

export const COMMON_SQUARES = Object.freeze(
  Array.from({ length: COMMON_SQUARE_COUNT }, (_, index) => index + 1),
);

export const SAFE_SQUARES = Object.freeze([5, 12, 17, 22, 29, 34, 39, 46, 51, 56, 63, 68]);

export const START_SQUARE_BY_FACTION = Object.freeze({
  [FACTION_IDS.YELLOW]: 5,
  [FACTION_IDS.BLUE]: 22,
  [FACTION_IDS.RED]: 39,
  [FACTION_IDS.GREEN]: 56,
});

export const LAST_COMMON_SQUARE_BY_FACTION = Object.freeze({
  [FACTION_IDS.YELLOW]: 4,
  [FACTION_IDS.BLUE]: 21,
  [FACTION_IDS.RED]: 38,
  [FACTION_IDS.GREEN]: 55,
});

export const FINAL_LANE_LENGTH = 7;

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
