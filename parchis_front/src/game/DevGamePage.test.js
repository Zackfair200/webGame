import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { DevGamePageContent, DevGamePageGameContent } from './DevGamePage';
import { DICE_ANIMATION_DURATION_MS } from './dice/GameDice';
import {
  EXECUTABLE_ACTION_TYPES,
  EXECUTION_EVENT_TYPES,
  GAME_PHASES,
  REWARD_ACTION_TYPES,
  REWARD_TYPES,
  TURN_PHASES,
} from './engine';
import { useLocalDevGameSession } from './hooks/useLocalDevGameSession';

function createCharacter({ id, characterId, name, factionId, position }) {
  return { id, characterId, name, factionId, position };
}

function createGameState(overrides = {}) {
  return {
    phase: GAME_PHASES.IN_PROGRESS,
    players: [
      {
        id: 'player-a',
        name: 'Player A',
        factionId: 'red',
        characters: [
          createCharacter({ id: 'red.fireMage', characterId: 'fireMage', name: 'Mago de fuego', factionId: 'red', position: { type: 'home' } }),
          createCharacter({ id: 'red.warrior', characterId: 'warrior', name: 'Guerrero', factionId: 'red', position: { type: 'common', square: 5 } }),
        ],
      },
      {
        id: 'player-b',
        name: 'Player B',
        factionId: 'blue',
        characters: [
          createCharacter({ id: 'blue.iceMage', characterId: 'iceMage', name: 'Mago de hielo', factionId: 'blue', position: { type: 'home' } }),
          createCharacter({ id: 'blue.hunter', characterId: 'hunter', name: 'Cazador', factionId: 'blue', position: { type: 'finalLane', factionId: 'blue', index: 3 } }),
          createCharacter({ id: 'blue.alchemist', characterId: 'alchemist', name: 'Alquimista', factionId: 'blue', position: { type: 'goal' } }),
        ],
      },
    ],
    turnOrder: ['player-b', 'player-a'],
    currentPlayerId: 'player-b',
    winnerPlayerId: null,
    ...overrides,
  };
}

function createTurnState(overrides = {}) {
  return {
    playerId: 'player-b',
    factionId: 'blue',
    phase: TURN_PHASES.WAITING_FOR_ROLL,
    consecutiveSixes: 0,
    currentRoll: null,
    availableActions: [],
    pendingReward: null,
    availableRewardActions: [],
    ...overrides,
  };
}

function createEngine(overrides = {}) {
  const gameState = overrides.gameState || createGameState();
  const turnState = overrides.turnState || createTurnState();

  return {
    gameFlow: { gameState, turnState },
    gameState,
    turnState,
    currentPlayer: gameState.players.find((player) => player.id === gameState.currentPlayerId),
    availableActions: turnState.availableActions || [],
    pendingReward: turnState.pendingReward || null,
    availableRewardActions: turnState.availableRewardActions || [],
    lastEvents: [],
    registerRoll: jest.fn(),
    executeAction: jest.fn(),
    executeRewardChoice: jest.fn(),
    ...overrides,
  };
}

function renderDevGame(engineOverrides = {}) {
  const engine = createEngine(engineOverrides);
  render(<DevGamePageGameContent engine={engine} />);
  return engine;
}

function DevGameSessionHarness({ shuffle }) {
  const session = useLocalDevGameSession({ shuffle });

  return <DevGamePageContent session={session} />;
}

function createShuffle(results) {
  return jest.fn(() => results.shift());
}

