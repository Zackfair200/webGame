import {
  EXECUTABLE_ACTION_TYPES,
  EXECUTION_EVENT_TYPES,
  FACTION_IDS,
  GAME_PHASES,
  MOVEMENT_SOURCE_TYPES,
  MOVEMENT_TYPES,
  POSITION_TYPES,
  REWARD_ACTION_TYPES,
  REWARD_TYPES,
  TURN_PHASES,
  createCommonPosition,
  createFinalLanePosition,
  createGameFlow,
  createGoalPosition,
  createHomePosition,
  executeGameAction,
  executeGameDecision,
  getWinningPlayerId,
  registerGameRoll,
} from '../index';

const DEFAULT_FACTIONS = [FACTION_IDS.RED, FACTION_IDS.BLUE, FACTION_IDS.GREEN, FACTION_IDS.YELLOW];

function createCharacter({ id, factionId, position }) {
  return { id, factionId, position };
}

function createPlayer({ id, factionId, positions = [] }) {
  return {
    id,
    factionId,
    characters: [0, 1, 2, 3].map((index) =>
      createCharacter({
        id: `${factionId}.${index + 1}`,
        factionId,
        position: positions[index] || createHomePosition(),
      }),
    ),
  };
}

function createReadyGame({ factions = DEFAULT_FACTIONS.slice(0, 2), turnOrder, players, currentPlayerId } = {}) {
  const gamePlayers = players || factions.map((factionId, index) =>
    createPlayer({ id: `player-${index + 1}`, factionId }),
  );
  const order = turnOrder || gamePlayers.map((player) => player.id);

  return {
    phase: GAME_PHASES.READY,
    players: gamePlayers,
    turnOrder: order,
    currentPlayerId: currentPlayerId || order[0],
    winnerPlayerId: null,
  };
}

function getCharacter(state, characterId) {
  return state.players
    .flatMap((player) => player.characters)
    .find((character) => character.id === characterId);
}

function getPlayer(state, playerId) {
  return state.players.find((player) => player.id === playerId);
}

function getActionForCharacter(gameFlow, characterId) {
  return gameFlow.turnState.availableActions.find((action) => action.characterId === characterId);
}

function getDecisionActionForCharacter(gameFlow, characterId) {
  return gameFlow.turnState.availableDecisionActions.find((action) => action.characterId === characterId);
}

