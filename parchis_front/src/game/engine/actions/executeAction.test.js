import {
  DESTINATION_OUTCOME_TYPES,
  EXECUTABLE_ACTION_TYPES,
  EXECUTION_EVENT_TYPES,
  FACTION_IDS,
  MOVEMENT_SOURCE_TYPES,
  MOVEMENT_TYPES,
  POSITION_TYPES,
  REWARD_SOURCE_TYPES,
  REWARD_TYPES,
  SAFE_SQUARES,
  START_SQUARE_BY_FACTION,
  createCommonPosition,
  createFinalLanePosition,
  createGoalPosition,
  createHomePosition,
  deriveRewardsFromEvents,
  executeAction,
} from '../index';

function createCharacter({ id, characterId, factionId, position }) {
  return {
    id,
    ...(characterId ? { characterId } : {}),
    factionId,
    position,
  };
}

function createState(characters) {
  const factionIds = [FACTION_IDS.RED, FACTION_IDS.BLUE, FACTION_IDS.GREEN, FACTION_IDS.YELLOW];
  const players = factionIds.map((factionId, index) => ({
    id: `player-${factionId}`,
    factionId,
    characters: characters.filter((character) => character.factionId === factionId),
  }));

  return {
    phase: 'ready',
    players,
    turnOrder: players.map((player) => player.id),
    currentPlayerId: players[0].id,
  };
}

function getCharacter(state, characterId) {
  return state.players
    .flatMap((player) => player.characters)
    .find((character) => character.id === characterId);
}

function getStartPosition(factionId) {
  return createCommonPosition(START_SQUARE_BY_FACTION[factionId]);
}

function normalMovementAction(characterId, movement = undefined) {
  return {
    type: EXECUTABLE_ACTION_TYPES.NORMAL_MOVEMENT,
    characterId,
    movement,
  };
}

function exitHomeAction(characterId, overrides = {}) {
  return {
    type: EXECUTABLE_ACTION_TYPES.EXIT_HOME,
    characterId,
    ...overrides,
  };
}

function breakBarrierAction(characterId, overrides = {}) {
  return {
    type: EXECUTABLE_ACTION_TYPES.BREAK_BARRIER,
    characterId,
    ...overrides,
  };
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }

  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}

function expectEventsWithoutRewards(events) {
  expect(JSON.stringify(events)).not.toMatch(/reward/i);
  expect(JSON.stringify(events)).not.toContain('+10');
  expect(JSON.stringify(events)).not.toContain('+20');
}

