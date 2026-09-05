import {
  ABILITY_IDS,
  ABILITY_ACTIVATION_TYPES,
  MOVEMENT_TYPES,
  createAbilityDefinition,
  createAbilityRegistry,
  createRulesContext,
} from '../index';

function createState() {
  return {
    players: [
      {
        id: 'player-red',
        factionId: 'red',
        characters: [
          {
            id: 'red.testCharacter',
            characterId: 'testCharacter',
            factionId: 'red',
            position: { type: 'common', square: 10 },
          },
        ],
      },
    ],
    characterStatesById: {
      'red.testCharacter': { effects: [{ id: 'character-effect' }] },
    },
    factionStatesById: {
      red: { effects: [{ id: 'faction-effect' }] },
    },
    globalEffects: [{ id: 'global-effect' }],
    terrainEffectsByPositionKey: {
      'common:10': [{ id: 'terrain-effect' }],
    },
  };
}

describe('rulesContext', () => {
  test('builds a deterministic snapshot with relevant abilities and effects', () => {
    const gameState = createState();
    const registry = createAbilityRegistry([
      createAbilityDefinition({
        id: 'testAbility',
        characterType: 'testCharacter',
        activationType: ABILITY_ACTIVATION_TYPES.PASSIVE,
      }),
    ]);
    const inputBefore = JSON.parse(JSON.stringify(gameState));
    const context = createRulesContext({
      gameState,
      actorCharacterId: 'red.testCharacter',
      source: { type: 'testSource' },
      movementType: MOVEMENT_TYPES.REWARD,
      terrainPositionKey: 'common:10',
      abilityRegistry: registry,
    });

    expect(context.actor.id).toBe('red.testCharacter');
    expect(context.abilities.map((ability) => ability.id)).toEqual(['testAbility']);
    expect(context.effects.character).toEqual([{ id: 'character-effect' }]);
    expect(context.effects.faction).toEqual([{ id: 'faction-effect' }]);
    expect(context.effects.global).toEqual([{ id: 'global-effect' }]);
    expect(context.effects.terrain).toEqual([{ id: 'terrain-effect' }]);
    expect(gameState).toEqual(inputBefore);
  });

  test('returned snapshots cannot mutate the source state', () => {
    const gameState = createState();
    const context = createRulesContext({ gameState });

    context.gameState.players[0].id = 'changed';
    context.effects.global.push({ id: 'changed' });

    expect(gameState.players[0].id).toBe('player-red');
    expect(gameState.globalEffects).toEqual([{ id: 'global-effect' }]);
  });

  test('resolves the ranger ability from the real registry without dropping terrain effects', () => {
    const gameState = createState();
    gameState.players[0].characters[0] = {
      ...gameState.players[0].characters[0],
      id: 'green.ranger',
      characterId: 'ranger',
      factionId: 'green',
    };
    gameState.terrainEffectsByPositionKey['common:11'] = [{ id: 'vines' }];

    const context = createRulesContext({
      gameState,
      actorCharacterId: 'green.ranger',
      movementType: MOVEMENT_TYPES.NORMAL,
      terrainPositionKey: 'common:11',
    });

    expect(context.abilities.map((ability) => ability.id)).toEqual([
      ABILITY_IDS.RANGER_PASS_THROUGH_BARRIERS,
    ]);
    expect(context.effects.terrain).toEqual([{ id: 'vines' }]);
  });
});
