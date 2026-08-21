import {
  DESTINATION_FAILURE_REASONS,
  DESTINATION_OUTCOME_TYPES,
  FACTION_IDS,
  POSITION_TYPES,
  createCommonPosition,
  createFinalLanePosition,
  createGoalPosition,
  createHomePosition,
  evaluateDestination,
} from '../../index';

function createCharacter({ id, factionId, position }) {
  return {
    id,
    factionId,
    position,
  };
}

function createMovingCharacter(overrides = {}) {
  return createCharacter({
    id: 'red.1',
    factionId: FACTION_IDS.RED,
    position: createCommonPosition(9),
    ...overrides,
  });
}

function expectDestinationResult(result, expected) {
  expect(result).toEqual(expected);
}

describe('evaluateDestination', () => {
  describe('empty destination', () => {
    test('allows an empty normal common destination', () => {
      const destination = createCommonPosition(10);
      const characters = [createMovingCharacter()];

      expectDestinationResult(
        evaluateDestination({ movingCharacterId: 'red.1', destination, characters }),
        {
          legal: true,
          outcome: { type: DESTINATION_OUTCOME_TYPES.EMPTY },
          destination: createCommonPosition(10),
        },
      );
    });

    test('allows an empty safe common destination', () => {
      const destination = createCommonPosition(12);
      const characters = [createMovingCharacter()];

      expectDestinationResult(
        evaluateDestination({ movingCharacterId: 'red.1', destination, characters }),
        {
          legal: true,
          outcome: { type: DESTINATION_OUTCOME_TYPES.EMPTY },
          destination: createCommonPosition(12),
        },
      );
    });

    test('allows an empty own final lane destination', () => {
      const destination = createFinalLanePosition(FACTION_IDS.RED, 3);
      const characters = [createMovingCharacter()];

      expectDestinationResult(
        evaluateDestination({ movingCharacterId: 'red.1', destination, characters }),
        {
          legal: true,
          outcome: { type: DESTINATION_OUTCOME_TYPES.EMPTY },
          destination: createFinalLanePosition(FACTION_IDS.RED, 3),
        },
      );
    });
  });

  describe('ally destination', () => {
    test('allows sharing a normal common destination with one ally', () => {
      const destination = createCommonPosition(10);
      const characters = [
        createMovingCharacter(),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: destination }),
      ];

      expectDestinationResult(
        evaluateDestination({ movingCharacterId: 'red.1', destination, characters }),
        {
          legal: true,
          outcome: {
            type: DESTINATION_OUTCOME_TYPES.SHARE_WITH_ALLY,
            occupantCharacterId: 'red.2',
          },
          destination: createCommonPosition(10),
        },
      );
    });

    test('allows sharing a safe common destination with one ally', () => {
      const destination = createCommonPosition(12);
      const characters = [
        createMovingCharacter(),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: destination }),
      ];

      expectDestinationResult(
        evaluateDestination({ movingCharacterId: 'red.1', destination, characters }),
        {
          legal: true,
          outcome: {
            type: DESTINATION_OUTCOME_TYPES.SHARE_WITH_ALLY,
            occupantCharacterId: 'red.2',
          },
          destination: createCommonPosition(12),
        },
      );
    });

    test('allows sharing an own final lane destination with one ally', () => {
      const destination = createFinalLanePosition(FACTION_IDS.RED, 3);
      const characters = [
        createMovingCharacter(),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: destination }),
      ];

      expectDestinationResult(
        evaluateDestination({ movingCharacterId: 'red.1', destination, characters }),
        {
          legal: true,
          outcome: {
            type: DESTINATION_OUTCOME_TYPES.SHARE_WITH_ALLY,
            occupantCharacterId: 'red.2',
          },
          destination: createFinalLanePosition(FACTION_IDS.RED, 3),
        },
      );
    });

    test('rejects two allies as destination full', () => {
      const destination = createCommonPosition(10);
      const characters = [
        createMovingCharacter(),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: destination }),
        createCharacter({ id: 'red.3', factionId: FACTION_IDS.RED, position: destination }),
      ];

      expectDestinationResult(
        evaluateDestination({ movingCharacterId: 'red.1', destination, characters }),
        {
          legal: false,
          reason: DESTINATION_FAILURE_REASONS.DESTINATION_FULL,
          destination: createCommonPosition(10),
        },
      );
    });
  });

  describe('enemy destination', () => {
    test('detects capture on a normal common destination with one enemy', () => {
      const destination = createCommonPosition(10);
      const characters = [
        createMovingCharacter(),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: destination }),
      ];

      expectDestinationResult(
        evaluateDestination({ movingCharacterId: 'red.1', destination, characters }),
        {
          legal: true,
          outcome: {
            type: DESTINATION_OUTCOME_TYPES.CAPTURE,
            capturedCharacterId: 'blue.1',
          },
          destination: createCommonPosition(10),
        },
      );
    });

    test('allows safe sharing on a safe common destination with one enemy', () => {
      const destination = createCommonPosition(12);
      const characters = [
        createMovingCharacter(),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: destination }),
      ];

      expectDestinationResult(
        evaluateDestination({ movingCharacterId: 'red.1', destination, characters }),
        {
          legal: true,
          outcome: {
            type: DESTINATION_OUTCOME_TYPES.SAFE_SHARE,
            occupantCharacterId: 'blue.1',
          },
          destination: createCommonPosition(12),
        },
      );
    });

    test('treats a start square as safe when sharing with one enemy', () => {
      const destination = createCommonPosition(5);
      const characters = [
        createMovingCharacter(),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: destination }),
      ];

      expectDestinationResult(
        evaluateDestination({ movingCharacterId: 'red.1', destination, characters }),
        {
          legal: true,
          outcome: {
            type: DESTINATION_OUTCOME_TYPES.SAFE_SHARE,
            occupantCharacterId: 'blue.1',
          },
          destination: createCommonPosition(5),
        },
      );
    });

    test('rejects two same-faction enemies as destination full', () => {
      const destination = createCommonPosition(10);
      const characters = [
        createMovingCharacter(),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: destination }),
        createCharacter({ id: 'blue.2', factionId: FACTION_IDS.BLUE, position: destination }),
      ];

      expectDestinationResult(
        evaluateDestination({ movingCharacterId: 'red.1', destination, characters }),
        {
          legal: false,
          reason: DESTINATION_FAILURE_REASONS.DESTINATION_FULL,
          destination: createCommonPosition(10),
        },
      );
    });

    test('rejects two different-faction occupants on a safe common destination as full', () => {
      const destination = createCommonPosition(12);
      const characters = [
        createMovingCharacter(),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: destination }),
        createCharacter({ id: 'green.1', factionId: FACTION_IDS.GREEN, position: destination }),
      ];

      expectDestinationResult(
        evaluateDestination({ movingCharacterId: 'red.1', destination, characters }),
        {
          legal: false,
          reason: DESTINATION_FAILURE_REASONS.DESTINATION_FULL,
          destination: createCommonPosition(12),
        },
      );
    });

    test('rejects different-faction occupants on a normal common destination as inconsistent state', () => {
      const destination = createCommonPosition(10);
      const characters = [
        createMovingCharacter(),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: destination }),
        createCharacter({ id: 'green.1', factionId: FACTION_IDS.GREEN, position: destination }),
      ];

      expect(() => evaluateDestination({ movingCharacterId: 'red.1', destination, characters })).toThrow(
        'Different-faction occupants cannot coexist on a normal common position.',
      );
    });
  });

  describe('final lane destination', () => {
    test('allows an empty own final lane destination', () => {
      const destination = createFinalLanePosition(FACTION_IDS.RED, 4);
      const characters = [createMovingCharacter()];

      expectDestinationResult(
        evaluateDestination({ movingCharacterId: 'red.1', destination, characters }),
        {
          legal: true,
          outcome: { type: DESTINATION_OUTCOME_TYPES.EMPTY },
          destination: createFinalLanePosition(FACTION_IDS.RED, 4),
        },
      );
    });

    test('allows an own final lane destination with one ally', () => {
      const destination = createFinalLanePosition(FACTION_IDS.RED, 4);
      const characters = [
        createMovingCharacter(),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: destination }),
      ];

      expectDestinationResult(
        evaluateDestination({ movingCharacterId: 'red.1', destination, characters }),
        {
          legal: true,
          outcome: {
            type: DESTINATION_OUTCOME_TYPES.SHARE_WITH_ALLY,
            occupantCharacterId: 'red.2',
          },
          destination: createFinalLanePosition(FACTION_IDS.RED, 4),
        },
      );
    });

    test('rejects an own final lane destination with two allies as full', () => {
      const destination = createFinalLanePosition(FACTION_IDS.RED, 4);
      const characters = [
        createMovingCharacter(),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: destination }),
        createCharacter({ id: 'red.3', factionId: FACTION_IDS.RED, position: destination }),
      ];

      expectDestinationResult(
        evaluateDestination({ movingCharacterId: 'red.1', destination, characters }),
        {
          legal: false,
          reason: DESTINATION_FAILURE_REASONS.DESTINATION_FULL,
          destination: createFinalLanePosition(FACTION_IDS.RED, 4),
        },
      );
    });

    test('rejects an enemy in final lane as inconsistent state', () => {
      const destination = createFinalLanePosition(FACTION_IDS.RED, 4);
      const characters = [
        createMovingCharacter(),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: destination }),
      ];

      expect(() => evaluateDestination({ movingCharacterId: 'red.1', destination, characters })).toThrow(
        'Enemy occupant cannot be in a final lane.',
      );
    });

    test('rejects a final lane destination that belongs to another faction', () => {
      const characters = [createMovingCharacter()];

      expect(() =>
        evaluateDestination({
          movingCharacterId: 'red.1',
          destination: createFinalLanePosition(FACTION_IDS.BLUE, 4),
          characters,
        }),
      ).toThrow('Destination final lane does not match moving character faction.');
    });
  });

  describe('goal destination', () => {
    test('allows goal with no finalized characters', () => {
      const characters = [createMovingCharacter()];

      expectDestinationResult(
        evaluateDestination({ movingCharacterId: 'red.1', destination: createGoalPosition(), characters }),
        {
          legal: true,
          outcome: { type: DESTINATION_OUTCOME_TYPES.GOAL },
          destination: createGoalPosition(),
        },
      );
    });

    test.each([1, 2, 4])('allows goal with %i same-faction finalized characters', (goalOccupants) => {
      const characters = [
        createMovingCharacter(),
        ...Array.from({ length: goalOccupants }, (_, index) =>
          createCharacter({
            id: `red.goal.${index + 1}`,
            factionId: FACTION_IDS.RED,
            position: createGoalPosition(),
          }),
        ),
      ];

      expectDestinationResult(
        evaluateDestination({ movingCharacterId: 'red.1', destination: createGoalPosition(), characters }),
        {
          legal: true,
          outcome: { type: DESTINATION_OUTCOME_TYPES.GOAL },
          destination: createGoalPosition(),
        },
      );
    });
  });

  describe('moving character exclusion', () => {
    test('excludes the moving character from destination occupancy', () => {
      const destination = createCommonPosition(10);
      const characters = [
        createMovingCharacter({ position: destination }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: destination }),
      ];

      expectDestinationResult(
        evaluateDestination({ movingCharacterId: 'red.1', destination, characters }),
        {
          legal: true,
          outcome: {
            type: DESTINATION_OUTCOME_TYPES.SHARE_WITH_ALLY,
            occupantCharacterId: 'red.2',
          },
          destination: createCommonPosition(10),
        },
      );
    });

    test('treats a conceptual bounce ending on the initial position as empty after excluding the mover', () => {
      const destination = createFinalLanePosition(FACTION_IDS.RED, 6);
      const characters = [createMovingCharacter({ position: destination })];

      expectDestinationResult(
        evaluateDestination({ movingCharacterId: 'red.1', destination, characters }),
        {
          legal: true,
          outcome: { type: DESTINATION_OUTCOME_TYPES.EMPTY },
          destination: createFinalLanePosition(FACTION_IDS.RED, 6),
        },
      );
    });

    test('treats a conceptual bounce ending on the initial position as ally share when one ally remains', () => {
      const destination = createFinalLanePosition(FACTION_IDS.RED, 6);
      const characters = [
        createMovingCharacter({ position: destination }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: destination }),
      ];

      expectDestinationResult(
        evaluateDestination({ movingCharacterId: 'red.1', destination, characters }),
        {
          legal: true,
          outcome: {
            type: DESTINATION_OUTCOME_TYPES.SHARE_WITH_ALLY,
            occupantCharacterId: 'red.2',
          },
          destination: createFinalLanePosition(FACTION_IDS.RED, 6),
        },
      );
    });
  });

  describe('invalid input and inconsistent state', () => {
    test.each([undefined, null, {}])('rejects invalid characters: %s', (characters) => {
      expect(() =>
        evaluateDestination({
          movingCharacterId: 'red.1',
          destination: createCommonPosition(10),
          characters,
        }),
      ).toThrow('characters must be an array.');
    });

    test('rejects a missing movingCharacterId', () => {
      expect(() =>
        evaluateDestination({
          movingCharacterId: 'red.missing',
          destination: createCommonPosition(10),
          characters: [],
        }),
      ).toThrow('movingCharacterId does not match an existing character: red.missing');
    });

    test('rejects a duplicate movingCharacterId', () => {
      const characters = [createMovingCharacter(), createMovingCharacter({ position: createCommonPosition(11) })];

      expect(() =>
        evaluateDestination({ movingCharacterId: 'red.1', destination: createCommonPosition(10), characters }),
      ).toThrow('Duplicate character id: red.1');
    });

    test('rejects invalid moving character faction', () => {
      const characters = [createMovingCharacter({ factionId: 'purple' })];

      expect(() =>
        evaluateDestination({ movingCharacterId: 'red.1', destination: createCommonPosition(10), characters }),
      ).toThrow('Invalid moving character faction id: purple');
    });

    test('rejects invalid destination', () => {
      const characters = [createMovingCharacter()];

      expect(() =>
        evaluateDestination({
          movingCharacterId: 'red.1',
          destination: { type: POSITION_TYPES.COMMON },
          characters,
        }),
      ).toThrow('Destination position is invalid.');
    });

    test('rejects home as destination', () => {
      const characters = [createMovingCharacter()];

      expect(() =>
        evaluateDestination({ movingCharacterId: 'red.1', destination: createHomePosition(), characters }),
      ).toThrow('Destination cannot be home.');
    });

    test('rejects more than two occupants after excluding the mover', () => {
      const destination = createCommonPosition(10);
      const characters = [
        createMovingCharacter(),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: destination }),
        createCharacter({ id: 'red.3', factionId: FACTION_IDS.RED, position: destination }),
        createCharacter({ id: 'red.4', factionId: FACTION_IDS.RED, position: destination }),
      ];

      expect(() => evaluateDestination({ movingCharacterId: 'red.1', destination, characters })).toThrow(
        'Cannot evaluate destination with more than two occupants.',
      );
    });

    test('rejects invalid relevant occupant faction', () => {
      const destination = createCommonPosition(10);
      const characters = [
        createMovingCharacter(),
        createCharacter({ id: 'purple.1', factionId: 'purple', position: destination }),
      ];

      expect(() => evaluateDestination({ movingCharacterId: 'red.1', destination, characters })).toThrow(
        'Invalid occupant faction id: purple',
      );
    });

    test('does not reject irrelevant characters in other positions', () => {
      const destination = createCommonPosition(10);
      const characters = [
        createMovingCharacter(),
        createCharacter({ id: 'purple.1', factionId: 'purple', position: createCommonPosition(30) }),
      ];

      expectDestinationResult(
        evaluateDestination({ movingCharacterId: 'red.1', destination, characters }),
        {
          legal: true,
          outcome: { type: DESTINATION_OUTCOME_TYPES.EMPTY },
          destination: createCommonPosition(10),
        },
      );
    });
  });

  describe('mutability', () => {
    test('does not mutate characters', () => {
      const destination = createCommonPosition(10);
      const characters = [
        createMovingCharacter(),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: destination }),
      ];
      const before = JSON.parse(JSON.stringify(characters));

      evaluateDestination({ movingCharacterId: 'red.1', destination, characters });

      expect(characters).toEqual(before);
    });

    test('does not mutate destination', () => {
      const destination = createCommonPosition(10);
      const characters = [createMovingCharacter()];
      const before = { ...destination };

      evaluateDestination({ movingCharacterId: 'red.1', destination, characters });

      expect(destination).toEqual(before);
    });

    test('returns defensive destination copies', () => {
      const destination = createCommonPosition(10);
      const characters = [createMovingCharacter()];
      const result = evaluateDestination({ movingCharacterId: 'red.1', destination, characters });

      result.destination.square = 99;

      expect(destination).toEqual(createCommonPosition(10));
    });

    test('mutating a result does not affect later calls', () => {
      const destination = createCommonPosition(10);
      const characters = [createMovingCharacter()];
      const firstResult = evaluateDestination({ movingCharacterId: 'red.1', destination, characters });

      firstResult.destination.square = 99;
      firstResult.outcome.type = 'changed';

      expect(evaluateDestination({ movingCharacterId: 'red.1', destination, characters })).toEqual({
        legal: true,
        outcome: { type: DESTINATION_OUTCOME_TYPES.EMPTY },
        destination: createCommonPosition(10),
      });
    });

    test('does not expose complete character objects in outcomes', () => {
      const destination = createCommonPosition(10);
      const characters = [
        createMovingCharacter(),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: destination }),
      ];
      const result = evaluateDestination({ movingCharacterId: 'red.1', destination, characters });

      expect(result.outcome).toEqual({
        type: DESTINATION_OUTCOME_TYPES.CAPTURE,
        capturedCharacterId: 'blue.1',
      });
      expect(result.outcome.capturedCharacter).toBeUndefined();
      expect(result.outcome.occupant).toBeUndefined();
    });
  });
});
