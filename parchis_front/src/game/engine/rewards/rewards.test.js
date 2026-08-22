import {
  DESTINATION_FAILURE_REASONS,
  EXECUTION_EVENT_TYPES,
  FACTION_IDS,
  LEGAL_MOVEMENT_FAILURE_REASONS,
  MOVEMENT_FAILURE_REASONS,
  REWARD_ACTION_TYPES,
  REWARD_LOST_REASONS,
  REWARD_STATUS,
  REWARD_TYPES,
  createCommonPosition,
  createFinalLanePosition,
  createGoalPosition,
  createHomePosition,
  deriveRewardsFromEvents,
  executeRewardAction,
  getAvailableRewardActions,
} from '../index';

function createCharacter({ id, factionId, position }) {
  return { id, factionId, position };
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

function captureReward(characterId = 'red.1') {
  return {
    type: REWARD_TYPES.CAPTURE_REWARD,
    characterId,
    steps: 20,
  };
}

function goalReward(sourceCharacterId = 'red.1') {
  return {
    type: REWARD_TYPES.GOAL_REWARD,
    sourceCharacterId,
    steps: 10,
  };
}

function captureRewardAction(characterId = 'red.1', movement = undefined) {
  return {
    type: REWARD_ACTION_TYPES.CAPTURE_REWARD_MOVEMENT,
    characterId,
    steps: 20,
    movement,
  };
}

function goalRewardAction(characterId = 'red.2', movement = undefined) {
  return {
    type: REWARD_ACTION_TYPES.GOAL_REWARD_MOVEMENT,
    characterId,
    steps: 10,
    movement,
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

describe('reward primitives', () => {
  describe('deriveRewardsFromEvents', () => {
    test('detects captureReward from characterCaptured', () => {
      expect(deriveRewardsFromEvents({
        events: [
          {
            type: EXECUTION_EVENT_TYPES.CHARACTER_CAPTURED,
            characterId: 'red.1',
            capturedCharacterId: 'blue.1',
          },
        ],
      })).toEqual([captureReward('red.1')]);
    });

    test('detects goalReward from characterReachedGoal', () => {
      expect(deriveRewardsFromEvents({
        events: [
          {
            type: EXECUTION_EVENT_TYPES.CHARACTER_REACHED_GOAL,
            characterId: 'red.1',
          },
        ],
      })).toEqual([goalReward('red.1')]);
    });

    test('does not treat characterRemovedFromStart as a capture reward', () => {
      expect(deriveRewardsFromEvents({
        events: [
          {
            type: EXECUTION_EVENT_TYPES.CHARACTER_REMOVED_FROM_START,
            characterId: 'blue.1',
            removedByCharacterId: 'red.1',
            position: createCommonPosition(39),
          },
        ],
      })).toEqual([]);
    });

    test('preserves reward order and ignores non-generating events', () => {
      expect(deriveRewardsFromEvents({
        events: [
          { type: EXECUTION_EVENT_TYPES.CHARACTER_MOVED, characterId: 'red.1' },
          { type: EXECUTION_EVENT_TYPES.CHARACTER_REACHED_GOAL, characterId: 'red.2' },
          { type: EXECUTION_EVENT_TYPES.CHARACTER_CAPTURED, characterId: 'blue.1' },
        ],
      })).toEqual([
        goalReward('red.2'),
        captureReward('blue.1'),
      ]);
    });

    test('does not mutate events', () => {
      const events = [
        {
          type: EXECUTION_EVENT_TYPES.CHARACTER_CAPTURED,
          characterId: 'red.1',
          capturedCharacterId: 'blue.1',
        },
      ];
      const before = JSON.parse(JSON.stringify(events));

      deepFreeze(events);
      deriveRewardsFromEvents({ events });

      expect(events).toEqual(before);
    });

    test.each([null, undefined])('rejects invalid event entries: %s', (event) => {
      expect(() => deriveRewardsFromEvents({ events: [event] })).toThrow('event must be an object.');
    });

    test.each([
      [{ type: EXECUTION_EVENT_TYPES.CHARACTER_CAPTURED }, 'characterCaptured event requires characterId.'],
      [
        { type: EXECUTION_EVENT_TYPES.CHARACTER_CAPTURED, characterId: '' },
        'characterCaptured event requires characterId.',
      ],
      [{ type: EXECUTION_EVENT_TYPES.CHARACTER_REACHED_GOAL }, 'characterReachedGoal event requires characterId.'],
      [
        { type: EXECUTION_EVENT_TYPES.CHARACTER_REACHED_GOAL, characterId: '' },
        'characterReachedGoal event requires characterId.',
      ],
    ])('rejects malformed generating event %#', (event, message) => {
      expect(() => deriveRewardsFromEvents({ events: [event] })).toThrow(message);
    });
  });

  describe('captureReward availability and execution', () => {
    test.each([10, 21, undefined])('rejects captureReward with invalid steps: %s', (steps) => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      ]);
      const reward = {
        type: REWARD_TYPES.CAPTURE_REWARD,
        characterId: 'red.1',
        steps,
      };

      expect(() => getAvailableRewardActions({ state, reward })).toThrow(
        'captureReward.steps must be exactly 20.',
      );
      expect(() => executeRewardAction({
        state,
        reward,
        action: captureRewardAction('red.1'),
      })).toThrow('captureReward.steps must be exactly 20.');
    });

    test('belongs exclusively to the capturing character and offers exactly a 20-step action', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(20) }),
      ]);
      const availability = getAvailableRewardActions({ state, reward: captureReward('red.1') });

      expect(availability.status).toBe(REWARD_STATUS.AVAILABLE);
      expect(availability.mustChooseAction).toBe(false);
      expect(availability.availableActions).toHaveLength(1);
      expect(availability.availableActions[0]).toMatchObject({
        type: REWARD_ACTION_TYPES.CAPTURE_REWARD_MOVEMENT,
        characterId: 'red.1',
        steps: 20,
      });
    });

    test('executes a legal captureReward movement of exactly 20', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      ]);
      const result = executeRewardAction({
        state,
        reward: captureReward('red.1'),
        action: captureRewardAction('red.1'),
      });

      expect(getCharacter(result.state, 'red.1').position).toEqual(createCommonPosition(30));
      expect(result.events).toEqual([
        {
          type: EXECUTION_EVENT_TYPES.CHARACTER_MOVED,
          characterId: 'red.1',
          from: createCommonPosition(10),
          to: createCommonPosition(30),
          steps: 20,
          actionType: REWARD_TYPES.CAPTURE_REWARD,
        },
      ]);
    });

    test('respects barriers and loses the reward when blocked', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(15) }),
        createCharacter({ id: 'blue.2', factionId: FACTION_IDS.BLUE, position: createCommonPosition(15) }),
      ]);
      const availability = getAvailableRewardActions({ state, reward: captureReward('red.1') });

      expect(availability).toMatchObject({
        status: REWARD_STATUS.LOST,
        mustChooseAction: false,
        availableActions: [],
        reason: LEGAL_MOVEMENT_FAILURE_REASONS.BARRIER,
      });
    });

    test('loses captureReward when the capturing character is currently at HOME', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createHomePosition() }),
      ]);
      const availability = getAvailableRewardActions({ state, reward: captureReward('red.1') });
      const result = executeRewardAction({
        state,
        reward: captureReward('red.1'),
        action: captureRewardAction('red.1'),
      });

      expect(availability).toMatchObject({
        status: REWARD_STATUS.LOST,
        availableActions: [],
        reason: LEGAL_MOVEMENT_FAILURE_REASONS.CHARACTER_AT_HOME,
      });
      expect(result.state).toBe(state);
      expect(result.events).toEqual([
        {
          type: EXECUTION_EVENT_TYPES.REWARD_LOST,
          rewardType: REWARD_TYPES.CAPTURE_REWARD,
          characterId: 'red.1',
          steps: 20,
          reason: LEGAL_MOVEMENT_FAILURE_REASONS.CHARACTER_AT_HOME,
        },
      ]);
    });

    test('loses captureReward when the capturing character is currently at GOAL', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
      ]);
      const availability = getAvailableRewardActions({ state, reward: captureReward('red.1') });
      const result = executeRewardAction({
        state,
        reward: captureReward('red.1'),
        action: captureRewardAction('red.1'),
      });

      expect(availability).toMatchObject({
        status: REWARD_STATUS.LOST,
        availableActions: [],
        reason: LEGAL_MOVEMENT_FAILURE_REASONS.CHARACTER_AT_GOAL,
      });
      expect(result.state).toBe(state);
      expect(result.events).toEqual([
        {
          type: EXECUTION_EVENT_TYPES.REWARD_LOST,
          rewardType: REWARD_TYPES.CAPTURE_REWARD,
          characterId: 'red.1',
          steps: 20,
          reason: LEGAL_MOVEMENT_FAILURE_REASONS.CHARACTER_AT_GOAL,
        },
      ]);
    });

    test('respects full destination occupancy', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(9) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(29) }),
        createCharacter({ id: 'green.1', factionId: FACTION_IDS.GREEN, position: createCommonPosition(29) }),
      ]);
      const availability = getAvailableRewardActions({ state, reward: captureReward('red.1') });

      expect(availability).toMatchObject({
        status: REWARD_STATUS.LOST,
        availableActions: [],
        reason: DESTINATION_FAILURE_REASONS.DESTINATION_FULL,
      });
    });

    test('respects legal bounce for captureReward', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(27) }),
      ]);
      const result = executeRewardAction({
        state,
        reward: captureReward('red.1'),
        action: captureRewardAction('red.1'),
      });

      expect(getCharacter(result.state, 'red.1').position).toEqual(
        createFinalLanePosition(FACTION_IDS.RED, 7),
      );
    });

    test('loses incompletable captureReward without partial movement', () => {
      const state = createState([
        createCharacter({
          id: 'red.1',
          factionId: FACTION_IDS.RED,
          position: createFinalLanePosition(FACTION_IDS.RED, 1),
        }),
      ]);
      const before = JSON.parse(JSON.stringify(state));
      const result = executeRewardAction({
        state,
        reward: captureReward('red.1'),
        action: captureRewardAction('red.1'),
      });

      expect(result.state).toBe(state);
      expect(state).toEqual(before);
      expect(result.events).toEqual([
        {
          type: EXECUTION_EVENT_TYPES.REWARD_LOST,
          rewardType: REWARD_TYPES.CAPTURE_REWARD,
          characterId: 'red.1',
          steps: 20,
          reason: MOVEMENT_FAILURE_REASONS.MOVEMENT_BEYOND_FINAL_LANE_START,
        },
      ]);
    });

    test('rejects transfer of captureReward to another character', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(20) }),
      ]);

      expect(() => executeRewardAction({
        state,
        reward: captureReward('red.1'),
        action: captureRewardAction('red.2'),
      })).toThrow('captureReward must be executed by the capturing character.');
    });

    test('does not use stale movement snapshots for captureReward execution', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      ]);
      const result = executeRewardAction({
        state,
        reward: captureReward('red.1'),
        action: captureRewardAction('red.1', {
          legal: true,
          destination: createCommonPosition(99),
          outcome: { type: 'empty' },
        }),
      });

      expect(getCharacter(result.state, 'red.1').position).toEqual(createCommonPosition(30));
    });

    test('captureReward that captures emits characterCaptured but does not execute another reward', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(30) }),
      ]);
      const result = executeRewardAction({
        state,
        reward: captureReward('red.1'),
        action: captureRewardAction('red.1'),
      });

      expect(getCharacter(result.state, 'blue.1').position).toEqual(createHomePosition());
      expect(result.events.map((event) => event.type)).toEqual([
        EXECUTION_EVENT_TYPES.CHARACTER_MOVED,
        EXECUTION_EVENT_TYPES.CHARACTER_CAPTURED,
      ]);
    });

    test('captureReward that reaches GOAL emits characterReachedGoal but does not execute +10', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(26) }),
      ]);
      const result = executeRewardAction({
        state,
        reward: captureReward('red.1'),
        action: captureRewardAction('red.1'),
      });

      expect(getCharacter(result.state, 'red.1').position).toEqual(createGoalPosition());
      expect(result.events.map((event) => event.type)).toEqual([
        EXECUTION_EVENT_TYPES.CHARACTER_MOVED,
        EXECUTION_EVENT_TYPES.CHARACTER_REACHED_GOAL,
      ]);
    });
  });

  describe('goalReward availability and execution', () => {
    test.each([20, undefined])('rejects goalReward with invalid steps: %s', (steps) => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      ]);
      const reward = {
        type: REWARD_TYPES.GOAL_REWARD,
        sourceCharacterId: 'red.1',
        steps,
      };

      expect(() => getAvailableRewardActions({ state, reward })).toThrow(
        'goalReward.steps must be exactly 10.',
      );
      expect(() => executeRewardAction({
        state,
        reward,
        action: goalRewardAction('red.2'),
      })).toThrow('goalReward.steps must be exactly 10.');
    });

    test('rejects goalReward when sourceCharacterId is no longer at GOAL', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(20) }),
      ]);
      const before = JSON.parse(JSON.stringify(state));

      expect(() => getAvailableRewardActions({ state, reward: goalReward('red.1') })).toThrow(
        'goalReward.sourceCharacterId must currently be at GOAL.',
      );
      expect(() => executeRewardAction({
        state,
        reward: goalReward('red.1'),
        action: goalRewardAction('red.2'),
      })).toThrow('goalReward.sourceCharacterId must currently be at GOAL.');
      expect(state).toEqual(before);
    });

    test('excludes source, HOME, GOAL, and illegal candidates', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createHomePosition() }),
        createCharacter({ id: 'red.3', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
        createCharacter({ id: 'red.4', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(15) }),
        createCharacter({ id: 'blue.2', factionId: FACTION_IDS.BLUE, position: createCommonPosition(15) }),
      ]);
      const availability = getAvailableRewardActions({ state, reward: goalReward('red.1') });

      expect(availability).toMatchObject({
        status: REWARD_STATUS.LOST,
        mustChooseAction: false,
        availableActions: [],
        reason: REWARD_LOST_REASONS.NO_LEGAL_RECIPIENT,
      });
    });

    test('returns choiceRequired for multiple legal goalReward recipients', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'red.3', factionId: FACTION_IDS.RED, position: createCommonPosition(20) }),
      ]);
      const availability = getAvailableRewardActions({ state, reward: goalReward('red.1') });

      expect(availability.status).toBe(REWARD_STATUS.CHOICE_REQUIRED);
      expect(availability.mustChooseAction).toBe(true);
      expect(availability.availableActions.map((action) => action.characterId)).toEqual(['red.2', 'red.3']);
    });

    test('returns available without choice for a single legal goalReward recipient', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      ]);
      const availability = getAvailableRewardActions({ state, reward: goalReward('red.1') });

      expect(availability.status).toBe(REWARD_STATUS.AVAILABLE);
      expect(availability.mustChooseAction).toBe(false);
      expect(availability.availableActions).toHaveLength(1);
      expect(availability.availableActions[0]).toMatchObject({
        type: REWARD_ACTION_TYPES.GOAL_REWARD_MOVEMENT,
        characterId: 'red.2',
        steps: 10,
      });
    });

    test('returns lost when there are no legal goalReward recipients', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createHomePosition() }),
      ]);
      const availability = getAvailableRewardActions({ state, reward: goalReward('red.1') });

      expect(availability).toMatchObject({
        status: REWARD_STATUS.LOST,
        mustChooseAction: false,
        availableActions: [],
        reason: REWARD_LOST_REASONS.NO_LEGAL_RECIPIENT,
      });
    });

    test('rejects stale goalReward choice when selected character is no longer a candidate', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createHomePosition() }),
        createCharacter({ id: 'red.3', factionId: FACTION_IDS.RED, position: createCommonPosition(20) }),
      ]);

      expect(() => executeRewardAction({
        state,
        reward: goalReward('red.1'),
        action: goalRewardAction('red.2'),
      })).toThrow('Action is not available for this reward.');
    });

    test('rejects stale goalReward choice when selected character moved to GOAL', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
        createCharacter({ id: 'red.3', factionId: FACTION_IDS.RED, position: createCommonPosition(20) }),
      ]);

      expect(() => executeRewardAction({
        state,
        reward: goalReward('red.1'),
        action: goalRewardAction('red.2'),
      })).toThrow('Action is not available for this reward.');
    });

    test('loses goalReward when a new barrier invalidates the only recipient', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(15) }),
        createCharacter({ id: 'blue.2', factionId: FACTION_IDS.BLUE, position: createCommonPosition(15) }),
      ]);
      const result = executeRewardAction({
        state,
        reward: goalReward('red.1'),
        action: goalRewardAction('red.2'),
      });

      expect(result.state).toBe(state);
      expect(result.events).toEqual([
        {
          type: EXECUTION_EVENT_TYPES.REWARD_LOST,
          rewardType: REWARD_TYPES.GOAL_REWARD,
          characterId: 'red.1',
          steps: 10,
          reason: REWARD_LOST_REASONS.NO_LEGAL_RECIPIENT,
        },
      ]);
    });

    test('goalReward rewardLost characterId documents the sourceCharacterId, not the stale recipient', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createHomePosition() }),
      ]);
      const result = executeRewardAction({
        state,
        reward: goalReward('red.1'),
        action: goalRewardAction('red.2'),
      });

      expect(result.events).toEqual([
        {
          type: EXECUTION_EVENT_TYPES.REWARD_LOST,
          rewardType: REWARD_TYPES.GOAL_REWARD,
          characterId: 'red.1',
          steps: 10,
          reason: REWARD_LOST_REASONS.NO_LEGAL_RECIPIENT,
        },
      ]);
    });

    test('does not use stale movement snapshots for goalReward execution', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      ]);
      const result = executeRewardAction({
        state,
        reward: goalReward('red.1'),
        action: goalRewardAction('red.2', {
          legal: true,
          destination: createCommonPosition(99),
          outcome: { type: 'empty' },
        }),
      });

      expect(getCharacter(result.state, 'red.2').position).toEqual(createCommonPosition(20));
    });

    test('goalReward that captures emits characterCaptured but does not execute +20', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(20) }),
      ]);
      const result = executeRewardAction({
        state,
        reward: goalReward('red.1'),
        action: goalRewardAction('red.2'),
      });

      expect(getCharacter(result.state, 'blue.1').position).toEqual(createHomePosition());
      expect(result.events.map((event) => event.type)).toEqual([
        EXECUTION_EVENT_TYPES.CHARACTER_MOVED,
        EXECUTION_EVENT_TYPES.CHARACTER_CAPTURED,
      ]);
    });

    test('goalReward that reaches GOAL emits characterReachedGoal', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(36) }),
      ]);
      const result = executeRewardAction({
        state,
        reward: goalReward('red.1'),
        action: goalRewardAction('red.2'),
      });

      expect(getCharacter(result.state, 'red.2').position).toEqual(createGoalPosition());
      expect(result.events.map((event) => event.type)).toEqual([
        EXECUTION_EVENT_TYPES.CHARACTER_MOVED,
        EXECUTION_EVENT_TYPES.CHARACTER_REACHED_GOAL,
      ]);
    });

    test('goalReward can complete a legal bounce without treating intermediate GOAL as reached', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
        createCharacter({
          id: 'red.2',
          factionId: FACTION_IDS.RED,
          position: createFinalLanePosition(FACTION_IDS.RED, 5),
        }),
      ]);
      const availability = getAvailableRewardActions({ state, reward: goalReward('red.1') });
      const result = executeRewardAction({
        state,
        reward: goalReward('red.1'),
        action: goalRewardAction('red.2'),
      });

      expect(availability.availableActions.map((action) => action.characterId)).toEqual(['red.2']);
      expect(getCharacter(result.state, 'red.2').position).toEqual(
        createFinalLanePosition(FACTION_IDS.RED, 1),
      );
      expect(result.events).toEqual([
        {
          type: EXECUTION_EVENT_TYPES.CHARACTER_MOVED,
          characterId: 'red.2',
          from: createFinalLanePosition(FACTION_IDS.RED, 5),
          to: createFinalLanePosition(FACTION_IDS.RED, 1),
          steps: 10,
          actionType: REWARD_TYPES.GOAL_REWARD,
        },
      ]);
    });
  });

  describe('composition without automatic chain resolver', () => {
    test('explicitly derives a new captureReward after a +20 capture', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(30) }),
      ]);
      const result = executeRewardAction({
        state,
        reward: captureReward('red.1'),
        action: captureRewardAction('red.1'),
      });

      expect(deriveRewardsFromEvents({ events: result.events })).toEqual([captureReward('red.1')]);
    });

    test('explicitly derives captureReward after a +10 capture', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(20) }),
      ]);
      const result = executeRewardAction({
        state,
        reward: goalReward('red.1'),
        action: goalRewardAction('red.2'),
      });

      expect(deriveRewardsFromEvents({ events: result.events })).toEqual([captureReward('red.2')]);
    });

    test('explicitly derives goalReward after a +20 reaches GOAL', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(26) }),
      ]);
      const result = executeRewardAction({
        state,
        reward: captureReward('red.1'),
        action: captureRewardAction('red.1'),
      });

      expect(deriveRewardsFromEvents({ events: result.events })).toEqual([goalReward('red.1')]);
    });
  });

  describe('immutability and snapshot safety', () => {
    test('does not mutate reward or action', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      ]);
      const reward = captureReward('red.1');
      const action = captureRewardAction('red.1', { destination: createCommonPosition(99) });
      const rewardBefore = JSON.parse(JSON.stringify(reward));
      const actionBefore = JSON.parse(JSON.stringify(action));

      executeRewardAction({ state, reward, action });

      expect(reward).toEqual(rewardBefore);
      expect(action).toEqual(actionBefore);
    });

    test('does not let returned availability mutations affect later availability calls', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      ]);
      const reward = captureReward('red.1');
      const availability = getAvailableRewardActions({ state, reward });

      availability.reward.characterId = 'changed';
      availability.availableActions[0].movement.destination.square = 99;

      const nextAvailability = getAvailableRewardActions({ state, reward });

      expect(nextAvailability.reward).toEqual(reward);
      expect(nextAvailability.availableActions[0].movement.destination).toEqual(createCommonPosition(30));
    });

    test('uses structural sharing when reward movement changes one player', () => {
      const state = createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
        createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(20) }),
        createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(31) }),
      ]);
      const redPlayer = state.players.find((player) => player.factionId === FACTION_IDS.RED);
      const bluePlayer = state.players.find((player) => player.factionId === FACTION_IDS.BLUE);
      const redTwo = getCharacter(state, 'red.2');
      const result = executeRewardAction({
        state,
        reward: captureReward('red.1'),
        action: captureRewardAction('red.1'),
      });
      const nextRedPlayer = result.state.players.find((player) => player.factionId === FACTION_IDS.RED);
      const nextBluePlayer = result.state.players.find((player) => player.factionId === FACTION_IDS.BLUE);

      expect(result.state).not.toBe(state);
      expect(result.state.players).not.toBe(state.players);
      expect(nextRedPlayer).not.toBe(redPlayer);
      expect(nextBluePlayer).toBe(bluePlayer);
      expect(getCharacter(result.state, 'red.2')).toBe(redTwo);
    });
  });
});
