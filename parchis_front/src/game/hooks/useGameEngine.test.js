import { act, renderHook } from '@testing-library/react';
import {
  EXECUTABLE_ACTION_TYPES,
  EXECUTION_EVENT_TYPES,
  GAME_PHASES,
  POSITION_TYPES,
  TURN_PHASES,
} from '../engine';
import { useGameEngine } from './useGameEngine';

function getCharacter(gameState, characterId) {
  return gameState.players
    .flatMap((player) => player.characters)
    .find((character) => character.id === characterId);
}

describe('useGameEngine', () => {
  test('initializes a fixed local game through Game Setup and Game Flow', () => {
    const { result } = renderHook(() => useGameEngine());

    expect(result.current.gameState.phase).toBe(GAME_PHASES.IN_PROGRESS);
    expect(result.current.gameState.players.map((player) => ({
      id: player.id,
      name: player.name,
      factionId: player.factionId,
    }))).toEqual([
      { id: 'player-a', name: 'Player A', factionId: 'red' },
      { id: 'player-b', name: 'Player B', factionId: 'blue' },
    ]);
    expect(result.current.gameState.turnOrder).toEqual(['player-b', 'player-a']);
    expect(result.current.gameState.currentPlayerId).toBe('player-b');
    expect(result.current.turnState.playerId).toBe('player-b');
    expect(result.current.turnState.factionId).toBe('blue');
    expect(result.current.currentPlayer.id).toBe('player-b');
    expect(result.current.availableActions).toEqual([]);
    expect(result.current.pendingReward).toBe(null);
    expect(result.current.availableRewardActions).toEqual([]);
    expect(result.current.lastEvents).toEqual([]);
  });

  test('registerRoll delegates to the engine and exposes roll 5 home-exit actions', () => {
    const { result } = renderHook(() => useGameEngine());

    act(() => {
      result.current.registerRoll(5);
    });

    expect(result.current.turnState.phase).toBe(TURN_PHASES.WAITING_FOR_ACTION);
    expect(result.current.turnState.currentRoll).toBe(5);
    expect(result.current.availableActions).toHaveLength(4);
    expect(result.current.availableActions.every((action) => action.type === EXECUTABLE_ACTION_TYPES.EXIT_HOME)).toBe(true);
    expect(result.current.availableActions.every((action) => action.destination?.type === POSITION_TYPES.COMMON)).toBe(true);
    expect(result.current.lastEvents).toEqual([]);
  });

  test('executeAction delegates a real available action and updates the engine flow', () => {
    const { result } = renderHook(() => useGameEngine());

    act(() => {
      result.current.registerRoll(5);
    });

    const action = result.current.availableActions[0];

    act(() => {
      result.current.executeAction(action);
    });

    expect(getCharacter(result.current.gameState, action.characterId).position).toEqual(action.destination);
    expect(result.current.gameState.currentPlayerId).toBe('player-a');
    expect(result.current.turnState.playerId).toBe('player-a');
    expect(result.current.lastEvents).toEqual([
      expect.objectContaining({
        type: EXECUTION_EVENT_TYPES.CHARACTER_EXITED_HOME,
        characterId: action.characterId,
      }),
    ]);
  });

  test('lastEvents only reflects the latest engine operation', () => {
    const { result } = renderHook(() => useGameEngine());

    act(() => {
      result.current.registerRoll(5);
    });

    const action = result.current.availableActions[0];

    act(() => {
      result.current.executeAction(action);
    });

    expect(result.current.lastEvents).toHaveLength(1);

    act(() => {
      result.current.registerRoll(1);
    });

    expect(result.current.lastEvents).toEqual([]);
  });

  test('executeRewardChoice delegates to the engine instead of handling rewards in React', () => {
    const { result } = renderHook(() => useGameEngine());
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      expect(() => {
        act(() => {
          result.current.executeRewardChoice({ type: 'unknown' });
        });
      }).toThrow('Turn phase must be waitingForRewardChoice.');
    } finally {
      consoleError.mockRestore();
    }
  });

  test('does not expose manual destination movement commands', () => {
    const { result } = renderHook(() => useGameEngine());

    expect(result.current.moveCharacterToBox).toBeUndefined();
    expect(result.current.moveToDestination).toBeUndefined();
    expect(result.current.selectDestination).toBeUndefined();
    expect(result.current.dispatch).toBeUndefined();
  });
});