describe('DevGamePageContent', () => {
  test('walks through setup and shows the game interface only after Start game', () => {
    const shuffle = createShuffle([
      ['player-b', 'player-a', 'player-c'],
      ['player-c', 'player-b', 'player-a'],
    ]);

    render(<DevGameSessionHarness shuffle={shuffle} />);

    expect(screen.getByRole('heading', { name: 'Dev Game Setup' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2 players' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '4 players' }));
    expect(within(screen.getByLabelText('Player setup')).getByText('Player D')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '3 players' }));
    expect(screen.queryByText('Player D')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sort faction selection order' }));

    expect(shuffle).toHaveBeenNthCalledWith(1, ['player-a', 'player-b', 'player-c']);
    expect(screen.getByRole('button', { name: '3 players' })).toBeDisabled();
    expect(within(screen.getByLabelText('Faction selection order')).getByText('Player B (player-b)')).toBeInTheDocument();
    expect(screen.getByText('Player B, choose your faction')).toBeInTheDocument();

    const factionButtons = within(screen.getByLabelText('Faction choices')).getAllByRole('button');
    expect(factionButtons.map((button) => button.textContent)).toEqual(['green', 'red', 'blue', 'yellow']);

    fireEvent.click(screen.getByRole('button', { name: 'blue' }));
    expect(screen.getByRole('button', { name: 'blue' })).toBeDisabled();
    expect(screen.getByText('Player A, choose your faction')).toBeInTheDocument();
    expect(within(screen.getByLabelText('Faction choices summary')).getByText('blue')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'red' }));
    expect(screen.getByText('Player C, choose your faction')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'green' }));

    fireEvent.click(screen.getByRole('button', { name: 'Sort turn order' }));

    expect(shuffle).toHaveBeenNthCalledWith(2, ['player-a', 'player-b', 'player-c']);
    expect(within(screen.getByLabelText('Turn order')).getByText('Player C (player-c)')).toBeInTheDocument();
    expect(screen.getByLabelText('Setup summary')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Dev Game Engine' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Start game' }));

    expect(screen.getByRole('heading', { name: 'Dev Game Engine' })).toBeInTheDocument();
    expect(screen.getByLabelText('Visual game board')).toBeInTheDocument();
    expect(screen.getByLabelText('Roll controls')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '5' })).toBeEnabled();
    expect(screen.queryByText(/select destination/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '5' }));
    fireEvent.click(screen.getByRole('button', { name: /Druida.*available/ }));

    expect(within(screen.getByLabelText('Character positions')).getByText('common 22')).toBeInTheDocument();
  });

  test('shows roll controls and calls registerRoll while waiting for roll', () => {
    const engine = renderDevGame();

    [1, 2, 3, 4, 5, 6].forEach((value) => {
      expect(screen.getByRole('button', { name: String(value) })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole('button', { name: '5' }));

    expect(engine.registerRoll).toHaveBeenCalledWith(5);
  });

  test('renders a prominent current-turn indicator from engine state', () => {
    renderDevGame();

    const indicator = screen.getByLabelText('Current turn');

    expect(indicator).toHaveAttribute('data-current-player-id', 'player-b');
    expect(indicator).toHaveAttribute('data-current-faction', 'blue');
    expect(indicator).toHaveClass('dev-game-turn-indicator--blue');
    expect(within(indicator).getByText('Player B')).toBeInTheDocument();
    expect(within(indicator).getByText('player-b')).toBeInTheDocument();
    expect(within(indicator).getByText('blue')).toBeInTheDocument();
    expect(within(indicator).getByText(TURN_PHASES.WAITING_FOR_ROLL)).toBeInTheDocument();
  });

  test('current-turn indicator follows changed engine current player without local turn state', () => {
    const initialEngine = createEngine();
    const nextGameState = createGameState({ currentPlayerId: 'player-a' });
    const nextEngine = createEngine({
      gameState: nextGameState,
      turnState: createTurnState({
        playerId: 'player-a',
        factionId: 'red',
        phase: TURN_PHASES.WAITING_FOR_ACTION,
      }),
    });
    const { rerender } = render(<DevGamePageGameContent engine={initialEngine} />);

    expect(screen.getByLabelText('Current turn')).toHaveAttribute('data-current-player-id', 'player-b');

    rerender(<DevGamePageGameContent engine={nextEngine} />);

    const indicator = screen.getByLabelText('Current turn');

    expect(indicator).toHaveAttribute('data-current-player-id', 'player-a');
    expect(indicator).toHaveAttribute('data-current-faction', 'red');
    expect(indicator).toHaveClass('dev-game-turn-indicator--red');
    expect(within(indicator).getByText('Player A')).toBeInTheDocument();
    expect(within(indicator).getByText('red')).toBeInTheDocument();
    expect(within(indicator).getByText(TURN_PHASES.WAITING_FOR_ACTION)).toBeInTheDocument();
  });

  test('keeps the board in the primary game screen and debug tools in the development section', () => {
    renderDevGame();

    const gameScreen = screen.getByLabelText('Game screen');
    const developmentTools = screen.getByLabelText('Development tools');

    expect(within(gameScreen).getByLabelText('Current turn')).toBeInTheDocument();
    expect(within(gameScreen).getByLabelText('Gameplay dice')).toBeInTheDocument();
    expect(within(gameScreen).getByRole('button', { name: 'Roll dice' })).toBeEnabled();
    expect(within(gameScreen).getByLabelText('Visual game board')).toBeInTheDocument();
    expect(within(gameScreen).getByLabelText('Parchis board')).toBeInTheDocument();
    expect(within(developmentTools).getByLabelText('Roll controls')).toBeInTheDocument();
    expect(within(developmentTools).getByRole('button', { name: '5' })).toBeEnabled();
    expect(within(developmentTools).getByLabelText('Game status')).toBeInTheDocument();
    expect(within(developmentTools).getByLabelText('Available actions')).toBeInTheDocument();
    expect(within(developmentTools).getByLabelText('Reward actions')).toBeInTheDocument();
    expect(within(developmentTools).getByLabelText('Character positions')).toBeInTheDocument();
    expect(within(developmentTools).getByLabelText('Last events')).toBeInTheDocument();
    expect(document.querySelector('[data-start-square="56"]')).toBeTruthy();
  });

  test('disables roll controls when the engine is waiting for an action', () => {
    renderDevGame({
      turnState: createTurnState({ phase: TURN_PHASES.WAITING_FOR_ACTION }),
    });

    expect(screen.getByRole('button', { name: 'Roll dice' })).toBeDisabled();
    [1, 2, 3, 4, 5, 6].forEach((value) => {
      expect(screen.getByRole('button', { name: String(value) })).toBeDisabled();
    });
  });

  test('real dice submits one generated roll and temporarily disables deterministic controls', () => {
    jest.useFakeTimers();
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.66);
    const engine = renderDevGame();

    fireEvent.click(screen.getByRole('button', { name: 'Roll dice' }));

    expect(engine.registerRoll).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Rolling dice' })).toBeDisabled();
    [1, 2, 3, 4, 5, 6].forEach((value) => {
      expect(screen.getByRole('button', { name: String(value) })).toBeDisabled();
    });

    act(() => {
      jest.advanceTimersByTime(DICE_ANIMATION_DURATION_MS);
    });

    expect(engine.registerRoll).toHaveBeenCalledTimes(1);
    expect(engine.registerRoll).toHaveBeenCalledWith(4);
    expect(screen.getByText('Rolled 4')).toBeInTheDocument();

    randomSpy.mockRestore();
    jest.useRealTimers();
  });

  test('renders and executes an exitHome action without manual destination selection', () => {
    const action = {
      type: EXECUTABLE_ACTION_TYPES.EXIT_HOME,
      characterId: 'blue.iceMage',
      destination: { type: 'common', square: 56 },
      occupantRemoval: { required: false, removableCharacterIds: [], isCapture: false, grantsCaptureReward: false },
    };
    const turnState = createTurnState({ phase: TURN_PHASES.WAITING_FOR_ACTION, availableActions: [action] });
    const engine = renderDevGame({ turnState, availableActions: [action] });

    expect(screen.getByText('Mago de hielo (blue.iceMage)')).toBeInTheDocument();
    expect(screen.getByText('common 56')).toBeInTheDocument();
    expect(screen.queryByText(/select destination/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Execute' }));

    expect(engine.executeAction).toHaveBeenCalledWith(action);
  });

  test('passes removeCharacterId for exitHome occupant removal', () => {
    const action = {
      type: EXECUTABLE_ACTION_TYPES.EXIT_HOME,
      characterId: 'blue.iceMage',
      destination: { type: 'common', square: 56 },
      occupantRemoval: {
        required: true,
        removableCharacterIds: ['red.warrior', 'blue.hunter'],
        isCapture: false,
        grantsCaptureReward: false,
      },
    };
    const turnState = createTurnState({ phase: TURN_PHASES.WAITING_FOR_ACTION, availableActions: [action] });
    const engine = renderDevGame({ turnState, availableActions: [action] });

    fireEvent.change(screen.getByLabelText(/remove occupant/i), { target: { value: 'blue.hunter' } });
    fireEvent.click(screen.getByRole('button', { name: 'Execute' }));

    expect(engine.executeAction).toHaveBeenCalledWith(action, { removeCharacterId: 'blue.hunter' });
  });

  test('renders normalMovement details and executes the real action object', () => {
    const action = {
      type: EXECUTABLE_ACTION_TYPES.NORMAL_MOVEMENT,
      characterId: 'blue.hunter',
      movement: {
        legal: true,
        destination: { type: 'common', square: 28 },
        path: [{ type: 'common', square: 23 }, { type: 'common', square: 28 }],
        outcome: { type: 'empty' },
      },
    };
    const turnState = createTurnState({ phase: TURN_PHASES.WAITING_FOR_ACTION, availableActions: [action] });
    const engine = renderDevGame({ turnState, availableActions: [action] });

    expect(screen.getByText('common 23 -> common 28')).toBeInTheDocument();
    expect(screen.getByText(JSON.stringify({ type: 'empty' }))).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Execute' }));

    expect(engine.executeAction).toHaveBeenCalledWith(action);
  });

  test('renders breakBarrier details and executes the real action object', () => {
    const action = {
      type: EXECUTABLE_ACTION_TYPES.BREAK_BARRIER,
      characterId: 'blue.hunter',
      barrier: {
        position: { type: 'common', square: 56 },
        occupantCharacterIds: ['blue.iceMage', 'blue.hunter'],
      },
      movement: {
        legal: true,
        destination: { type: 'common', square: 28 },
        path: [{ type: 'common', square: 23 }, { type: 'common', square: 28 }],
        outcome: { type: 'empty' },
      },
    };
    const turnState = createTurnState({ phase: TURN_PHASES.WAITING_FOR_ACTION, availableActions: [action] });
    const engine = renderDevGame({ turnState, availableActions: [action] });

    expect(screen.getByText('common 56 | blue.iceMage, blue.hunter')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Execute' }));

    expect(engine.executeAction).toHaveBeenCalledWith(action);
  });

  test('renders reward choices and delegates executeRewardChoice', () => {
    const rewardAction = {
      type: REWARD_ACTION_TYPES.GOAL_REWARD_MOVEMENT,
      characterId: 'blue.hunter',
      steps: 10,
      movement: {
        legal: true,
        destination: { type: 'common', square: 35 },
        path: [{ type: 'common', square: 35 }],
        outcome: { type: 'empty' },
      },
    };
    const turnState = createTurnState({
      phase: TURN_PHASES.WAITING_FOR_REWARD_CHOICE,
      pendingReward: { type: REWARD_TYPES.GOAL_REWARD, sourceCharacterId: 'blue.alchemist', steps: 10 },
      availableRewardActions: [rewardAction],
    });
    const engine = renderDevGame({
      turnState,
      pendingReward: turnState.pendingReward,
      availableRewardActions: [rewardAction],
    });

    expect(screen.getAllByText(/goalReward/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Execute reward' }));

    expect(engine.executeRewardChoice).toHaveBeenCalledWith(rewardAction);
  });

  test('shows positions directly from GameState', () => {
    renderDevGame();

    const table = screen.getByRole('table');

    expect(within(table).getByText('Mago de hielo')).toBeInTheDocument();
    expect(within(table).getAllByText('HOME').length).toBeGreaterThan(0);
    expect(within(table).getByText('common 5')).toBeInTheDocument();
    expect(within(table).getByText('finalLane blue 3')).toBeInTheDocument();
    expect(within(table).getByText('GOAL')).toBeInTheDocument();
  });

  test('shows only last events without mutating state', () => {
    const engine = renderDevGame({
      lastEvents: [
        {
          type: EXECUTION_EVENT_TYPES.CHARACTER_EXITED_HOME,
          characterId: 'blue.iceMage',
          from: { type: 'home' },
          to: { type: 'common', square: 56 },
        },
        {
          type: EXECUTION_EVENT_TYPES.BARRIER_BROKEN,
          characterId: 'blue.hunter',
          position: { type: 'common', square: 56 },
          occupantCharacterIds: ['blue.iceMage', 'blue.hunter'],
        },
      ],
    });

    expect(screen.getByText(/exited HOME to common 56/)).toBeInTheDocument();
    expect(screen.getByText(/broke barrier at common 56/)).toBeInTheDocument();
    expect(engine.gameState.players[1].characters[0].position).toEqual({ type: 'home' });
  });

  test('shows automatic capture reward movement in last events without reward choices', () => {
    renderDevGame({
      lastEvents: [
        {
          type: EXECUTION_EVENT_TYPES.CHARACTER_MOVED,
          characterId: 'blue.hunter',
          from: { type: 'common', square: 58 },
          to: { type: 'common', square: 61 },
          steps: 3,
          actionType: EXECUTABLE_ACTION_TYPES.NORMAL_MOVEMENT,
        },
        {
          type: EXECUTION_EVENT_TYPES.CHARACTER_CAPTURED,
          characterId: 'blue.hunter',
          capturedCharacterId: 'red.warrior',
        },
        {
          type: EXECUTION_EVENT_TYPES.CHARACTER_MOVED,
          characterId: 'blue.hunter',
          from: { type: 'common', square: 61 },
          to: { type: 'common', square: 13 },
          steps: 20,
          actionType: REWARD_TYPES.CAPTURE_REWARD,
        },
      ],
    });

    expect(screen.getByText(/Cazador .* moved common 61 -> common 13 \(captureReward, 20 steps\)/)).toBeInTheDocument();
    expect(within(screen.getByLabelText('Reward actions')).getByText('No reward choices available.')).toBeInTheDocument();
  });

  test('reflects current player and repeat-roll state from GameFlow', () => {
    renderDevGame({
      turnState: createTurnState({ phase: TURN_PHASES.WAITING_FOR_ROLL, currentRoll: null, consecutiveSixes: 1 }),
    });

    expect(screen.getByText('Player B (player-b)')).toBeInTheDocument();
    expect(within(screen.getByLabelText('Game status')).getByText('1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '6' })).toBeEnabled();
  });
});
