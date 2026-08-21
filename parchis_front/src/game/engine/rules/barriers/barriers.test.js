import {
  FACTION_IDS,
  calculateMovementPath,
  checkPathBlockedByBarrier,
  createCommonPosition,
  createFinalLanePosition,
  createGoalPosition,
  createHomePosition,
  getBarriersForFaction,
  getBarrierAtPosition,
  isBarrierAtPosition,
} from '../../index';

function createCharacter({ id, factionId, position }) {
  return {
    id,
    factionId,
    position,
  };
}

describe('barrier detection', () => {
  test.each([undefined, null, {}])('getBarrierAtPosition rejects non-array characters: %s', (characters) => {
    expect(() => getBarrierAtPosition({ position: createCommonPosition(10), characters })).toThrow(
      'characters must be an array.',
    );
  });

  test.each([undefined, null, {}])('isBarrierAtPosition rejects non-array characters: %s', (characters) => {
    expect(() => isBarrierAtPosition({ position: createCommonPosition(10), characters })).toThrow(
      'characters must be an array.',
    );
  });

  test('does not find a barrier with no occupants', () => {
    expect(getBarrierAtPosition({ position: createCommonPosition(10), characters: [] })).toEqual({
      exists: false,
    });
  });

  test('does not find a barrier with one occupant', () => {
    const characters = [
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
    ];

    expect(getBarrierAtPosition({ position: createCommonPosition(10), characters })).toEqual({
      exists: false,
    });
  });

  test('finds a barrier with two same-faction characters on common', () => {
    const characters = [
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
    ];

    expect(getBarrierAtPosition({ position: createCommonPosition(10), characters })).toEqual({
      exists: true,
      position: createCommonPosition(10),
      factionId: FACTION_IDS.RED,
      occupants: characters,
    });
    expect(isBarrierAtPosition({ position: createCommonPosition(10), characters })).toBe(true);
  });

  test('finds a barrier with two same-faction characters on final lane', () => {
    const position = createFinalLanePosition(FACTION_IDS.RED, 3);
    const characters = [
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position }),
    ];

    expect(getBarrierAtPosition({ position, characters })).toEqual({
      exists: true,
      position,
      factionId: FACTION_IDS.RED,
      occupants: characters,
    });
  });

  test('does not find a barrier with two different-faction characters', () => {
    const characters = [
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(10) }),
    ];

    expect(getBarrierAtPosition({ position: createCommonPosition(10), characters })).toEqual({
      exists: false,
    });
    expect(isBarrierAtPosition({ position: createCommonPosition(10), characters })).toBe(false);
  });

  test('does not treat home as a barrier', () => {
    const characters = [
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createHomePosition() }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createHomePosition() }),
    ];

    expect(getBarrierAtPosition({ position: createHomePosition(), characters })).toEqual({ exists: false });
    expect(isBarrierAtPosition({ position: createHomePosition(), characters })).toBe(false);
  });

  test('does not treat goal as a barrier', () => {
    const characters = [
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
    ];

    expect(getBarrierAtPosition({ position: createGoalPosition(), characters })).toEqual({ exists: false });
    expect(isBarrierAtPosition({ position: createGoalPosition(), characters })).toBe(false);
  });

  test('rejects barrier evaluation for more than two occupants at a playable position', () => {
    const characters = [
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(10) }),
    ];

    expect(() => getBarrierAtPosition({ position: createCommonPosition(10), characters })).toThrow(
      'Cannot evaluate barrier at a position with more than two occupants.',
    );
  });

  test('returns defensive copies in barrier results', () => {
    const characters = [
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
    ];
    const result = getBarrierAtPosition({ position: createCommonPosition(10), characters });

    result.position.square = 99;
    result.occupants[0].position.square = 99;

    expect(characters).toEqual([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
    ]);
  });
});

