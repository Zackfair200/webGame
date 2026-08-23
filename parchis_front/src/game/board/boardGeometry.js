import {
  COMMON_SQUARES,
  COMMON_SQUARE_COUNT,
  FACTION_IDS,
  FINAL_LANE_LENGTH,
  POSITION_TYPES,
} from '../engine';
import {
  CLASSIC_BOARD_VIEW_BOX_SIZE,
  CLASSIC_COMMON_CELLS,
  CLASSIC_GOAL,
  getClassicCommonCellById,
  getClassicFinalLaneCellsForFaction,
  getClassicHomeZone,
  pointListToSvg,
} from './classicBoardGeometry';

export const BOARD_VIEW_BOX_SIZE = CLASSIC_BOARD_VIEW_BOX_SIZE;
export const DEFAULT_HOME_TOKEN_SIZE = 72;
export const DEFAULT_GOAL_TOKEN_SIZE = 58;
export const SINGLE_OCCUPANT_TOKEN_SCALE = 0.76;
export const MULTI_OCCUPANT_TOKEN_MARGIN_SCALE = 0.1;

export const FACTION_VISUAL_ORDER = Object.freeze([
  FACTION_IDS.YELLOW,
  FACTION_IDS.GREEN,
  FACTION_IDS.BLUE,
  FACTION_IDS.RED,
]);

function getPointCoordinate(point) {
  if (!point) {
    return null;
  }

  return {
    x: point.x,
    y: point.y,
  };
}

function createTokenCoordinate(point, tokenSize) {
  const coordinate = getPointCoordinate(point);

  if (!coordinate) {
    return null;
  }

  return {
    ...coordinate,
    tokenSize,
  };
}

function getCellCoordinate(cell) {
  if (!cell) {
    return null;
  }

  return {
    x: cell.center.x,
    y: cell.center.y,
  };
}

function getTokenSizeForCell(cell, totalOccupants) {
  const minimumSide = Math.min(cell.width, cell.height);

  if (totalOccupants <= 1) {
    return minimumSide * SINGLE_OCCUPANT_TOKEN_SCALE;
  }

  if (totalOccupants === 2) {
    const maximumSide = Math.max(cell.width, cell.height);
    const margin = minimumSide * MULTI_OCCUPANT_TOKEN_MARGIN_SCALE;

    return Math.min(
      minimumSide - (margin * 2),
      (maximumSide - (margin * 3)) / 2,
    );
  }

  return minimumSide * 0.32;
}

function getTwoOccupantOffset(cell, tokenSize, slotIndex) {
  const margin = Math.min(cell.width, cell.height) * MULTI_OCCUPANT_TOKEN_MARGIN_SCALE;
  const offset = (tokenSize / 2) + (margin / 2);

  if (cell.width >= cell.height) {
    return {
      x: slotIndex === 0 ? -offset : offset,
      y: 0,
    };
  }

  return {
    x: 0,
    y: slotIndex === 0 ? -offset : offset,
  };
}

export function getPositionKey(position, fallbackFactionId) {
  if (!position || !position.type) {
    return 'unknown';
  }

  if (position.type === POSITION_TYPES.HOME) {
    return `home:${fallbackFactionId}`;
  }

  if (position.type === POSITION_TYPES.COMMON) {
    return `common:${position.square}`;
  }

  if (position.type === POSITION_TYPES.FINAL_LANE) {
    return `finalLane:${position.factionId}:${position.index}`;
  }

  if (position.type === POSITION_TYPES.GOAL) {
    return 'goal';
  }

  return `unknown:${position.type}`;
}

export function getBoardCell(position, fallbackFactionId) {
  if (!position || !position.type) {
    return null;
  }

  if (position.type === POSITION_TYPES.HOME) {
    return getClassicHomeZone(fallbackFactionId);
  }

  if (position.type === POSITION_TYPES.COMMON) {
    return getClassicCommonCellById(position.square);
  }

  if (position.type === POSITION_TYPES.FINAL_LANE) {
    return getClassicFinalLaneCellsForFaction(position.factionId)
      .find((cell) => cell.index === position.index) || null;
  }

  if (position.type === POSITION_TYPES.GOAL) {
    return CLASSIC_GOAL.bounds;
  }

  return null;
}

export function getBoardCoordinate(position, fallbackFactionId) {
  const cell = getBoardCell(position, fallbackFactionId);

  return getCellCoordinate(cell);
}

