import {
  EXECUTION_EVENT_TYPES,
  FACTION_IDS,
  MOVEMENT_SOURCE_TYPES,
  MOVEMENT_TYPES,
  REWARD_ACTION_TYPES,
  REWARD_LOST_REASONS,
  REWARD_SOURCE_TYPES,
  REWARD_STATUS,
  REWARD_TYPES,
  createCommonPosition,
  createDruidVinesEffect,
  createGoalPosition,
  createHomePosition,
  deriveRewardsFromEvents,
  executeRewardAction,
  getAvailableRewardActions,
  getPlayablePositionKey,
} from '../index';

function createCharacter({ id, characterId, factionId, position }) {
  return { id, ...(characterId ? { characterId } : {}), factionId, position };
}

function createState(characters) {
  const factionIds = [FACTION_IDS.RED, FACTION_IDS.BLUE, FACTION_IDS.GREEN, FACTION_IDS.YELLOW];
  const players = factionIds.map((factionId) => ({
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

function movementReward({
  sourceType = REWARD_SOURCE_TYPES.CAPTURE,
  sourceCharacterId = 'red.1',
  ownerFactionId = FACTION_IDS.RED,
  steps = sourceType === REWARD_SOURCE_TYPES.CAPTURE ? 20 : 10,
  excludedCharacterIds = [],
} = {}) {
  return {
    type: REWARD_TYPES.MOVEMENT_REWARD,
    source: {
      type: sourceType,
      characterId: sourceCharacterId,
    },
    ownerFactionId,
    steps,
    excludedCharacterIds,
  };
}

function captureMovementReward(sourceCharacterId = 'red.1', ownerFactionId = FACTION_IDS.RED) {
  return movementReward({
    sourceType: REWARD_SOURCE_TYPES.CAPTURE,
    sourceCharacterId,
    ownerFactionId,
    steps: 20,
  });
}

function goalMovementReward(sourceCharacterId = 'red.1', ownerFactionId = FACTION_IDS.RED) {
  return movementReward({
    sourceType: REWARD_SOURCE_TYPES.GOAL,
    sourceCharacterId,
    ownerFactionId,
    steps: 10,
    excludedCharacterIds: [sourceCharacterId],
  });
}

function rewardAction(characterId = 'red.1') {
  return {
    type: REWARD_ACTION_TYPES.MOVEMENT_REWARD_MOVEMENT,
    characterId,
    steps: 20,
  };
}

function loseRewardAction() {
  return { type: REWARD_ACTION_TYPES.LOSE_REWARD };
}

describe('movement rewards', () => {
  describe('deriveRewardsFromEvents', () => {
    test('normal capture creates a faction-owned +20 movementReward', () => {
      expect(deriveRewardsFromEvents({
        events: [
          {
            type: EXECUTION_EVENT_TYPES.CHARACTER_CAPTURED,
            characterId: 'red.1',
            factionId: FACTION_IDS.RED,
            capturedCharacterId: 'blue.1',
          },
        ],
      })).toEqual([captureMovementReward('red.1', FACTION_IDS.RED)]);
    });

    test('goal creates a faction-owned +10 movementReward that excludes the source character', () => {
      expect(deriveRewardsFromEvents({
        events: [
          {
            type: EXECUTION_EVENT_TYPES.CHARACTER_REACHED_GOAL,
            characterId: 'red.1',
            factionId: FACTION_IDS.RED,
          },
        ],
      })).toEqual([goalMovementReward('red.1', FACTION_IDS.RED)]);
    });
  });

  describe('capture +20 availability', () => {
    test('capturing character can be a candidate when it can move exactly 20', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      ]);
      const availability = getAvailableRewardActions({ state, reward: captureMovementReward('red.1') });

      expect(availability.status).toBe(REWARD_STATUS.AVAILABLE);
      expect(availability.availableActions).toHaveLength(1);
      expect(availability.availableActions[0]).toMatchObject({
        type: REWARD_ACTION_TYPES.MOVEMENT_REWARD_MOVEMENT,
        characterId: 'red.1',
        steps: 20,
        rewardSteps: 20,
        movement: expect.objectContaining({ destination: createCommonPosition(30) }),
      });
    });

    test('another character from the same faction can receive the +20', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createHomePosition() }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(20) }),
      ]);
      const availability = getAvailableRewardActions({ state, reward: captureMovementReward('red.1') });

      expect(availability.status).toBe(REWARD_STATUS.AVAILABLE);
      expect(availability.availableActions.map((action) => action.characterId)).toEqual(['red.2']);
    });

    test('HOME, GOAL, enemies, and illegal exact movements are not candidates', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createHomePosition() }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
        createCharacter({ id: 'red.3', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(20) }),
        createCharacter({ id: 'blue.2', factionId: FACTION_IDS.BLUE, position: createCommonPosition(30) }),
      ]);
      const availability = getAvailableRewardActions({ state, reward: captureMovementReward('red.1') });

      expect(availability.availableActions.map((action) => action.characterId)).toEqual(['red.3']);
    });

    test('movement must be exactly 20 and does not fallback to 19 through 1', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(28) }),
        createCharacter({ id: 'blue.2', factionId: FACTION_IDS.BLUE, position: createCommonPosition(28) }),
      ]);
      const availability = getAvailableRewardActions({ state, reward: captureMovementReward('red.1') });

      expect(availability).toMatchObject({
        status: REWARD_STATUS.LOST,
        mustChooseAction: false,
        availableActions: [],
        reason: REWARD_LOST_REASONS.NO_LEGAL_RECIPIENT,
      });
    });

    test('vines do not make a +20 candidate legal through a later barrier', () => {
      const vinePosition = createCommonPosition(23);
      const vines = createDruidVinesEffect({
        characterId: 'green.druid',
        factionId: FACTION_IDS.GREEN,
        position: vinePosition,
      });
      const state = {
        ...createState([
          createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(9) }),
          createCharacter({ id: 'green.1', factionId: FACTION_IDS.GREEN, position: createCommonPosition(28) }),
          createCharacter({ id: 'green.2', factionId: FACTION_IDS.GREEN, position: createCommonPosition(28) }),
        ]),
        terrainEffectsByPositionKey: {
          [getPlayablePositionKey(vinePosition)]: [vines],
        },
      };
      const availability = getAvailableRewardActions({
        state,
        reward: captureMovementReward('red.1'),
      });

      expect(availability).toMatchObject({
        status: REWARD_STATUS.LOST,
        mustChooseAction: false,
        availableActions: [],
        reason: REWARD_LOST_REASONS.NO_LEGAL_RECIPIENT,
      });
    });

    test('zero candidates materializes rewardLost', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createHomePosition() }),
      ]);
      const result = executeRewardAction({
        state,
        reward: captureMovementReward('red.1'),
        action: loseRewardAction(),
      });

      expect(result.state).toBe(state);
      expect(result.events).toEqual([
        {
          type: EXECUTION_EVENT_TYPES.REWARD_LOST,
          rewardType: REWARD_TYPES.MOVEMENT_REWARD,
          rewardSource: { type: REWARD_SOURCE_TYPES.CAPTURE, characterId: 'red.1' },
          ownerFactionId: FACTION_IDS.RED,
          characterId: 'red.1',
          steps: 20,
          reason: REWARD_LOST_REASONS.NO_LEGAL_RECIPIENT,
        },
      ]);
    });

    test('one candidate executes automatically when used by the consequence resolver', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      ]);
      const availability = getAvailableRewardActions({ state, reward: captureMovementReward('red.1') });
      const result = executeRewardAction({
        state,
        reward: captureMovementReward('red.1'),
        action: availability.availableActions[0],
      });

      expect(getCharacter(result.state, 'red.1').position).toEqual(createCommonPosition(30));
      expect(result.events[0]).toMatchObject({
        type: EXECUTION_EVENT_TYPES.CHARACTER_MOVED,
        characterId: 'red.1',
        factionId: FACTION_IDS.RED,
        steps: 20,
        actionType: REWARD_ACTION_TYPES.MOVEMENT_REWARD_MOVEMENT,
        movementType: MOVEMENT_TYPES.REWARD,
        source: {
          type: MOVEMENT_SOURCE_TYPES.REWARD,
          rewardType: REWARD_TYPES.MOVEMENT_REWARD,
          rewardSource: { type: REWARD_SOURCE_TYPES.CAPTURE, characterId: 'red.1' },
          ownerFactionId: FACTION_IDS.RED,
        },
      });
    });

    test('multiple candidates require selection and a valid selection executes +20', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(20) }),
      ]);
      const reward = captureMovementReward('red.1');
      const availability = getAvailableRewardActions({ state, reward });
      const result = executeRewardAction({
        state,
        reward,
        action: rewardAction('red.2'),
      });

      expect(availability.status).toBe(REWARD_STATUS.CHOICE_REQUIRED);
      expect(availability.availableActions.map((action) => action.characterId)).toEqual(['red.1', 'red.2']);
      expect(getCharacter(result.state, 'red.1').position).toEqual(createCommonPosition(10));
      expect(getCharacter(result.state, 'red.2').position).toEqual(createCommonPosition(40));
    });

    test('invalid selection is rejected', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createHomePosition() }),
      ]);

      expect(() => executeRewardAction({
        state,
        reward: captureMovementReward('red.1'),
        action: rewardAction('red.2'),
      })).toThrow('Action is not available for this reward.');
    });

    test('captures from reward movements still generate chained capture rewards', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(30) }),
      ]);
      const result = executeRewardAction({
        state,
        reward: captureMovementReward('red.1'),
        action: rewardAction('red.1'),
      });

      expect(getCharacter(result.state, 'blue.1').position).toEqual(createHomePosition());
      expect(result.events.map((event) => event.type)).toEqual([
        EXECUTION_EVENT_TYPES.CHARACTER_MOVED,
        EXECUTION_EVENT_TYPES.CHARACTER_CAPTURED,
      ]);
      expect(deriveRewardsFromEvents({ events: result.events })).toEqual([
        captureMovementReward('red.1', FACTION_IDS.RED),
      ]);
    });

    test('movementReward includes and revalidates the ranger through an intermediate barrier', () => {
      const state = createState([
        createCharacter({
          id: 'green.ranger',
          characterId: 'ranger',
          factionId: FACTION_IDS.GREEN,
          position: createCommonPosition(30),
        }),
        createCharacter({
          id: 'green.druid',
          characterId: 'druid',
          factionId: FACTION_IDS.GREEN,
          position: createCommonPosition(30),
        }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(40) }),
        createCharacter({ id: 'blue.2', factionId: FACTION_IDS.BLUE, position: createCommonPosition(40) }),
      ]);
      const reward = captureMovementReward('green.ranger', FACTION_IDS.GREEN);
      const availability = getAvailableRewardActions({ state, reward });

      expect(availability.availableActions.map((action) => action.characterId)).toEqual([
        'green.ranger',
      ]);

      const result = executeRewardAction({
        state,
        reward,
        action: availability.availableActions[0],
      });

      expect(getCharacter(result.state, 'green.ranger').position).toEqual(createCommonPosition(50));
      expect(getCharacter(result.state, 'blue.1').position).toEqual(createCommonPosition(40));
      expect(getCharacter(result.state, 'blue.2').position).toEqual(createCommonPosition(40));
    });

    test('movementReward lets assassin capture on SAFE and generates the existing +20 reward', () => {
      const state = createState([
        createCharacter({
          id: 'red.assassin',
          characterId: 'assassin',
          factionId: FACTION_IDS.RED,
          position: createCommonPosition(19),
        }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(39) }),
      ]);
      const reward = captureMovementReward('red.assassin', FACTION_IDS.RED);
      const availability = getAvailableRewardActions({ state, reward });

      expect(availability.availableActions[0]).toMatchObject({
        characterId: 'red.assassin',
        movement: {
          legal: true,
          destination: createCommonPosition(39),
          outcome: {
            type: 'capture',
            capturedCharacterId: 'blue.1',
          },
        },
      });

      const result = executeRewardAction({
        state,
        reward,
        action: availability.availableActions[0],
      });

      expect(getCharacter(result.state, 'red.assassin').position).toEqual(createCommonPosition(39));
      expect(getCharacter(result.state, 'blue.1').position).toEqual(createHomePosition());
      expect(result.events).toContainEqual(expect.objectContaining({
        type: EXECUTION_EVENT_TYPES.CHARACTER_CAPTURED,
        characterId: 'red.assassin',
        factionId: FACTION_IDS.RED,
        capturedCharacterId: 'blue.1',
        movementType: MOVEMENT_TYPES.REWARD,
      }));
      expect(deriveRewardsFromEvents({ events: result.events })).toEqual([
        captureMovementReward('red.assassin', FACTION_IDS.RED),
      ]);
    });
  });

  describe('goal +10 availability', () => {
    test('excludes the character that reached GOAL', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      ]);
      const availability = getAvailableRewardActions({ state, reward: goalMovementReward('red.1') });

      expect(availability.availableActions.map((action) => action.characterId)).toEqual(['red.2']);
    });

    test('zero goal +10 candidates is lost', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createHomePosition() }),
      ]);
      const availability = getAvailableRewardActions({ state, reward: goalMovementReward('red.1') });

      expect(availability).toMatchObject({
        status: REWARD_STATUS.LOST,
        availableActions: [],
        reason: REWARD_LOST_REASONS.NO_LEGAL_RECIPIENT,
      });
    });

    test('one goal +10 candidate is available without choice', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      ]);
      const availability = getAvailableRewardActions({ state, reward: goalMovementReward('red.1') });

      expect(availability.status).toBe(REWARD_STATUS.AVAILABLE);
      expect(availability.mustChooseAction).toBe(false);
      expect(availability.availableActions[0]).toMatchObject({
        type: REWARD_ACTION_TYPES.MOVEMENT_REWARD_MOVEMENT,
        characterId: 'red.2',
        steps: 10,
      });
    });

    test('multiple goal +10 candidates require selection', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'red.3', factionId: FACTION_IDS.RED, position: createCommonPosition(20) }),
      ]);
      const availability = getAvailableRewardActions({ state, reward: goalMovementReward('red.1') });

      expect(availability.status).toBe(REWARD_STATUS.CHOICE_REQUIRED);
      expect(availability.mustChooseAction).toBe(true);
      expect(availability.availableActions.map((action) => action.characterId)).toEqual(['red.2', 'red.3']);
    });
  });
});
