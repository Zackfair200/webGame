import {
  DESTINATION_FAILURE_REASONS,
  DESTINATION_OUTCOME_TYPES,
  FACTION_IDS,
  LEGAL_MOVEMENT_FAILURE_REASONS,
  MOVEMENT_FAILURE_REASONS,
  MOVEMENT_TYPES,
  POSITION_TYPES,
  ROUTES_BY_FACTION,
  createCommonPosition,
  createFinalLanePosition,
  createGoalPosition,
  createHomePosition,
  createRulesContext,
  evaluateMovement,
} from '../../index';

function createCharacter({ id, characterId, factionId, position }) {
  return {
    id,
    ...(characterId ? { characterId } : {}),
    factionId,
    position,
  };
}

function createState(characters) {
  return {
    players: Object.values(FACTION_IDS).map((factionId) => ({
      id: `player-${factionId}`,
      factionId,
      characters: characters.filter((character) => character.factionId === factionId),
    })),
    characterStatesById: {},
    factionStatesById: {},
    globalEffects: [],
    terrainEffectsByPositionKey: {},
  };
}

function evaluateAbilityMovement({
  characterId,
  characters,
  steps,
  movementType = MOVEMENT_TYPES.NORMAL,
}) {
  const state = createState(characters);

  return evaluateMovement({
    characterId,
    steps,
    characters,
    rulesContext: createRulesContext({
      gameState: state,
      actorCharacterId: characterId,
      movementType,
    }),
  });
}

function evaluateRangerMovement({ characters, steps, movementType = MOVEMENT_TYPES.NORMAL }) {
  return evaluateAbilityMovement({
    characterId: 'green.ranger',
    characters,
    steps,
    movementType,
  });
}

function expectLegalMovement(
  result,
  { destination, path, steps, outcome = { type: DESTINATION_OUTCOME_TYPES.EMPTY } },
) {
  expect(result).toEqual({ legal: true, destination, path, outcome });
  expect(result.path).toHaveLength(steps);
  expect(result.destination).toEqual(result.path.at(-1));
}

function getRoutePosition(factionId, position) {
  return ROUTES_BY_FACTION[factionId].find((routePosition) => {
    if (routePosition.type !== position.type) {
      return false;
    }

    if (position.type === POSITION_TYPES.COMMON) {
      return routePosition.square === position.square;
    }

    if (position.type === POSITION_TYPES.FINAL_LANE) {
      return routePosition.factionId === position.factionId && routePosition.index === position.index;
    }

    return true;
  });
}

