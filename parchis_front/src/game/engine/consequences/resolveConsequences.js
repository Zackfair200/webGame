import { executeRewardAction } from '../rewards/executeRewardAction';
import { getAvailableRewardActions } from '../rewards/rewardAvailability';
import { deriveRewardsFromEvents } from '../rewards/rewardDetection';
import { REWARD_ACTION_TYPES, REWARD_STATUS } from '../rewards/types';
import { CONSEQUENCE_RESOLUTION_STATUS } from './types';

function assertArray(value, message) {
  if (!Array.isArray(value)) {
    throw new Error(message);
  }
}

function cloneReward(reward) {
  return { ...reward };
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
  };
}

function cloneAction(action) {
  return {
    ...action,
    movement: cloneMovement(action.movement),
  };
}

function cloneEvents(events) {
  return events.map((event) => ({ ...event }));
}

function cloneRewards(rewards) {
  return rewards.map(cloneReward);
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

function createChoiceRequiredResult({
  state,
  inputEvents,
  generatedEvents,
  pendingReward,
  availableActions,
  remainingRewards,
}) {
  const generatedEventsSnapshot = cloneEvents(generatedEvents);

  return {
    status: CONSEQUENCE_RESOLUTION_STATUS.CHOICE_REQUIRED,
    state,
    events: [...cloneEvents(inputEvents), ...cloneEvents(generatedEventsSnapshot)],
    generatedEvents: generatedEventsSnapshot,
    pendingReward: cloneReward(pendingReward),
    availableActions: availableActions.map(cloneAction),
    remainingRewards: cloneRewards(remainingRewards),
  };
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

export function resolveConsequences({ state, events, remainingRewards = [], shouldStop = null }) {
  assertArray(events, 'events must be an array.');
  assertArray(remainingRewards, 'remainingRewards must be an array.');

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

  const queue = [
    ...deriveRewardsFromEvents({ events }),
    ...cloneRewards(remainingRewards),
  ];

  while (queue.length > 0) {
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

    const reward = queue.shift();
    const availability = getAvailableRewardActions({ state: currentState, reward });

    if (availability.status === REWARD_STATUS.CHOICE_REQUIRED) {
      return createChoiceRequiredResult({
        state: currentState,
        inputEvents,
        generatedEvents,
        pendingReward: reward,
        availableActions: availability.availableActions,
        remainingRewards: queue,
      });
    }

    const action = getAutomaticAction(availability);
    const result = executeRewardAction({
      state: currentState,
      reward,
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

    const newRewards = deriveRewardsFromEvents({ events: result.events });
    queue.unshift(...newRewards);
  }

  return createResolvedResult({
    state: currentState,
    inputEvents,
    generatedEvents,
  });
}
