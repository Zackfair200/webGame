import { executeAction } from '../actions/executeAction';
import { EXECUTABLE_ACTION_TYPES } from '../actions/types';
import { resolveConsequences } from '../consequences/resolveConsequences';
import { CONSEQUENCE_RESOLUTION_STATUS } from '../consequences/types';
import { executeDecision, isSameDecisionAction } from '../decisions/decisions';
import { getMovableCharacters } from '../rules/movableCharacters/movableCharacters';
import { getAvailableRollFiveActions } from '../rules/rollFive/rollFive';
import { getAvailableRollSixActions } from '../rules/rollSix/rollSix';
import { getCharactersFromState } from '../state/characters';
import { applyThirdSixPenalty } from './turnPenalty';
import {
  TURN_AFTER_CONSEQUENCES,
  TURN_END_REASONS,
  TURN_PHASES,
} from './types';
import { assertTurnState } from './turnValidation';

function cloneValue(value) {
  if (value === undefined || value === null) {
    return value;
  }

  return JSON.parse(JSON.stringify(value));
}

function assertRoll(roll) {
  if (!Number.isInteger(roll) || roll < 1 || roll > 6) {
    throw new Error(`Unsupported roll: ${roll}. Roll must be an integer from 1 to 6.`);
  }
}

function assertPhase(turnState, phase) {
  assertTurnState(turnState);

  if (!turnState || turnState.phase !== phase) {
    throw new Error(`Turn phase must be ${phase}.`);
  }
}

function createNormalMovementActions({ state, factionId, steps, characters }) {
  const { movableCharacters } = getMovableCharacters({
    factionId,
    steps,
    characters,
    gameState: state,
  });

  return movableCharacters.map(({ characterId, movement }) => ({
    type: EXECUTABLE_ACTION_TYPES.NORMAL_MOVEMENT,
    characterId,
    movement,
  }));
}

function getAvailableDiceActions({ state, factionId, roll }) {
  const characters = getCharactersFromState(state);

  if (roll === 5) {
    return getAvailableRollFiveActions({ factionId, characters, gameState: state }).availableActions;
  }

  if (roll === 6) {
    return getAvailableRollSixActions({ factionId, characters, gameState: state }).availableActions;
  }

  return createNormalMovementActions({ state, factionId, steps: roll, characters });
}

function finishTurn({ turnState, reason, events }) {
  return {
    ...turnState,
    phase: TURN_PHASES.ENDED,
    currentRoll: null,
    availableActions: [],
    pendingDecision: null,
    availableDecisionActions: [],
    pendingConsequences: [],
    events: [...turnState.events, ...events.map(cloneValue)],
    endReason: reason,
    afterConsequences: null,
  };
}

function waitForNextRoll({ turnState, events }) {
  return {
    ...turnState,
    phase: TURN_PHASES.WAITING_FOR_ROLL,
    currentRoll: null,
    availableActions: [],
    pendingDecision: null,
    availableDecisionActions: [],
    pendingConsequences: [],
    events: [...turnState.events, ...events.map(cloneValue)],
    endReason: null,
    afterConsequences: null,
  };
}

function createDecisionRequiredTurnState({ turnState, resolution }) {
  return {
    ...turnState,
    phase: TURN_PHASES.WAITING_FOR_DECISION,
    availableActions: [],
    pendingDecision: cloneValue(resolution.pendingDecision),
    availableDecisionActions: resolution.availableDecisionActions.map(cloneValue),
    pendingConsequences: resolution.pendingConsequences.map(cloneValue),
    events: [...turnState.events, ...resolution.events.map(cloneValue)],
    endReason: null,
  };
}

function advanceAfterConsequences({ turnState, events }) {
  if (turnState.afterConsequences === TURN_AFTER_CONSEQUENCES.WAIT_FOR_ROLL) {
    return waitForNextRoll({ turnState, events });
  }

  return finishTurn({
    turnState,
    reason: TURN_END_REASONS.COMPLETED,
    events,
  });
}

