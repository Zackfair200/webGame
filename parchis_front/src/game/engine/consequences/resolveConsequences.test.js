import {
  CONSEQUENCE_RESOLUTION_STATUS,
  EXECUTION_EVENT_TYPES,
  FACTION_IDS,
  LEGAL_MOVEMENT_FAILURE_REASONS,
  REWARD_ACTION_TYPES,
  REWARD_LOST_REASONS,
  REWARD_TYPES,
  createCommonPosition,
  createFinalLanePosition,
  createGoalPosition,
  createHomePosition,
  executeRewardAction,
  resolveConsequences,
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

function characterMoved(characterId = 'red.1') {
  return { type: EXECUTION_EVENT_TYPES.CHARACTER_MOVED, characterId };
}

function characterCaptured(characterId = 'red.1', capturedCharacterId = 'blue.1') {
  return {
    type: EXECUTION_EVENT_TYPES.CHARACTER_CAPTURED,
    characterId,
    capturedCharacterId,
  };
}

function characterReachedGoal(characterId = 'red.goal') {
  return { type: EXECUTION_EVENT_TYPES.CHARACTER_REACHED_GOAL, characterId };
}

function captureReward(characterId = 'red.1') {
  return { type: REWARD_TYPES.CAPTURE_REWARD, characterId, steps: 20 };
}

function goalReward(sourceCharacterId = 'red.goal') {
  return { type: REWARD_TYPES.GOAL_REWARD, sourceCharacterId, steps: 10 };
}

function goalRewardAction(characterId = 'red.2') {
  return { type: REWARD_ACTION_TYPES.GOAL_REWARD_MOVEMENT, characterId, steps: 10 };
}

function getMovedCharacterIds(events) {
  return events
    .filter((event) => event.type === EXECUTION_EVENT_TYPES.CHARACTER_MOVED)
    .map((event) => event.characterId);
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }

  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}

