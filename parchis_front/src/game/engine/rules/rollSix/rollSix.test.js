import {
  FACTION_IDS,
  ROLL_SIX_ACTION_MODES,
  ROLL_SIX_ACTION_TYPES,
  createCommonPosition,
  createFinalLanePosition,
  createGoalPosition,
  createHomePosition,
  evaluateMovement,
  getAvailableRollSixActions,
} from '../../index';

function createCharacter({ id, factionId, position }) {
  return {
    id,
    factionId,
    position,
  };
}

function createNormalMovementAction({ characterId, characters }) {
  return {
    type: ROLL_SIX_ACTION_TYPES.NORMAL_MOVEMENT,
    characterId,
    movement: evaluateMovement({ characterId, steps: 6, characters }),
  };
}

function createBreakBarrierAction({ characterId, barrierPosition, occupantCharacterIds, characters }) {
  return {
    type: ROLL_SIX_ACTION_TYPES.BREAK_BARRIER,
    characterId,
    barrier: {
      position: barrierPosition,
      occupantCharacterIds,
    },
    movement: evaluateMovement({ characterId, steps: 6, characters }),
  };
}

describe('getAvailableRollSixActions', () => {
  describe('normal movement without own barriers', () => {
    test('returns normal movement actions when the faction has no own barriers', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(20) }),
      ];

      expect(getAvailableRollSixActions({ factionId: FACTION_IDS.RED, characters })).toEqual({
        roll: 6,
        actionMode: ROLL_SIX_ACTION_MODES.NORMAL_MOVEMENT,
        mustChooseAction: true,
        availableActions: [
          createNormalMovementAction({ characterId: 'red.1', characters }),
          createNormalMovementAction({ characterId: 'red.2', characters }),
        ],
      });
    });

    test('returns no actions when there are no own barriers and no legal movement of 6', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(9) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(12) }),
        createCharacter({ id: 'blue.2', factionId: FACTION_IDS.BLUE, position: createCommonPosition(12) }),
      ];

      expect(getAvailableRollSixActions({ factionId: FACTION_IDS.RED, characters })).toEqual({
        roll: 6,
        actionMode: ROLL_SIX_ACTION_MODES.NONE,
        mustChooseAction: false,
        availableActions: [],
      });
    });

    test('does not treat enemy barriers as own barriers', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(30) }),
        createCharacter({ id: 'blue.2', factionId: FACTION_IDS.BLUE, position: createCommonPosition(30) }),
      ];

      expect(getAvailableRollSixActions({ factionId: FACTION_IDS.RED, characters })).toEqual({
        roll: 6,
        actionMode: ROLL_SIX_ACTION_MODES.NORMAL_MOVEMENT,
        mustChooseAction: true,
        availableActions: [createNormalMovementAction({ characterId: 'red.1', characters })],
      });
    });

    test('does not activate breakBarrier for an enemy barrier in the movement path', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(9) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(12) }),
        createCharacter({ id: 'blue.2', factionId: FACTION_IDS.BLUE, position: createCommonPosition(12) }),
      ];

      expect(getAvailableRollSixActions({ factionId: FACTION_IDS.RED, characters })).toEqual({
        roll: 6,
        actionMode: ROLL_SIX_ACTION_MODES.NONE,
        mustChooseAction: false,
        availableActions: [],
      });
    });
  });

  describe('breaking own barriers', () => {
    test('returns breakBarrier actions for both characters in a breakable common barrier', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      ];

      expect(getAvailableRollSixActions({ factionId: FACTION_IDS.RED, characters })).toEqual({
        roll: 6,
        actionMode: ROLL_SIX_ACTION_MODES.BREAK_BARRIER,
        mustChooseAction: true,
        availableActions: [
          createBreakBarrierAction({
            characterId: 'red.1',
            barrierPosition: createCommonPosition(10),
            occupantCharacterIds: ['red.1', 'red.2'],
            characters,
          }),
          createBreakBarrierAction({
            characterId: 'red.2',
            barrierPosition: createCommonPosition(10),
            occupantCharacterIds: ['red.1', 'red.2'],
            characters,
          }),
        ],
      });
    });

    test('returns breakBarrier actions for a breakable final lane barrier', () => {
      const barrierPosition = createFinalLanePosition(FACTION_IDS.RED, 1);
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: barrierPosition }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: barrierPosition }),
      ];

      expect(getAvailableRollSixActions({ factionId: FACTION_IDS.RED, characters })).toEqual({
        roll: 6,
        actionMode: ROLL_SIX_ACTION_MODES.BREAK_BARRIER,
        mustChooseAction: true,
        availableActions: [
          createBreakBarrierAction({
            characterId: 'red.1',
            barrierPosition,
            occupantCharacterIds: ['red.1', 'red.2'],
            characters,
          }),
          createBreakBarrierAction({
            characterId: 'red.2',
            barrierPosition,
            occupantCharacterIds: ['red.1', 'red.2'],
            characters,
          }),
        ],
      });
    });

    test('prioritizes breakBarrier actions over other normal movement actions', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'red.3', factionId: FACTION_IDS.RED, position: createCommonPosition(30) }),
      ];

      expect(getAvailableRollSixActions({ factionId: FACTION_IDS.RED, characters }).availableActions.map(
        (action) => action.characterId,
      )).toEqual(['red.1', 'red.2']);
      expect(getAvailableRollSixActions({ factionId: FACTION_IDS.RED, characters }).actionMode).toBe(
        ROLL_SIX_ACTION_MODES.BREAK_BARRIER,
      );
    });

    test('returns only barriers that can actually be broken', () => {
      const nonBreakingBarrierPosition = createFinalLanePosition(FACTION_IDS.RED, 5);
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: nonBreakingBarrierPosition }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: nonBreakingBarrierPosition }),
        createCharacter({ id: 'red.3', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'red.4', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      ];

      expect(getAvailableRollSixActions({ factionId: FACTION_IDS.RED, characters }).availableActions.map(
        (action) => action.characterId,
      )).toEqual(['red.3', 'red.4']);
    });

    test('with mixed barriers, only returns actions from the barrier that can actually be broken', () => {
      const nonBreakingBarrierPosition = createFinalLanePosition(FACTION_IDS.RED, 5);
      const breakableBarrierPosition = createCommonPosition(10);
      const characters = [
        createCharacter({ id: 'red.stuck.1', factionId: FACTION_IDS.RED, position: nonBreakingBarrierPosition }),
        createCharacter({ id: 'red.stuck.2', factionId: FACTION_IDS.RED, position: nonBreakingBarrierPosition }),
        createCharacter({ id: 'red.break.1', factionId: FACTION_IDS.RED, position: breakableBarrierPosition }),
        createCharacter({ id: 'red.break.2', factionId: FACTION_IDS.RED, position: breakableBarrierPosition }),
        createCharacter({ id: 'red.free', factionId: FACTION_IDS.RED, position: createCommonPosition(30) }),
      ];

      expect(getAvailableRollSixActions({ factionId: FACTION_IDS.RED, characters })).toEqual({
        roll: 6,
        actionMode: ROLL_SIX_ACTION_MODES.BREAK_BARRIER,
        mustChooseAction: true,
        availableActions: [
          createBreakBarrierAction({
            characterId: 'red.break.1',
            barrierPosition: breakableBarrierPosition,
            occupantCharacterIds: ['red.break.1', 'red.break.2'],
            characters,
          }),
          createBreakBarrierAction({
            characterId: 'red.break.2',
            barrierPosition: breakableBarrierPosition,
            occupantCharacterIds: ['red.break.1', 'red.break.2'],
            characters,
          }),
        ],
      });
    });

    test('does not consider a legal movement as breakBarrier when both barrier characters remain together', () => {
      const barrierPosition = createFinalLanePosition(FACTION_IDS.RED, 5);
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: barrierPosition }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: barrierPosition }),
      ];

      expect(evaluateMovement({ characterId: 'red.1', steps: 6, characters }).legal).toBe(true);
      expect(evaluateMovement({ characterId: 'red.1', steps: 6, characters }).destination).toEqual(barrierPosition);
      expect(getAvailableRollSixActions({ factionId: FACTION_IDS.RED, characters })).toEqual({
        roll: 6,
        actionMode: ROLL_SIX_ACTION_MODES.NONE,
        mustChooseAction: false,
        availableActions: [],
      });
    });
  });

  describe('fallback when no own barrier can be broken', () => {
    test('falls back to normal movement for non-barrier characters only', () => {
      const barrierPosition = createFinalLanePosition(FACTION_IDS.RED, 5);
      const characters = [
        createCharacter({ id: 'red.barrier.1', factionId: FACTION_IDS.RED, position: barrierPosition }),
        createCharacter({ id: 'red.barrier.2', factionId: FACTION_IDS.RED, position: barrierPosition }),
        createCharacter({ id: 'red.other', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      ];

      expect(getAvailableRollSixActions({ factionId: FACTION_IDS.RED, characters })).toEqual({
        roll: 6,
        actionMode: ROLL_SIX_ACTION_MODES.NORMAL_MOVEMENT,
        mustChooseAction: true,
        availableActions: [createNormalMovementAction({ characterId: 'red.other', characters })],
      });
    });

    test('with two unbreakable barriers, falls back only to a movable non-barrier character', () => {
      const firstBarrierPosition = createFinalLanePosition(FACTION_IDS.RED, 5);
      const secondBarrierPosition = createFinalLanePosition(FACTION_IDS.RED, 6);
      const characters = [
        createCharacter({ id: 'red.barrier.1', factionId: FACTION_IDS.RED, position: firstBarrierPosition }),
        createCharacter({ id: 'red.barrier.2', factionId: FACTION_IDS.RED, position: firstBarrierPosition }),
        createCharacter({ id: 'red.barrier.3', factionId: FACTION_IDS.RED, position: secondBarrierPosition }),
        createCharacter({ id: 'red.barrier.4', factionId: FACTION_IDS.RED, position: secondBarrierPosition }),
        createCharacter({ id: 'red.free', factionId: FACTION_IDS.RED, position: createCommonPosition(30) }),
      ];

      expect(getAvailableRollSixActions({ factionId: FACTION_IDS.RED, characters })).toEqual({
        roll: 6,
        actionMode: ROLL_SIX_ACTION_MODES.NORMAL_MOVEMENT,
        mustChooseAction: true,
        availableActions: [createNormalMovementAction({ characterId: 'red.free', characters })],
      });
    });

    test('excludes all characters that form any own barrier from fallback normal movement', () => {
      const firstBarrierPosition = createFinalLanePosition(FACTION_IDS.RED, 5);
      const secondBarrierPosition = createFinalLanePosition(FACTION_IDS.RED, 6);
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: firstBarrierPosition }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: firstBarrierPosition }),
        createCharacter({ id: 'red.3', factionId: FACTION_IDS.RED, position: secondBarrierPosition }),
        createCharacter({ id: 'red.4', factionId: FACTION_IDS.RED, position: secondBarrierPosition }),
      ];

      expect(getAvailableRollSixActions({ factionId: FACTION_IDS.RED, characters })).toEqual({
        roll: 6,
        actionMode: ROLL_SIX_ACTION_MODES.NONE,
        mustChooseAction: false,
        availableActions: [],
      });
    });
  });

  describe('home, goal, and bounce', () => {
    test('does not include home or goal characters as normal movement actions', () => {
      const characters = [
        createCharacter({ id: 'red.home', factionId: FACTION_IDS.RED, position: createHomePosition() }),
        createCharacter({ id: 'red.goal', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
        createCharacter({ id: 'red.board', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      ];

      expect(getAvailableRollSixActions({ factionId: FACTION_IDS.RED, characters }).availableActions.map(
        (action) => action.characterId,
      )).toEqual(['red.board']);
    });

    test('includes a legal bounce as a normal movement action', () => {
      const characters = [
        createCharacter({
          id: 'red.1',
          factionId: FACTION_IDS.RED,
          position: createFinalLanePosition(FACTION_IDS.RED, 7),
        }),
      ];

      expect(getAvailableRollSixActions({ factionId: FACTION_IDS.RED, characters })).toEqual({
        roll: 6,
        actionMode: ROLL_SIX_ACTION_MODES.NORMAL_MOVEMENT,
        mustChooseAction: true,
        availableActions: [createNormalMovementAction({ characterId: 'red.1', characters })],
      });
    });
  });

  describe('invalid input and inconsistent state', () => {
    test.each([undefined, null, {}])('rejects invalid characters: %s', (characters) => {
      expect(() => getAvailableRollSixActions({ factionId: FACTION_IDS.RED, characters })).toThrow(
        'characters must be an array.',
      );
    });

    test('rejects an invalid faction id', () => {
      expect(() => getAvailableRollSixActions({ factionId: 'purple', characters: [] })).toThrow(
        'Invalid faction id: purple',
      );
    });

    test('propagates relevant movement evaluation errors', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: { type: 'unknown' } }),
      ];

      expect(() => getAvailableRollSixActions({ factionId: FACTION_IDS.RED, characters })).toThrow(
        'Character position is invalid.',
      );
    });

    test('does not globally validate an irrelevant corrupt character', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'blue.1', factionId: 'purple', position: createCommonPosition(40) }),
      ];

      expect(getAvailableRollSixActions({ factionId: FACTION_IDS.RED, characters })).toEqual({
        roll: 6,
        actionMode: ROLL_SIX_ACTION_MODES.NORMAL_MOVEMENT,
        mustChooseAction: true,
        availableActions: [createNormalMovementAction({ characterId: 'red.1', characters })],
      });
    });
  });

  describe('mutability', () => {
    test('does not mutate characters or character positions', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      ];
      const before = JSON.parse(JSON.stringify(characters));

      getAvailableRollSixActions({ factionId: FACTION_IDS.RED, characters });

      expect(characters).toEqual(before);
    });

    test('mutating returned breakBarrier action does not affect later calls', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      ];
      const result = getAvailableRollSixActions({ factionId: FACTION_IDS.RED, characters });

      result.availableActions[0].barrier.position.square = 99;
      result.availableActions[0].barrier.occupantCharacterIds[0] = 'changed';
      result.availableActions[0].movement.destination.square = 99;

      expect(getAvailableRollSixActions({ factionId: FACTION_IDS.RED, characters }).availableActions[0]).toEqual(
        createBreakBarrierAction({
          characterId: 'red.1',
          barrierPosition: createCommonPosition(10),
          occupantCharacterIds: ['red.1', 'red.2'],
          characters,
        }),
      );
    });
  });
});
