import {
  CONSEQUENCE_RESOLUTION_STATUS,
  DECISION_TYPES,
  EXECUTION_EVENT_TYPES,
  FACTION_IDS,
  REWARD_ACTION_TYPES,
  REWARD_LOST_REASONS,
  REWARD_SOURCE_TYPES,
  REWARD_TYPES,
  createCommonPosition,
  createRewardConsequence,
  createGoalPosition,
  createHomePosition,
  executeDecision,
  getAvailableDecisionActions,
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

function characterCaptured(characterId = 'red.1', capturedCharacterId = 'blue.1', factionId = FACTION_IDS.RED) {
  return {
    type: EXECUTION_EVENT_TYPES.CHARACTER_CAPTURED,
    characterId,
    factionId,
    capturedCharacterId,
  };
}

function characterReachedGoal(characterId = 'red.goal', factionId = FACTION_IDS.RED) {
  return { type: EXECUTION_EVENT_TYPES.CHARACTER_REACHED_GOAL, characterId, factionId };
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
    source: { type: sourceType, characterId: sourceCharacterId },
    ownerFactionId,
    steps,
    excludedCharacterIds,
  };
}

function captureReward(characterId = 'red.1', ownerFactionId = FACTION_IDS.RED) {
  return movementReward({
    sourceType: REWARD_SOURCE_TYPES.CAPTURE,
    sourceCharacterId: characterId,
    ownerFactionId,
    steps: 20,
  });
}

function goalReward(characterId = 'red.goal', ownerFactionId = FACTION_IDS.RED) {
  return movementReward({
    sourceType: REWARD_SOURCE_TYPES.GOAL,
    sourceCharacterId: characterId,
    ownerFactionId,
    steps: 10,
    excludedCharacterIds: [characterId],
  });
}

function getDecisionAction({ state, decision, characterId }) {
  return getAvailableDecisionActions({ state, decision })
    .find((action) => action.characterId === characterId);
}

function getMovedCharacterIds(events) {
  return events
    .filter((event) => event.type === EXECUTION_EVENT_TYPES.CHARACTER_MOVED)
    .map((event) => event.characterId);
}

