import { REWARD_ACTION_TYPES, REWARD_STATUS } from '../rewards/types';
import { getAvailableDecisionActions } from '../decisions/decisions';
import {
  cloneConsequence,
  createDecisionForConsequence,
  deriveConsequencesFromEvents,
  executeConsequence,
  getConsequenceAvailability,
} from './consequenceItems';
import { CONSEQUENCE_RESOLUTION_STATUS } from './types';

function assertArray(value, message) {
  if (!Array.isArray(value)) {
    throw new Error(message);
  }
}

function cloneMovement(movement) {
  if (!movement || typeof movement !== 'object') {
    return movement;
  }

  return {
    ...movement,
    destination: movement.destination ? { ...movement.destination } : movement.destination,
    path: Array.isArray(movement.path) ? movement.path.map((position) => ({ ...position })) : movement.path,
    outcome: movement.outcome ? { ...movement.outcome } : movement.outcome,
    terrainTriggers: Array.isArray(movement.terrainTriggers)
      ? movement.terrainTriggers.map(cloneValue)
      : movement.terrainTriggers,
  };
}

function cloneAction(action) {
  return {
    ...action,
    rewardSource: action.rewardSource ? { ...action.rewardSource } : action.rewardSource,
    movement: cloneMovement(action.movement),
  };
}

function cloneEvents(events) {
  return events.map((event) => ({ ...event }));
}

function cloneConsequences(consequences) {
  return consequences.map(cloneConsequence);
}

function createResolvedResult({ state, inputEvents, generatedEvents }) {
  const generatedEventsSnapshot = cloneEvents(generatedEvents);

  return {
    status: CONSEQUENCE_RESOLUTION_STATUS.RESOLVED,
    state,
    events: [...cloneEvents(inputEvents), ...cloneEvents(generatedEventsSnapshot)],
    generatedEvents: generatedEventsSnapshot,
  };
}

function createDecisionRequiredResult({
  state,
  inputEvents,
  generatedEvents,
  pendingDecision,
  availableDecisionActions,
  pendingConsequences,
}) {
  const generatedEventsSnapshot = cloneEvents(generatedEvents);

  return {
    status: CONSEQUENCE_RESOLUTION_STATUS.DECISION_REQUIRED,
    state,
    events: [...cloneEvents(inputEvents), ...cloneEvents(generatedEventsSnapshot)],
    generatedEvents: generatedEventsSnapshot,
    pendingConsequences: cloneConsequences(pendingConsequences),
    pendingDecision: cloneValue(pendingDecision),
    availableDecisionActions: availableDecisionActions.map(cloneAction),
  };
}

function cloneValue(value) {
  return value === undefined || value === null
    ? value
    : JSON.parse(JSON.stringify(value));
}

function createStoppedResult({ state, inputEvents, generatedEvents, stop }) {
  const generatedEventsSnapshot = cloneEvents(generatedEvents);

  return {
    status: CONSEQUENCE_RESOLUTION_STATUS.STOPPED,
    state,
    events: [...cloneEvents(inputEvents), ...cloneEvents(generatedEventsSnapshot)],
    generatedEvents: generatedEventsSnapshot,
    stop: { ...stop },
  };
}

function getStopResult({ shouldStop, state, inputEvents, generatedEvents, lastEvents }) {
  if (!shouldStop) {
    return null;
  }

  const stop = shouldStop({
    state,
    events: [...cloneEvents(inputEvents), ...cloneEvents(generatedEvents)],
    generatedEvents: cloneEvents(generatedEvents),
    lastEvents: cloneEvents(lastEvents),
  });

  if (!stop) {
    return null;
  }

  return createStoppedResult({ state, inputEvents, generatedEvents, stop });
}

function getAutomaticAction(availability) {
  if (availability.status === REWARD_STATUS.LOST) {
    return { type: REWARD_ACTION_TYPES.LOSE_REWARD };
  }

  if (availability.status === REWARD_STATUS.AVAILABLE) {
    if (availability.availableActions.length !== 1) {
      throw new Error('Available reward must expose exactly one action.');
    }

    return availability.availableActions[0];
  }

  return null;
}

export function resolveConsequences({ state, events, pendingConsequences = [], shouldStop = null }) {
  assertArray(events, 'events must be an array.');
  assertArray(pendingConsequences, 'pendingConsequences must be an array.');

  let currentState = state;
  const inputEvents = cloneEvents(events);
  const generatedEvents = [];
  const initialStop = getStopResult({
    shouldStop,
    state: currentState,
    inputEvents,
    generatedEvents,
    lastEvents: inputEvents,
  });

  if (initialStop) {
    return initialStop;
  }

  const consequenceQueue = [
    ...deriveConsequencesFromEvents({ state: currentState, events }),
    ...cloneConsequences(pendingConsequences),
  ];

  while (consequenceQueue.length > 0) {
    const queuedStop = getStopResult({
      shouldStop,
      state: currentState,
      inputEvents,
      generatedEvents,
      lastEvents: [],
    });

    if (queuedStop) {
      return queuedStop;
    }

    const consequence = consequenceQueue.shift();
    const availability = getConsequenceAvailability({ state: currentState, consequence });

    if (availability.status === REWARD_STATUS.CHOICE_REQUIRED) {
      const pendingDecision = createDecisionForConsequence(consequence);

      return createDecisionRequiredResult({
        state: currentState,
        inputEvents,
        generatedEvents,
        pendingDecision,
        availableDecisionActions: getAvailableDecisionActions({
          state: currentState,
          decision: pendingDecision,
        }),
        pendingConsequences: consequenceQueue,
      });
    }

    const action = getAutomaticAction(availability);
    const result = executeConsequence({
      state: currentState,
      consequence,
      action,
    });

    currentState = result.state;
    generatedEvents.push(...result.events.map((event) => ({ ...event })));

    const rewardStop = getStopResult({
      shouldStop,
      state: currentState,
      inputEvents,
      generatedEvents,
      lastEvents: result.events,
    });

    if (rewardStop) {
      return rewardStop;
    }

    const newConsequences = deriveConsequencesFromEvents({
      state: currentState,
      events: result.events,
    });
    consequenceQueue.unshift(...newConsequences);
  }

  return createResolvedResult({
    state: currentState,
    inputEvents,
    generatedEvents,
  });
}