export function getCharacterSlotCoordinate(position, fallbackFactionId, slotIndex = 0, totalOccupants = 1) {
  if (!position || !position.type) {
    return null;
  }

  if (position.type === POSITION_TYPES.HOME) {
    const home = getClassicHomeZone(fallbackFactionId);
    const slot = home?.slots?.[slotIndex % home.slots.length];

    return createTokenCoordinate(slot, DEFAULT_HOME_TOKEN_SIZE);
  }

  if (position.type === POSITION_TYPES.GOAL) {
    if (totalOccupants <= 1) {
      return createTokenCoordinate(CLASSIC_GOAL.center, DEFAULT_GOAL_TOKEN_SIZE);
    }

    return createTokenCoordinate(CLASSIC_GOAL.slots[slotIndex % CLASSIC_GOAL.slots.length], DEFAULT_GOAL_TOKEN_SIZE);
  }

  const cell = getBoardCell(position, fallbackFactionId);
  const coordinate = getCellCoordinate(cell);

  if (!cell || !coordinate) {
    return null;
  }

  if (totalOccupants <= 1) {
    return {
      ...coordinate,
      tokenSize: getTokenSizeForCell(cell, totalOccupants),
    };
  }

  if (totalOccupants === 2) {
    const tokenSize = getTokenSizeForCell(cell, totalOccupants);
    const offset = getTwoOccupantOffset(cell, tokenSize, slotIndex);

    return {
      x: coordinate.x + offset.x,
      y: coordinate.y + offset.y,
      tokenSize,
    };
  }

  const radius = Math.min(cell.width, cell.height) * 0.26;
  const angle = (-Math.PI / 2) + ((Math.PI * 2 * slotIndex) / totalOccupants);

  return {
    x: coordinate.x + Math.cos(angle) * radius,
    y: coordinate.y + Math.sin(angle) * radius,
    tokenSize: getTokenSizeForCell(cell, totalOccupants),
  };
}

export function getTokenBounds(coordinate) {
  if (!coordinate || !coordinate.tokenSize) {
    return null;
  }

  const radius = coordinate.tokenSize / 2;

  return {
    x: coordinate.x - radius,
    y: coordinate.y - radius,
    width: coordinate.tokenSize,
    height: coordinate.tokenSize,
    right: coordinate.x + radius,
    bottom: coordinate.y + radius,
  };
}

export function tokenBoundsFitInsideBoard(coordinate) {
  const bounds = getTokenBounds(coordinate);

  return Boolean(
    bounds &&
    bounds.x >= 0 &&
    bounds.y >= 0 &&
    bounds.right <= BOARD_VIEW_BOX_SIZE &&
    bounds.bottom <= BOARD_VIEW_BOX_SIZE,
  );
}

export function tokenBoundsFitInsideCell(coordinate, cell) {
  const bounds = getTokenBounds(coordinate);

  return Boolean(
    bounds &&
    cell &&
    bounds.x >= cell.x &&
    bounds.y >= cell.y &&
    bounds.right <= cell.x + cell.width &&
    bounds.bottom <= cell.y + cell.height,
  );
}

export function getCommonBoardSlots() {
  return COMMON_SQUARES.map((square) => {
    const cell = getClassicCommonCellById(square);

    return {
      key: `common:${square}`,
      square,
      cell,
      coordinate: getCellCoordinate(cell),
    };
  });
}

export function getFinalLaneBoardSlots(factionId) {
  return Array.from({ length: FINAL_LANE_LENGTH }, (_, index) => {
    const cell = getClassicFinalLaneCellsForFaction(factionId).find((candidate) => candidate.index === index + 1);

    return {
      key: `finalLane:${factionId}:${index + 1}`,
      factionId,
      index: index + 1,
      cell,
      coordinate: getCellCoordinate(cell),
    };
  });
}

export function getHomeZone(factionId) {
  return getClassicHomeZone(factionId);
}

export function getHomeSlots(factionId) {
  const home = getClassicHomeZone(factionId);

  return home?.slots.map((slot) => ({
    center: slot,
  })) || [];
}

export function getHomeCoordinate(factionId) {
  return getCellCoordinate(getClassicHomeZone(factionId));
}

export function getGoalCell() {
  return CLASSIC_GOAL.bounds;
}

export function getGoalPoints() {
  return CLASSIC_GOAL.points;
}

export function getGoalPointsSvg() {
  return pointListToSvg(CLASSIC_GOAL.points);
}

export function getGoalCoordinate() {
  return getPointCoordinate(CLASSIC_GOAL.center);
}

export function getVisualPathCoordinates(action, character) {
  const path = action?.movement?.path || [];

  if (path.length > 0) {
    return path.map((position) => getBoardCoordinate(position, character?.factionId)).filter(Boolean);
  }

  if (action?.destination) {
    return [getBoardCoordinate(action.destination, character?.factionId)].filter(Boolean);
  }

  return [];
}

export function getAllCommonCoordinates() {
  return CLASSIC_COMMON_CELLS.reduce((cells, cell) => ({
    ...cells,
    [cell.id]: cell,
  }), {});
}

export function getAllFinalLaneCoordinates() {
  return Object.values(FACTION_IDS).reduce((lanes, factionId) => ({
    ...lanes,
    [factionId]: getClassicFinalLaneCellsForFaction(factionId).reduce((cells, cell) => ({
      ...cells,
      [cell.index]: cell,
    }), {}),
  }), {});
}

export function getBoardPositionForKey(positionKey) {
  if (positionKey === 'goal') {
    return getGoalCoordinate();
  }

  const [type, factionOrSquare, index] = positionKey.split(':');

  if (type === 'home') {
    return getHomeCoordinate(factionOrSquare);
  }

  if (type === 'common') {
    return getCellCoordinate(getClassicCommonCellById(Number(factionOrSquare)));
  }

  if (type === 'finalLane') {
    const cell = getClassicFinalLaneCellsForFaction(factionOrSquare)
      .find((candidate) => candidate.index === Number(index));

    return getCellCoordinate(cell);
  }

  return null;
}

export function getExpectedCommonSlotCount() {
  return COMMON_SQUARE_COUNT;
}
