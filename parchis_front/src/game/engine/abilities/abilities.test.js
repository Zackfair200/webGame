import {
  ABILITY_HOOKS,
  ABILITY_IDS,
  ABILITY_REGISTRY,
  ABILITY_ACTIVATION_TYPES,
  ASSASSIN_CAPTURE_ON_SAFE_SQUARE,
  DRUID_VINES,
  EMPTY_ABILITY_REGISTRY,
  MOVEMENT_TYPES,
  RANGER_PASS_THROUGH_BARRIERS,
  canCaptureEnemyOnSafeDestination,
  canPassThroughIntermediateBarrier,
  createAbilityDefinition,
  createAbilityRegistry,
  getAbilitiesForCharacterType,
} from '../index';

describe('ability contracts', () => {
  test('the default registry is empty and serializable', () => {
    expect(EMPTY_ABILITY_REGISTRY).toEqual({ definitions: [] });
    expect(JSON.parse(JSON.stringify(EMPTY_ABILITY_REGISTRY))).toEqual(EMPTY_ABILITY_REGISTRY);
  });

  test('registers definitions centrally without character-specific engine logic', () => {
    const definition = createAbilityDefinition({
      id: 'testAbility',
      characterType: 'testCharacter',
      activationType: ABILITY_ACTIVATION_TYPES.PASSIVE,
      hooks: ['afterMovement'],
      metadata: { label: 'Test' },
    });
    const registry = createAbilityRegistry([definition]);

    expect(getAbilitiesForCharacterType({ registry, characterType: 'testCharacter' })).toEqual([definition]);
    expect(getAbilitiesForCharacterType({ registry, characterType: 'anotherCharacter' })).toEqual([]);
  });

  test('registers Paso entre barreras as the passive permanent ranger ability', () => {
    expect(RANGER_PASS_THROUGH_BARRIERS).toEqual({
      id: ABILITY_IDS.RANGER_PASS_THROUGH_BARRIERS,
      characterType: 'ranger',
      activationType: ABILITY_ACTIVATION_TYPES.PASSIVE,
      hooks: [ABILITY_HOOKS.PASS_THROUGH_INTERMEDIATE_BARRIERS],
      metadata: {
        label: 'Paso entre barreras',
        permanent: true,
      },
    });
    expect(getAbilitiesForCharacterType({
      registry: ABILITY_REGISTRY,
      characterType: 'ranger',
    })).toEqual([RANGER_PASS_THROUGH_BARRIERS]);
  });

  test('registers Enredaderas with its persistent initial charges', () => {
    expect(DRUID_VINES).toEqual({
      id: ABILITY_IDS.DRUID_VINES,
      characterType: 'druid',
      activationType: ABILITY_ACTIVATION_TYPES.PASSIVE,
      hooks: [ABILITY_HOOKS.OPTIONAL_POST_MOVEMENT_ACTIVATION],
      initialState: { charges: 2 },
      metadata: {
        label: 'Enredaderas',
        permanent: true,
        maxActiveTerrainEffects: 2,
      },
    });
    expect(getAbilitiesForCharacterType({
      registry: ABILITY_REGISTRY,
      characterType: 'druid',
    })).toEqual([DRUID_VINES]);
  });

  test('registers Captura en tabernas as the passive permanent assassin ability', () => {
    expect(ASSASSIN_CAPTURE_ON_SAFE_SQUARE).toEqual({
      id: ABILITY_IDS.ASSASSIN_CAPTURE_ON_SAFE_SQUARE,
      characterType: 'assassin',
      activationType: ABILITY_ACTIVATION_TYPES.PASSIVE,
      hooks: [ABILITY_HOOKS.CAPTURE_ENEMY_ON_SAFE_DESTINATION],
      metadata: {
        label: 'Captura en tabernas',
        permanent: true,
      },
    });
    expect(getAbilitiesForCharacterType({
      registry: ABILITY_REGISTRY,
      characterType: 'assassin',
    })).toEqual([ASSASSIN_CAPTURE_ON_SAFE_SQUARE]);
  });

  test.each([MOVEMENT_TYPES.NORMAL, MOVEMENT_TYPES.REWARD])(
    'allows the ranger hook for intermediate barriers during %s movement',
    (movementType) => {
      expect(canPassThroughIntermediateBarrier({
        rulesContext: {
          movementType,
          abilities: [RANGER_PASS_THROUGH_BARRIERS],
          effects: { terrain: [{ id: 'terrain-effect' }] },
        },
        pathIndex: 1,
        pathLength: 3,
      })).toBe(true);
    },
  );

  test.each([MOVEMENT_TYPES.FORCED_DISPLACEMENT, MOVEMENT_TYPES.SPECIAL_TRAVERSAL])(
    'does not apply the ranger hook to %s movement',
    (movementType) => {
      expect(canPassThroughIntermediateBarrier({
        rulesContext: {
          movementType,
          abilities: [RANGER_PASS_THROUGH_BARRIERS],
        },
        pathIndex: 1,
        pathLength: 3,
      })).toBe(false);
    },
  );

  test('never allows the ranger hook to pass a destination barrier', () => {
    expect(canPassThroughIntermediateBarrier({
      rulesContext: {
        movementType: MOVEMENT_TYPES.NORMAL,
        abilities: [RANGER_PASS_THROUGH_BARRIERS],
      },
      pathIndex: 2,
      pathLength: 3,
    })).toBe(false);
  });

  test.each([MOVEMENT_TYPES.NORMAL, MOVEMENT_TYPES.REWARD])(
    'allows the assassin safe capture hook during %s movement',
    (movementType) => {
      expect(canCaptureEnemyOnSafeDestination({
        rulesContext: {
          movementType,
          abilities: [ASSASSIN_CAPTURE_ON_SAFE_SQUARE],
        },
      })).toBe(true);
    },
  );

  test.each([MOVEMENT_TYPES.FORCED_DISPLACEMENT, MOVEMENT_TYPES.SPECIAL_TRAVERSAL])(
    'does not apply the assassin safe capture hook to %s movement',
    (movementType) => {
      expect(canCaptureEnemyOnSafeDestination({
        rulesContext: {
          movementType,
          abilities: [ASSASSIN_CAPTURE_ON_SAFE_SQUARE],
        },
      })).toBe(false);
    },
  );

  test.each([
    ['ranger', [RANGER_PASS_THROUGH_BARRIERS]],
    ['character without abilities', []],
  ])('does not leak the assassin safe capture hook to %s', (label, abilities) => {
    expect(canCaptureEnemyOnSafeDestination({
      rulesContext: {
        movementType: MOVEMENT_TYPES.NORMAL,
        abilities,
      },
    })).toBe(false);
  });

  test('does not give the assassin the ranger barrier hook', () => {
    expect(canPassThroughIntermediateBarrier({
      rulesContext: {
        movementType: MOVEMENT_TYPES.NORMAL,
        abilities: [ASSASSIN_CAPTURE_ON_SAFE_SQUARE],
      },
      pathIndex: 1,
      pathLength: 3,
    })).toBe(false);
  });
});
