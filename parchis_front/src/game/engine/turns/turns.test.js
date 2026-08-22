import {
  EXECUTABLE_ACTION_TYPES,
  FACTION_IDS,
  TURN_END_REASONS,
  TURN_EVENT_TYPES,
  TURN_PHASES,
  createCommonPosition,
  createFinalLanePosition,
  createGoalPosition,
  createHomePosition,
  createTurnState,
  executeTurnAction,
  executeTurnRewardAction,
  registerTurnRoll,
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

function getPlayer(state, factionId) {
  return state.players.find((player) => player.factionId === factionId);
}

function setCharacterPosition(state, characterId, position) {
  return {
    ...state,
    players: state.players.map((player) => {
      const characters = player.characters.map((character) => {
        if (character.id !== characterId) {
          return character;
        }

        return {
          ...character,
          position,
        };
      });

      if (characters.every((character, index) => character === player.characters[index])) {
        return player;
      }

      return {
        ...player,
        characters,
      };
    }),
  };
}

function createRedTurn(overrides = {}) {
  return {
    ...createTurnState({ playerId: 'player-red', factionId: FACTION_IDS.RED }),
    ...overrides,
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

describe('turn flow', () => {
  test('creates a serializable turn state waiting for a roll', () => {
    expect(createTurnState({ playerId: 'player-red', factionId: FACTION_IDS.RED })).toEqual({
      playerId: 'player-red',
      factionId: FACTION_IDS.RED,
      phase: TURN_PHASES.WAITING_FOR_ROLL,
      consecutiveSixes: 0,
      currentRoll: null,
      availableActions: [],
      pendingReward: null,
      availableRewardActions: [],
      remainingRewards: [],
      diceMoveHistory: [],
      events: [],
      endReason: null,
      afterConsequences: null,
    });
  });

  test('registers a normal roll with legal moves as waiting for action', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
    ]);
    const result = registerTurnRoll({ state, turnState: createRedTurn(), roll: 3 });

    expect(result.state).toBe(state);
    expect(result.turnState.phase).toBe(TURN_PHASES.WAITING_FOR_ACTION);
    expect(result.turnState.currentRoll).toBe(3);
    expect(result.turnState.consecutiveSixes).toBe(0);
    expect(result.turnState.availableActions).toEqual([
      {
        type: EXECUTABLE_ACTION_TYPES.NORMAL_MOVEMENT,
        characterId: 'red.1',
        movement: expect.objectContaining({
          legal: true,
          destination: createCommonPosition(13),
        }),
      },
    ]);
  });

  test('ends a non-six roll when no legal action exists', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createHomePosition() }),
    ]);
    const result = registerTurnRoll({ state, turnState: createRedTurn(), roll: 3 });

    expect(result.turnState.phase).toBe(TURN_PHASES.ENDED);
    expect(result.turnState.endReason).toBe(TURN_END_REASONS.NO_LEGAL_ACTION);
  });

  test('ends roll 5 when there are no home characters and no legal movements', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
    ]);
    const result = registerTurnRoll({ state, turnState: createRedTurn(), roll: 5 });

    expect(result.state).toBe(state);
    expect(result.turnState.phase).toBe(TURN_PHASES.ENDED);
    expect(result.turnState.endReason).toBe(TURN_END_REASONS.NO_LEGAL_ACTION);
    expect(result.turnState.diceMoveHistory).toEqual([]);
  });

  test('a six without legal actions still grants another roll and counts the sequence', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createHomePosition() }),
    ]);
    const result = registerTurnRoll({ state, turnState: createRedTurn(), roll: 6 });

    expect(result.turnState.phase).toBe(TURN_PHASES.WAITING_FOR_ROLL);
    expect(result.turnState.consecutiveSixes).toBe(1);
    expect(result.turnState.currentRoll).toBe(null);
    expect(result.turnState.availableActions).toEqual([]);
  });

  test('executes a dice action, records dice history, and ends after a non-six', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
    ]);
    const rollResult = registerTurnRoll({ state, turnState: createRedTurn(), roll: 2 });
    const actionResult = executeTurnAction({
      state,
      turnState: rollResult.turnState,
      action: rollResult.turnState.availableActions[0],
    });

    expect(getCharacter(actionResult.state, 'red.1').position).toEqual(createCommonPosition(12));
    expect(actionResult.turnState.phase).toBe(TURN_PHASES.ENDED);
    expect(actionResult.turnState.endReason).toBe(TURN_END_REASONS.COMPLETED);
    expect(actionResult.turnState.diceMoveHistory).toEqual([
      {
        characterId: 'red.1',
        actionType: EXECUTABLE_ACTION_TYPES.NORMAL_MOVEMENT,
        roll: 2,
      },
    ]);
  });

  test('records exitHome with 5 as a dice movement', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createHomePosition() }),
    ]);
    const rollResult = registerTurnRoll({ state, turnState: createRedTurn(), roll: 5 });
    const actionResult = executeTurnAction({
      state,
      turnState: rollResult.turnState,
      action: rollResult.turnState.availableActions[0],
    });

    expect(actionResult.turnState.phase).toBe(TURN_PHASES.ENDED);
    expect(actionResult.turnState.diceMoveHistory).toEqual([
      {
        characterId: 'red.1',
        actionType: EXECUTABLE_ACTION_TYPES.EXIT_HOME,
        roll: 5,
      },
    ]);
  });

  test('records breakBarrier with 6 as a dice movement', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
    ]);
    const rollResult = registerTurnRoll({ state, turnState: createRedTurn(), roll: 6 });
    const breakBarrierAction = rollResult.turnState.availableActions.find(
      (action) => action.characterId === 'red.1',
    );
    const actionResult = executeTurnAction({
      state,
      turnState: rollResult.turnState,
      action: breakBarrierAction,
    });

    expect(breakBarrierAction.type).toBe(EXECUTABLE_ACTION_TYPES.BREAK_BARRIER);
    expect(actionResult.turnState.phase).toBe(TURN_PHASES.WAITING_FOR_ROLL);
    expect(actionResult.turnState.diceMoveHistory).toEqual([
      {
        characterId: 'red.1',
        actionType: EXECUTABLE_ACTION_TYPES.BREAK_BARRIER,
        roll: 6,
      },
    ]);
  });

  test('executes a six action and waits for the next roll after consequences resolve', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
    ]);
    const rollResult = registerTurnRoll({ state, turnState: createRedTurn(), roll: 6 });
    const actionResult = executeTurnAction({
      state,
      turnState: rollResult.turnState,
      action: rollResult.turnState.availableActions[0],
    });

    expect(getCharacter(actionResult.state, 'red.1').position).toEqual(createCommonPosition(16));
    expect(actionResult.turnState.phase).toBe(TURN_PHASES.WAITING_FOR_ROLL);
    expect(actionResult.turnState.consecutiveSixes).toBe(1);
    expect(actionResult.turnState.currentRoll).toBe(null);
  });

  test('resolves a 6 capture with automatic +20 to +20 chain before waiting for the next roll', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(41) }),
      createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(47) }),
      createCharacter({ id: 'blue.2', factionId: FACTION_IDS.BLUE, position: createCommonPosition(67) }),
    ]);
    const rollResult = registerTurnRoll({ state, turnState: createRedTurn(), roll: 6 });
    const actionResult = executeTurnAction({
      state,
      turnState: rollResult.turnState,
      action: rollResult.turnState.availableActions[0],
    });

    expect(getCharacter(actionResult.state, 'red.1').position).toEqual(createCommonPosition(19));
    expect(getCharacter(actionResult.state, 'blue.1').position).toEqual(createHomePosition());
    expect(getCharacter(actionResult.state, 'blue.2').position).toEqual(createHomePosition());
    expect(actionResult.events.filter((event) => event.type === 'characterCaptured')).toHaveLength(2);
    expect(actionResult.turnState.phase).toBe(TURN_PHASES.WAITING_FOR_ROLL);
  });

  test('resolves a 6 capture with automatic +20 to GOAL and +10 before waiting for the next roll', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(20) }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(26) }),
    ]);
    const rollResult = registerTurnRoll({ state, turnState: createRedTurn(), roll: 6 });
    const actionResult = executeTurnAction({
      state,
      turnState: rollResult.turnState,
      action: rollResult.turnState.availableActions.find((action) => action.characterId === 'red.1'),
    });

    expect(getCharacter(actionResult.state, 'red.1').position).toEqual(createGoalPosition());
    expect(getCharacter(actionResult.state, 'red.2').position).toEqual(createCommonPosition(20));
    expect(actionResult.events.map((event) => event.type)).toEqual([
      'characterMoved',
      'characterCaptured',
      'characterMoved',
      'characterReachedGoal',
      'characterMoved',
    ]);
    expect(actionResult.turnState.phase).toBe(TURN_PHASES.WAITING_FOR_ROLL);
  });

  test('keeps a 6 turn waiting for reward choice before granting the next roll', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createFinalLanePosition(FACTION_IDS.RED, 2) }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'red.3', factionId: FACTION_IDS.RED, position: createCommonPosition(20) }),
    ]);
    const rollResult = registerTurnRoll({ state, turnState: createRedTurn(), roll: 6 });
    const actionResult = executeTurnAction({
      state,
      turnState: rollResult.turnState,
      action: rollResult.turnState.availableActions.find((action) => action.characterId === 'red.1'),
    });

    expect(actionResult.turnState.phase).toBe(TURN_PHASES.WAITING_FOR_REWARD_CHOICE);
    expect(() =>
      registerTurnRoll({
        state: actionResult.state,
        turnState: actionResult.turnState,
        roll: 6,
      }),
    ).toThrow('Turn phase must be waitingForRoll.');

    const rewardResult = executeTurnRewardAction({
      state: actionResult.state,
      turnState: actionResult.turnState,
      action: actionResult.turnState.availableRewardActions.find((action) => action.characterId === 'red.2'),
    });

    expect(getCharacter(rewardResult.state, 'red.2').position).toEqual(createCommonPosition(20));
    expect(rewardResult.turnState.phase).toBe(TURN_PHASES.WAITING_FOR_ROLL);
  });

  test('pauses for a reward choice and resumes without adding reward moves to dice history', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createFinalLanePosition(FACTION_IDS.RED, 7) }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'red.3', factionId: FACTION_IDS.RED, position: createCommonPosition(20) }),
    ]);
    const rollResult = registerTurnRoll({ state, turnState: createRedTurn(), roll: 1 });
    const actionResult = executeTurnAction({
      state,
      turnState: rollResult.turnState,
      action: rollResult.turnState.availableActions.find((action) => action.characterId === 'red.1'),
    });

    expect(actionResult.turnState.phase).toBe(TURN_PHASES.WAITING_FOR_REWARD_CHOICE);
    expect(getCharacter(actionResult.state, 'red.1').position).toEqual(createGoalPosition());
    expect(actionResult.turnState.availableRewardActions.map((action) => action.characterId).sort()).toEqual([
      'red.2',
      'red.3',
    ]);

    const rewardResult = executeTurnRewardAction({
      state: actionResult.state,
      turnState: actionResult.turnState,
      action: actionResult.turnState.availableRewardActions.find((action) => action.characterId === 'red.2'),
    });

    expect(getCharacter(rewardResult.state, 'red.2').position).toEqual(createCommonPosition(20));
    expect(rewardResult.turnState.phase).toBe(TURN_PHASES.ENDED);
    expect(rewardResult.turnState.diceMoveHistory).toEqual([
      {
        characterId: 'red.1',
        actionType: EXECUTABLE_ACTION_TYPES.NORMAL_MOVEMENT,
        roll: 1,
      },
    ]);
  });

  test('applies third-six penalty immediately without offering actions for that roll', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
    ]);
    const turnState = createRedTurn({
      consecutiveSixes: 2,
      diceMoveHistory: [
        {
          characterId: 'red.1',
          actionType: EXECUTABLE_ACTION_TYPES.NORMAL_MOVEMENT,
          roll: 6,
        },
      ],
    });
    const result = registerTurnRoll({ state, turnState, roll: 6 });

    expect(result.turnState.phase).toBe(TURN_PHASES.ENDED);
    expect(result.turnState.endReason).toBe(TURN_END_REASONS.THIRD_SIX_PENALTY);
    expect(result.turnState.availableActions).toEqual([]);
    expect(getCharacter(result.state, 'red.1').position).toEqual(createHomePosition());
    expect(result.events).toEqual([
      {
        type: TURN_EVENT_TYPES.THIRD_SIX_PENALTY,
        characterId: 'red.1',
        from: createCommonPosition(10),
        to: createHomePosition(),
      },
    ]);
  });

  test('third-six penalty skips characters already in goal and searches backward', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
    ]);
    const turnState = createRedTurn({
      consecutiveSixes: 2,
      diceMoveHistory: [
        { characterId: 'red.1', actionType: EXECUTABLE_ACTION_TYPES.NORMAL_MOVEMENT, roll: 6 },
        { characterId: 'red.2', actionType: EXECUTABLE_ACTION_TYPES.NORMAL_MOVEMENT, roll: 6 },
      ],
    });
    const result = registerTurnRoll({ state, turnState, roll: 6 });

    expect(getCharacter(result.state, 'red.1').position).toEqual(createHomePosition());
    expect(getCharacter(result.state, 'red.2').position).toEqual(createGoalPosition());
  });

  test('third-six penalty skips history entries currently at HOME and GOAL while searching backward', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createHomePosition() }),
      createCharacter({ id: 'red.3', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
    ]);
    const turnState = createRedTurn({
      consecutiveSixes: 2,
      diceMoveHistory: [
        { characterId: 'red.1', actionType: EXECUTABLE_ACTION_TYPES.NORMAL_MOVEMENT, roll: 6 },
        { characterId: 'red.2', actionType: EXECUTABLE_ACTION_TYPES.NORMAL_MOVEMENT, roll: 6 },
        { characterId: 'red.3', actionType: EXECUTABLE_ACTION_TYPES.NORMAL_MOVEMENT, roll: 6 },
      ],
    });
    const result = registerTurnRoll({ state, turnState, roll: 6 });

    expect(getCharacter(result.state, 'red.1').position).toEqual(createHomePosition());
    expect(getCharacter(result.state, 'red.2').position).toEqual(createHomePosition());
    expect(getCharacter(result.state, 'red.3').position).toEqual(createGoalPosition());
  });

  test('third-six penalty ignores reward movements when selecting the penalized character', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(40) }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(20) }),
    ]);
    const turnState = createRedTurn({
      consecutiveSixes: 2,
      diceMoveHistory: [
        { characterId: 'red.1', actionType: EXECUTABLE_ACTION_TYPES.NORMAL_MOVEMENT, roll: 6 },
        { characterId: 'red.2', actionType: EXECUTABLE_ACTION_TYPES.NORMAL_MOVEMENT, roll: 6 },
      ],
      events: [
        {
          type: 'characterMoved',
          characterId: 'red.1',
          steps: 10,
          actionType: 'goalReward',
        },
      ],
    });
    const result = registerTurnRoll({ state, turnState, roll: 6 });

    expect(getCharacter(result.state, 'red.1').position).toEqual(createCommonPosition(40));
    expect(getCharacter(result.state, 'red.2').position).toEqual(createHomePosition());
  });

  test('third-six penalty ends without moving anyone when no moved character is penalizable', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
    ]);
    const turnState = createRedTurn({
      consecutiveSixes: 2,
      diceMoveHistory: [
        { characterId: 'red.1', actionType: EXECUTABLE_ACTION_TYPES.NORMAL_MOVEMENT, roll: 6 },
      ],
    });
    const result = registerTurnRoll({ state, turnState, roll: 6 });

    expect(result.state).toBe(state);
    expect(result.turnState.phase).toBe(TURN_PHASES.ENDED);
    expect(result.events).toEqual([
      {
        type: TURN_EVENT_TYPES.THIRD_SIX_PENALTY_SKIPPED,
        reason: 'noPenalizableCharacter',
      },
    ]);
  });

  test('third-six penalty is skipped with empty dice history', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
    ]);
    const result = registerTurnRoll({
      state,
      turnState: createRedTurn({ consecutiveSixes: 2 }),
      roll: 6,
    });

    expect(result.state).toBe(state);
    expect(result.turnState.endReason).toBe(TURN_END_REASONS.THIRD_SIX_PENALTY);
    expect(result.events).toEqual([
      {
        type: TURN_EVENT_TYPES.THIRD_SIX_PENALTY_SKIPPED,
        reason: 'noPenalizableCharacter',
      },
    ]);
  });

  test('six rolls without legal movements still count toward the third-six penalty', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createHomePosition() }),
    ]);
    const first = registerTurnRoll({ state, turnState: createRedTurn(), roll: 6 });
    const second = registerTurnRoll({ state, turnState: first.turnState, roll: 6 });
    const third = registerTurnRoll({ state, turnState: second.turnState, roll: 6 });

    expect(first.turnState.diceMoveHistory).toEqual([]);
    expect(second.turnState.consecutiveSixes).toBe(2);
    expect(third.turnState.phase).toBe(TURN_PHASES.ENDED);
    expect(third.turnState.endReason).toBe(TURN_END_REASONS.THIRD_SIX_PENALTY);
    expect(third.events[0].type).toBe(TURN_EVENT_TYPES.THIRD_SIX_PENALTY_SKIPPED);
  });

  test('third-six penalty ignores corrupt enemy history entries', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(20) }),
    ]);
    const turnState = createRedTurn({
      consecutiveSixes: 2,
      diceMoveHistory: [
        { characterId: 'red.1', actionType: EXECUTABLE_ACTION_TYPES.NORMAL_MOVEMENT, roll: 6 },
        { characterId: 'blue.1', actionType: EXECUTABLE_ACTION_TYPES.NORMAL_MOVEMENT, roll: 6 },
      ],
    });
    const result = registerTurnRoll({ state, turnState, roll: 6 });

    expect(getCharacter(result.state, 'red.1').position).toEqual(createHomePosition());
    expect(getCharacter(result.state, 'blue.1').position).toEqual(createCommonPosition(20));
  });

  test('rejects waitingForRoll turn states with consecutiveSixes already at 3 or more', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createHomePosition() }),
    ]);

    expect(() =>
      registerTurnRoll({
        state,
        turnState: createRedTurn({ consecutiveSixes: 3 }),
        roll: 6,
      }),
    ).toThrow('turnState.consecutiveSixes must be an integer from 0 to 2 while phase is waitingForRoll.');
  });

  test.each([
    ['missing object', null, 'turnState must be an object.'],
    ['missing playerId', { playerId: '' }, 'turnState.playerId is required.'],
    ['invalid phase', { phase: 'rolling' }, 'Invalid turn phase: rolling'],
    ['invalid actions', { availableActions: null }, 'turnState.availableActions must be an array.'],
    ['invalid history entry', { diceMoveHistory: [{ characterId: 'red.1', actionType: 'normalMovement' }] }, 'turnState.diceMoveHistory[0].roll must be an integer from 1 to 6.'],
  ])('rejects malformed TurnState: %s', (name, overrides, message) => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
    ]);
    const turnState = overrides ? createRedTurn(overrides) : overrides;

    expect(() => registerTurnRoll({ state, turnState, roll: 1 })).toThrow(message);
  });

  test('rejects turn operations in the wrong phase', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
    ]);
    const waitingForAction = registerTurnRoll({ state, turnState: createRedTurn(), roll: 1 }).turnState;
    const ended = registerTurnRoll({
      state: createState([
        createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createHomePosition() }),
      ]),
      turnState: createRedTurn(),
      roll: 1,
    }).turnState;

    expect(() => registerTurnRoll({ state, turnState: waitingForAction, roll: 1 })).toThrow(
      'Turn phase must be waitingForRoll.',
    );
    expect(() => executeTurnAction({ state, turnState: createRedTurn(), action: {} })).toThrow(
      'Turn phase must be waitingForAction.',
    );
    expect(() => executeTurnRewardAction({ state, turnState: ended, action: {} })).toThrow(
      'Turn phase must be waitingForRewardChoice.',
    );
  });

  test('rejects a stale dice action after the GameState changes', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
    ]);
    const rollResult = registerTurnRoll({ state, turnState: createRedTurn(), roll: 2 });
    const changedState = setCharacterPosition(state, 'red.1', createHomePosition());

    expect(() =>
      executeTurnAction({
        state: changedState,
        turnState: rollResult.turnState,
        action: rollResult.turnState.availableActions[0],
      }),
    ).toThrow('Action is not available for the current state.');
  });

  test('rejects a stale reward choice after the GameState changes', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createFinalLanePosition(FACTION_IDS.RED, 7) }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'red.3', factionId: FACTION_IDS.RED, position: createCommonPosition(20) }),
    ]);
    const rollResult = registerTurnRoll({ state, turnState: createRedTurn(), roll: 1 });
    const actionResult = executeTurnAction({
      state,
      turnState: rollResult.turnState,
      action: rollResult.turnState.availableActions.find((action) => action.characterId === 'red.1'),
    });
    const changedState = setCharacterPosition(actionResult.state, 'red.2', createHomePosition());

    expect(() =>
      executeTurnRewardAction({
        state: changedState,
        turnState: actionResult.turnState,
        action: actionResult.turnState.availableRewardActions.find((action) => action.characterId === 'red.2'),
      }),
    ).toThrow('Action is not available for this reward.');
  });

  test('third-six penalty preserves structural sharing for unaffected state branches', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(20) }),
      createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(30) }),
    ]);
    const redPlayer = getPlayer(state, FACTION_IDS.RED);
    const bluePlayer = getPlayer(state, FACTION_IDS.BLUE);
    const red2 = getCharacter(state, 'red.2');
    const result = registerTurnRoll({
      state,
      turnState: createRedTurn({
        consecutiveSixes: 2,
        diceMoveHistory: [
          { characterId: 'red.1', actionType: EXECUTABLE_ACTION_TYPES.NORMAL_MOVEMENT, roll: 6 },
        ],
      }),
      roll: 6,
    });

    expect(result.state).not.toBe(state);
    expect(getPlayer(result.state, FACTION_IDS.RED)).not.toBe(redPlayer);
    expect(getPlayer(result.state, FACTION_IDS.BLUE)).toBe(bluePlayer);
    expect(getCharacter(result.state, 'red.1')).not.toBe(getCharacter(state, 'red.1'));
    expect(getCharacter(result.state, 'red.2')).toBe(red2);
  });

  test('mutating returned availableActions does not contaminate later roll evaluation', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
    ]);
    const first = registerTurnRoll({ state, turnState: createRedTurn(), roll: 2 });

    first.turnState.availableActions[0].movement.destination.square = 99;

    const second = registerTurnRoll({ state, turnState: createRedTurn(), roll: 2 });

    expect(second.turnState.availableActions[0].movement.destination).toEqual(createCommonPosition(12));
  });

  test('mutating returned reward snapshots does not contaminate later reward evaluation', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createFinalLanePosition(FACTION_IDS.RED, 7) }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'red.3', factionId: FACTION_IDS.RED, position: createCommonPosition(20) }),
    ]);
    const firstRoll = registerTurnRoll({ state, turnState: createRedTurn(), roll: 1 });
    const firstAction = executeTurnAction({
      state,
      turnState: firstRoll.turnState,
      action: firstRoll.turnState.availableActions.find((action) => action.characterId === 'red.1'),
    });

    firstAction.turnState.pendingReward.steps = 999;
    firstAction.turnState.availableRewardActions[0].movement.destination.square = 99;

    const secondRoll = registerTurnRoll({ state, turnState: createRedTurn(), roll: 1 });
    const secondAction = executeTurnAction({
      state,
      turnState: secondRoll.turnState,
      action: secondRoll.turnState.availableActions.find((action) => action.characterId === 'red.1'),
    });

    expect(secondAction.turnState.pendingReward.steps).toBe(10);
    expect(secondAction.turnState.availableRewardActions[0].movement.destination).not.toEqual(createCommonPosition(99));
  });

  test('does not mutate state or turn state inputs', () => {
    const state = createState([
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
    ]);
    const turnState = createRedTurn();

    deepFreeze(state);
    deepFreeze(turnState);

    const result = registerTurnRoll({ state, turnState, roll: 2 });

    expect(result.turnState).not.toBe(turnState);
    expect(result.state).toBe(state);
    expect(turnState.phase).toBe(TURN_PHASES.WAITING_FOR_ROLL);
    expect(getCharacter(state, 'red.1').position).toEqual(createCommonPosition(10));
  });
});
