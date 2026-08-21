import {
  FACTION_IDS,
  MOVEMENT_FAILURE_REASONS,
  POSITION_TYPES,
  calculateDestination,
  createCommonPosition,
  createFinalLanePosition,
  createGoalPosition,
  createHomePosition,
} from '../index';

function expectValidDestination(result, destination) {
  expect(result).toEqual({ ok: true, destination });
}

describe('calculateDestination', () => {
  describe('common route movement', () => {
    test('moves normally without crossing 68', () => {
      expectValidDestination(
        calculateDestination({
          factionId: FACTION_IDS.YELLOW,
          from: createCommonPosition(10),
          steps: 3,
        }),
        createCommonPosition(13),
      );
    });

    test('moves across 68 to 1', () => {
      expectValidDestination(
        calculateDestination({
          factionId: FACTION_IDS.YELLOW,
          from: createCommonPosition(67),
          steps: 2,
        }),
        createCommonPosition(1),
      );
    });

    test.each([
      [FACTION_IDS.YELLOW, 1, 3, 4],
      [FACTION_IDS.BLUE, 18, 3, 21],
      [FACTION_IDS.RED, 35, 3, 38],
      [FACTION_IDS.GREEN, 52, 3, 55],
    ])('can finish exactly on the last common square for %s', (factionId, fromSquare, steps, lastCommonSquare) => {
      expectValidDestination(
        calculateDestination({
          factionId,
          from: createCommonPosition(fromSquare),
          steps,
        }),
        createCommonPosition(lastCommonSquare),
      );
    });

    test.each([
      [FACTION_IDS.YELLOW, 4],
      [FACTION_IDS.BLUE, 21],
      [FACTION_IDS.RED, 38],
      [FACTION_IDS.GREEN, 55],
    ])('enters final lane 1 from the last common square for %s', (factionId, lastCommonSquare) => {
      expectValidDestination(
        calculateDestination({
          factionId,
          from: createCommonPosition(lastCommonSquare),
          steps: 1,
        }),
        createFinalLanePosition(factionId, 1),
      );
    });

    test('can enter final lane and continue moving within it', () => {
      expectValidDestination(
        calculateDestination({
          factionId: FACTION_IDS.YELLOW,
          from: createCommonPosition(4),
          steps: 3,
        }),
        createFinalLanePosition(FACTION_IDS.YELLOW, 3),
      );
    });
  });

  describe('final lane movement and bounce', () => {
    test('moves within the final lane', () => {
      expectValidDestination(
        calculateDestination({
          factionId: FACTION_IDS.RED,
          from: createFinalLanePosition(FACTION_IDS.RED, 2),
          steps: 3,
        }),
        createFinalLanePosition(FACTION_IDS.RED, 5),
      );
    });

    test('reaches goal exactly from final lane 7', () => {
      expectValidDestination(
        calculateDestination({
          factionId: FACTION_IDS.BLUE,
          from: createFinalLanePosition(FACTION_IDS.BLUE, 7),
          steps: 1,
        }),
        createGoalPosition(),
      );
    });

    test('reaches goal exactly from final lane 6', () => {
      expectValidDestination(
        calculateDestination({
          factionId: FACTION_IDS.GREEN,
          from: createFinalLanePosition(FACTION_IDS.GREEN, 6),
          steps: 2,
        }),
        createGoalPosition(),
      );
    });

    test('bounces from goal and consumes all steps', () => {
      expectValidDestination(
        calculateDestination({
          factionId: FACTION_IDS.YELLOW,
          from: createFinalLanePosition(FACTION_IDS.YELLOW, 6),
          steps: 4,
        }),
        createFinalLanePosition(FACTION_IDS.YELLOW, 6),
      );
    });

    test('bounces several steps without returning to the common route', () => {
      const result = calculateDestination({
        factionId: FACTION_IDS.RED,
        from: createFinalLanePosition(FACTION_IDS.RED, 7),
        steps: 8,
      });

      expectValidDestination(result, createFinalLanePosition(FACTION_IDS.RED, 1));
      expect(result.destination.type).not.toBe(POSITION_TYPES.COMMON);
    });

    test('does not finish at goal when goal is crossed during bounce', () => {
      const result = calculateDestination({
        factionId: FACTION_IDS.BLUE,
        from: createFinalLanePosition(FACTION_IDS.BLUE, 5),
        steps: 5,
      });

      expectValidDestination(result, createFinalLanePosition(FACTION_IDS.BLUE, 6));
      expect(result.destination).not.toEqual(createGoalPosition());
    });

    test('rejects geometrically impossible bounce beyond final lane 1', () => {
      expect(
        calculateDestination({
          factionId: FACTION_IDS.RED,
          from: createFinalLanePosition(FACTION_IDS.RED, 7),
          steps: 9,
        }),
      ).toEqual({
        ok: false,
        reason: MOVEMENT_FAILURE_REASONS.MOVEMENT_BEYOND_FINAL_LANE_START,
      });
    });

    test('detects impossible bounce after entering the final lane from common route', () => {
      expect(
        calculateDestination({
          factionId: FACTION_IDS.YELLOW,
          from: createCommonPosition(4),
          steps: 17,
        }),
      ).toEqual({
        ok: false,
        reason: MOVEMENT_FAILURE_REASONS.MOVEMENT_BEYOND_FINAL_LANE_START,
      });
    });
  });

  describe('invalid inputs', () => {
    test('rejects movement from home', () => {
      expect(() =>
        calculateDestination({
          factionId: FACTION_IDS.YELLOW,
          from: createHomePosition(),
          steps: 1,
        }),
      ).toThrow('Cannot calculate movement from home.');
    });

    test('rejects movement from goal', () => {
      expect(() =>
        calculateDestination({
          factionId: FACTION_IDS.YELLOW,
          from: createGoalPosition(),
          steps: 1,
        }),
      ).toThrow('Cannot calculate movement from goal.');
    });

    test.each([0, -1, 1.5])('rejects invalid steps: %s', (steps) => {
      expect(() =>
        calculateDestination({
          factionId: FACTION_IDS.YELLOW,
          from: createCommonPosition(5),
          steps,
        }),
      ).toThrow('Movement steps must be a positive integer.');
    });

    test.each([0, 69])('rejects invalid common square: %s', (square) => {
      expect(() =>
        calculateDestination({
          factionId: FACTION_IDS.YELLOW,
          from: createCommonPosition(square),
          steps: 1,
        }),
      ).toThrow(`Invalid common square: ${square}`);
    });

    test.each([0, 8])('rejects invalid final lane index: %s', (index) => {
      expect(() =>
        calculateDestination({
          factionId: FACTION_IDS.YELLOW,
          from: createFinalLanePosition(FACTION_IDS.YELLOW, index),
          steps: 1,
        }),
      ).toThrow(`Invalid final lane index: ${index}`);
    });

    test('rejects final lane from another faction', () => {
      expect(() =>
        calculateDestination({
          factionId: FACTION_IDS.BLUE,
          from: createFinalLanePosition(FACTION_IDS.RED, 3),
          steps: 1,
        }),
      ).toThrow('Cannot move from another faction final lane.');
    });

    test('rejects invalid faction id', () => {
      expect(() =>
        calculateDestination({
          factionId: 'purple',
          from: createCommonPosition(5),
          steps: 1,
        }),
      ).toThrow('Invalid faction id: purple');
    });
  });

  describe('movement source independence', () => {
    test('calculates the same destination from only position, faction, and steps', () => {
      const sharedInput = {
        factionId: FACTION_IDS.GREEN,
        from: createCommonPosition(56),
        steps: 20,
      };

      expect(calculateDestination(sharedInput)).toEqual(calculateDestination(sharedInput));
      expectValidDestination(calculateDestination(sharedInput), createCommonPosition(8));
    });
  });
});
