import {
  FACTION_IDS,
  ROLL_FIVE_ACTION_MODES,
  ROLL_FIVE_ACTION_TYPES,
  START_SQUARE_BY_FACTION,
  createCommonPosition,
  createFinalLanePosition,
  createGoalPosition,
  createHomePosition,
  evaluateMovement,
  getAvailableRollFiveActions,
} from '../../index';

function createCharacter({ id, factionId, position }) {
  return {
    id,
    factionId,
    position,
  };
}

function getStartPosition(factionId) {
  return createCommonPosition(START_SQUARE_BY_FACTION[factionId]);
}

function createExitHomeAction({ characterId, factionId, removableCharacterIds = [] }) {
  return {
    type: ROLL_FIVE_ACTION_TYPES.EXIT_HOME,
    characterId,
    destination: getStartPosition(factionId),
    occupantRemoval: {
      required: removableCharacterIds.length === 2,
      removableCharacterIds,
      isCapture: false,
      grantsCaptureReward: false,
    },
  };
}

function createRollFiveExitResult({ factionId, characterIds, removableCharacterIds = [] }) {
  return {
    roll: 5,
    actionMode: ROLL_FIVE_ACTION_MODES.EXIT_HOME,
    mustChooseAction: true,
    availableActions: characterIds.map((characterId) =>
      createExitHomeAction({ characterId, factionId, removableCharacterIds }),
    ),
  };
}