describe('getBarriersForFaction', () => {
  test.each([undefined, null, {}])('rejects non-array characters: %s', (characters) => {
    expect(() => getBarriersForFaction({ factionId: FACTION_IDS.RED, characters })).toThrow(
      'characters must be an array.',
    );
  });

  test('rejects an invalid faction id', () => {
    expect(() => getBarriersForFaction({ factionId: 'purple', characters: [] })).toThrow(
      'Invalid faction id: purple',
    );
  });

  test('returns an empty array when the faction has no barriers', () => {
    const characters = [
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(11) }),
      createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(10) }),
    ];

    expect(getBarriersForFaction({ factionId: FACTION_IDS.RED, characters })).toEqual([]);
  });

  test('finds own barriers on common positions', () => {
    const characters = [
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(20) }),
      createCharacter({ id: 'blue.2', factionId: FACTION_IDS.BLUE, position: createCommonPosition(20) }),
    ];

    expect(getBarriersForFaction({ factionId: FACTION_IDS.RED, characters })).toEqual([
      {
        position: createCommonPosition(10),
        factionId: FACTION_IDS.RED,
        occupants: [characters[0], characters[1]],
      },
    ]);
  });

  test('finds own barriers on final lane positions', () => {
    const position = createFinalLanePosition(FACTION_IDS.RED, 3);
    const characters = [
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position }),
    ];

    expect(getBarriersForFaction({ factionId: FACTION_IDS.RED, characters })).toEqual([
      {
        position,
        factionId: FACTION_IDS.RED,
        occupants: characters,
      },
    ]);
  });

  test('does not treat home or goal occupants as barriers', () => {
    const characters = [
      createCharacter({ id: 'red.home.1', factionId: FACTION_IDS.RED, position: createHomePosition() }),
      createCharacter({ id: 'red.home.2', factionId: FACTION_IDS.RED, position: createHomePosition() }),
      createCharacter({ id: 'red.goal.1', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
      createCharacter({ id: 'red.goal.2', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
    ];

    expect(getBarriersForFaction({ factionId: FACTION_IDS.RED, characters })).toEqual([]);
  });

  test('returns barriers in first-position encounter order', () => {
    const characters = [
      createCharacter({ id: 'red.3', factionId: FACTION_IDS.RED, position: createCommonPosition(30) }),
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'red.4', factionId: FACTION_IDS.RED, position: createCommonPosition(30) }),
    ];

    expect(getBarriersForFaction({ factionId: FACTION_IDS.RED, characters }).map((barrier) => barrier.position)).toEqual([
      createCommonPosition(30),
      createCommonPosition(10),
    ]);
  });

  test('rejects own barrier positions with more than two occupants', () => {
    const characters = [
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'red.3', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
    ];

    expect(() => getBarriersForFaction({ factionId: FACTION_IDS.RED, characters })).toThrow(
      'Cannot evaluate barrier at a position with more than two occupants.',
    );
  });

  test('returns defensive copies', () => {
    const characters = [
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
    ];
    const result = getBarriersForFaction({ factionId: FACTION_IDS.RED, characters });

    result[0].position.square = 99;
    result[0].occupants[0].position.square = 99;

    expect(characters).toEqual([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
    ]);
    expect(getBarriersForFaction({ factionId: FACTION_IDS.RED, characters })[0].position).toEqual(
      createCommonPosition(10),
    );
  });

  test('mutating returned occupants array does not affect later calls', () => {
    const characters = [
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
    ];
    const result = getBarriersForFaction({ factionId: FACTION_IDS.RED, characters });

    result[0].occupants.pop();
    result[0].occupants.push(
      createCharacter({ id: 'changed', factionId: FACTION_IDS.RED, position: createCommonPosition(99) }),
    );

    expect(characters).toEqual([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
    ]);
    expect(getBarriersForFaction({ factionId: FACTION_IDS.RED, characters })[0].occupants).toEqual(characters);
  });
});