describe('resolveConsequences', () => {
  test('resolves with no rewards without replacing state', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
    ]);
    const events = [characterMoved('red.1')];
    const result = resolveConsequences({ state, events });

    expect(result).toEqual({
      status: CONSEQUENCE_RESOLUTION_STATUS.RESOLVED,
      state,
      events,
      generatedEvents: [],
    });
    expect(result.state).toBe(state);
    expect(result.events).not.toBe(events);
  });

  test('resolves capture to automatic +20 empty movement', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
    ]);
    const result = resolveConsequences({ state, events: [characterMoved(), characterCaptured()] });

    expect(result.status).toBe(CONSEQUENCE_RESOLUTION_STATUS.RESOLVED);
    expect(getCharacter(result.state, 'red.1').position).toEqual(createCommonPosition(30));
    expect(result.generatedEvents).toEqual([
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

  test('resolves capture to +20 capture to another +20', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(30) }),
    ]);
    const result = resolveConsequences({ state, events: [characterCaptured('red.1', 'blue.0')] });

    expect(getCharacter(result.state, 'red.1').position).toEqual(
      createFinalLanePosition(FACTION_IDS.RED, 4),
    );
    expect(getCharacter(result.state, 'blue.1').position).toEqual(createHomePosition());
    expect(result.generatedEvents.map((event) => event.type)).toEqual([
      EXECUTION_EVENT_TYPES.CHARACTER_MOVED,
      EXECUTION_EVENT_TYPES.CHARACTER_CAPTURED,
      EXECUTION_EVENT_TYPES.CHARACTER_MOVED,
    ]);
  });

  test('resolves capture to +20 reaching GOAL and automatic +10', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(26) }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
    ]);
    const result = resolveConsequences({ state, events: [characterCaptured('red.1', 'blue.0')] });

    expect(getCharacter(result.state, 'red.1').position).toEqual(createGoalPosition());
    expect(getCharacter(result.state, 'red.2').position).toEqual(createCommonPosition(20));
    expect(result.generatedEvents.map((event) => event.type)).toEqual([
      EXECUTION_EVENT_TYPES.CHARACTER_MOVED,
      EXECUTION_EVENT_TYPES.CHARACTER_REACHED_GOAL,
      EXECUTION_EVENT_TYPES.CHARACTER_MOVED,
    ]);
  });

  test('resolves META to automatic +10 with a single recipient', () => {
    const state = createState([
      createCharacter({ id: 'red.goal', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
    ]);
    const result = resolveConsequences({ state, events: [characterReachedGoal('red.goal')] });

    expect(result.status).toBe(CONSEQUENCE_RESOLUTION_STATUS.RESOLVED);
    expect(getCharacter(result.state, 'red.2').position).toEqual(createCommonPosition(20));
    expect(result.generatedEvents[0].actionType).toBe(REWARD_TYPES.GOAL_REWARD);
  });

  test('stops at choiceRequired for META +10 with multiple recipients', () => {
    const state = createState([
      createCharacter({ id: 'red.goal', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'red.3', factionId: FACTION_IDS.RED, position: createCommonPosition(20) }),
    ]);
    const result = resolveConsequences({ state, events: [characterReachedGoal('red.goal')] });

    expect(result.status).toBe(CONSEQUENCE_RESOLUTION_STATUS.CHOICE_REQUIRED);
    expect(result.state).toBe(state);
    expect(result.pendingReward).toEqual(goalReward('red.goal'));
    expect(result.availableActions.map((action) => action.characterId)).toEqual(['red.2', 'red.3']);
    expect(result.generatedEvents).toEqual([]);
  });

  test('materializes rewardLost for a lost reward', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createHomePosition() }),
    ]);
    const result = resolveConsequences({ state, events: [characterCaptured('red.1', 'blue.0')] });

    expect(result.state).toBe(state);
    expect(result.generatedEvents).toEqual([
      {
        type: EXECUTION_EVENT_TYPES.REWARD_LOST,
        rewardType: REWARD_TYPES.CAPTURE_REWARD,
        characterId: 'red.1',
        steps: 20,
        reason: LEGAL_MOVEMENT_FAILURE_REASONS.CHARACTER_AT_HOME,
      },
    ]);
  });

  test('continues after a lost reward to another pending reward', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createHomePosition() }),
      createCharacter({ id: 'red.goal', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
    ]);
    const result = resolveConsequences({
      state,
      events: [characterCaptured('red.1', 'blue.0'), characterReachedGoal('red.goal')],
    });

    expect(result.generatedEvents.map((event) => event.type)).toEqual([
      EXECUTION_EVENT_TYPES.REWARD_LOST,
      EXECUTION_EVENT_TYPES.CHARACTER_MOVED,
    ]);
    expect(getCharacter(result.state, 'red.2').position).toEqual(createCommonPosition(20));
  });

  test('processes multiple initial rewards in order', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'blue.goal', factionId: FACTION_IDS.BLUE, position: createGoalPosition() }),
      createCharacter({ id: 'blue.2', factionId: FACTION_IDS.BLUE, position: createCommonPosition(40) }),
    ]);
    const result = resolveConsequences({
      state,
      events: [characterCaptured('red.1', 'x'), characterReachedGoal('blue.goal')],
    });

    expect(getMovedCharacterIds(result.generatedEvents)).toEqual(['red.1', 'blue.2']);
  });

  test('processes newly generated reward before sister pending reward', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'blue.victim', factionId: FACTION_IDS.BLUE, position: createCommonPosition(30) }),
      createCharacter({ id: 'blue.goal', factionId: FACTION_IDS.BLUE, position: createGoalPosition() }),
      createCharacter({ id: 'blue.2', factionId: FACTION_IDS.BLUE, position: createCommonPosition(40) }),
    ]);
    const result = resolveConsequences({
      state,
      events: [characterCaptured('red.1', 'x'), characterReachedGoal('blue.goal')],
    });

    expect(getMovedCharacterIds(result.generatedEvents)).toEqual(['red.1', 'red.1', 'blue.2']);
  });

  test('resolves deep generated rewards before sister pending reward', () => {
    const state = createState([
      createCharacter({ id: 'yellow.1', factionId: FACTION_IDS.YELLOW, position: createCommonPosition(10) }),
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(30) }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(50) }),
      createCharacter({ id: 'blue.goal', factionId: FACTION_IDS.BLUE, position: createGoalPosition() }),
      createCharacter({ id: 'blue.2', factionId: FACTION_IDS.BLUE, position: createCommonPosition(40) }),
    ]);
    const result = resolveConsequences({
      state,
      events: [characterCaptured('yellow.1', 'x'), characterReachedGoal('blue.goal')],
    });

    expect(getMovedCharacterIds(result.generatedEvents)).toEqual([
      'yellow.1',
      'yellow.1',
      'yellow.1',
      'blue.2',
    ]);
  });

  test('keeps exact generatedEvents order', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(30) }),
    ]);
    const result = resolveConsequences({ state, events: [characterCaptured('red.1', 'x')] });

    expect(result.generatedEvents.map((event) => event.type)).toEqual([
      EXECUTION_EVENT_TYPES.CHARACTER_MOVED,
      EXECUTION_EVENT_TYPES.CHARACTER_CAPTURED,
      EXECUTION_EVENT_TYPES.CHARACTER_MOVED,
    ]);
  });

  test('choiceRequired returns remainingRewards without pendingReward', () => {
    const state = createState([
      createCharacter({ id: 'red.goal', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'red.3', factionId: FACTION_IDS.RED, position: createCommonPosition(20) }),
      createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(30) }),
    ]);
    const remainingRewards = [captureReward('blue.1')];
    const result = resolveConsequences({
      state,
      events: [characterReachedGoal('red.goal')],
      remainingRewards,
    });

    expect(result.status).toBe(CONSEQUENCE_RESOLUTION_STATUS.CHOICE_REQUIRED);
    expect(result.pendingReward).toEqual(goalReward('red.goal'));
    expect(result.remainingRewards).toEqual(remainingRewards);
    expect(result.remainingRewards).not.toContainEqual(result.pendingReward);
  });

  test('restarts after choice and preserves pending rewards', () => {
    const state = createState([
      createCharacter({ id: 'red.goal', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'red.3', factionId: FACTION_IDS.RED, position: createCommonPosition(20) }),
      createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(30) }),
    ]);
    const first = resolveConsequences({
      state,
      events: [characterReachedGoal('red.goal')],
      remainingRewards: [captureReward('blue.1')],
    });
    const chosen = executeRewardAction({
      state: first.state,
      reward: first.pendingReward,
      action: goalRewardAction('red.2'),
    });
    const resumed = resolveConsequences({
      state: chosen.state,
      events: chosen.events,
      remainingRewards: first.remainingRewards,
    });

    expect(resumed.status).toBe(CONSEQUENCE_RESOLUTION_STATUS.RESOLVED);
    expect(getMovedCharacterIds(resumed.generatedEvents)).toEqual(['blue.1']);
  });

  test('consequences of chosen reward are processed before remainingRewards', () => {
    const state = createState([
      createCharacter({ id: 'red.goal', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'red.3', factionId: FACTION_IDS.RED, position: createCommonPosition(30) }),
      createCharacter({ id: 'green.1', factionId: FACTION_IDS.GREEN, position: createCommonPosition(20) }),
      createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(40) }),
    ]);
    const first = resolveConsequences({
      state,
      events: [characterReachedGoal('red.goal')],
      remainingRewards: [captureReward('blue.1')],
    });
    const chosen = executeRewardAction({
      state: first.state,
      reward: first.pendingReward,
      action: goalRewardAction('red.2'),
    });
    const resumed = resolveConsequences({
      state: chosen.state,
      events: chosen.events,
      remainingRewards: first.remainingRewards,
    });

    expect(getMovedCharacterIds(resumed.generatedEvents)).toEqual(['red.2', 'blue.1']);
  });

  test('stale choice is revalidated by executeRewardAction before resuming', () => {
    const state = createState([
      createCharacter({ id: 'red.goal', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createHomePosition() }),
    ]);
    const result = executeRewardAction({
      state,
      reward: goalReward('red.goal'),
      action: goalRewardAction('red.2'),
    });

    expect(result.state).toBe(state);
    expect(result.events).toEqual([
      {
        type: EXECUTION_EVENT_TYPES.REWARD_LOST,
        rewardType: REWARD_TYPES.GOAL_REWARD,
        characterId: 'red.goal',
        steps: 10,
        reason: REWARD_LOST_REASONS.NO_LEGAL_RECIPIENT,
      },
    ]);
  });

  test('does not process the same event twice within one resolution', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
    ]);
    const result = resolveConsequences({ state, events: [characterCaptured('red.1', 'x')] });

    expect(getMovedCharacterIds(result.generatedEvents)).toEqual(['red.1']);
    expect(result.events.filter((event) => event.type === EXECUTION_EVENT_TYPES.CHARACTER_CAPTURED)).toHaveLength(1);
  });

  test('does not mutate input events or remainingRewards', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(10) }),
    ]);
    const events = [characterCaptured('red.1', 'x')];
    const remainingRewards = [captureReward('blue.1')];
    const eventsBefore = JSON.parse(JSON.stringify(events));
    const rewardsBefore = JSON.parse(JSON.stringify(remainingRewards));

    deepFreeze(events);
    deepFreeze(remainingRewards);
    resolveConsequences({ state, events, remainingRewards });

    expect(events).toEqual(eventsBefore);
    expect(remainingRewards).toEqual(rewardsBefore);
  });

  test('returned choice snapshots are defensive arrays', () => {
    const state = createState([
      createCharacter({ id: 'red.goal', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'red.3', factionId: FACTION_IDS.RED, position: createCommonPosition(20) }),
    ]);
    const result = resolveConsequences({ state, events: [characterReachedGoal('red.goal')] });

    result.availableActions[0].characterId = 'changed';
    result.remainingRewards.push(captureReward('red.2'));

    const next = resolveConsequences({ state, events: [characterReachedGoal('red.goal')] });

    expect(next.availableActions.map((action) => action.characterId)).toEqual(['red.2', 'red.3']);
    expect(next.remainingRewards).toEqual([]);
  });

  test('returned pendingReward is defensive', () => {
    const state = createState([
      createCharacter({ id: 'red.goal', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'red.3', factionId: FACTION_IDS.RED, position: createCommonPosition(20) }),
    ]);
    const events = [characterReachedGoal('red.goal')];
    const remainingRewards = [captureReward('blue.1')];
    const result = resolveConsequences({ state, events, remainingRewards });

    result.pendingReward.sourceCharacterId = 'changed';

    expect(events).toEqual([characterReachedGoal('red.goal')]);
    expect(remainingRewards).toEqual([captureReward('blue.1')]);
    expect(result.remainingRewards).toEqual([captureReward('blue.1')]);

    const next = resolveConsequences({ state, events, remainingRewards });

    expect(next.pendingReward).toEqual(goalReward('red.goal'));
  });

  test('returned events and generatedEvents are independent snapshots', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
    ]);
    const events = [characterCaptured('red.1', 'x')];
    const result = resolveConsequences({ state, events });

    result.events[1].characterId = 'changed-in-events';

    expect(result.generatedEvents[0].characterId).toBe('red.1');
    expect(events).toEqual([characterCaptured('red.1', 'x')]);

    result.generatedEvents[0].characterId = 'changed-in-generated';

    expect(result.events[1].characterId).toBe('changed-in-events');
    expect(events).toEqual([characterCaptured('red.1', 'x')]);

    const next = resolveConsequences({ state, events });

    expect(next.events[1].characterId).toBe('red.1');
    expect(next.generatedEvents[0].characterId).toBe('red.1');
  });

  test('preserves structural sharing from reward execution', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(20) }),
      createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(31) }),
    ]);
    const redPlayer = state.players.find((player) => player.factionId === FACTION_IDS.RED);
    const bluePlayer = state.players.find((player) => player.factionId === FACTION_IDS.BLUE);
    const redTwo = getCharacter(state, 'red.2');
    const result = resolveConsequences({ state, events: [characterCaptured('red.1', 'x')] });
    const nextRedPlayer = result.state.players.find((player) => player.factionId === FACTION_IDS.RED);
    const nextBluePlayer = result.state.players.find((player) => player.factionId === FACTION_IDS.BLUE);

    expect(nextRedPlayer).not.toBe(redPlayer);
    expect(nextBluePlayer).toBe(bluePlayer);
    expect(getCharacter(result.state, 'red.2')).toBe(redTwo);
  });

  test('resolves a reasonably long valid capture reward chain', () => {
    const state = createState([
      createCharacter({ id: 'yellow.1', factionId: FACTION_IDS.YELLOW, position: createCommonPosition(10) }),
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(30) }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(50) }),
      createCharacter({ id: 'red.3', factionId: FACTION_IDS.RED, position: createCommonPosition(2) }),
    ]);
    const result = resolveConsequences({ state, events: [characterCaptured('yellow.1', 'x')] });

    expect(result.status).toBe(CONSEQUENCE_RESOLUTION_STATUS.RESOLVED);
    expect(result.generatedEvents.filter((event) => event.type === EXECUTION_EVENT_TYPES.CHARACTER_CAPTURED)).toHaveLength(3);
    expect(getCharacter(result.state, 'yellow.1').position).toEqual(createCommonPosition(2));
  });

  test('propagates errors from lower layers', () => {
    expect(() => resolveConsequences({ state: {}, events: [characterCaptured('red.1', 'x')] })).toThrow(
      'state must be a GameState with players.',
    );
  });

  test('validates events and remainingRewards arrays', () => {
    const state = createState([]);

    expect(() => resolveConsequences({ state, events: null })).toThrow('events must be an array.');
    expect(() => resolveConsequences({ state, events: [], remainingRewards: null })).toThrow(
      'remainingRewards must be an array.',
    );
  });
});