describe('getAvailableRollFiveActions', () => {
  describe('home exit', () => {
    test.each([
      [FACTION_IDS.YELLOW, 39],
      [FACTION_IDS.GREEN, 22],
      [FACTION_IDS.BLUE, 56],
      [FACTION_IDS.RED, 5],
    ])('offers %s home exit to canonical start square %i', (factionId, startSquare) => {
      const characters = [
        createCharacter({ id: `${factionId}.1`, factionId, position: createHomePosition() }),
      ];

      expect(getAvailableRollFiveActions({ factionId, characters }).availableActions).toEqual([
        createExitHomeAction({ characterId: `${factionId}.1`, factionId }),
      ]);
      expect(START_SQUARE_BY_FACTION[factionId]).toBe(startSquare);
    });

    test('offers home exit when the start square is empty', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createHomePosition() }),
      ];

      expect(getAvailableRollFiveActions({ factionId: FACTION_IDS.RED, characters })).toEqual(
        createRollFiveExitResult({ factionId: FACTION_IDS.RED, characterIds: ['red.1'] }),
      );
    });

    test('offers home exit when the start square has one ally', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createHomePosition() }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: getStartPosition(FACTION_IDS.RED) }),
      ];

      expect(getAvailableRollFiveActions({ factionId: FACTION_IDS.RED, characters })).toEqual(
        createRollFiveExitResult({ factionId: FACTION_IDS.RED, characterIds: ['red.1'] }),
      );
    });

    test('offers home exit without capture when the start square has one enemy', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createHomePosition() }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: getStartPosition(FACTION_IDS.RED) }),
      ];

      expect(getAvailableRollFiveActions({ factionId: FACTION_IDS.RED, characters })).toEqual(
        createRollFiveExitResult({ factionId: FACTION_IDS.RED, characterIds: ['red.1'] }),
      );
    });

    test('requires removal when the start square has an own-faction barrier', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createHomePosition() }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: getStartPosition(FACTION_IDS.RED) }),
        createCharacter({ id: 'red.3', factionId: FACTION_IDS.RED, position: getStartPosition(FACTION_IDS.RED) }),
      ];

      expect(getAvailableRollFiveActions({ factionId: FACTION_IDS.RED, characters })).toEqual(
        createRollFiveExitResult({
          factionId: FACTION_IDS.RED,
          characterIds: ['red.1'],
          removableCharacterIds: ['red.2', 'red.3'],
        }),
      );
    });

    test('requires removal when the start square has an enemy barrier', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createHomePosition() }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: getStartPosition(FACTION_IDS.RED) }),
        createCharacter({ id: 'blue.2', factionId: FACTION_IDS.BLUE, position: getStartPosition(FACTION_IDS.RED) }),
      ];

      expect(getAvailableRollFiveActions({ factionId: FACTION_IDS.RED, characters })).toEqual(
        createRollFiveExitResult({
          factionId: FACTION_IDS.RED,
          characterIds: ['red.1'],
          removableCharacterIds: ['blue.1', 'blue.2'],
        }),
      );
    });

    test('requires removal when the start square has two enemies from different factions', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createHomePosition() }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: getStartPosition(FACTION_IDS.RED) }),
        createCharacter({ id: 'green.1', factionId: FACTION_IDS.GREEN, position: getStartPosition(FACTION_IDS.RED) }),
      ];

      expect(getAvailableRollFiveActions({ factionId: FACTION_IDS.RED, characters })).toEqual(
        createRollFiveExitResult({
          factionId: FACTION_IDS.RED,
          characterIds: ['red.1'],
          removableCharacterIds: ['blue.1', 'green.1'],
        }),
      );
    });

    test('requires removal when the start square has one ally and one enemy', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createHomePosition() }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: getStartPosition(FACTION_IDS.RED) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: getStartPosition(FACTION_IDS.RED) }),
      ];

      expect(getAvailableRollFiveActions({ factionId: FACTION_IDS.RED, characters })).toEqual(
        createRollFiveExitResult({
          factionId: FACTION_IDS.RED,
          characterIds: ['red.1'],
          removableCharacterIds: ['red.2', 'blue.1'],
        }),
      );
    });

    test('offers one exit action for each home character in original order', () => {
      const characters = [
        createCharacter({ id: 'red.fireMage', factionId: FACTION_IDS.RED, position: createHomePosition() }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createHomePosition() }),
        createCharacter({ id: 'red.warrior', factionId: FACTION_IDS.RED, position: createHomePosition() }),
        createCharacter({ id: 'red.assassin', factionId: FACTION_IDS.RED, position: createHomePosition() }),
      ];

      expect(getAvailableRollFiveActions({ factionId: FACTION_IDS.RED, characters })).toEqual(
        createRollFiveExitResult({
          factionId: FACTION_IDS.RED,
          characterIds: ['red.fireMage', 'red.warrior', 'red.assassin'],
        }),
      );
    });

    test('home exit has priority over normal movement of 5', () => {
      const characters = [
        createCharacter({ id: 'red.home', factionId: FACTION_IDS.RED, position: createHomePosition() }),
        createCharacter({ id: 'red.board', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      ];

      expect(getAvailableRollFiveActions({ factionId: FACTION_IDS.RED, characters })).toEqual(
        createRollFiveExitResult({ factionId: FACTION_IDS.RED, characterIds: ['red.home'] }),
      );
    });
  });

  describe('normal movement fallback', () => {
    test('uses normal movement of 5 when the faction has no home characters', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(20) }),
      ];

      expect(getAvailableRollFiveActions({ factionId: FACTION_IDS.RED, characters })).toEqual({
        roll: 5,
        actionMode: ROLL_FIVE_ACTION_MODES.NORMAL_MOVEMENT,
        mustChooseAction: true,
        availableActions: [
          {
            type: ROLL_FIVE_ACTION_TYPES.NORMAL_MOVEMENT,
            characterId: 'red.1',
            movement: evaluateMovement({ characterId: 'red.1', steps: 5, characters }),
          },
          {
            type: ROLL_FIVE_ACTION_TYPES.NORMAL_MOVEMENT,
            characterId: 'red.2',
            movement: evaluateMovement({ characterId: 'red.2', steps: 5, characters }),
          },
        ],
      });
    });

    test('returns no actions when no home characters and no normal movement of 5 exists', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(9) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(12) }),
        createCharacter({ id: 'blue.2', factionId: FACTION_IDS.BLUE, position: createCommonPosition(12) }),
      ];

      expect(getAvailableRollFiveActions({ factionId: FACTION_IDS.RED, characters })).toEqual({
        roll: 5,
        actionMode: ROLL_FIVE_ACTION_MODES.NONE,
        mustChooseAction: false,
        availableActions: [],
      });
    });
  });

  describe('invalid input and inconsistent state', () => {
    test.each([undefined, null, {}])('rejects invalid characters: %s', (characters) => {
      expect(() => getAvailableRollFiveActions({ factionId: FACTION_IDS.RED, characters })).toThrow(
        'characters must be an array.',
      );
    });

    test('rejects an invalid faction id', () => {
      expect(() => getAvailableRollFiveActions({ factionId: 'purple', characters: [] })).toThrow(
        'Invalid faction id: purple',
      );
    });

    test('rejects more than two start-square occupants', () => {
      const characters = [
        createCharacter({ id: 'red.home', factionId: FACTION_IDS.RED, position: createHomePosition() }),
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: getStartPosition(FACTION_IDS.RED) }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: getStartPosition(FACTION_IDS.RED) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: getStartPosition(FACTION_IDS.RED) }),
      ];

      expect(() => getAvailableRollFiveActions({ factionId: FACTION_IDS.RED, characters })).toThrow(
        'Cannot evaluate roll 5 home exit with more than two start-square occupants.',
      );
    });

    test('rejects invalid relevant start-square occupant faction', () => {
      const characters = [
        createCharacter({ id: 'red.home', factionId: FACTION_IDS.RED, position: createHomePosition() }),
        createCharacter({ id: 'purple.1', factionId: 'purple', position: getStartPosition(FACTION_IDS.RED) }),
      ];

      expect(() => getAvailableRollFiveActions({ factionId: FACTION_IDS.RED, characters })).toThrow(
        'Invalid start-square occupant faction id: purple',
      );
    });

    test('rejects a relevant home character without an id', () => {
      const characters = [
        createCharacter({ id: '', factionId: FACTION_IDS.RED, position: createHomePosition() }),
      ];

      expect(() => getAvailableRollFiveActions({ factionId: FACTION_IDS.RED, characters })).toThrow(
        'Relevant character requires an id.',
      );
    });

    test('rejects duplicate ids that affect a home exit action', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createHomePosition() }),
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(20) }),
      ];

      expect(() => getAvailableRollFiveActions({ factionId: FACTION_IDS.RED, characters })).toThrow(
        'Duplicate character id: red.1',
      );
    });

    test('rejects duplicate ids that affect removable occupants', () => {
      const characters = [
        createCharacter({ id: 'red.home', factionId: FACTION_IDS.RED, position: createHomePosition() }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: getStartPosition(FACTION_IDS.RED) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.GREEN, position: getStartPosition(FACTION_IDS.RED) }),
      ];

      expect(() => getAvailableRollFiveActions({ factionId: FACTION_IDS.RED, characters })).toThrow(
        'Duplicate character id: blue.1',
      );
    });

    test('does not globally validate an irrelevant corrupt character', () => {
      const characters = [
        createCharacter({ id: 'red.home', factionId: FACTION_IDS.RED, position: createHomePosition() }),
        createCharacter({ id: 'blue.1', factionId: 'purple', position: createCommonPosition(20) }),
      ];

      expect(getAvailableRollFiveActions({ factionId: FACTION_IDS.RED, characters })).toEqual(
        createRollFiveExitResult({ factionId: FACTION_IDS.RED, characterIds: ['red.home'] }),
      );
    });
  });

  describe('mutability', () => {
    test('does not mutate characters or positions', () => {
      const characters = [
        createCharacter({ id: 'red.home', factionId: FACTION_IDS.RED, position: createHomePosition() }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: getStartPosition(FACTION_IDS.RED) }),
      ];
      const before = JSON.parse(JSON.stringify(characters));

      getAvailableRollFiveActions({ factionId: FACTION_IDS.RED, characters });

      expect(characters).toEqual(before);
    });

    test('mutating returned exit actions does not affect later calls', () => {
      const characters = [
        createCharacter({ id: 'red.home', factionId: FACTION_IDS.RED, position: createHomePosition() }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: getStartPosition(FACTION_IDS.RED) }),
        createCharacter({ id: 'blue.2', factionId: FACTION_IDS.BLUE, position: getStartPosition(FACTION_IDS.RED) }),
      ];
      const result = getAvailableRollFiveActions({ factionId: FACTION_IDS.RED, characters });

      result.availableActions[0].destination.square = 99;
      result.availableActions[0].occupantRemoval.removableCharacterIds[0] = 'changed';

      expect(getAvailableRollFiveActions({ factionId: FACTION_IDS.RED, characters })).toEqual(
        createRollFiveExitResult({
          factionId: FACTION_IDS.RED,
          characterIds: ['red.home'],
          removableCharacterIds: ['blue.1', 'blue.2'],
        }),
      );
    });

    test('mutating returned normal movement actions does not affect later calls', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(8) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(13) }),
      ];
      const result = getAvailableRollFiveActions({ factionId: FACTION_IDS.RED, characters });

      result.availableActions[0].movement.destination.square = 99;
      result.availableActions[0].movement.path[0].square = 99;
      result.availableActions[0].movement.outcome.type = 'changed';

      expect(getAvailableRollFiveActions({ factionId: FACTION_IDS.RED, characters })).toEqual({
        roll: 5,
        actionMode: ROLL_FIVE_ACTION_MODES.NORMAL_MOVEMENT,
        mustChooseAction: true,
        availableActions: [
          {
            type: ROLL_FIVE_ACTION_TYPES.NORMAL_MOVEMENT,
            characterId: 'red.1',
            movement: evaluateMovement({ characterId: 'red.1', steps: 5, characters }),
          },
        ],
      });
    });
  });
});
