import { COMMON_SQUARE_COUNT, FINAL_LANE_LENGTH } from '../board/constants';
import { getFactionIds } from '../factions/factions';

export const POSITION_TYPES = Object.freeze({
  HOME: 'home',
  COMMON: 'common',
  FINAL_LANE: 'finalLane',
  GOAL: 'goal',
});

export function createHomePosition() {
  return { type: POSITION_TYPES.HOME };
}

export function createCommonPosition(square) {
  return { type: POSITION_TYPES.COMMON, square };
}

export function createFinalLanePosition(factionId, index) {
  return { type: POSITION_TYPES.FINAL_LANE, factionId, index };
}

export function createGoalPosition() {
  return { type: POSITION_TYPES.GOAL };
}

export function isValidPosition(position) {
  if (!position || !position.type) {
    return false;
  }

  if (position.type === POSITION_TYPES.HOME || position.type === POSITION_TYPES.GOAL) {
    return true;
  }

  if (position.type === POSITION_TYPES.COMMON) {
    return (
      Number.isInteger(position.square) &&
      position.square >= 1 &&
      position.square <= COMMON_SQUARE_COUNT
    );
  }

  if (position.type === POSITION_TYPES.FINAL_LANE) {
    return (
      getFactionIds().includes(position.factionId) &&
      Number.isInteger(position.index) &&
      position.index >= 1 &&
      position.index <= FINAL_LANE_LENGTH
    );
  }

  return false;
}

export function isSamePosition(left, right) {
  if (!isValidPosition(left) || !isValidPosition(right) || left.type !== right.type) {
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

export function isPlayablePosition(position) {
  return (
    isValidPosition(position) &&
    (position.type === POSITION_TYPES.COMMON || position.type === POSITION_TYPES.FINAL_LANE)
  );
}

export function getPlayablePositionKey(position) {
  if (!isPlayablePosition(position)) {
    throw new Error('A playable position is required to create a position key.');
  }

  if (position.type === POSITION_TYPES.COMMON) {
    return `common:${position.square}`;
  }

  return `finalLane:${position.factionId}:${position.index}`;
}

export function clonePosition(position) {
  return { ...position };
}
