import {
  DESTINATION_OUTCOME_TYPES,
  FACTION_IDS,
  createCommonPosition,
  createFinalLanePosition,
  createGoalPosition,
  createHomePosition,
  evaluateMovement,
  getMovableCharacters,
} from '../../index';

function createCharacter({ id, factionId, position }) {
  return {
    id,
    factionId,
    position,
  };
}

function expectMovableCharacters({ factionId, steps, characters, characterIds }) {
  expect(getMovableCharacters({ factionId, steps, characters })).toEqual({
    movableCharacters: characterIds.map((characterId) => ({
      characterId,
      movement: evaluateMovement({ characterId, steps, characters }),
    })),
  });
}

describe('getMovableCharacters', () => {
  describe('basic selection', () => {
    test('returns four same-faction characters when all can move', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(1) }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'red.3', factionId: FACTION_IDS.RED, position: createCommonPosition(20) }),
        createCharacter({ id: 'red.4', factionId: FACTION_IDS.RED, position: createCommonPosition(30) }),
      ];

      expectMovableCharacters({
        factionId: FACTION_IDS.RED,
        steps: 1,
        characters,
        characterIds: ['red.1', 'red.2', 'red.3', 'red.4'],
      });
    });

    test('returns only characters that can move when some cannot', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(1) }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createHomePosition() }),
        createCharacter({ id: 'red.3', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
        createCharacter({ id: 'red.4', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(11) }),
        createCharacter({ id: 'blue.2', factionId: FACTION_IDS.BLUE, position: createCommonPosition(11) }),
      ];

      expectMovableCharacters({
        factionId: FACTION_IDS.RED,
        steps: 1,
        characters,
        characterIds: ['red.1'],
      });
    });

    test('returns an empty result when no character can move', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createHomePosition() }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
        createCharacter({ id: 'red.3', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'red.4', factionId: FACTION_IDS.RED, position: createCommonPosition(20) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(11) }),
        createCharacter({ id: 'blue.2', factionId: FACTION_IDS.BLUE, position: createCommonPosition(11) }),
        createCharacter({ id: 'green.1', factionId: FACTION_IDS.GREEN, position: createCommonPosition(21) }),
        createCharacter({ id: 'green.2', factionId: FACTION_IDS.GREEN, position: createCommonPosition(21) }),
      ];

      expect(getMovableCharacters({ factionId: FACTION_IDS.RED, steps: 1, characters })).toEqual({
        movableCharacters: [],
      });
    });

    test('excludes a character at home through legal movement evaluation', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createHomePosition() }),
      ];

      expect(evaluateMovement({ characterId: 'red.1', steps: 1, characters }).legal).toBe(false);
      expect(getMovableCharacters({ factionId: FACTION_IDS.RED, steps: 1, characters })).toEqual({
        movableCharacters: [],
      });
    });

    test('excludes a character at goal through legal movement evaluation', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
      ];

      expect(evaluateMovement({ characterId: 'red.1', steps: 1, characters }).legal).toBe(false);
      expect(getMovableCharacters({ factionId: FACTION_IDS.RED, steps: 1, characters })).toEqual({
        movableCharacters: [],
      });
    });
  });

  describe('illegal movement reasons', () => {
    test('excludes a character blocked by a barrier', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(9) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(12) }),
        createCharacter({ id: 'blue.2', factionId: FACTION_IDS.BLUE, position: createCommonPosition(12) }),
      ];

      expect(evaluateMovement({ characterId: 'red.1', steps: 3, characters }).legal).toBe(false);
      expect(getMovableCharacters({ factionId: FACTION_IDS.RED, steps: 3, characters })).toEqual({
        movableCharacters: [],
      });
    });

    test('excludes a character when destination is full', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(12) }),
        createCharacter({ id: 'green.1', factionId: FACTION_IDS.GREEN, position: createCommonPosition(12) }),
      ];

      expect(evaluateMovement({ characterId: 'red.1', steps: 2, characters }).legal).toBe(false);
      expect(getMovableCharacters({ factionId: FACTION_IDS.RED, steps: 2, characters })).toEqual({
        movableCharacters: [],
      });
    });

    test('excludes a character when movement exceeds the bounce limit', () => {
      const characters = [
        createCharacter({
          id: 'red.1',
          factionId: FACTION_IDS.RED,
          position: createFinalLanePosition(FACTION_IDS.RED, 7),
        }),
      ];

      expect(evaluateMovement({ characterId: 'red.1', steps: 9, characters }).legal).toBe(false);
      expect(getMovableCharacters({ factionId: FACTION_IDS.RED, steps: 9, characters })).toEqual({
        movableCharacters: [],
      });
    });
  });

  describe('legal outcomes', () => {
    test('keeps a character available for an empty destination outcome', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(8) }),
      ];

      expectMovableCharacters({
        factionId: FACTION_IDS.RED,
        steps: 1,
        characters,
        characterIds: ['red.1'],
      });
      expect(getMovableCharacters({ factionId: FACTION_IDS.RED, steps: 1, characters }).movableCharacters[0]
        .movement.outcome.type).toBe(DESTINATION_OUTCOME_TYPES.EMPTY);
    });

    test('keeps a character available for a shareWithAlly outcome', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(8) }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(11) }),
        createCharacter({ id: 'blue.2', factionId: FACTION_IDS.BLUE, position: createCommonPosition(11) }),
      ];

      expectMovableCharacters({
        factionId: FACTION_IDS.RED,
        steps: 2,
        characters,
        characterIds: ['red.1'],
      });
      expect(getMovableCharacters({ factionId: FACTION_IDS.RED, steps: 2, characters }).movableCharacters[0]
        .movement.outcome).toEqual({
        type: DESTINATION_OUTCOME_TYPES.SHARE_WITH_ALLY,
        occupantCharacterId: 'red.2',
      });
    });

    test('keeps a character available for a capture outcome', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(8) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(10) }),
      ];

      expectMovableCharacters({
        factionId: FACTION_IDS.RED,
        steps: 2,
        characters,
        characterIds: ['red.1'],
      });
      expect(getMovableCharacters({ factionId: FACTION_IDS.RED, steps: 2, characters }).movableCharacters[0]
        .movement.outcome).toEqual({
        type: DESTINATION_OUTCOME_TYPES.CAPTURE,
        capturedCharacterId: 'blue.1',
      });
    });

    test('keeps a character available for a safeShare outcome', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(12) }),
      ];

      expectMovableCharacters({
        factionId: FACTION_IDS.RED,
        steps: 2,
        characters,
        characterIds: ['red.1'],
      });
      expect(getMovableCharacters({ factionId: FACTION_IDS.RED, steps: 2, characters }).movableCharacters[0]
        .movement.outcome).toEqual({
        type: DESTINATION_OUTCOME_TYPES.SAFE_SHARE,
        occupantCharacterId: 'blue.1',
      });
    });

    test('keeps a character available for a goal outcome', () => {
      const characters = [
        createCharacter({
          id: 'red.1',
          factionId: FACTION_IDS.RED,
          position: createFinalLanePosition(FACTION_IDS.RED, 6),
        }),
      ];

      expectMovableCharacters({
        factionId: FACTION_IDS.RED,
        steps: 2,
        characters,
        characterIds: ['red.1'],
      });
      expect(getMovableCharacters({ factionId: FACTION_IDS.RED, steps: 2, characters }).movableCharacters[0]
        .movement.outcome.type).toBe(DESTINATION_OUTCOME_TYPES.GOAL);
    });
  });

  describe('factions', () => {
    test('only evaluates candidates from the requested faction', () => {
      const characters = [
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(1) }),
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      ];

      expectMovableCharacters({
        factionId: FACTION_IDS.RED,
        steps: 1,
        characters,
        characterIds: ['red.1'],
      });
    });

    test('non-candidate factions can still affect barrier evaluation', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(9) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(12) }),
        createCharacter({ id: 'blue.2', factionId: FACTION_IDS.BLUE, position: createCommonPosition(12) }),
      ];

      expect(getMovableCharacters({ factionId: FACTION_IDS.RED, steps: 3, characters })).toEqual({
        movableCharacters: [],
      });
    });

    test('non-candidate factions can still affect destination evaluation', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(8) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(10) }),
      ];

      const result = getMovableCharacters({ factionId: FACTION_IDS.RED, steps: 2, characters });

      expect(result.movableCharacters).toHaveLength(1);
      expect(result.movableCharacters[0].movement.outcome).toEqual({
        type: DESTINATION_OUTCOME_TYPES.CAPTURE,
        capturedCharacterId: 'blue.1',
      });
    });

    test('rejects an invalid faction id', () => {
      expect(() => getMovableCharacters({ factionId: 'purple', steps: 1, characters: [] })).toThrow(
        'Invalid faction id: purple',
      );
    });

    test('returns an empty result for a valid faction with no characters', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      ];

      expect(getMovableCharacters({ factionId: FACTION_IDS.GREEN, steps: 1, characters })).toEqual({
        movableCharacters: [],
      });
    });
  });

  describe('steps', () => {
    test.each([0, -1, 1.5])('rejects invalid movement steps: %s', (steps) => {
      expect(() => getMovableCharacters({ factionId: FACTION_IDS.RED, steps, characters: [] })).toThrow(
        'Movement steps must be a positive integer.',
      );
    });

    test.each([5, 6])('treats %i as a normal movement step count', (steps) => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(1) }),
      ];

      expectMovableCharacters({
        factionId: FACTION_IDS.RED,
        steps,
        characters,
        characterIds: ['red.1'],
      });
    });
  });

  describe('inconsistent state', () => {
    test('propagates relevant errors from movement evaluation', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: { type: 'unknown' } }),
      ];

      expect(() => getMovableCharacters({ factionId: FACTION_IDS.RED, steps: 1, characters })).toThrow(
        'Character position is invalid.',
      );
    });

    test('does not globally validate an irrelevant corrupt character from another faction', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(8) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: { type: 'unknown' } }),
      ];

      expectMovableCharacters({
        factionId: FACTION_IDS.RED,
        steps: 1,
        characters,
        characterIds: ['red.1'],
      });
    });
  });

  describe('duplicate ids', () => {
    test('propagates duplicate ids between candidates', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(8) }),
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(20) }),
      ];

      expect(() => getMovableCharacters({ factionId: FACTION_IDS.RED, steps: 1, characters })).toThrow(
        'Duplicate character id: red.1',
      );
    });

    test('propagates a duplicate id shared by a candidate and another faction', () => {
      const characters = [
        createCharacter({ id: 'shared.1', factionId: FACTION_IDS.RED, position: createCommonPosition(8) }),
        createCharacter({ id: 'shared.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(20) }),
      ];

      expect(() => getMovableCharacters({ factionId: FACTION_IDS.RED, steps: 1, characters })).toThrow(
        'Duplicate character id: shared.1',
      );
    });

    test('does not globally validate irrelevant duplicate ids', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(8) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(40) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(50) }),
      ];

      expectMovableCharacters({
        factionId: FACTION_IDS.RED,
        steps: 1,
        characters,
        characterIds: ['red.1'],
      });
    });
  });

  describe('order', () => {
    test('preserves the original relative order of legal candidates', () => {
      const characters = [
        createCharacter({ id: 'red.3', factionId: FACTION_IDS.RED, position: createCommonPosition(30) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(40) }),
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createHomePosition() }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      ];

      expect(getMovableCharacters({ factionId: FACTION_IDS.RED, steps: 1, characters }).movableCharacters.map(
        ({ characterId }) => characterId,
      )).toEqual(['red.3', 'red.2']);
    });
  });

  describe('mutability', () => {
    test('does not mutate characters or character positions', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(8) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(10) }),
      ];
      const before = JSON.parse(JSON.stringify(characters));

      getMovableCharacters({ factionId: FACTION_IDS.RED, steps: 2, characters });

      expect(characters).toEqual(before);
    });

    test('mutating returned movement does not affect state or later calls', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(8) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(10) }),
      ];
      const result = getMovableCharacters({ factionId: FACTION_IDS.RED, steps: 2, characters });

      result.movableCharacters[0].movement.path[0].square = 99;
      result.movableCharacters[0].movement.destination.square = 99;
      result.movableCharacters[0].movement.outcome.type = 'changed';
      result.movableCharacters[0].movement.outcome.capturedCharacterId = 'changed';

      expect(characters).toEqual([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(8) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(10) }),
      ]);
      expect(getMovableCharacters({ factionId: FACTION_IDS.RED, steps: 2, characters })).toEqual({
        movableCharacters: [
          {
            characterId: 'red.1',
            movement: evaluateMovement({ characterId: 'red.1', steps: 2, characters }),
          },
        ],
      });
    });
  });

  describe('invalid input', () => {
    test.each([undefined, null, {}])('rejects invalid characters: %s', (characters) => {
      expect(() => getMovableCharacters({ factionId: FACTION_IDS.RED, steps: 1, characters })).toThrow(
        'characters must be an array.',
      );
    });
  });
});
