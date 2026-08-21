import {
  FACTION_IDS,
  FINAL_LANE_LENGTH,
  MOVEMENT_FAILURE_REASONS,
  POSITION_TYPES,
  ROUTES_BY_FACTION,
  calculateDestination,
  calculateMovementPath,
  createCommonPosition,
  createFinalLanePosition,
  createGoalPosition,
  createHomePosition,
} from '../index';

function expectValidDestination(result, destination) {
  expect(result).toEqual({ ok: true, destination });
}

function expectValidPath(result, path) {
  expect(result).toEqual({ ok: true, path });
}

function getCommonRoutePosition(factionId, square) {
  return ROUTES_BY_FACTION[factionId].find(
    (position) => position.type === POSITION_TYPES.COMMON && position.square === square,
  );
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

describe('calculateMovementPath', () => {
  test('returns every reached common square in order', () => {
    expectValidPath(
      calculateMovementPath({
        factionId: FACTION_IDS.YELLOW,
        from: createCommonPosition(67),
        steps: 5,
      }),
      [
        createCommonPosition(68),
        createCommonPosition(1),
        createCommonPosition(2),
        createCommonPosition(3),
        createCommonPosition(4),
      ],
    );
  });

  test('includes final lane positions after leaving the common route', () => {
    expectValidPath(
      calculateMovementPath({
        factionId: FACTION_IDS.YELLOW,
        from: createCommonPosition(4),
        steps: 3,
      }),
      [
        createFinalLanePosition(FACTION_IDS.YELLOW, 1),
        createFinalLanePosition(FACTION_IDS.YELLOW, 2),
        createFinalLanePosition(FACTION_IDS.YELLOW, 3),
      ],
    );
  });

  test('includes goal as the final path position when reached exactly', () => {
    expectValidPath(
      calculateMovementPath({
        factionId: FACTION_IDS.BLUE,
        from: createFinalLanePosition(FACTION_IDS.BLUE, 6),
        steps: 2,
      }),
      [createFinalLanePosition(FACTION_IDS.BLUE, 7), createGoalPosition()],
    );
  });

  test('reaches goal exactly after entering final lane from common route', () => {
    expectValidPath(
      calculateMovementPath({
        factionId: FACTION_IDS.RED,
        from: createCommonPosition(38),
        steps: 8,
      }),
      [
        createFinalLanePosition(FACTION_IDS.RED, 1),
        createFinalLanePosition(FACTION_IDS.RED, 2),
        createFinalLanePosition(FACTION_IDS.RED, 3),
        createFinalLanePosition(FACTION_IDS.RED, 4),
        createFinalLanePosition(FACTION_IDS.RED, 5),
        createFinalLanePosition(FACTION_IDS.RED, 6),
        createFinalLanePosition(FACTION_IDS.RED, 7),
        createGoalPosition(),
      ],
    );
  });

  test('includes goal as an intermediate path position during bounce', () => {
    expectValidPath(
      calculateMovementPath({
        factionId: FACTION_IDS.YELLOW,
        from: createFinalLanePosition(FACTION_IDS.YELLOW, 6),
        steps: 4,
      }),
      [
        createFinalLanePosition(FACTION_IDS.YELLOW, 7),
        createGoalPosition(),
        createFinalLanePosition(FACTION_IDS.YELLOW, 7),
        createFinalLanePosition(FACTION_IDS.YELLOW, 6),
      ],
    );
  });

  test('includes goal as an intermediate path position when bouncing after entering final lane from common route', () => {
    expectValidPath(
      calculateMovementPath({
        factionId: FACTION_IDS.GREEN,
        from: createCommonPosition(55),
        steps: 9,
      }),
      [
        createFinalLanePosition(FACTION_IDS.GREEN, 1),
        createFinalLanePosition(FACTION_IDS.GREEN, 2),
        createFinalLanePosition(FACTION_IDS.GREEN, 3),
        createFinalLanePosition(FACTION_IDS.GREEN, 4),
        createFinalLanePosition(FACTION_IDS.GREEN, 5),
        createFinalLanePosition(FACTION_IDS.GREEN, 6),
        createFinalLanePosition(FACTION_IDS.GREEN, 7),
        createGoalPosition(),
        createFinalLanePosition(FACTION_IDS.GREEN, 7),
      ],
    );
  });

  test('can bounce back to final lane 1 without returning to the common route', () => {
    const result = calculateMovementPath({
      factionId: FACTION_IDS.RED,
      from: createFinalLanePosition(FACTION_IDS.RED, 7),
      steps: 8,
    });

    expectValidPath(result, [
      createGoalPosition(),
      createFinalLanePosition(FACTION_IDS.RED, 7),
      createFinalLanePosition(FACTION_IDS.RED, 6),
      createFinalLanePosition(FACTION_IDS.RED, 5),
      createFinalLanePosition(FACTION_IDS.RED, 4),
      createFinalLanePosition(FACTION_IDS.RED, 3),
      createFinalLanePosition(FACTION_IDS.RED, 2),
      createFinalLanePosition(FACTION_IDS.RED, 1),
    ]);
    expect(result.path.some((position) => position.type === POSITION_TYPES.COMMON)).toBe(false);
  });

  test('rejects geometrically impossible bounce beyond final lane 1', () => {
    expect(
      calculateMovementPath({
        factionId: FACTION_IDS.YELLOW,
        from: createCommonPosition(4),
        steps: 16,
      }),
    ).toEqual({
      ok: false,
      reason: MOVEMENT_FAILURE_REASONS.MOVEMENT_BEYOND_FINAL_LANE_START,
    });
  });

  test('keeps destination results independent from internal routes', () => {
    const routePosition = getCommonRoutePosition(FACTION_IDS.YELLOW, 68);
    const result = calculateDestination({
      factionId: FACTION_IDS.YELLOW,
      from: createCommonPosition(67),
      steps: 1,
    });

    result.destination.square = 999;

    expect(routePosition).toEqual(createCommonPosition(68));
    expect(getCommonRoutePosition(FACTION_IDS.YELLOW, 68)).toEqual(createCommonPosition(68));
  });

  test('keeps path results independent from internal routes', () => {
    const routePosition = getCommonRoutePosition(FACTION_IDS.YELLOW, 68);
    const result = calculateMovementPath({
      factionId: FACTION_IDS.YELLOW,
      from: createCommonPosition(67),
      steps: 2,
    });

    result.path[0].square = 999;

    expect(routePosition).toEqual(createCommonPosition(68));
    expect(getCommonRoutePosition(FACTION_IDS.YELLOW, 68)).toEqual(createCommonPosition(68));
  });

  test('returns correct results after a previous result was mutated', () => {
    const firstPathResult = calculateMovementPath({
      factionId: FACTION_IDS.YELLOW,
      from: createCommonPosition(67),
      steps: 2,
    });
    const firstDestinationResult = calculateDestination({
      factionId: FACTION_IDS.YELLOW,
      from: createCommonPosition(67),
      steps: 1,
    });

    firstPathResult.path[0].square = 999;
    firstDestinationResult.destination.square = 999;

    expectValidPath(
      calculateMovementPath({
        factionId: FACTION_IDS.YELLOW,
        from: createCommonPosition(67),
        steps: 2,
      }),
      [createCommonPosition(68), createCommonPosition(1)],
    );
    expectValidDestination(
      calculateDestination({
        factionId: FACTION_IDS.YELLOW,
        from: createCommonPosition(67),
        steps: 1,
      }),
      createCommonPosition(68),
    );
  });

  test('systematically matches calculateDestination for valid movement geometry', () => {
    const inputs = [];

    Object.values(FACTION_IDS).forEach((factionId) => {
      for (let square = 1; square <= 68; square += 1) {
        for (let steps = 1; steps <= 20; steps += 1) {
          inputs.push({ factionId, from: createCommonPosition(square), steps });
        }
      }

      for (let index = 1; index <= FINAL_LANE_LENGTH; index += 1) {
        for (let steps = 1; steps <= 15; steps += 1) {
          inputs.push({ factionId, from: createFinalLanePosition(factionId, index), steps });
        }
      }
    });

    inputs.forEach((input) => {
      const pathResult = calculateMovementPath(input);
      const destinationResult = calculateDestination(input);

      if (!pathResult.ok) {
        expect(destinationResult).toEqual(pathResult);
        return;
      }

      expect(destinationResult.ok).toBe(true);
      expect(pathResult.path).toHaveLength(input.steps);
      expect(pathResult.path.at(-1)).toEqual(destinationResult.destination);
    });
  });

  describe('invalid inputs', () => {
    test('rejects invalid faction id', () => {
      expect(() =>
        calculateMovementPath({
          factionId: 'purple',
          from: createCommonPosition(5),
          steps: 1,
        }),
      ).toThrow('Invalid faction id: purple');
    });

    test('rejects movement from home', () => {
      expect(() =>
        calculateMovementPath({
          factionId: FACTION_IDS.YELLOW,
          from: createHomePosition(),
          steps: 1,
        }),
      ).toThrow('Cannot calculate movement from home.');
    });

    test('rejects movement from goal', () => {
      expect(() =>
        calculateMovementPath({
          factionId: FACTION_IDS.YELLOW,
          from: createGoalPosition(),
          steps: 1,
        }),
      ).toThrow('Cannot calculate movement from goal.');
    });

    test.each([0, -1, 1.5])('rejects invalid steps: %s', (steps) => {
      expect(() =>
        calculateMovementPath({
          factionId: FACTION_IDS.YELLOW,
          from: createCommonPosition(5),
          steps,
        }),
      ).toThrow('Movement steps must be a positive integer.');
    });

    test.each([0, 69])('rejects invalid common square: %s', (square) => {
      expect(() =>
        calculateMovementPath({
          factionId: FACTION_IDS.YELLOW,
          from: createCommonPosition(square),
          steps: 1,
        }),
      ).toThrow(`Invalid common square: ${square}`);
    });

    test.each([0, 8])('rejects invalid final lane index: %s', (index) => {
      expect(() =>
        calculateMovementPath({
          factionId: FACTION_IDS.YELLOW,
          from: createFinalLanePosition(FACTION_IDS.YELLOW, index),
          steps: 1,
        }),
      ).toThrow(`Invalid final lane index: ${index}`);
    });

    test('rejects final lane from another faction', () => {
      expect(() =>
        calculateMovementPath({
          factionId: FACTION_IDS.BLUE,
          from: createFinalLanePosition(FACTION_IDS.RED, 3),
          steps: 1,
        }),
      ).toThrow('Cannot move from another faction final lane.');
    });
  });
});