describe('resolveConsequences', () => {
  test('resolves with no rewards without replacing state', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
    ]);
    const events = [{ type: EXECUTION_EVENT_TYPES.CHARACTER_MOVED, characterId: 'red.1' }];
    const result = resolveConsequences({ state, events });

    expect(result).toEqual({
      status: CONSEQUENCE_RESOLUTION_STATUS.RESOLVED,
      state,
      events,
      generatedEvents: [],
    });
  });

  test('resolves capture +20 automatically when there is exactly one recipient', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
    ]);
    const result = resolveConsequences({ state, events: [characterCaptured('red.1')] });

    expect(result.status).toBe(CONSEQUENCE_RESOLUTION_STATUS.RESOLVED);
    expect(getCharacter(result.state, 'red.1').position).toEqual(createCommonPosition(30));
    expect(result.generatedEvents[0]).toMatchObject({
      type: EXECUTION_EVENT_TYPES.CHARACTER_MOVED,
      characterId: 'red.1',
      steps: 20,
      actionType: REWARD_ACTION_TYPES.MOVEMENT_REWARD_MOVEMENT,
    });
  });

  test('stops with a generic pendingDecision for multiple capture +20 recipients', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(20) }),
    ]);
    const result = resolveConsequences({ state, events: [characterCaptured('red.1')] });

    expect(result.status).toBe(CONSEQUENCE_RESOLUTION_STATUS.DECISION_REQUIRED);
    expect(result.pendingDecision).toEqual({
      type: DECISION_TYPES.REWARD_RECIPIENT_SELECTION,
      reward: captureReward('red.1'),
    });
    expect(result.availableDecisionActions.map((action) => action.characterId)).toEqual(['red.1', 'red.2']);
  });

  test('materializes rewardLost when no capture +20 recipient can move exactly 20', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(28) }),
      createCharacter({ id: 'blue.2', factionId: FACTION_IDS.BLUE, position: createCommonPosition(28) }),
    ]);
    const result = resolveConsequences({ state, events: [characterCaptured('red.1')] });

    expect(result.state).toBe(state);
    expect(result.generatedEvents).toEqual([
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

  test('resumes after reward recipient selection and preserves pending consequences', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(20) }),
      createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(50) }),
    ]);
    const first = resolveConsequences({
      state,
      events: [characterCaptured('red.1')],
      pendingConsequences: [createRewardConsequence(captureReward('blue.1', FACTION_IDS.BLUE))],
    });
    const chosen = executeDecision({
      state: first.state,
      decision: first.pendingDecision,
      action: getDecisionAction({ state: first.state, decision: first.pendingDecision, characterId: 'red.2' }),
    });
    const resumed = resolveConsequences({
      state: chosen.state,
      events: chosen.events,
      pendingConsequences: first.pendingConsequences,
    });

    expect(getCharacter(resumed.state, 'red.2').position).toEqual(createCommonPosition(40));
    expect(getMovedCharacterIds(resumed.generatedEvents)).toEqual(['blue.1']);
  });

  test('capture rewards from chosen reward movement are queued before pending consequences', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(20) }),
      createCharacter({ id: 'green.1', factionId: FACTION_IDS.GREEN, position: createCommonPosition(40) }),
      createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(50) }),
    ]);
    const first = resolveConsequences({
      state,
      events: [characterCaptured('red.1')],
      pendingConsequences: [createRewardConsequence(captureReward('blue.1', FACTION_IDS.BLUE))],
    });
    const chosen = executeDecision({
      state: first.state,
      decision: first.pendingDecision,
      action: getDecisionAction({ state: first.state, decision: first.pendingDecision, characterId: 'red.2' }),
    });
    const resumed = resolveConsequences({
      state: chosen.state,
      events: chosen.events,
      pendingConsequences: first.pendingConsequences,
    });

    expect(resumed.status).toBe(CONSEQUENCE_RESOLUTION_STATUS.DECISION_REQUIRED);
    expect(getMovedCharacterIds(resumed.events)).toEqual(['red.2']);
    expect(resumed.pendingDecision.reward.source).toEqual({
      type: REWARD_SOURCE_TYPES.CAPTURE,
      characterId: 'red.2',
    });
    expect(resumed.pendingConsequences).toEqual([
      createRewardConsequence(captureReward('blue.1', FACTION_IDS.BLUE)),
    ]);
    expect(getCharacter(resumed.state, 'green.1').position).toEqual(createHomePosition());
  });

  test('goal +10 still supports automatic, lost, and choice-required outcomes', () => {
    const automaticState = createState([
      createCharacter({ id: 'red.goal', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
    ]);
    const lostState = createState([
      createCharacter({ id: 'red.goal', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createHomePosition() }),
    ]);
    const choiceState = createState([
      createCharacter({ id: 'red.goal', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'red.3', factionId: FACTION_IDS.RED, position: createCommonPosition(20) }),
    ]);

    expect(getCharacter(
      resolveConsequences({ state: automaticState, events: [characterReachedGoal('red.goal')] }).state,
      'red.2',
    ).position).toEqual(createCommonPosition(20));
    expect(resolveConsequences({ state: lostState, events: [characterReachedGoal('red.goal')] }).generatedEvents[0]).toMatchObject({
      type: EXECUTION_EVENT_TYPES.REWARD_LOST,
      reason: REWARD_LOST_REASONS.NO_LEGAL_RECIPIENT,
    });
    expect(resolveConsequences({ state: choiceState, events: [characterReachedGoal('red.goal')] }).status).toBe(
      CONSEQUENCE_RESOLUTION_STATUS.DECISION_REQUIRED,
    );
  });

  test('stops before deriving rewards when shouldStop reports victory', () => {
    const state = createState([
      createCharacter({ id: 'red.goal', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
    ]);
    const stop = { reason: 'testStop', winnerPlayerId: 'player-red' };
    const result = resolveConsequences({
      state,
      events: [characterReachedGoal('red.goal')],
      shouldStop: () => stop,
    });

    expect(result).toEqual({
      status: CONSEQUENCE_RESOLUTION_STATUS.STOPPED,
      state,
      events: [characterReachedGoal('red.goal')],
      generatedEvents: [],
      stop,
    });
  });
});
