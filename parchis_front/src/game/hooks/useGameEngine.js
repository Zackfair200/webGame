import { useReducer } from 'react';
import * as Engine from '../engine';

const ACTION_TYPES = Object.freeze({
  REGISTER_ROLL: 'registerRoll',
  EXECUTE_ACTION: 'executeAction',
  EXECUTE_REWARD_CHOICE: 'executeRewardChoice',
});

function createInitialGameFlow() {
  const players = [
    { id: 'player-a', name: 'Player A' },
    { id: 'player-b', name: 'Player B' },
  ];
  const created = Engine.createGameSetup({ players });
  const withSelectionOrder = Engine.setFactionSelectionOrder({
    setupState: created,
    playerOrder: ['player-a', 'player-b'],
  });
  const withPlayerAFaction = Engine.chooseFaction({
    setupState: withSelectionOrder,
    playerId: 'player-a',
    factionId: Engine.FACTION_IDS.RED,
  });
  const withPlayerBFaction = Engine.chooseFaction({
    setupState: withPlayerAFaction,
    playerId: 'player-b',
    factionId: Engine.FACTION_IDS.BLUE,
  });
  const completedSetup = Engine.setGameSetupTurnOrder({
    setupState: withPlayerBFaction,
    playerOrder: ['player-b', 'player-a'],
  });
  const { gameState } = Engine.completeGameSetup({ setupState: completedSetup });

  return Engine.createGameFlow({ gameState });
}

function createInitialState() {
  return {
    gameFlow: createInitialGameFlow(),
    lastEvents: [],
  };
}

function applyGameFlowResult(result) {
  return {
    gameFlow: {
      gameState: result.gameState,
      turnState: result.turnState,
    },
    lastEvents: result.events || [],
  };
}

function gameEngineReducer(state, action) {
  if (action.type === ACTION_TYPES.REGISTER_ROLL) {
    return applyGameFlowResult(Engine.registerGameRoll({
      gameFlow: state.gameFlow,
      roll: action.value,
    }));
  }

  if (action.type === ACTION_TYPES.EXECUTE_ACTION) {
    return applyGameFlowResult(Engine.executeGameAction({
      gameFlow: state.gameFlow,
      action: action.action,
      choice: action.choice,
    }));
  }

  if (action.type === ACTION_TYPES.EXECUTE_REWARD_CHOICE) {
    return applyGameFlowResult(Engine.executeGameRewardChoice({
      gameFlow: state.gameFlow,
      action: action.action,
    }));
  }

  throw new Error(`Unknown game engine action: ${action.type}`);
}

export function useGameEngine() {
  const [state, dispatch] = useReducer(gameEngineReducer, undefined, createInitialState);
  const { gameFlow, lastEvents } = state;
  const { gameState, turnState } = gameFlow;

  return {
    gameFlow,
    gameState,
    turnState,
    currentPlayer: Engine.getCurrentPlayer(gameState),
    availableActions: turnState?.availableActions || [],
    pendingReward: turnState?.pendingReward || null,
    availableRewardActions: turnState?.availableRewardActions || [],
    lastEvents,
    registerRoll(value) {
      dispatch({ type: ACTION_TYPES.REGISTER_ROLL, value });
    },
    executeAction(action, choice) {
      dispatch({ type: ACTION_TYPES.EXECUTE_ACTION, action, choice });
    },
    executeRewardChoice(action) {
      dispatch({ type: ACTION_TYPES.EXECUTE_REWARD_CHOICE, action });
    },
  };
}

export default useGameEngine;