describe('game flow', () => {
  test('starts a configured ready game without cloning players or turnOrder', () => {
    const gameState = createReadyGame();
    const result = createGameFlow({ gameState });

    expect(result.gameState).not.toBe(gameState);
    expect(result.gameState.phase).toBe(GAME_PHASES.IN_PROGRESS);
    expect(result.gameState.players).toBe(gameState.players);
    expect(result.gameState.turnOrder).toBe(gameState.turnOrder);
    expect(result.gameState.currentPlayerId).toBe('player-1');
    expect(result.gameState.winnerPlayerId).toBe(null);
    expect(result.turnState.playerId).toBe('player-1');
    expect(result.turnState.factionId).toBe(FACTION_IDS.RED);
  });

  test.each([2, 3, 4])('starts a game with %i players', (playerCount) => {
    const gameState = createReadyGame({ factions: DEFAULT_FACTIONS.slice(0, playerCount) });
    const result = createGameFlow({ gameState });

    expect(result.gameState.players).toHaveLength(playerCount);
    expect(result.turnState.playerId).toBe(result.gameState.currentPlayerId);
  });

  test('respects arbitrary turnOrder and non-consecutive ids', () => {
    const players = [
      createPlayer({ id: 'alice-10', factionId: FACTION_IDS.RED }),
      createPlayer({ id: 'carol-30', factionId: FACTION_IDS.BLUE }),
      createPlayer({ id: 'bob-20', factionId: FACTION_IDS.GREEN }),
    ];
    const gameState = createReadyGame({
      players,
      turnOrder: ['carol-30', 'bob-20', 'alice-10'],
      currentPlayerId: 'carol-30',
    });
    const flow = createGameFlow({ gameState });
    const next = registerGameRoll({ gameFlow: flow, roll: 1 });

    expect(flow.turnState.playerId).toBe('carol-30');
    expect(next.gameState.currentPlayerId).toBe('bob-20');
    expect(next.turnState.playerId).toBe('bob-20');
  });

  test('wraps around after the last player', () => {
    const gameState = createReadyGame({ currentPlayerId: 'player-2' });
    const flow = createGameFlow({ gameState });
    const next = registerGameRoll({ gameFlow: flow, roll: 1 });

    expect(next.gameState.currentPlayerId).toBe('player-1');
    expect(next.turnState.playerId).toBe('player-1');
  });

  test('rejects a ready gameState that already satisfies the victory condition', () => {
    const gameState = createReadyGame({
      players: [
        createPlayer({
          id: 'player-1',
          factionId: FACTION_IDS.RED,
          positions: [createGoalPosition(), createGoalPosition(), createGoalPosition(), createGoalPosition()],
        }),
        createPlayer({ id: 'player-2', factionId: FACTION_IDS.BLUE }),
      ],
    });

    expect(() => createGameFlow({ gameState })).toThrow(
      'A non-finished gameState cannot already satisfy the victory condition.',
    );
  });

  test('rejects finished gameStates whose winnerPlayerId is not a real winner', () => {
    const gameState = {
      ...createReadyGame({
        players: [
          createPlayer({
            id: 'player-1',
            factionId: FACTION_IDS.RED,
            positions: [createGoalPosition(), createGoalPosition(), createGoalPosition(), createGoalPosition()],
          }),
          createPlayer({ id: 'player-2', factionId: FACTION_IDS.BLUE }),
        ],
      }),
      phase: GAME_PHASES.FINISHED,
      winnerPlayerId: 'player-2',
    };

    expect(() => createGameFlow({ gameState })).toThrow(
      'winnerPlayerId must match the player that satisfies the victory condition.',
    );
  });

  test('rejects finished gameStates whose winnerPlayerId is not a player', () => {
    const gameState = {
      ...createReadyGame({
        players: [
          createPlayer({
            id: 'player-1',
            factionId: FACTION_IDS.RED,
            positions: [createGoalPosition(), createGoalPosition(), createGoalPosition(), createGoalPosition()],
          }),
          createPlayer({ id: 'player-2', factionId: FACTION_IDS.BLUE }),
        ],
      }),
      phase: GAME_PHASES.FINISHED,
      winnerPlayerId: 'missing-player',
    };

    expect(() => createGameFlow({ gameState })).toThrow(
      'winnerPlayerId does not match a player: missing-player',
    );
  });

  test('normal movement ends the turn and advances to the next player', () => {
    const gameState = createReadyGame({
      players: [
        createPlayer({ id: 'player-1', factionId: FACTION_IDS.RED, positions: [createCommonPosition(10)] }),
        createPlayer({ id: 'player-2', factionId: FACTION_IDS.BLUE }),
      ],
    });
    const flow = createGameFlow({ gameState });
    const rolled = registerGameRoll({ gameFlow: flow, roll: 1 });
    const result = executeGameAction({ gameFlow: rolled, action: rolled.turnState.availableActions[0] });

    expect(getCharacter(result.gameState, 'red.1').position).toEqual(createCommonPosition(11));
    expect(result.gameState.currentPlayerId).toBe('player-2');
    expect(result.turnState.playerId).toBe('player-2');
  });

  test('roll 5 exitHome ends the turn and advances', () => {
    const flow = createGameFlow({ gameState: createReadyGame() });
    const rolled = registerGameRoll({ gameFlow: flow, roll: 5 });
    const result = executeGameAction({ gameFlow: rolled, action: rolled.turnState.availableActions[0] });

    expect(result.gameState.currentPlayerId).toBe('player-2');
    expect(result.turnState.playerId).toBe('player-2');
  });

  test('a turn with no legal action advances to the next player', () => {
    const flow = createGameFlow({ gameState: createReadyGame() });
    const result = registerGameRoll({ gameFlow: flow, roll: 1 });

    expect(result.gameState.currentPlayerId).toBe('player-2');
    expect(result.turnState.playerId).toBe('player-2');
  });

  test('a 6 without movement keeps the same player and active TurnState', () => {
    const flow = createGameFlow({ gameState: createReadyGame() });
    const result = registerGameRoll({ gameFlow: flow, roll: 6 });

    expect(result.gameState.currentPlayerId).toBe('player-1');
    expect(result.turnState.playerId).toBe('player-1');
    expect(result.turnState.phase).toBe(TURN_PHASES.WAITING_FOR_ROLL);
    expect(result.turnState.consecutiveSixes).toBe(1);
  });

  test('a valid 6 action keeps the same player waiting for the next roll', () => {
    const gameState = createReadyGame({
      players: [
        createPlayer({ id: 'player-1', factionId: FACTION_IDS.RED, positions: [createCommonPosition(10)] }),
        createPlayer({ id: 'player-2', factionId: FACTION_IDS.BLUE }),
      ],
    });
    const rolled = registerGameRoll({ gameFlow: createGameFlow({ gameState }), roll: 6 });
    const result = executeGameAction({ gameFlow: rolled, action: getActionForCharacter(rolled, 'red.1') });

    expect(getCharacter(result.gameState, 'red.1').position).toEqual(createCommonPosition(16));
    expect(result.gameState.currentPlayerId).toBe('player-1');
    expect(result.turnState.playerId).toBe('player-1');
    expect(result.turnState.phase).toBe(TURN_PHASES.WAITING_FOR_ROLL);
  });

  test('a 6 with automatic reward keeps the same player after resolving the reward', () => {
    const gameState = createReadyGame({
      players: [
        createPlayer({ id: 'player-1', factionId: FACTION_IDS.RED, positions: [createCommonPosition(10)] }),
        createPlayer({ id: 'player-2', factionId: FACTION_IDS.BLUE, positions: [createCommonPosition(16)] }),
      ],
    });
    const rolled = registerGameRoll({ gameFlow: createGameFlow({ gameState }), roll: 6 });
    const result = executeGameAction({ gameFlow: rolled, action: getActionForCharacter(rolled, 'red.1') });

    expect(getCharacter(result.gameState, 'red.1').position).toEqual(createCommonPosition(36));
    expect(getCharacter(result.gameState, 'blue.1').position).toEqual(createHomePosition());
    expect(result.gameState.currentPlayerId).toBe('player-1');
    expect(result.turnState.phase).toBe(TURN_PHASES.WAITING_FOR_ROLL);
  });

  test('multiple 6 rolls keep the same player until the third 6 ends the turn', () => {
    const flow = createGameFlow({ gameState: createReadyGame() });
    const first = registerGameRoll({ gameFlow: flow, roll: 6 });
    const second = registerGameRoll({ gameFlow: first, roll: 6 });
    const third = registerGameRoll({ gameFlow: second, roll: 6 });

    expect(first.gameState.currentPlayerId).toBe('player-1');
    expect(second.gameState.currentPlayerId).toBe('player-1');
    expect(third.gameState.currentPlayerId).toBe('player-2');
    expect(third.turnState.playerId).toBe('player-2');
  });

  test('choiceRequired prevents advancing and resolving it advances for a non-six turn', () => {
    const gameState = createReadyGame({
      players: [
        createPlayer({
          id: 'player-1',
          factionId: FACTION_IDS.RED,
          positions: [
            createFinalLanePosition(FACTION_IDS.RED, 7),
            createCommonPosition(10),
            createCommonPosition(54),
          ],
        }),
        createPlayer({ id: 'player-2', factionId: FACTION_IDS.BLUE }),
      ],
    });
    const flow = createGameFlow({ gameState });
    const rolled = registerGameRoll({ gameFlow: flow, roll: 1 });
    const waitingChoice = executeGameAction({
      gameFlow: rolled,
      action: getActionForCharacter(rolled, 'red.1'),
    });

    expect(waitingChoice.gameState.currentPlayerId).toBe('player-1');
    expect(waitingChoice.turnState.phase).toBe(TURN_PHASES.WAITING_FOR_DECISION);

    const resolved = executeGameDecision({
      gameFlow: waitingChoice,
      action: getDecisionActionForCharacter(waitingChoice, 'red.2'),
    });

    expect(getCharacter(resolved.gameState, 'red.2').position).toEqual(createCommonPosition(20));
    expect(resolved.gameState.currentPlayerId).toBe('player-2');
  });

  test('choiceRequired from a 6 keeps the same player and blocks roll/action until resolved', () => {
    const gameState = createReadyGame({
      players: [
        createPlayer({
          id: 'player-1',
          factionId: FACTION_IDS.RED,
          positions: [
            createFinalLanePosition(FACTION_IDS.RED, 2),
            createCommonPosition(10),
            createCommonPosition(54),
          ],
        }),
        createPlayer({ id: 'player-2', factionId: FACTION_IDS.BLUE }),
      ],
    });
    const flow = createGameFlow({ gameState });
    const rolled = registerGameRoll({ gameFlow: flow, roll: 6 });
    const waitingChoice = executeGameAction({
      gameFlow: rolled,
      action: getActionForCharacter(rolled, 'red.1'),
    });

    expect(waitingChoice.gameState.currentPlayerId).toBe('player-1');
    expect(waitingChoice.turnState.phase).toBe(TURN_PHASES.WAITING_FOR_DECISION);
    expect(() => registerGameRoll({ gameFlow: waitingChoice, roll: 1 })).toThrow(
      'Turn phase must be waitingForRoll.',
    );
    expect(() => executeGameAction({ gameFlow: waitingChoice, action: {} })).toThrow(
      'Turn phase must be waitingForAction.',
    );

    const resolved = executeGameDecision({
      gameFlow: waitingChoice,
      action: getDecisionActionForCharacter(waitingChoice, 'red.2'),
    });

    expect(getCharacter(resolved.gameState, 'red.2').position).toEqual(createCommonPosition(20));
    expect(resolved.gameState.currentPlayerId).toBe('player-1');
    expect(resolved.turnState.phase).toBe(TURN_PHASES.WAITING_FOR_ROLL);
  });

  test('automatic rewards resolve before advancing to the next player', () => {
    const gameState = createReadyGame({
      players: [
        createPlayer({ id: 'player-1', factionId: FACTION_IDS.RED, positions: [createCommonPosition(10)] }),
        createPlayer({ id: 'player-2', factionId: FACTION_IDS.BLUE, positions: [createCommonPosition(11)] }),
      ],
    });
    const flow = createGameFlow({ gameState });
    const rolled = registerGameRoll({ gameFlow: flow, roll: 1 });
    const result = executeGameAction({ gameFlow: rolled, action: getActionForCharacter(rolled, 'red.1') });

    expect(getCharacter(result.gameState, 'red.1').position).toEqual(createCommonPosition(31));
    expect(getCharacter(result.gameState, 'blue.1').position).toEqual(createHomePosition());
    expect(result.gameState.currentPlayerId).toBe('player-2');
  });

  test('blue normal capture of red automatically applies exact +20 capture reward', () => {
    const gameState = createReadyGame({
      players: [
        createPlayer({ id: 'blue-player', factionId: FACTION_IDS.BLUE, positions: [createCommonPosition(58)] }),
        createPlayer({ id: 'red-player', factionId: FACTION_IDS.RED, positions: [createCommonPosition(61)] }),
      ],
      turnOrder: ['blue-player', 'red-player'],
      currentPlayerId: 'blue-player',
    });
    const flow = createGameFlow({ gameState });
    const rolled = registerGameRoll({ gameFlow: flow, roll: 3 });
    const result = executeGameAction({
      gameFlow: rolled,
      action: getActionForCharacter(rolled, 'blue.1'),
    });

    expect(getCharacter(result.gameState, 'red.1').position).toEqual(createHomePosition());
    expect(getCharacter(result.gameState, 'blue.1').position).toEqual(createCommonPosition(13));
expect(result.events).toEqual([
      {
        type: EXECUTION_EVENT_TYPES.CHARACTER_MOVED,
        characterId: 'blue.1',
        factionId: FACTION_IDS.BLUE,
        from: createCommonPosition(58),
        to: createCommonPosition(61),
        previousPosition: createCommonPosition(60),
        steps: 3,
        actionType: EXECUTABLE_ACTION_TYPES.NORMAL_MOVEMENT,
        movementType: MOVEMENT_TYPES.NORMAL,
        source: { type: MOVEMENT_SOURCE_TYPES.DICE, roll: 3 },
      },
      {
        type: EXECUTION_EVENT_TYPES.CHARACTER_CAPTURED,
        characterId: 'blue.1',
        factionId: FACTION_IDS.BLUE,
        capturedCharacterId: 'red.1',
        actionType: EXECUTABLE_ACTION_TYPES.NORMAL_MOVEMENT,
        movementType: MOVEMENT_TYPES.NORMAL,
        source: { type: MOVEMENT_SOURCE_TYPES.DICE, roll: 3 },
      },
      {
        type: EXECUTION_EVENT_TYPES.CHARACTER_MOVED,
        characterId: 'blue.1',
        factionId: FACTION_IDS.BLUE,
        from: createCommonPosition(61),
        to: createCommonPosition(13),
        previousPosition: createCommonPosition(12),
        steps: 20,
        actionType: REWARD_ACTION_TYPES.MOVEMENT_REWARD_MOVEMENT,
        movementType: MOVEMENT_TYPES.REWARD,
        source: {
          type: MOVEMENT_SOURCE_TYPES.REWARD,
          rewardType: REWARD_TYPES.MOVEMENT_REWARD,
          rewardSource: { type: 'capture', characterId: 'blue.1' },
          ownerFactionId: FACTION_IDS.BLUE,
        },
      },
    ]);
    expect(result.turnState.phase).toBe(TURN_PHASES.WAITING_FOR_ROLL);
    expect(result.gameState.currentPlayerId).toBe('red-player');
  });

  test('winning by normal movement finishes the game without generating the winning +10', () => {
    const gameState = createReadyGame({
      players: [
        createPlayer({
          id: 'player-1',
          factionId: FACTION_IDS.RED,
          positions: [
            createFinalLanePosition(FACTION_IDS.RED, 7),
            createGoalPosition(),
            createGoalPosition(),
            createGoalPosition(),
          ],
        }),
        createPlayer({ id: 'player-2', factionId: FACTION_IDS.BLUE }),
      ],
    });
    const flow = createGameFlow({ gameState });
    const rolled = registerGameRoll({ gameFlow: flow, roll: 1 });
    const result = executeGameAction({ gameFlow: rolled, action: getActionForCharacter(rolled, 'red.1') });

    expect(result.gameState.phase).toBe(GAME_PHASES.FINISHED);
    expect(result.gameState.winnerPlayerId).toBe('player-1');
    expect(result.turnState).toBe(null);
    expect(result.events.map((event) => event.type)).toEqual([
      EXECUTION_EVENT_TYPES.CHARACTER_MOVED,
      EXECUTION_EVENT_TYPES.CHARACTER_REACHED_GOAL,
    ]);
  });

  test('winning by +20 cuts consequences and does not generate the winning +10', () => {
    const gameState = createReadyGame({
      players: [
        createPlayer({
          id: 'player-1',
          factionId: FACTION_IDS.RED,
          positions: [
            createCommonPosition(54),
            createGoalPosition(),
            createGoalPosition(),
            createGoalPosition(),
          ],
        }),
        createPlayer({ id: 'player-2', factionId: FACTION_IDS.BLUE, positions: [createCommonPosition(60)] }),
      ],
    });
    const flow = createGameFlow({ gameState });
    const rolled = registerGameRoll({ gameFlow: flow, roll: 6 });
    const result = executeGameAction({ gameFlow: rolled, action: getActionForCharacter(rolled, 'red.1') });

    expect(result.gameState.phase).toBe(GAME_PHASES.FINISHED);
    expect(result.gameState.winnerPlayerId).toBe('player-1');
    expect(result.turnState).toBe(null);
    expect(result.events.map((event) => event.type)).toEqual([
      EXECUTION_EVENT_TYPES.CHARACTER_MOVED,
      EXECUTION_EVENT_TYPES.CHARACTER_CAPTURED,
      EXECUTION_EVENT_TYPES.CHARACTER_MOVED,
      EXECUTION_EVENT_TYPES.CHARACTER_REACHED_GOAL,
    ]);
  });

  test('winning by +10 cuts consequences', () => {
    const gameState = createReadyGame({
      players: [
        createPlayer({
          id: 'player-1',
          factionId: FACTION_IDS.RED,
          positions: [
            createFinalLanePosition(FACTION_IDS.RED, 7),
            createGoalPosition(),
            createGoalPosition(),
            createCommonPosition(2),
          ],
        }),
        createPlayer({ id: 'player-2', factionId: FACTION_IDS.BLUE }),
      ],
    });
    const flow = createGameFlow({ gameState });
    const rolled = registerGameRoll({ gameFlow: flow, roll: 1 });
    const result = executeGameAction({ gameFlow: rolled, action: getActionForCharacter(rolled, 'red.1') });

    expect(result.gameState.phase).toBe(GAME_PHASES.FINISHED);
    expect(result.gameState.winnerPlayerId).toBe('player-1');
    expect(getCharacter(result.gameState, 'red.4').position).toEqual(createGoalPosition());
    expect(result.events.map((event) => event.type)).toEqual([
      EXECUTION_EVENT_TYPES.CHARACTER_MOVED,
      EXECUTION_EVENT_TYPES.CHARACTER_REACHED_GOAL,
      EXECUTION_EVENT_TYPES.CHARACTER_MOVED,
      EXECUTION_EVENT_TYPES.CHARACTER_REACHED_GOAL,
    ]);
  });

  test('victory does not produce rewardLost for discarded rewards', () => {
    const gameState = createReadyGame({
      players: [
        createPlayer({
          id: 'player-1',
          factionId: FACTION_IDS.RED,
          positions: [
            createFinalLanePosition(FACTION_IDS.RED, 7),
            createGoalPosition(),
            createGoalPosition(),
            createGoalPosition(),
          ],
        }),
        createPlayer({ id: 'player-2', factionId: FACTION_IDS.BLUE }),
      ],
    });
    const flow = createGameFlow({ gameState });
    const rolled = registerGameRoll({ gameFlow: flow, roll: 1 });
    const result = executeGameAction({ gameFlow: rolled, action: getActionForCharacter(rolled, 'red.1') });

    expect(result.events.some((event) => event.type === EXECUTION_EVENT_TYPES.REWARD_LOST)).toBe(false);
  });

  test('operations after finished are rejected', () => {
    const gameState = createReadyGame({
      players: [
        createPlayer({
          id: 'player-1',
          factionId: FACTION_IDS.RED,
          positions: [
            createFinalLanePosition(FACTION_IDS.RED, 7),
            createGoalPosition(),
            createGoalPosition(),
            createGoalPosition(),
          ],
        }),
        createPlayer({ id: 'player-2', factionId: FACTION_IDS.BLUE }),
      ],
    });
    const flow = createGameFlow({ gameState });
    const rolled = registerGameRoll({ gameFlow: flow, roll: 1 });
    const finished = executeGameAction({ gameFlow: rolled, action: getActionForCharacter(rolled, 'red.1') });

    expect(() => registerGameRoll({ gameFlow: finished, roll: 1 })).toThrow('Cannot operate on a finished game.');
    expect(() => executeGameAction({ gameFlow: finished, action: {} })).toThrow('Cannot operate on a finished game.');
    expect(() => executeGameDecision({ gameFlow: finished, action: {} })).toThrow('Cannot operate on a finished game.');
    expect(() => createGameFlow({ gameState: finished.gameState })).toThrow(
      'createGameFlow requires a ready gameState.',
    );
  });

  test('multiple simultaneous winners are an inconsistent state', () => {
    const gameState = createReadyGame({
      players: [
        createPlayer({
          id: 'player-1',
          factionId: FACTION_IDS.RED,
          positions: [createGoalPosition(), createGoalPosition(), createGoalPosition(), createGoalPosition()],
        }),
        createPlayer({
          id: 'player-2',
          factionId: FACTION_IDS.BLUE,
          positions: [createGoalPosition(), createGoalPosition(), createGoalPosition(), createGoalPosition()],
        }),
      ],
    });

    expect(() => getWinningPlayerId(gameState)).toThrow(
      'GameState is inconsistent: multiple players satisfy the victory condition.',
    );
  });

  test('getWinningPlayerId returns null unless all four characters are at GOAL', () => {
    const gameState = createReadyGame({
      players: [
        createPlayer({
          id: 'player-1',
          factionId: FACTION_IDS.RED,
          positions: [
            createGoalPosition(),
            createGoalPosition(),
            createGoalPosition(),
            createFinalLanePosition(FACTION_IDS.RED, 7),
          ],
        }),
        createPlayer({ id: 'player-2', factionId: FACTION_IDS.BLUE }),
      ],
    });

    expect(getWinningPlayerId(gameState)).toBe(null);
  });

  test('getWinningPlayerId rejects corrupt player character collections', () => {
    const gameState = createReadyGame();
    const corruptState = {
      ...gameState,
      players: [
        {
          ...gameState.players[0],
          characters: gameState.players[0].characters.slice(0, 3),
        },
        gameState.players[1],
      ],
    };

    expect(() => getWinningPlayerId(corruptState)).toThrow(
      'Player must have exactly four characters to evaluate victory: player-1',
    );
  });

  test('advancing player without board changes preserves players and turnOrder references', () => {
    const gameState = createReadyGame();
    const flow = createGameFlow({ gameState });
    const result = registerGameRoll({ gameFlow: flow, roll: 1 });

    expect(result.gameState.players).toBe(flow.gameState.players);
    expect(result.gameState.turnOrder).toBe(flow.gameState.turnOrder);
    expect(result.gameState.currentPlayerId).toBe('player-2');
  });

  test('movement keeps structural sharing for unaffected branches', () => {
    const gameState = createReadyGame({
      players: [
        createPlayer({ id: 'player-1', factionId: FACTION_IDS.RED, positions: [createCommonPosition(10)] }),
        createPlayer({ id: 'player-2', factionId: FACTION_IDS.BLUE }),
      ],
    });
    const flow = createGameFlow({ gameState });
    const redPlayer = getPlayer(flow.gameState, 'player-1');
    const bluePlayer = getPlayer(flow.gameState, 'player-2');
    const rolled = registerGameRoll({ gameFlow: flow, roll: 1 });
    const result = executeGameAction({ gameFlow: rolled, action: getActionForCharacter(rolled, 'red.1') });

    expect(getPlayer(result.gameState, 'player-1')).not.toBe(redPlayer);
    expect(getPlayer(result.gameState, 'player-2')).toBe(bluePlayer);
    expect(result.gameState.turnOrder).toBe(flow.gameState.turnOrder);
  });

  test('finished game preserves players and turnOrder references from the winning state', () => {
    const gameState = createReadyGame({
      players: [
        createPlayer({
          id: 'player-1',
          factionId: FACTION_IDS.RED,
          positions: [
            createFinalLanePosition(FACTION_IDS.RED, 7),
            createGoalPosition(),
            createGoalPosition(),
            createGoalPosition(),
          ],
        }),
        createPlayer({ id: 'player-2', factionId: FACTION_IDS.BLUE }),
      ],
    });
    const flow = createGameFlow({ gameState });
    const rolled = registerGameRoll({ gameFlow: flow, roll: 1 });
    const moved = executeGameAction({ gameFlow: rolled, action: getActionForCharacter(rolled, 'red.1') });

    expect(moved.gameState.players).not.toBe(flow.gameState.players);
    expect(moved.gameState.turnOrder).toBe(flow.gameState.turnOrder);
  });

  test('mutating returned stop and events does not affect finished GameState', () => {
    const gameState = createReadyGame({
      players: [
        createPlayer({
          id: 'player-1',
          factionId: FACTION_IDS.RED,
          positions: [
            createFinalLanePosition(FACTION_IDS.RED, 7),
            createGoalPosition(),
            createGoalPosition(),
            createGoalPosition(),
          ],
        }),
        createPlayer({ id: 'player-2', factionId: FACTION_IDS.BLUE }),
      ],
    });
    const flow = createGameFlow({ gameState });
    const rolled = registerGameRoll({ gameFlow: flow, roll: 1 });
    const result = executeGameAction({ gameFlow: rolled, action: getActionForCharacter(rolled, 'red.1') });

    result.stop.winnerPlayerId = 'player-2';
    result.events[0].characterId = 'tampered';

    expect(result.gameState.winnerPlayerId).toBe('player-1');
    expect(getCharacter(result.gameState, 'red.1').id).toBe('red.1');
  });

  test('does not hardcode action types while delegating to turn flow', () => {
    const gameState = createReadyGame({
      players: [
        createPlayer({ id: 'player-1', factionId: FACTION_IDS.RED, positions: [createCommonPosition(10)] }),
        createPlayer({ id: 'player-2', factionId: FACTION_IDS.BLUE }),
      ],
    });
    const rolled = registerGameRoll({ gameFlow: createGameFlow({ gameState }), roll: 1 });

    expect(rolled.turnState.availableActions[0].type).toBe(EXECUTABLE_ACTION_TYPES.NORMAL_MOVEMENT);
    expect(getCharacter(rolled.gameState, 'red.1').position.type).toBe(POSITION_TYPES.COMMON);
  });
});