function resolveTurnConsequences({
  state,
  turnState,
  events,
  pendingConsequences = [],
  shouldStopConsequences = null,
}) {
  const resolution = resolveConsequences({
    state,
    events,
    pendingConsequences,
    shouldStop: shouldStopConsequences,
  });

  if (resolution.status === CONSEQUENCE_RESOLUTION_STATUS.STOPPED) {
    return {
      state: resolution.state,
      turnState: finishTurn({
        turnState,
        reason: TURN_END_REASONS.STOPPED,
        events: resolution.events,
      }),
      events: resolution.events.map(cloneValue),
      stop: cloneValue(resolution.stop),
    };
  }

  if (resolution.status === CONSEQUENCE_RESOLUTION_STATUS.DECISION_REQUIRED) {
    return {
      state: resolution.state,
      turnState: createDecisionRequiredTurnState({ turnState, resolution }),
      events: resolution.events.map(cloneValue),
    };
  }

  return {
    state: resolution.state,
    turnState: advanceAfterConsequences({
      turnState,
      events: resolution.events,
    }),
    events: resolution.events.map(cloneValue),
  };
}

function findAvailableAction(availableActions, action) {
  return availableActions.find(
    (candidate) => candidate.type === action?.type && candidate.characterId === action?.characterId,
  );
}

function appendDiceMove({ turnState, action }) {
  return {
    ...turnState,
    diceMoveHistory: [
      ...turnState.diceMoveHistory.map(cloneValue),
      {
        characterId: action.characterId,
        actionType: action.type,
        roll: turnState.currentRoll,
      },
    ],
  };
}

export function registerTurnRoll({ state, turnState, roll }) {
  assertPhase(turnState, TURN_PHASES.WAITING_FOR_ROLL);
  assertRoll(roll);

  const consecutiveSixes = roll === 6 ? turnState.consecutiveSixes + 1 : 0;
  const baseTurnState = {
    ...turnState,
    consecutiveSixes,
    currentRoll: roll,
    availableActions: [],
    pendingDecision: null,
    availableDecisionActions: [],
    pendingConsequences: [],
    endReason: null,
  };

  if (consecutiveSixes === 3) {
    const penalty = applyThirdSixPenalty({
      state,
      turnState: {
        ...baseTurnState,
        phase: TURN_PHASES.ENDED,
        currentRoll: null,
        endReason: TURN_END_REASONS.THIRD_SIX_PENALTY,
        afterConsequences: null,
      },
    });

    return {
      state: penalty.state,
      turnState: finishTurn({
        turnState: baseTurnState,
        reason: TURN_END_REASONS.THIRD_SIX_PENALTY,
        events: penalty.events,
      }),
      events: penalty.events.map(cloneValue),
    };
  }

  const availableActions = getAvailableDiceActions({
    state,
    factionId: turnState.factionId,
    roll,
  });

  if (availableActions.length === 0) {
    if (roll === 6) {
      return {
        state,
        turnState: waitForNextRoll({ turnState: baseTurnState, events: [] }),
        events: [],
      };
    }

    return {
      state,
      turnState: finishTurn({
        turnState: baseTurnState,
        reason: TURN_END_REASONS.NO_LEGAL_ACTION,
        events: [],
      }),
      events: [],
    };
  }

  return {
    state,
    turnState: {
      ...baseTurnState,
      phase: TURN_PHASES.WAITING_FOR_ACTION,
      availableActions: availableActions.map(cloneValue),
      afterConsequences:
        roll === 6 ? TURN_AFTER_CONSEQUENCES.WAIT_FOR_ROLL : TURN_AFTER_CONSEQUENCES.END_TURN,
    },
    events: [],
  };
}

export function executeTurnAction({ state, turnState, action, choice, shouldStopConsequences = null }) {
  assertPhase(turnState, TURN_PHASES.WAITING_FOR_ACTION);

  if (!findAvailableAction(turnState.availableActions, action)) {
    throw new Error('Action is not available for the current turn.');
  }

  const actionResult = executeAction({
    state,
    factionId: turnState.factionId,
    roll: turnState.currentRoll,
    action,
    choice,
  });
  const nextTurnState = appendDiceMove({ turnState, action });

  return resolveTurnConsequences({
    state: actionResult.state,
    turnState: nextTurnState,
    events: actionResult.events,
    shouldStopConsequences,
  });
}

export function executeTurnDecision({ state, turnState, action, shouldStopConsequences = null }) {
  assertPhase(turnState, TURN_PHASES.WAITING_FOR_DECISION);

  if (!turnState.availableDecisionActions.some((candidate) => isSameDecisionAction(candidate, action))) {
    throw new Error('Decision action is not available for the current turn.');
  }

  const decisionResult = executeDecision({
    state,
    decision: turnState.pendingDecision,
    action,
  });

  return resolveTurnConsequences({
    state: decisionResult.state,
    turnState,
    events: decisionResult.events,
    pendingConsequences: turnState.pendingConsequences,
    shouldStopConsequences,
  });
}
