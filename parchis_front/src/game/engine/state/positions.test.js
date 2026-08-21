import {
  FACTION_IDS,
  COMMON_SQUARE_COUNT,
  FINAL_LANE_LENGTH,
  POSITION_TYPES,
  clonePosition,
  createCommonPosition,
  createFinalLanePosition,
  createGoalPosition,
  createHomePosition,
  isPlayablePosition,
  isSamePosition,
  isValidPosition,
} from '../index';

describe('position helpers', () => {
  describe('isValidPosition', () => {
    test('accepts valid home and goal positions', () => {
      expect(isValidPosition(createHomePosition())).toBe(true);
      expect(isValidPosition(createGoalPosition())).toBe(true);
    });

    test('accepts valid common boundaries', () => {
      expect(isValidPosition(createCommonPosition(1))).toBe(true);
      expect(isValidPosition(createCommonPosition(COMMON_SQUARE_COUNT))).toBe(true);
    });

    test('accepts valid final lane positions for every faction', () => {
      Object.values(FACTION_IDS).forEach((factionId) => {
        expect(isValidPosition(createFinalLanePosition(factionId, 1))).toBe(true);
      });
    });

    test('accepts valid final lane index boundaries', () => {
      expect(isValidPosition(createFinalLanePosition(FACTION_IDS.RED, 1))).toBe(true);
      expect(isValidPosition(createFinalLanePosition(FACTION_IDS.RED, FINAL_LANE_LENGTH))).toBe(true);
    });

    test.each([
      null,
      {},
      { type: 'unknown' },
      { type: POSITION_TYPES.COMMON },
      createCommonPosition(0),
      createCommonPosition(COMMON_SQUARE_COUNT + 1),
      createCommonPosition(1.5),
      { type: POSITION_TYPES.FINAL_LANE, index: 1 },
      createFinalLanePosition('purple', 1),
      { type: POSITION_TYPES.FINAL_LANE, factionId: FACTION_IDS.RED },
      createFinalLanePosition(FACTION_IDS.RED, 0),
      createFinalLanePosition(FACTION_IDS.RED, FINAL_LANE_LENGTH + 1),
      createFinalLanePosition(FACTION_IDS.RED, 1.5),
    ])('rejects invalid position: %#', (position) => {
      expect(isValidPosition(position)).toBe(false);
    });
  });

  describe('isSamePosition', () => {
    test('matches the same common position', () => {
      expect(isSamePosition(createCommonPosition(10), createCommonPosition(10))).toBe(true);
    });

    test('does not match different common positions', () => {
      expect(isSamePosition(createCommonPosition(10), createCommonPosition(11))).toBe(false);
    });

    test('matches the same final lane position', () => {
      expect(
        isSamePosition(
          createFinalLanePosition(FACTION_IDS.RED, 3),
          createFinalLanePosition(FACTION_IDS.RED, 3),
        ),
      ).toBe(true);
    });

    test('does not match final lane positions with the same index and different factions', () => {
      expect(
        isSamePosition(
          createFinalLanePosition(FACTION_IDS.RED, 3),
          createFinalLanePosition(FACTION_IDS.BLUE, 3),
        ),
      ).toBe(false);
    });

    test('matches home positions structurally', () => {
      expect(isSamePosition(createHomePosition(), createHomePosition())).toBe(true);
    });

    test('matches goal positions structurally', () => {
      expect(isSamePosition(createGoalPosition(), createGoalPosition())).toBe(true);
    });

    test('does not match different position types', () => {
      expect(isSamePosition(createHomePosition(), createGoalPosition())).toBe(false);
    });

    test('does not match missing positions', () => {
      expect(isSamePosition(null, createGoalPosition())).toBe(false);
      expect(isSamePosition(createGoalPosition(), undefined)).toBe(false);
    });

    test('does not match invalid common positions missing square', () => {
      expect(
        isSamePosition({ type: POSITION_TYPES.COMMON }, { type: POSITION_TYPES.COMMON }),
      ).toBe(false);
    });

    test('does not match incomplete final lane positions', () => {
      expect(
        isSamePosition(
          { type: POSITION_TYPES.FINAL_LANE, factionId: FACTION_IDS.RED },
          { type: POSITION_TYPES.FINAL_LANE, factionId: FACTION_IDS.RED },
        ),
      ).toBe(false);
    });

    test('does not match unknown position types', () => {
      expect(isSamePosition({ type: 'unknown' }, { type: 'unknown' })).toBe(false);
    });
  });

  describe('isPlayablePosition', () => {
    test('treats common positions as playable', () => {
      expect(isPlayablePosition(createCommonPosition(10))).toBe(true);
    });

    test('treats final lane positions as playable', () => {
      expect(isPlayablePosition(createFinalLanePosition(FACTION_IDS.RED, 3))).toBe(true);
    });

    test('does not treat home as playable', () => {
      expect(isPlayablePosition(createHomePosition())).toBe(false);
    });

    test('does not treat goal as playable', () => {
      expect(isPlayablePosition(createGoalPosition())).toBe(false);
    });

    test('does not treat incomplete common positions as playable', () => {
      expect(isPlayablePosition({ type: POSITION_TYPES.COMMON })).toBe(false);
    });

    test('does not treat out-of-range common positions as playable', () => {
      expect(isPlayablePosition(createCommonPosition(COMMON_SQUARE_COUNT + 1))).toBe(false);
    });

    test('does not treat incomplete final lane positions as playable', () => {
      expect(isPlayablePosition({ type: POSITION_TYPES.FINAL_LANE, factionId: FACTION_IDS.RED })).toBe(false);
    });

    test('does not treat final lane positions with invalid faction as playable', () => {
      expect(isPlayablePosition(createFinalLanePosition('purple', 1))).toBe(false);
    });

    test('does not treat unknown position types as playable', () => {
      expect(isPlayablePosition({ type: 'unknown' })).toBe(false);
    });
  });

  describe('clonePosition', () => {
    test('returns a structurally equal independent copy', () => {
      const position = createFinalLanePosition(FACTION_IDS.YELLOW, 4);
      const copy = clonePosition(position);

      copy.index = 5;

      expect(position).toEqual({
        type: POSITION_TYPES.FINAL_LANE,
        factionId: FACTION_IDS.YELLOW,
        index: 4,
      });
      expect(copy).toEqual({
        type: POSITION_TYPES.FINAL_LANE,
        factionId: FACTION_IDS.YELLOW,
        index: 5,
      });
    });
  });
});