describe('evaluateMovement', () => {
  describe('legal movement', () => {
    test('allows common to common movement without barriers', () => {
      const characters = [
        createCharacter({ id: 'yellow.1', factionId: FACTION_IDS.YELLOW, position: createCommonPosition(10) }),
      ];

      expectLegalMovement(
        evaluateMovement({ characterId: 'yellow.1', steps: 3, characters }),
        {
          destination: createCommonPosition(13),
          path: [createCommonPosition(11), createCommonPosition(12), createCommonPosition(13)],
          steps: 3,
        },
      );
    });

    test('allows movement across 68 to 1', () => {
      const characters = [
        createCharacter({ id: 'yellow.1', factionId: FACTION_IDS.YELLOW, position: createCommonPosition(67) }),
      ];

      expectLegalMovement(
        evaluateMovement({ characterId: 'yellow.1', steps: 2, characters }),
        {
          destination: createCommonPosition(1),
          path: [createCommonPosition(68), createCommonPosition(1)],
          steps: 2,
        },
      );
    });

    test.each([
      [FACTION_IDS.YELLOW, 38],
      [FACTION_IDS.GREEN, 21],
      [FACTION_IDS.BLUE, 55],
      [FACTION_IDS.RED, 4],
    ])('allows %s movement from canonical entry %i into final lane', (factionId, entrySquare) => {
      const characters = [
        createCharacter({ id: `${factionId}.1`, factionId, position: createCommonPosition(entrySquare) }),
      ];

      expectLegalMovement(
        evaluateMovement({ characterId: `${factionId}.1`, steps: 3, characters }),
        {
          destination: createFinalLanePosition(factionId, 3),
          path: [
            createFinalLanePosition(factionId, 1),
            createFinalLanePosition(factionId, 2),
            createFinalLanePosition(factionId, 3),
          ],
          steps: 3,
        },
      );
    });

    test('allows movement within final lane', () => {
      const characters = [
        createCharacter({
          id: 'red.1',
          factionId: FACTION_IDS.RED,
          position: createFinalLanePosition(FACTION_IDS.RED, 2),
        }),
      ];

      expectLegalMovement(
        evaluateMovement({ characterId: 'red.1', steps: 3, characters }),
        {
          destination: createFinalLanePosition(FACTION_IDS.RED, 5),
          path: [
            createFinalLanePosition(FACTION_IDS.RED, 3),
            createFinalLanePosition(FACTION_IDS.RED, 4),
            createFinalLanePosition(FACTION_IDS.RED, 5),
          ],
          steps: 3,
        },
      );
    });

    test('allows exact arrival to goal', () => {
      const characters = [
        createCharacter({
          id: 'blue.1',
          factionId: FACTION_IDS.BLUE,
          position: createFinalLanePosition(FACTION_IDS.BLUE, 6),
        }),
      ];

      expectLegalMovement(
        evaluateMovement({ characterId: 'blue.1', steps: 2, characters }),
        {
          destination: createGoalPosition(),
          path: [createFinalLanePosition(FACTION_IDS.BLUE, 7), createGoalPosition()],
          steps: 2,
          outcome: { type: DESTINATION_OUTCOME_TYPES.GOAL },
        },
      );
    });

    test('allows a valid bounce', () => {
      const characters = [
        createCharacter({
          id: 'red.1',
          factionId: FACTION_IDS.RED,
          position: createFinalLanePosition(FACTION_IDS.RED, 7),
        }),
      ];

      expectLegalMovement(
        evaluateMovement({ characterId: 'red.1', steps: 8, characters }),
        {
          destination: createFinalLanePosition(FACTION_IDS.RED, 1),
          path: [
            createGoalPosition(),
            createFinalLanePosition(FACTION_IDS.RED, 7),
            createFinalLanePosition(FACTION_IDS.RED, 6),
            createFinalLanePosition(FACTION_IDS.RED, 5),
            createFinalLanePosition(FACTION_IDS.RED, 4),
            createFinalLanePosition(FACTION_IDS.RED, 3),
            createFinalLanePosition(FACTION_IDS.RED, 2),
            createFinalLanePosition(FACTION_IDS.RED, 1),
          ],
          steps: 8,
        },
      );
    });

    test('allows a bounce that crosses goal as an intermediate position', () => {
      const characters = [
        createCharacter({
          id: 'yellow.1',
          factionId: FACTION_IDS.YELLOW,
          position: createFinalLanePosition(FACTION_IDS.YELLOW, 6),
        }),
      ];
      const result = evaluateMovement({ characterId: 'yellow.1', steps: 4, characters });

      expectLegalMovement(
        result,
        {
          destination: createFinalLanePosition(FACTION_IDS.YELLOW, 6),
          path: [
            createFinalLanePosition(FACTION_IDS.YELLOW, 7),
            createGoalPosition(),
            createFinalLanePosition(FACTION_IDS.YELLOW, 7),
            createFinalLanePosition(FACTION_IDS.YELLOW, 6),
          ],
          steps: 4,
        },
      );
      expect(result.outcome.type).not.toBe(DESTINATION_OUTCOME_TYPES.GOAL);
    });

    test('detects capture against a single enemy on a normal common destination', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(8) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(10) }),
      ];

      expectLegalMovement(
        evaluateMovement({ characterId: 'red.1', steps: 2, characters }),
        {
          destination: createCommonPosition(10),
          path: [createCommonPosition(9), createCommonPosition(10)],
          steps: 2,
          outcome: {
            type: DESTINATION_OUTCOME_TYPES.CAPTURE,
            capturedCharacterId: 'blue.1',
          },
        },
      );
    });

    test('allows sharing destination with one ally', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(8) }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      ];

      expectLegalMovement(
        evaluateMovement({ characterId: 'red.1', steps: 2, characters }),
        {
          destination: createCommonPosition(10),
          path: [createCommonPosition(9), createCommonPosition(10)],
          steps: 2,
          outcome: {
            type: DESTINATION_OUTCOME_TYPES.SHARE_WITH_ALLY,
            occupantCharacterId: 'red.2',
          },
        },
      );
    });

    test('allows safe sharing with one enemy on a safe common destination', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(12) }),
      ];

      expectLegalMovement(
        evaluateMovement({ characterId: 'red.1', steps: 2, characters }),
        {
          destination: createCommonPosition(12),
          path: [createCommonPosition(11), createCommonPosition(12)],
          steps: 2,
          outcome: {
            type: DESTINATION_OUTCOME_TYPES.SAFE_SHARE,
            occupantCharacterId: 'blue.1',
          },
        },
      );
    });

    test('allows safe sharing with one enemy on a start square', () => {
      const characters = [
        createCharacter({ id: 'yellow.1', factionId: FACTION_IDS.YELLOW, position: createCommonPosition(3) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(5) }),
      ];

      expectLegalMovement(
        evaluateMovement({ characterId: 'yellow.1', steps: 2, characters }),
        {
          destination: createCommonPosition(5),
          path: [createCommonPosition(4), createCommonPosition(5)],
          steps: 2,
          outcome: {
            type: DESTINATION_OUTCOME_TYPES.SAFE_SHARE,
            occupantCharacterId: 'blue.1',
          },
        },
      );
    });
  });

  describe('geometrically impossible movement', () => {
    test('rejects movement beyond final lane 1 as not legal', () => {
      const characters = [
        createCharacter({
          id: 'yellow.1',
          factionId: FACTION_IDS.YELLOW,
          position: createFinalLanePosition(FACTION_IDS.YELLOW, 7),
        }),
      ];

      expect(evaluateMovement({ characterId: 'yellow.1', steps: 9, characters })).toEqual({
        legal: false,
        reason: MOVEMENT_FAILURE_REASONS.MOVEMENT_BEYOND_FINAL_LANE_START,
      });
    });
  });

  describe('barriers', () => {
    test('rejects a movement blocked by an intermediate barrier', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(9) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(12) }),
        createCharacter({ id: 'blue.2', factionId: FACTION_IDS.BLUE, position: createCommonPosition(12) }),
      ];

      expect(evaluateMovement({ characterId: 'red.1', steps: 4, characters })).toEqual({
        legal: false,
        reason: LEGAL_MOVEMENT_FAILURE_REASONS.BARRIER,
        blockedAt: createCommonPosition(12),
        pathIndex: 2,
      });
    });

    test('rejects a movement blocked by a destination barrier', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(9) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(12) }),
        createCharacter({ id: 'blue.2', factionId: FACTION_IDS.BLUE, position: createCommonPosition(12) }),
      ];

      expect(evaluateMovement({ characterId: 'red.1', steps: 3, characters })).toEqual({
        legal: false,
        reason: LEGAL_MOVEMENT_FAILURE_REASONS.BARRIER,
        blockedAt: createCommonPosition(12),
        pathIndex: 2,
      });
    });

    test('rejects a movement blocked by an own-faction destination barrier', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(9) }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(12) }),
        createCharacter({ id: 'red.3', factionId: FACTION_IDS.RED, position: createCommonPosition(12) }),
      ];

      expect(evaluateMovement({ characterId: 'red.1', steps: 3, characters })).toEqual({
        legal: false,
        reason: LEGAL_MOVEMENT_FAILURE_REASONS.BARRIER,
        blockedAt: createCommonPosition(12),
        pathIndex: 2,
      });
    });

    test('rejects a movement blocked by an own-faction barrier', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(9) }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(11) }),
        createCharacter({ id: 'red.3', factionId: FACTION_IDS.RED, position: createCommonPosition(11) }),
      ];

      expect(evaluateMovement({ characterId: 'red.1', steps: 3, characters })).toEqual({
        legal: false,
        reason: LEGAL_MOVEMENT_FAILURE_REASONS.BARRIER,
        blockedAt: createCommonPosition(11),
        pathIndex: 1,
      });
    });

    test('rejects a movement blocked by a final lane barrier', () => {
      const characters = [
        createCharacter({
          id: 'red.1',
          factionId: FACTION_IDS.RED,
          position: createFinalLanePosition(FACTION_IDS.RED, 1),
        }),
        createCharacter({
          id: 'red.2',
          factionId: FACTION_IDS.RED,
          position: createFinalLanePosition(FACTION_IDS.RED, 3),
        }),
        createCharacter({
          id: 'red.3',
          factionId: FACTION_IDS.RED,
          position: createFinalLanePosition(FACTION_IDS.RED, 3),
        }),
      ];

      expect(evaluateMovement({ characterId: 'red.1', steps: 3, characters })).toEqual({
        legal: false,
        reason: LEGAL_MOVEMENT_FAILURE_REASONS.BARRIER,
        blockedAt: createFinalLanePosition(FACTION_IDS.RED, 3),
        pathIndex: 1,
      });
    });

    test('rejects a movement blocked after goal during a bounce', () => {
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

      expect(evaluateMovement({ characterId: 'yellow.1', steps: 4, characters })).toEqual({
        legal: false,
        reason: LEGAL_MOVEMENT_FAILURE_REASONS.BARRIER,
        blockedAt: createFinalLanePosition(FACTION_IDS.YELLOW, 6),
        pathIndex: 3,
      });
    });

    test('returns the first barrier found in path order', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(9) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(11) }),
        createCharacter({ id: 'blue.2', factionId: FACTION_IDS.BLUE, position: createCommonPosition(11) }),
        createCharacter({ id: 'green.1', factionId: FACTION_IDS.GREEN, position: createCommonPosition(13) }),
        createCharacter({ id: 'green.2', factionId: FACTION_IDS.GREEN, position: createCommonPosition(13) }),
      ];

      expect(evaluateMovement({ characterId: 'red.1', steps: 5, characters })).toEqual({
        legal: false,
        reason: LEGAL_MOVEMENT_FAILURE_REASONS.BARRIER,
        blockedAt: createCommonPosition(11),
        pathIndex: 1,
      });
    });

    test('excludes the moving character from barrier evaluation', () => {
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
      ];

      expectLegalMovement(
        evaluateMovement({ characterId: 'yellow.1', steps: 4, characters }),
        {
          destination: createFinalLanePosition(FACTION_IDS.YELLOW, 6),
          path: [
            createFinalLanePosition(FACTION_IDS.YELLOW, 7),
            createGoalPosition(),
            createFinalLanePosition(FACTION_IDS.YELLOW, 7),
            createFinalLanePosition(FACTION_IDS.YELLOW, 6),
          ],
          steps: 4,
          outcome: {
            type: DESTINATION_OUTCOME_TYPES.SHARE_WITH_ALLY,
            occupantCharacterId: 'yellow.2',
          },
        },
      );
    });

    test('assassin captures one enemy when landing on a safe square', () => {
      const characters = [
        createCharacter({
          id: 'red.assassin',
          characterId: 'assassin',
          factionId: FACTION_IDS.RED,
          position: createCommonPosition(10),
        }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(12) }),
      ];

      expect(evaluateAbilityMovement({
        characterId: 'red.assassin',
        characters,
        steps: 2,
      }).outcome).toEqual({
        type: DESTINATION_OUTCOME_TYPES.CAPTURE,
        capturedCharacterId: 'blue.1',
      });
    });

    test('assassin does not capture an enemy merely passed on a safe square', () => {
      const characters = [
        createCharacter({
          id: 'red.assassin',
          characterId: 'assassin',
          factionId: FACTION_IDS.RED,
          position: createCommonPosition(10),
        }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(12) }),
      ];
      const movement = evaluateAbilityMovement({
        characterId: 'red.assassin',
        characters,
        steps: 5,
      });

      expect(movement.path).toContainEqual(createCommonPosition(12));
      expect(movement.destination).toEqual(createCommonPosition(15));
      expect(movement.outcome).toEqual({ type: DESTINATION_OUTCOME_TYPES.EMPTY });
    });

    test('ranger passes through an intermediate enemy barrier', () => {
      const characters = [
        createCharacter({
          id: 'green.ranger',
          characterId: 'ranger',
          factionId: FACTION_IDS.GREEN,
          position: createCommonPosition(9),
        }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(11) }),
        createCharacter({ id: 'blue.2', factionId: FACTION_IDS.BLUE, position: createCommonPosition(11) }),
      ];

      expect(evaluateRangerMovement({ characters, steps: 4 })).toMatchObject({
        legal: true,
        destination: createCommonPosition(13),
      });
      expect(characters.slice(1).map((character) => character.position)).toEqual([
        createCommonPosition(11),
        createCommonPosition(11),
      ]);
    });

    test('assassin remains blocked by an intermediate barrier', () => {
      const characters = [
        createCharacter({
          id: 'red.assassin',
          characterId: 'assassin',
          factionId: FACTION_IDS.RED,
          position: createCommonPosition(9),
        }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(12) }),
        createCharacter({ id: 'blue.2', factionId: FACTION_IDS.BLUE, position: createCommonPosition(12) }),
      ];

      expect(evaluateAbilityMovement({
        characterId: 'red.assassin',
        characters,
        steps: 4,
      })).toEqual({
        legal: false,
        reason: LEGAL_MOVEMENT_FAILURE_REASONS.BARRIER,
        blockedAt: createCommonPosition(12),
        pathIndex: 2,
      });
    });

    test('assassin remains blocked by a barrier on the safe destination', () => {
      const characters = [
        createCharacter({
          id: 'red.assassin',
          characterId: 'assassin',
          factionId: FACTION_IDS.RED,
          position: createCommonPosition(9),
        }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(12) }),
        createCharacter({ id: 'blue.2', factionId: FACTION_IDS.BLUE, position: createCommonPosition(12) }),
      ];

      expect(evaluateAbilityMovement({
        characterId: 'red.assassin',
        characters,
        steps: 3,
      })).toEqual({
        legal: false,
        reason: LEGAL_MOVEMENT_FAILURE_REASONS.BARRIER,
        blockedAt: createCommonPosition(12),
        pathIndex: 2,
      });
    });

    test('ranger passes through an intermediate allied barrier', () => {
      const characters = [
        createCharacter({
          id: 'green.ranger',
          characterId: 'ranger',
          factionId: FACTION_IDS.GREEN,
          position: createCommonPosition(9),
        }),
        createCharacter({ id: 'green.druid', factionId: FACTION_IDS.GREEN, position: createCommonPosition(11) }),
        createCharacter({ id: 'green.archer', factionId: FACTION_IDS.GREEN, position: createCommonPosition(11) }),
      ];

      expect(evaluateRangerMovement({ characters, steps: 4 })).toMatchObject({
        legal: true,
        destination: createCommonPosition(13),
      });
    });

    test('ranger remains blocked by a barrier at the destination', () => {
      const characters = [
        createCharacter({
          id: 'green.ranger',
          characterId: 'ranger',
          factionId: FACTION_IDS.GREEN,
          position: createCommonPosition(9),
        }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(12) }),
        createCharacter({ id: 'blue.2', factionId: FACTION_IDS.BLUE, position: createCommonPosition(12) }),
      ];

      expect(evaluateRangerMovement({ characters, steps: 3 })).toEqual({
        legal: false,
        reason: LEGAL_MOVEMENT_FAILURE_REASONS.BARRIER,
        blockedAt: createCommonPosition(12),
        pathIndex: 2,
      });
    });

    test('rejects a rulesContext belonging to a different actor', () => {
      const characters = [
        createCharacter({
          id: 'green.ranger',
          characterId: 'ranger',
          factionId: FACTION_IDS.GREEN,
          position: createCommonPosition(9),
        }),
        createCharacter({
          id: 'green.druid',
          characterId: 'druid',
          factionId: FACTION_IDS.GREEN,
          position: createCommonPosition(20),
        }),
      ];
      const state = createState(characters);
      const rangerContext = createRulesContext({
        gameState: state,
        actorCharacterId: 'green.ranger',
        movementType: MOVEMENT_TYPES.NORMAL,
      });

      expect(() => evaluateMovement({
        characterId: 'green.druid',
        steps: 1,
        characters,
        rulesContext: rangerContext,
      })).toThrow('rulesContext actor must match the character being evaluated.');
    });

    test('ranger still uses the normal capture rule after crossing a barrier', () => {
      const characters = [
        createCharacter({
          id: 'green.ranger',
          characterId: 'ranger',
          factionId: FACTION_IDS.GREEN,
          position: createCommonPosition(9),
        }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(11) }),
        createCharacter({ id: 'blue.2', factionId: FACTION_IDS.BLUE, position: createCommonPosition(11) }),
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(13) }),
      ];

      expect(evaluateRangerMovement({ characters, steps: 4 }).outcome).toEqual({
        type: DESTINATION_OUTCOME_TYPES.CAPTURE,
        capturedCharacterId: 'red.1',
      });
    });

    test('ranger still uses the normal SAFE rule after crossing a barrier', () => {
      const characters = [
        createCharacter({
          id: 'green.ranger',
          characterId: 'ranger',
          factionId: FACTION_IDS.GREEN,
          position: createCommonPosition(9),
        }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(10) }),
        createCharacter({ id: 'blue.2', factionId: FACTION_IDS.BLUE, position: createCommonPosition(10) }),
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(12) }),
      ];

      expect(evaluateRangerMovement({ characters, steps: 3 }).outcome).toEqual({
        type: DESTINATION_OUTCOME_TYPES.SAFE_SHARE,
        occupantCharacterId: 'red.1',
      });
    });
  });

  describe('destination rules', () => {
    test('returns destinationFull for a full safe destination with two different-faction occupants', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(12) }),
        createCharacter({ id: 'green.1', factionId: FACTION_IDS.GREEN, position: createCommonPosition(12) }),
      ];

      expect(evaluateMovement({ characterId: 'red.1', steps: 2, characters })).toEqual({
        legal: false,
        reason: DESTINATION_FAILURE_REASONS.DESTINATION_FULL,
        destination: createCommonPosition(12),
      });
    });

    test('propagates inconsistent normal common destination occupants from destination rules', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(8) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(10) }),
        createCharacter({ id: 'green.1', factionId: FACTION_IDS.GREEN, position: createCommonPosition(10) }),
      ];

      expect(() => evaluateMovement({ characterId: 'red.1', steps: 2, characters })).toThrow(
        'Different-faction occupants cannot coexist on a normal common position.',
      );
    });

    test('propagates enemy final lane occupants from destination rules', () => {
      const characters = [
        createCharacter({
          id: 'red.1',
          factionId: FACTION_IDS.RED,
          position: createFinalLanePosition(FACTION_IDS.RED, 2),
        }),
        createCharacter({
          id: 'blue.1',
          factionId: FACTION_IDS.BLUE,
          position: createFinalLanePosition(FACTION_IDS.RED, 4),
        }),
      ];

      expect(() => evaluateMovement({ characterId: 'red.1', steps: 2, characters })).toThrow(
        'Enemy occupant cannot be in a final lane.',
      );
    });
  });

  describe('states outside this layer', () => {
    test('returns not legal for a character at home', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createHomePosition() }),
      ];

      expect(evaluateMovement({ characterId: 'red.1', steps: 1, characters })).toEqual({
        legal: false,
        reason: LEGAL_MOVEMENT_FAILURE_REASONS.CHARACTER_AT_HOME,
      });
    });

    test('returns not legal for a character at goal', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
      ];

      expect(evaluateMovement({ characterId: 'red.1', steps: 1, characters })).toEqual({
        legal: false,
        reason: LEGAL_MOVEMENT_FAILURE_REASONS.CHARACTER_AT_GOAL,
      });
    });
  });

  describe('invalid inputs and inconsistent state', () => {
    test.each([undefined, null, {}])('rejects invalid characters: %s', (characters) => {
      expect(() => evaluateMovement({ characterId: 'red.1', steps: 1, characters })).toThrow(
        'characters must be an array.',
      );
    });

    test('rejects a missing characterId', () => {
      expect(() => evaluateMovement({ characterId: 'red.missing', steps: 1, characters: [] })).toThrow(
        'characterId does not match an existing character: red.missing',
      );
    });

    test('rejects a duplicate characterId', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(11) }),
      ];

      expect(() => evaluateMovement({ characterId: 'red.1', steps: 1, characters })).toThrow(
        'Duplicate character id: red.1',
      );
    });

    test('rejects an invalid character faction', () => {
      const characters = [
        createCharacter({ id: 'purple.1', factionId: 'purple', position: createCommonPosition(10) }),
      ];

      expect(() => evaluateMovement({ characterId: 'purple.1', steps: 1, characters })).toThrow(
        'Invalid character faction id: purple',
      );
    });

    test('rejects an invalid character position', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: { type: POSITION_TYPES.COMMON } }),
      ];

      expect(() => evaluateMovement({ characterId: 'red.1', steps: 1, characters })).toThrow(
        'Character position is invalid.',
      );
    });

    test('rejects a final lane position that belongs to another faction', () => {
      const characters = [
        createCharacter({
          id: 'red.1',
          factionId: FACTION_IDS.RED,
          position: createFinalLanePosition(FACTION_IDS.BLUE, 3),
        }),
      ];

      expect(() => evaluateMovement({ characterId: 'red.1', steps: 1, characters })).toThrow(
        'Character final lane does not match its faction.',
      );
    });

    test.each([0, -1, 1.5])('rejects invalid steps: %s', (steps) => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      ];

      expect(() => evaluateMovement({ characterId: 'red.1', steps, characters })).toThrow(
        'Movement steps must be a positive integer.',
      );
    });

    test.each([0, -1])('rejects invalid steps before returning home state: %s', (steps) => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createHomePosition() }),
      ];

      expect(() => evaluateMovement({ characterId: 'red.1', steps, characters })).toThrow(
        'Movement steps must be a positive integer.',
      );
    });

    test.each([0, 1.5])('rejects invalid steps before returning goal state: %s', (steps) => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
      ];

      expect(() => evaluateMovement({ characterId: 'red.1', steps, characters })).toThrow(
        'Movement steps must be a positive integer.',
      );
    });
  });

  describe('mutability', () => {
    test('does not mutate characters or character positions', () => {
      const characters = [
        createCharacter({ id: 'yellow.1', factionId: FACTION_IDS.YELLOW, position: createCommonPosition(10) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(20) }),
      ];
      const before = JSON.parse(JSON.stringify(characters));

      evaluateMovement({ characterId: 'yellow.1', steps: 3, characters });

      expect(characters).toEqual(before);
    });

    test('returns correct destination after a previous destination result was mutated', () => {
      const characters = [
        createCharacter({ id: 'yellow.1', factionId: FACTION_IDS.YELLOW, position: createCommonPosition(10) }),
      ];
      const firstResult = evaluateMovement({ characterId: 'yellow.1', steps: 3, characters });

      firstResult.destination.square = 99;

      expect(evaluateMovement({ characterId: 'yellow.1', steps: 3, characters }).destination).toEqual(
        createCommonPosition(13),
      );
    });

    test('returns correct path after a previous path result was mutated', () => {
      const characters = [
        createCharacter({ id: 'yellow.1', factionId: FACTION_IDS.YELLOW, position: createCommonPosition(10) }),
      ];
      const firstResult = evaluateMovement({ characterId: 'yellow.1', steps: 3, characters });

      firstResult.path[0].square = 99;

      expect(evaluateMovement({ characterId: 'yellow.1', steps: 3, characters }).path).toEqual([
        createCommonPosition(11),
        createCommonPosition(12),
        createCommonPosition(13),
      ]);
    });

    test('returns correct outcome after a previous outcome result was mutated', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(8) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(10) }),
      ];
      const firstResult = evaluateMovement({ characterId: 'red.1', steps: 2, characters });

      firstResult.outcome.type = 'changed';
      firstResult.outcome.capturedCharacterId = 'changed';

      expect(evaluateMovement({ characterId: 'red.1', steps: 2, characters }).outcome).toEqual({
        type: DESTINATION_OUTCOME_TYPES.CAPTURE,
        capturedCharacterId: 'blue.1',
      });
      expect(characters[0].position).toEqual(createCommonPosition(8));
      expect(characters[1].position).toEqual(createCommonPosition(10));
    });

    test('does not expose route positions through legal results', () => {
      const characters = [
        createCharacter({ id: 'yellow.1', factionId: FACTION_IDS.YELLOW, position: createCommonPosition(67) }),
      ];
      const result = evaluateMovement({ characterId: 'yellow.1', steps: 1, characters });
      const routePosition = getRoutePosition(FACTION_IDS.YELLOW, createCommonPosition(68));

      result.path[0].square = 99;

      expect(routePosition).toEqual(createCommonPosition(68));
      expect(getRoutePosition(FACTION_IDS.YELLOW, createCommonPosition(68))).toEqual(createCommonPosition(68));
    });

    test('does not expose state positions through blockedAt', () => {
      const characters = [
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(9) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(12) }),
        createCharacter({ id: 'blue.2', factionId: FACTION_IDS.BLUE, position: createCommonPosition(12) }),
      ];
      const result = evaluateMovement({ characterId: 'red.1', steps: 3, characters });

      result.blockedAt.square = 99;

      expect(characters[1].position).toEqual(createCommonPosition(12));
      expect(evaluateMovement({ characterId: 'red.1', steps: 3, characters }).blockedAt).toEqual(
        createCommonPosition(12),
      );
    });
  });
});
