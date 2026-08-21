import { COMMON_SQUARE_COUNT, FINAL_LANE_LENGTH } from '../board/board';
import { ROUTES_BY_FACTION } from '../board/routes';
import { getFactionIds } from '../factions/factions';
import { POSITION_TYPES, createFinalLanePosition } from '../state/positions';

export const MOVEMENT_FAILURE_REASONS = Object.freeze({
  MOVEMENT_BEYOND_FINAL_LANE_START: 'movementBeyondFinalLaneStart',
});

function assertValidFaction(factionId) {
  if (!getFactionIds().includes(factionId)) {
    throw new Error(`Invalid faction id: ${factionId}`);
  }
}

function assertValidSteps(steps) {
  if (!Number.isInteger(steps) || steps <= 0) {
    throw new Error('Movement steps must be a positive integer.');
  }
}

function assertValidPositionForFaction(from, factionId) {
  if (!from || !from.type) {
    throw new Error('Movement requires an initial position.');
  }

  if (from.type === POSITION_TYPES.HOME) {
    throw new Error('Cannot calculate movement from home.');
  }

  if (from.type === POSITION_TYPES.GOAL) {
    throw new Error('Cannot calculate movement from goal.');
  }

  if (from.type === POSITION_TYPES.COMMON) {
    if (!Number.isInteger(from.square) || from.square < 1 || from.square > COMMON_SQUARE_COUNT) {
      throw new Error(`Invalid common square: ${from.square}`);
    }
    return;
  }

  if (from.type === POSITION_TYPES.FINAL_LANE) {
    if (from.factionId !== factionId) {
      throw new Error('Cannot move from another faction final lane.');
    }

    if (!Number.isInteger(from.index) || from.index < 1 || from.index > FINAL_LANE_LENGTH) {
      throw new Error(`Invalid final lane index: ${from.index}`);
    }
    return;
  }

  throw new Error(`Invalid position type: ${from.type}`);
}

function positionsMatch(left, right) {
  if (left.type !== right.type) {
    return false;
  }

  if (left.type === POSITION_TYPES.COMMON) {
    return left.square === right.square;
  }

  if (left.type === POSITION_TYPES.FINAL_LANE) {
    return left.factionId === right.factionId && left.index === right.index;
  }

  return true;
}

function findRouteIndex(route, position) {
  return route.findIndex((routePosition) => positionsMatch(routePosition, position));
}

function clonePosition(position) {
  return { ...position };
}

function calculateBouncePath(factionId, stepsBeyondGoal) {
  if (stepsBeyondGoal > FINAL_LANE_LENGTH) {
    return {
      ok: false,
      reason: MOVEMENT_FAILURE_REASONS.MOVEMENT_BEYOND_FINAL_LANE_START,
    };
  }

  return {
    ok: true,
    path: Array.from({ length: stepsBeyondGoal }, (_, index) =>
      createFinalLanePosition(factionId, FINAL_LANE_LENGTH - index),
    ),
  };
}

function calculateMovementGeometry({ factionId, from, steps }) {
  assertValidFaction(factionId);
  assertValidSteps(steps);
  assertValidPositionForFaction(from, factionId);

  const route = ROUTES_BY_FACTION[factionId];
  const currentIndex = findRouteIndex(route, from);

  if (currentIndex === -1) {
    throw new Error('Initial position does not belong to faction route.');
  }

  const goalIndex = route.length - 1;
  const destinationIndex = currentIndex + steps;

  if (destinationIndex <= goalIndex) {
    const path = route.slice(currentIndex + 1, destinationIndex + 1);

    return {
      ok: true,
      path,
      destination: path[path.length - 1],
    };
  }

  const bounceResult = calculateBouncePath(factionId, destinationIndex - goalIndex);

  if (!bounceResult.ok) {
    return bounceResult;
  }

  const path = [...route.slice(currentIndex + 1, goalIndex + 1), ...bounceResult.path];

  return {
    ok: true,
    path,
    destination: path[path.length - 1],
  };
}

export function calculateDestination(input) {
  const result = calculateMovementGeometry(input);

  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    destination: clonePosition(result.destination),
  };
}

export function calculateMovementPath(input) {
  const result = calculateMovementGeometry(input);

  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    path: result.path.map(clonePosition),
  };
}