describe('executeAction', () => {
  describe('normal movement rolls 1-4', () => {
    test.each([
      [1, createCommonPosition(11)],
      [2, createCommonPosition(12)],
      [3, createCommonPosition(13)],
      [4, createCommonPosition(14)],
    ])('executes a valid normalMovement with roll %i', (roll, destination) => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      ]);

      const result = executeAction({
        state,
        factionId: FACTION_IDS.RED,
        roll,
        action: normalMovementAction('red.1'),
      });

      expect(getCharacter(result.state, 'red.1').position).toEqual(destination);
      expect(result.events).toEqual([
        {
          type: EXECUTION_EVENT_TYPES.CHARACTER_MOVED,
          characterId: 'red.1',
          factionId: FACTION_IDS.RED,
          from: createCommonPosition(10),
          to: destination,
          previousPosition: createCommonPosition(9 + roll),
          steps: roll,
          actionType: EXECUTABLE_ACTION_TYPES.NORMAL_MOVEMENT,
          movementType: MOVEMENT_TYPES.NORMAL,
          source: { type: MOVEMENT_SOURCE_TYPES.DICE, roll },
        },
      ]);
    });

    test('rejects a roll outside the supported 1..6 range', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      ]);

      expect(() =>
        executeAction({
          state,
          factionId: FACTION_IDS.RED,
          roll: 7,
          action: normalMovementAction('red.1'),
        }),
      ).toThrow('Unsupported roll: 7. Roll must be an integer from 1 to 6.');
    });

    test('rejects an action that became obsolete after the state changed', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createHomePosition() }),
      ]);

      expect(() =>
        executeAction({
          state,
          factionId: FACTION_IDS.RED,
          roll: 1,
          action: normalMovementAction('red.1', {
            legal: true,
            destination: createCommonPosition(11),
            outcome: { type: 'empty' },
          }),
        }),
      ).toThrow('Action is not available for the current state.');
    });
  });

  describe('normal movement outcomes', () => {
    test('executes a normal movement without capture', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(8) }),
      ]);

      const result = executeAction({
        state,
        factionId: FACTION_IDS.RED,
        roll: 2,
        action: normalMovementAction('red.1'),
      });

      expect(getCharacter(result.state, 'red.1').position).toEqual(createCommonPosition(10));
      expect(result.events.map((event) => event.type)).toEqual([
        EXECUTION_EVENT_TYPES.CHARACTER_MOVED,
      ]);
    });

    test('executes shareWithAlly by moving onto the ally position', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(8) }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      ]);

      const result = executeAction({
        state,
        factionId: FACTION_IDS.RED,
        roll: 2,
        action: normalMovementAction('red.1'),
      });

      expect(getCharacter(result.state, 'red.1').position).toEqual(createCommonPosition(10));
      expect(getCharacter(result.state, 'red.2').position).toEqual(createCommonPosition(10));
      expect(result.events.map((event) => event.type)).toEqual([
        EXECUTION_EVENT_TYPES.CHARACTER_MOVED,
      ]);
    });

    test('executes safeShare without capturing the enemy', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(12) }),
      ]);

      const result = executeAction({
        state,
        factionId: FACTION_IDS.RED,
        roll: 2,
        action: normalMovementAction('red.1'),
      });

      expect(getCharacter(result.state, 'red.1').position).toEqual(createCommonPosition(12));
      expect(getCharacter(result.state, 'blue.1').position).toEqual(createCommonPosition(12));
      expect(result.events.map((event) => event.type)).toEqual([
        EXECUTION_EVENT_TYPES.CHARACTER_MOVED,
      ]);
    });

    test('revalidates and executes assassin capture on a safe destination', () => {
      const state = createState([
        createCharacter({
          id: 'red.assassin',
          characterId: 'assassin',
          factionId: FACTION_IDS.RED,
          position: createCommonPosition(10),
        }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(12) }),
      ]);

      const result = executeAction({
        state,
        factionId: FACTION_IDS.RED,
        roll: 2,
        action: normalMovementAction('red.assassin', {
          legal: true,
          destination: createCommonPosition(12),
          outcome: { type: DESTINATION_OUTCOME_TYPES.SAFE_SHARE, occupantCharacterId: 'blue.1' },
        }),
      });

      expect(getCharacter(result.state, 'red.assassin').position).toEqual(createCommonPosition(12));
      expect(getCharacter(result.state, 'blue.1').position).toEqual(createHomePosition());
      expect(SAFE_SQUARES).toContain(12);
      expect(result.events).toContainEqual(expect.objectContaining({
        type: EXECUTION_EVENT_TYPES.CHARACTER_CAPTURED,
        characterId: 'red.assassin',
        factionId: FACTION_IDS.RED,
        capturedCharacterId: 'blue.1',
        movementType: MOVEMENT_TYPES.NORMAL,
      }));
      expect(deriveRewardsFromEvents({ events: result.events })).toEqual([
        {
          type: REWARD_TYPES.MOVEMENT_REWARD,
          source: {
            type: REWARD_SOURCE_TYPES.CAPTURE,
            characterId: 'red.assassin',
          },
          ownerFactionId: FACTION_IDS.RED,
          steps: 20,
          excludedCharacterIds: [],
        },
      ]);
    });

    test('assassin does not capture an enemy passed on a safe square', () => {
      const state = createState([
        createCharacter({
          id: 'red.assassin',
          characterId: 'assassin',
          factionId: FACTION_IDS.RED,
          position: createCommonPosition(10),
        }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(12) }),
      ]);

      const result = executeAction({
        state,
        factionId: FACTION_IDS.RED,
        roll: 5,
        action: normalMovementAction('red.assassin'),
      });

      expect(getCharacter(result.state, 'red.assassin').position).toEqual(createCommonPosition(15));
      expect(getCharacter(result.state, 'blue.1').position).toEqual(createCommonPosition(12));
      expect(result.events).not.toContainEqual(expect.objectContaining({
        type: EXECUTION_EVENT_TYPES.CHARACTER_CAPTURED,
      }));
    });

    test('assassin preserves ordinary capture on a non-safe destination', () => {
      const state = createState([
        createCharacter({
          id: 'red.assassin',
          characterId: 'assassin',
          factionId: FACTION_IDS.RED,
          position: createCommonPosition(8),
        }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(10) }),
      ]);

      const result = executeAction({
        state,
        factionId: FACTION_IDS.RED,
        roll: 2,
        action: normalMovementAction('red.assassin'),
      });

      expect(getCharacter(result.state, 'blue.1').position).toEqual(createHomePosition());
      expect(result.events).toContainEqual(expect.objectContaining({
        type: EXECUTION_EVENT_TYPES.CHARACTER_CAPTURED,
        capturedCharacterId: 'blue.1',
      }));
    });

    test('uses recalculated capture outcome instead of the action movement snapshot', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(8) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(10) }),
        createCharacter({ id: 'green.1', factionId: FACTION_IDS.GREEN, position: createCommonPosition(30) }),
      ]);

      const result = executeAction({
        state,
        factionId: FACTION_IDS.RED,
        roll: 2,
        action: normalMovementAction('red.1', {
          legal: true,
          destination: createCommonPosition(10),
          outcome: { type: 'capture', capturedCharacterId: 'green.1' },
        }),
      });

      expect(getCharacter(result.state, 'red.1').position).toEqual(createCommonPosition(10));
      expect(getCharacter(result.state, 'blue.1').position).toEqual(createHomePosition());
      expect(getCharacter(result.state, 'green.1').position).toEqual(createCommonPosition(30));
      expect(result.events).toContainEqual(expect.objectContaining({
        type: EXECUTION_EVENT_TYPES.CHARACTER_CAPTURED,
        characterId: 'red.1',
        factionId: FACTION_IDS.RED,
        capturedCharacterId: 'blue.1',
      }));
      expectEventsWithoutRewards(result.events);
    });

    test('moves exactly to GOAL and emits characterReachedGoal without rewards', () => {
      const state = createState([
        createCharacter({
          id: 'red.1',
          factionId: FACTION_IDS.RED,
          position: createFinalLanePosition(FACTION_IDS.RED, 6),
        }),
      ]);

      const result = executeAction({
        state,
        factionId: FACTION_IDS.RED,
        roll: 2,
        action: normalMovementAction('red.1'),
      });

      expect(getCharacter(result.state, 'red.1').position).toEqual(createGoalPosition());
      expect(result.events).toContainEqual(expect.objectContaining({
        type: EXECUTION_EVENT_TYPES.CHARACTER_REACHED_GOAL,
        characterId: 'red.1',
        factionId: FACTION_IDS.RED,
      }));
      expectEventsWithoutRewards(result.events);
    });
  });

  describe('roll 5 revalidation and exitHome', () => {
    test('allows normalMovement with roll 5 only when there is no mandatory home exit', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(20) }),
      ]);

      const result = executeAction({
        state,
        factionId: FACTION_IDS.RED,
        roll: 5,
        action: normalMovementAction('red.1'),
      });

      expect(getCharacter(result.state, 'red.1').position).toEqual(createCommonPosition(15));
    });

    test('rejects normalMovement with roll 5 when a home exit is currently mandatory', () => {
      const state = createState([
        createCharacter({ id: 'red.home', factionId: FACTION_IDS.RED, position: createHomePosition() }),
        createCharacter({ id: 'red.board', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      ]);

      expect(() =>
        executeAction({
          state,
          factionId: FACTION_IDS.RED,
          roll: 5,
          action: normalMovementAction('red.board'),
        }),
      ).toThrow('Action is not available for the current state.');
    });

    test('executes exitHome without occupant removal', () => {
      const state = createState([
        createCharacter({ id: 'red.home', factionId: FACTION_IDS.RED, position: createHomePosition() }),
      ]);

      const result = executeAction({
        state,
        factionId: FACTION_IDS.RED,
        roll: 5,
        action: exitHomeAction('red.home'),
      });

      expect(getCharacter(result.state, 'red.home').position).toEqual(getStartPosition(FACTION_IDS.RED));
      expect(result.events).toEqual([
        {
          type: EXECUTION_EVENT_TYPES.CHARACTER_EXITED_HOME,
          characterId: 'red.home',
          from: createHomePosition(),
          to: getStartPosition(FACTION_IDS.RED),
        },
      ]);
    });

    test('assassin EXIT_HOME still shares the safe start square without capturing', () => {
      const start = getStartPosition(FACTION_IDS.RED);
      const state = createState([
        createCharacter({
          id: 'red.assassin',
          characterId: 'assassin',
          factionId: FACTION_IDS.RED,
          position: createHomePosition(),
        }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: start }),
      ]);

      const result = executeAction({
        state,
        factionId: FACTION_IDS.RED,
        roll: 5,
        action: exitHomeAction('red.assassin'),
      });

      expect(getCharacter(result.state, 'red.assassin').position).toEqual(start);
      expect(getCharacter(result.state, 'blue.1').position).toEqual(start);
      expect(result.events.map((event) => event.type)).toEqual([
        EXECUTION_EVENT_TYPES.CHARACTER_EXITED_HOME,
      ]);
    });

    test('requires choice.removeCharacterId when exitHome currently needs occupant removal', () => {
      const state = createState([
        createCharacter({ id: 'red.home', factionId: FACTION_IDS.RED, position: createHomePosition() }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: getStartPosition(FACTION_IDS.RED) }),
        createCharacter({ id: 'green.1', factionId: FACTION_IDS.GREEN, position: getStartPosition(FACTION_IDS.RED) }),
      ]);

      expect(() =>
        executeAction({
          state,
          factionId: FACTION_IDS.RED,
          roll: 5,
          action: exitHomeAction('red.home'),
        }),
      ).toThrow('choice.removeCharacterId is required for this exitHome action.');
    });

    test('executes exitHome removal using current occupants, not snapshot removableCharacterIds', () => {
      const state = createState([
        createCharacter({ id: 'red.home', factionId: FACTION_IDS.RED, position: createHomePosition() }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: getStartPosition(FACTION_IDS.RED) }),
        createCharacter({ id: 'green.1', factionId: FACTION_IDS.GREEN, position: getStartPosition(FACTION_IDS.RED) }),
      ]);

      const result = executeAction({
        state,
        factionId: FACTION_IDS.RED,
        roll: 5,
        action: exitHomeAction('red.home', {
          destination: getStartPosition(FACTION_IDS.RED),
          occupantRemoval: {
            required: false,
            removableCharacterIds: ['blue.old', 'green.old'],
          },
        }),
        choice: { removeCharacterId: 'blue.1' },
      });

      expect(getCharacter(result.state, 'red.home').position).toEqual(getStartPosition(FACTION_IDS.RED));
      expect(getCharacter(result.state, 'blue.1').position).toEqual(createHomePosition());
      expect(getCharacter(result.state, 'green.1').position).toEqual(getStartPosition(FACTION_IDS.RED));
      expect(result.events).toEqual([
        {
          type: EXECUTION_EVENT_TYPES.CHARACTER_REMOVED_FROM_START,
          characterId: 'blue.1',
          removedByCharacterId: 'red.home',
          position: getStartPosition(FACTION_IDS.RED),
        },
        {
          type: EXECUTION_EVENT_TYPES.CHARACTER_EXITED_HOME,
          characterId: 'red.home',
          from: createHomePosition(),
          to: getStartPosition(FACTION_IDS.RED),
        },
      ]);
      expect(result.events).not.toContainEqual(expect.objectContaining({
        type: EXECUTION_EVENT_TYPES.CHARACTER_CAPTURED,
      }));
      expectEventsWithoutRewards(result.events);
    });

    test('rejects exitHome removal choice that is not a current start occupant', () => {
      const state = createState([
        createCharacter({ id: 'red.home', factionId: FACTION_IDS.RED, position: createHomePosition() }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: getStartPosition(FACTION_IDS.RED) }),
        createCharacter({ id: 'green.1', factionId: FACTION_IDS.GREEN, position: getStartPosition(FACTION_IDS.RED) }),
        createCharacter({ id: 'yellow.1', factionId: FACTION_IDS.YELLOW, position: createCommonPosition(30) }),
      ]);

      expect(() =>
        executeAction({
          state,
          factionId: FACTION_IDS.RED,
          roll: 5,
          action: exitHomeAction('red.home'),
          choice: { removeCharacterId: 'yellow.1' },
        }),
      ).toThrow('choice.removeCharacterId is not removable in the current state.');
    });
  });

  describe('roll 6 revalidation and breakBarrier', () => {
    test('allows normalMovement with roll 6 when there is no own barrier to break', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      ]);

      const result = executeAction({
        state,
        factionId: FACTION_IDS.RED,
        roll: 6,
        action: normalMovementAction('red.1'),
      });

      expect(getCharacter(result.state, 'red.1').position).toEqual(createCommonPosition(16));
    });

    test('rejects normalMovement with roll 6 when a barrier break is currently mandatory', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'red.free', factionId: FACTION_IDS.RED, position: createCommonPosition(30) }),
      ]);

      expect(() =>
        executeAction({
          state,
          factionId: FACTION_IDS.RED,
          roll: 6,
          action: normalMovementAction('red.free'),
        }),
      ).toThrow('Action is not available for the current state.');
    });

    test('executes breakBarrier only after revalidation and emits barrierBroken when it disappears', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      ]);

      const result = executeAction({
        state,
        factionId: FACTION_IDS.RED,
        roll: 6,
        action: breakBarrierAction('red.1', {
          barrier: {
            position: createCommonPosition(99),
            occupantCharacterIds: ['stale.1', 'stale.2'],
          },
          movement: {
            legal: true,
            destination: createCommonPosition(99),
            outcome: { type: 'empty' },
          },
        }),
      });

      expect(getCharacter(result.state, 'red.1').position).toEqual(createCommonPosition(16));
      expect(getCharacter(result.state, 'red.2').position).toEqual(createCommonPosition(10));
      expect(result.events).toContainEqual({
        type: EXECUTION_EVENT_TYPES.BARRIER_BROKEN,
        characterId: 'red.1',
        position: createCommonPosition(10),
        occupantCharacterIds: ['red.1', 'red.2'],
      });
    });

    test('executes breakBarrier that also captures without creating rewards', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(16) }),
      ]);

      const result = executeAction({
        state,
        factionId: FACTION_IDS.RED,
        roll: 6,
        action: breakBarrierAction('red.1', {
          movement: {
            legal: true,
            destination: createCommonPosition(99),
            outcome: { type: 'empty' },
          },
        }),
      });

      expect(getCharacter(result.state, 'red.1').position).toEqual(createCommonPosition(16));
      expect(getCharacter(result.state, 'blue.1').position).toEqual(createHomePosition());
      expect(result.events.map((event) => event.type)).toEqual([
        EXECUTION_EVENT_TYPES.CHARACTER_MOVED,
        EXECUTION_EVENT_TYPES.CHARACTER_CAPTURED,
        EXECUTION_EVENT_TYPES.BARRIER_BROKEN,
      ]);
      expect(result.events).toContainEqual(expect.objectContaining({
        type: EXECUTION_EVENT_TYPES.CHARACTER_CAPTURED,
        characterId: 'red.1',
        factionId: FACTION_IDS.RED,
        capturedCharacterId: 'blue.1',
      }));
      expect(result.events).toContainEqual({
        type: EXECUTION_EVENT_TYPES.BARRIER_BROKEN,
        characterId: 'red.1',
        position: createCommonPosition(10),
        occupantCharacterIds: ['red.1', 'red.2'],
      });
      expectEventsWithoutRewards(result.events);
    });

    test('executes breakBarrier that also reaches GOAL without creating rewards', () => {
      const barrierPosition = createFinalLanePosition(FACTION_IDS.RED, 2);
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: barrierPosition }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: barrierPosition }),
      ]);

      const result = executeAction({
        state,
        factionId: FACTION_IDS.RED,
        roll: 6,
        action: breakBarrierAction('red.1', {
          movement: {
            legal: true,
            destination: createCommonPosition(99),
            outcome: { type: 'empty' },
          },
        }),
      });

      expect(getCharacter(result.state, 'red.1').position).toEqual(createGoalPosition());
      expect(getCharacter(result.state, 'red.1').finished).toBeUndefined();
      expect(result.events.map((event) => event.type)).toEqual([
        EXECUTION_EVENT_TYPES.CHARACTER_MOVED,
        EXECUTION_EVENT_TYPES.CHARACTER_REACHED_GOAL,
        EXECUTION_EVENT_TYPES.BARRIER_BROKEN,
      ]);
      expect(result.events).toContainEqual(expect.objectContaining({
        type: EXECUTION_EVENT_TYPES.CHARACTER_REACHED_GOAL,
        characterId: 'red.1',
        factionId: FACTION_IDS.RED,
      }));
      expect(result.events).toContainEqual({
        type: EXECUTION_EVENT_TYPES.BARRIER_BROKEN,
        characterId: 'red.1',
        position: barrierPosition,
        occupantCharacterIds: ['red.1', 'red.2'],
      });
      expectEventsWithoutRewards(result.events);
    });

    test('rejects a stale breakBarrier action when the barrier no longer exists', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(11) }),
      ]);
      const before = JSON.parse(JSON.stringify(state));

      expect(() =>
        executeAction({
          state,
          factionId: FACTION_IDS.RED,
          roll: 6,
          action: breakBarrierAction('red.1', {
            barrier: {
              position: createCommonPosition(10),
              occupantCharacterIds: ['red.1', 'red.2'],
            },
            movement: {
              legal: true,
              destination: createCommonPosition(16),
              outcome: { type: 'empty' },
            },
          }),
        }),
      ).toThrow('Action is not available for the current state.');

      expect(state).toEqual(before);
      expect(getCharacter(state, 'red.1').position).toEqual(createCommonPosition(10));
      expect(getCharacter(state, 'red.2').position).toEqual(createCommonPosition(11));
    });
  });

  describe('immutability', () => {
    test('does not mutate the original state and returns an independent moved character position', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(20) }),
      ]);
      const before = JSON.parse(JSON.stringify(state));

      deepFreeze(state);

      const result = executeAction({
        state,
        factionId: FACTION_IDS.RED,
        roll: 1,
        action: normalMovementAction('red.1'),
      });

      result.state.players[0].characters[0].position.square = 99;

      expect(state).toEqual(before);
      expect(getCharacter(state, 'red.1').position).toEqual(createCommonPosition(10));
      expect(getCharacter(state, 'blue.1').position).toEqual(createCommonPosition(20));
    });

    test('does not mutate action or choice snapshots', () => {
      const state = createState([
        createCharacter({ id: 'red.home', factionId: FACTION_IDS.RED, position: createHomePosition() }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: getStartPosition(FACTION_IDS.RED) }),
        createCharacter({ id: 'green.1', factionId: FACTION_IDS.GREEN, position: getStartPosition(FACTION_IDS.RED) }),
      ]);
      const action = exitHomeAction('red.home', {
        destination: getStartPosition(FACTION_IDS.RED),
        occupantRemoval: {
          required: false,
          removableCharacterIds: ['stale.1', 'stale.2'],
        },
      });
      const choice = { removeCharacterId: 'blue.1' };
      const actionBefore = JSON.parse(JSON.stringify(action));
      const choiceBefore = JSON.parse(JSON.stringify(choice));

      executeAction({ state, factionId: FACTION_IDS.RED, roll: 5, action, choice });

      expect(action).toEqual(actionBefore);
      expect(choice).toEqual(choiceBefore);
    });

    test('uses structural sharing for a simple movement', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(20) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(30) }),
      ]);
      const originalState = JSON.parse(JSON.stringify(state));
      const redPlayer = state.players.find((player) => player.factionId === FACTION_IDS.RED);
      const bluePlayer = state.players.find((player) => player.factionId === FACTION_IDS.BLUE);
      const redOne = getCharacter(state, 'red.1');
      const redTwo = getCharacter(state, 'red.2');

      const result = executeAction({
        state,
        factionId: FACTION_IDS.RED,
        roll: 1,
        action: normalMovementAction('red.1'),
      });
      const nextRedPlayer = result.state.players.find((player) => player.factionId === FACTION_IDS.RED);
      const nextBluePlayer = result.state.players.find((player) => player.factionId === FACTION_IDS.BLUE);

      expect(result.state).not.toBe(state);
      expect(result.state.players).not.toBe(state.players);
      expect(nextRedPlayer).not.toBe(redPlayer);
      expect(getCharacter(result.state, 'red.1')).not.toBe(redOne);
      expect(getCharacter(result.state, 'red.2')).toBe(redTwo);
      expect(nextBluePlayer).toBe(bluePlayer);
      expect(state).toEqual(originalState);
    });

    test('uses structural sharing for a capture between two players', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(8) }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(20) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(10) }),
        createCharacter({ id: 'blue.2', factionId: FACTION_IDS.BLUE, position: createCommonPosition(30) }),
        createCharacter({ id: 'green.1', factionId: FACTION_IDS.GREEN, position: createCommonPosition(40) }),
      ]);
      const originalState = JSON.parse(JSON.stringify(state));
      const redPlayer = state.players.find((player) => player.factionId === FACTION_IDS.RED);
      const bluePlayer = state.players.find((player) => player.factionId === FACTION_IDS.BLUE);
      const greenPlayer = state.players.find((player) => player.factionId === FACTION_IDS.GREEN);
      const redOne = getCharacter(state, 'red.1');
      const redTwo = getCharacter(state, 'red.2');
      const blueOne = getCharacter(state, 'blue.1');
      const blueTwo = getCharacter(state, 'blue.2');

      const result = executeAction({
        state,
        factionId: FACTION_IDS.RED,
        roll: 2,
        action: normalMovementAction('red.1'),
      });
      const nextRedPlayer = result.state.players.find((player) => player.factionId === FACTION_IDS.RED);
      const nextBluePlayer = result.state.players.find((player) => player.factionId === FACTION_IDS.BLUE);
      const nextGreenPlayer = result.state.players.find((player) => player.factionId === FACTION_IDS.GREEN);

      expect(nextRedPlayer).not.toBe(redPlayer);
      expect(nextBluePlayer).not.toBe(bluePlayer);
      expect(getCharacter(result.state, 'red.1')).not.toBe(redOne);
      expect(getCharacter(result.state, 'blue.1')).not.toBe(blueOne);
      expect(getCharacter(result.state, 'red.2')).toBe(redTwo);
      expect(getCharacter(result.state, 'blue.2')).toBe(blueTwo);
      expect(nextGreenPlayer).toBe(greenPlayer);
      expect(state).toEqual(originalState);
    });
  });

  describe('state validation', () => {
    test('requires a GameState with players', () => {
      expect(() =>
        executeAction({
          state: { characters: [] },
          factionId: FACTION_IDS.RED,
          roll: 1,
          action: normalMovementAction('red.1'),
        }),
      ).toThrow('state must be a GameState with players.');
    });

    test('keeps GOAL as the only finalization marker for this phase', () => {
      const state = createState([
        createCharacter({
          id: 'red.1',
          factionId: FACTION_IDS.RED,
          position: createFinalLanePosition(FACTION_IDS.RED, 6),
        }),
      ]);

      const result = executeAction({
        state,
        factionId: FACTION_IDS.RED,
        roll: 2,
        action: normalMovementAction('red.1'),
      });

      expect(getCharacter(result.state, 'red.1').position.type).toBe(POSITION_TYPES.GOAL);
      expect(getCharacter(result.state, 'red.1').finished).toBeUndefined();
    });
  });
});