describe('checkPathBlockedByBarrier', () => {
  test.each([undefined, null, {}])('rejects non-array characters: %s', (characters) => {
    expect(() =>
      checkPathBlockedByBarrier({
        path: [createCommonPosition(10)],
        characters,
        movingCharacterId: 'red.1',
      }),
    ).toThrow('characters must be an array.');
  });

  test('requires movingCharacterId', () => {
    expect(() =>
      checkPathBlockedByBarrier({
        path: [createCommonPosition(10)],
        characters: [],
      }),
    ).toThrow('movingCharacterId is required to check barrier blocking.');
  });

  test('requires movingCharacterId to match an existing character', () => {
    const characters = [
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(9) }),
    ];

    expect(() =>
      checkPathBlockedByBarrier({
        path: [createCommonPosition(10)],
        characters,
        movingCharacterId: 'red.missing',
      }),
    ).toThrow('movingCharacterId does not match an existing character: red.missing');
  });

  test('does not block a path without barriers', () => {
    const characters = [
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(9) }),
      createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(20) }),
    ];

    expect(
      checkPathBlockedByBarrier({
        path: [createCommonPosition(10), createCommonPosition(11), createCommonPosition(12)],
        characters,
        movingCharacterId: 'red.1',
      }),
    ).toEqual({ blocked: false });
  });

  test('blocks when a barrier is in an intermediate path position', () => {
    const characters = [
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(9) }),
      createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(12) }),
      createCharacter({ id: 'blue.2', factionId: FACTION_IDS.BLUE, position: createCommonPosition(12) }),
    ];

    expect(
      checkPathBlockedByBarrier({
        path: [createCommonPosition(10), createCommonPosition(11), createCommonPosition(12), createCommonPosition(13)],
        characters,
        movingCharacterId: 'red.1',
      }),
    ).toEqual({
      blocked: true,
      reason: 'barrier',
      position: createCommonPosition(12),
      pathIndex: 2,
    });
  });

  test('blocks when a barrier is in the destination position', () => {
    const characters = [
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(9) }),
      createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(12) }),
      createCharacter({ id: 'blue.2', factionId: FACTION_IDS.BLUE, position: createCommonPosition(12) }),
    ];

    expect(
      checkPathBlockedByBarrier({
        path: [createCommonPosition(10), createCommonPosition(11), createCommonPosition(12)],
        characters,
        movingCharacterId: 'red.1',
      }),
    ).toEqual({
      blocked: true,
      reason: 'barrier',
      position: createCommonPosition(12),
      pathIndex: 2,
    });
  });

  test('does not block when a barrier is after the destination', () => {
    const characters = [
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(9) }),
      createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(13) }),
      createCharacter({ id: 'blue.2', factionId: FACTION_IDS.BLUE, position: createCommonPosition(13) }),
    ];

    expect(
      checkPathBlockedByBarrier({
        path: [createCommonPosition(10), createCommonPosition(11), createCommonPosition(12)],
        characters,
        movingCharacterId: 'red.1',
      }),
    ).toEqual({ blocked: false });
  });

  test('blocks own-faction movement through a final lane barrier', () => {
    const characters = [
      createCharacter({
        id: 'red.1',
        factionId: FACTION_IDS.RED,
        position: createFinalLanePosition(FACTION_IDS.RED, 1),
      }),
      createCharacter({
        id: 'red.2',
        factionId: FACTION_IDS.RED,
        position: createFinalLanePosition(FACTION_IDS.RED, 2),
      }),
      createCharacter({
        id: 'red.3',
        factionId: FACTION_IDS.RED,
        position: createFinalLanePosition(FACTION_IDS.RED, 2),
      }),
    ];

    expect(
      checkPathBlockedByBarrier({
        path: [
          createFinalLanePosition(FACTION_IDS.RED, 2),
          createFinalLanePosition(FACTION_IDS.RED, 3),
        ],
        characters,
        movingCharacterId: 'red.1',
      }),
    ).toEqual({
      blocked: true,
      reason: 'barrier',
      position: createFinalLanePosition(FACTION_IDS.RED, 2),
      pathIndex: 0,
    });
  });

  test('ignores goal but checks final lane positions after goal during a bounce', () => {
    const pathResult = calculateMovementPath({
      factionId: FACTION_IDS.YELLOW,
      from: createFinalLanePosition(FACTION_IDS.YELLOW, 6),
      steps: 4,
    });
    const characters = [
      createCharacter({
        id: 'yellow.1',
        factionId: FACTION_IDS.YELLOW,
        position: createFinalLanePosition(FACTION_IDS.YELLOW, 6),
      }),
      createCharacter({
        id: 'yellow.2',
        factionId: FACTION_IDS.YELLOW,
        position: createFinalLanePosition(FACTION_IDS.YELLOW, 6),
      }),
      createCharacter({
        id: 'yellow.3',
        factionId: FACTION_IDS.YELLOW,
        position: createFinalLanePosition(FACTION_IDS.YELLOW, 6),
      }),
    ];

    expect(pathResult.ok).toBe(true);
    expect(
      checkPathBlockedByBarrier({
        path: pathResult.path,
        characters,
        movingCharacterId: 'yellow.1',
      }),
    ).toEqual({
      blocked: true,
      reason: 'barrier',
      position: createFinalLanePosition(FACTION_IDS.YELLOW, 6),
      pathIndex: 3,
    });
  });

  test('returns the first barrier in path order', () => {
    const characters = [
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(9) }),
      createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(11) }),
      createCharacter({ id: 'blue.2', factionId: FACTION_IDS.BLUE, position: createCommonPosition(11) }),
      createCharacter({ id: 'green.1', factionId: FACTION_IDS.GREEN, position: createCommonPosition(13) }),
      createCharacter({ id: 'green.2', factionId: FACTION_IDS.GREEN, position: createCommonPosition(13) }),
    ];

    expect(
      checkPathBlockedByBarrier({
        path: [createCommonPosition(10), createCommonPosition(11), createCommonPosition(12), createCommonPosition(13)],
        characters,
        movingCharacterId: 'red.1',
      }),
    ).toEqual({
      blocked: true,
      reason: 'barrier',
      position: createCommonPosition(11),
      pathIndex: 1,
    });
  });

  test('excludes the moving character from path occupancy evaluation', () => {
    const characters = [
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
    ];

    expect(
      checkPathBlockedByBarrier({
        path: [createCommonPosition(10)],
        characters,
        movingCharacterId: 'red.1',
      }),
    ).toEqual({ blocked: false });
  });

  test('still blocks a real barrier formed by two other characters', () => {
    const characters = [
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(9) }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'red.3', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
    ];

    expect(
      checkPathBlockedByBarrier({
        path: [createCommonPosition(10)],
        characters,
        movingCharacterId: 'red.1',
      }),
    ).toEqual({
      blocked: true,
      reason: 'barrier',
      position: createCommonPosition(10),
      pathIndex: 0,
    });
  });

  test('uses movement paths without including the initial position', () => {
    const pathResult = calculateMovementPath({
      factionId: FACTION_IDS.YELLOW,
      from: createCommonPosition(10),
      steps: 3,
    });

    expect(pathResult).toEqual({
      ok: true,
      path: [createCommonPosition(11), createCommonPosition(12), createCommonPosition(13)],
    });
  });

  test('does not mutate characters or path', () => {
    const path = [createCommonPosition(10), createCommonPosition(11), createCommonPosition(12)];
    const characters = [
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(9) }),
      createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(12) }),
      createCharacter({ id: 'blue.2', factionId: FACTION_IDS.BLUE, position: createCommonPosition(12) }),
    ];
    const pathBefore = JSON.parse(JSON.stringify(path));
    const charactersBefore = JSON.parse(JSON.stringify(characters));

    const result = checkPathBlockedByBarrier({ path, characters, movingCharacterId: 'red.1' });
    result.position.square = 99;

    expect(path).toEqual(pathBefore);
    expect(characters).toEqual(charactersBefore);
  });
});
