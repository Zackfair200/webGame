import { FACTION_IDS, LAST_COMMON_SQUARE_BY_FACTION, SAFE_SQUARES, START_SQUARE_BY_FACTION } from '../engine';

export const CLASSIC_BOARD_VIEW_BOX_SIZE = 1280;
export const CLASSIC_BOARD_CENTER = Object.freeze({ x: 640, y: 640 });

const BOARD_MIN = 20;
const BOARD_MAX = 1260;
const HOME_EDGE = 433.333;
const COMMON_A = 433.333;
const COMMON_B = 571.111;
const COMMON_C = 708.889;
const COMMON_D = 846.667;
const GOAL_NEAR = 502.416;
const GOAL_FAR = 777.584;
const OUTER_TRACK_LENGTH = HOME_EDGE - BOARD_MIN;
const TRACK_SEGMENT = OUTER_TRACK_LENGTH / 8;

export const COMMON_CELL_METADATA = Object.freeze([
  { id: 1, arm: 'bottom', lane: 'right-lane', index: 1 },
  { id: 2, arm: 'bottom', lane: 'right-lane', index: 2 },
  { id: 3, arm: 'bottom', lane: 'right-lane', index: 3 },
  { id: 4, arm: 'bottom', lane: 'right-lane', index: 4, finalEntryFaction: FACTION_IDS.RED },
  { id: 5, arm: 'bottom', lane: 'right-lane', index: 5, startFaction: FACTION_IDS.RED },
  { id: 6, arm: 'bottom', lane: 'right-lane', index: 6 },
  { id: 7, arm: 'bottom', lane: 'right-lane', index: 7 },
  { id: 8, arm: 'bottom', lane: 'right-lane', index: 8 },
  { id: 9, arm: 'right', lane: 'lower-lane', index: 1 },
  { id: 10, arm: 'right', lane: 'lower-lane', index: 2 },
  { id: 11, arm: 'right', lane: 'lower-lane', index: 3 },
  { id: 12, arm: 'right', lane: 'lower-lane', index: 4 },
  { id: 13, arm: 'right', lane: 'lower-lane', index: 5 },
  { id: 14, arm: 'right', lane: 'lower-lane', index: 6 },
  { id: 15, arm: 'right', lane: 'lower-lane', index: 7 },
  { id: 16, arm: 'right', lane: 'lower-lane', index: 8 },
  { id: 17, arm: 'right', lane: 'connector', index: 1 },
  { id: 18, arm: 'right', lane: 'upper-lane', index: 1 },
  { id: 19, arm: 'right', lane: 'upper-lane', index: 2 },
  { id: 20, arm: 'right', lane: 'upper-lane', index: 3 },
  { id: 21, arm: 'right', lane: 'upper-lane', index: 4, finalEntryFaction: FACTION_IDS.GREEN },
  { id: 22, arm: 'right', lane: 'upper-lane', index: 5, startFaction: FACTION_IDS.GREEN },
  { id: 23, arm: 'right', lane: 'upper-lane', index: 6 },
  { id: 24, arm: 'right', lane: 'upper-lane', index: 7 },
  { id: 25, arm: 'right', lane: 'upper-lane', index: 8 },
  { id: 26, arm: 'top', lane: 'right-lane', index: 1 },
  { id: 27, arm: 'top', lane: 'right-lane', index: 2 },
  { id: 28, arm: 'top', lane: 'right-lane', index: 3 },
  { id: 29, arm: 'top', lane: 'right-lane', index: 4 },
  { id: 30, arm: 'top', lane: 'right-lane', index: 5 },
  { id: 31, arm: 'top', lane: 'right-lane', index: 6 },
  { id: 32, arm: 'top', lane: 'right-lane', index: 7 },
  { id: 33, arm: 'top', lane: 'right-lane', index: 8 },
  { id: 34, arm: 'top', lane: 'connector', index: 1 },
  { id: 35, arm: 'top', lane: 'left-lane', index: 1 },
  { id: 36, arm: 'top', lane: 'left-lane', index: 2 },
  { id: 37, arm: 'top', lane: 'left-lane', index: 3 },
  { id: 38, arm: 'top', lane: 'left-lane', index: 4, finalEntryFaction: FACTION_IDS.YELLOW },
  { id: 39, arm: 'top', lane: 'left-lane', index: 5, startFaction: FACTION_IDS.YELLOW },
  { id: 40, arm: 'top', lane: 'left-lane', index: 6 },
  { id: 41, arm: 'top', lane: 'left-lane', index: 7 },
  { id: 42, arm: 'top', lane: 'left-lane', index: 8 },
  { id: 43, arm: 'left', lane: 'upper-lane', index: 1 },
  { id: 44, arm: 'left', lane: 'upper-lane', index: 2 },
  { id: 45, arm: 'left', lane: 'upper-lane', index: 3 },
  { id: 46, arm: 'left', lane: 'upper-lane', index: 4 },
  { id: 47, arm: 'left', lane: 'upper-lane', index: 5 },
  { id: 48, arm: 'left', lane: 'upper-lane', index: 6 },
  { id: 49, arm: 'left', lane: 'upper-lane', index: 7 },
  { id: 50, arm: 'left', lane: 'upper-lane', index: 8 },
  { id: 51, arm: 'left', lane: 'connector', index: 1 },
  { id: 52, arm: 'left', lane: 'lower-lane', index: 1 },
  { id: 53, arm: 'left', lane: 'lower-lane', index: 2 },
  { id: 54, arm: 'left', lane: 'lower-lane', index: 3 },
  { id: 55, arm: 'left', lane: 'lower-lane', index: 4, finalEntryFaction: FACTION_IDS.BLUE },
  { id: 56, arm: 'left', lane: 'lower-lane', index: 5, startFaction: FACTION_IDS.BLUE },
  { id: 57, arm: 'left', lane: 'lower-lane', index: 6 },
  { id: 58, arm: 'left', lane: 'lower-lane', index: 7 },
  { id: 59, arm: 'left', lane: 'lower-lane', index: 8 },
  { id: 60, arm: 'bottom', lane: 'left-lane', index: 1 },
  { id: 61, arm: 'bottom', lane: 'left-lane', index: 2 },
  { id: 62, arm: 'bottom', lane: 'left-lane', index: 3 },
  { id: 63, arm: 'bottom', lane: 'left-lane', index: 4 },
  { id: 64, arm: 'bottom', lane: 'left-lane', index: 5 },
  { id: 65, arm: 'bottom', lane: 'left-lane', index: 6 },
  { id: 66, arm: 'bottom', lane: 'left-lane', index: 7 },
  { id: 67, arm: 'bottom', lane: 'left-lane', index: 8 },
  { id: 68, arm: 'bottom', lane: 'connector', index: 1 },
].map((metadata) => Object.freeze({
  startFaction: null,
  finalEntryFaction: null,
  ...metadata,
  safe: SAFE_SQUARES.includes(metadata.id),
  previousId: metadata.id === 1 ? 68 : metadata.id - 1,
  nextId: metadata.id === 68 ? 1 : metadata.id + 1,
})));

function freezeRect(rect) {
  return Object.freeze({
    ...rect,
    center: Object.freeze({
      x: rect.x + (rect.width / 2),
      y: rect.y + (rect.height / 2),
    }),
  });
}

function createRectFromBounds({ id, factionId, type, index, x1, y1, x2, y2, metadata }) {
  return freezeRect({
    id,
    factionId,
    type,
    index,
    metadata,
    x: x1,
    y: y1,
    width: x2 - x1,
    height: y2 - y1,
  });
}

function edgeSegmentFromOuter(edge, index) {
  const offset = (index - 1) * TRACK_SEGMENT;

  if (edge === 'top' || edge === 'left') {
    return [BOARD_MIN + offset, BOARD_MIN + offset + TRACK_SEGMENT];
  }

  return [BOARD_MAX - offset - TRACK_SEGMENT, BOARD_MAX - offset];
}

function edgeSegmentFromInner(edge, index) {
  return edgeSegmentFromOuter(edge, 9 - index);
}

function getCommonBounds(metadata) {
  const { arm, lane, index } = metadata;

  if (arm === 'bottom' && lane === 'right-lane') {
    const [y1, y2] = edgeSegmentFromOuter('bottom', index);
    return { x1: COMMON_C, y1, x2: COMMON_D, y2 };
  }

  if (arm === 'bottom' && lane === 'left-lane') {
    const [y1, y2] = edgeSegmentFromInner('bottom', index);
    return { x1: COMMON_A, y1, x2: COMMON_B, y2 };
  }

  if (arm === 'bottom' && lane === 'connector') {
    const [y1, y2] = edgeSegmentFromOuter('bottom', 1);
    return { x1: COMMON_B, y1, x2: COMMON_C, y2 };
  }

  if (arm === 'right' && lane === 'lower-lane') {
    const [x1, x2] = edgeSegmentFromInner('right', index);
    return { x1, y1: COMMON_C, x2, y2: COMMON_D };
  }

  if (arm === 'right' && lane === 'upper-lane') {
    const [x1, x2] = edgeSegmentFromOuter('right', index);
    return { x1, y1: COMMON_A, x2, y2: COMMON_B };
  }

  if (arm === 'right' && lane === 'connector') {
    const [x1, x2] = edgeSegmentFromOuter('right', 1);
    return { x1, y1: COMMON_B, x2, y2: COMMON_C };
  }

  if (arm === 'top' && lane === 'right-lane') {
    const [y1, y2] = edgeSegmentFromInner('top', index);
    return { x1: COMMON_C, y1, x2: COMMON_D, y2 };
  }

  if (arm === 'top' && lane === 'left-lane') {
    const [y1, y2] = edgeSegmentFromOuter('top', index);
    return { x1: COMMON_A, y1, x2: COMMON_B, y2 };
  }

  if (arm === 'top' && lane === 'connector') {
    const [y1, y2] = edgeSegmentFromOuter('top', 1);
    return { x1: COMMON_B, y1, x2: COMMON_C, y2 };
  }

  if (arm === 'left' && lane === 'upper-lane') {
    const [x1, x2] = edgeSegmentFromInner('left', index);
    return { x1, y1: COMMON_A, x2, y2: COMMON_B };
  }

  if (arm === 'left' && lane === 'lower-lane') {
    const [x1, x2] = edgeSegmentFromOuter('left', index);
    return { x1, y1: COMMON_C, x2, y2: COMMON_D };
  }

  if (arm === 'left' && lane === 'connector') {
    const [x1, x2] = edgeSegmentFromOuter('left', 1);
    return { x1, y1: COMMON_B, x2, y2: COMMON_C };
  }

  throw new Error(`Unsupported common cell metadata: ${arm}/${lane}/${index}`);
}

function createCommonCells() {
  return Object.freeze(COMMON_CELL_METADATA.map((metadata) => createRectFromBounds({
    id: metadata.id,
    type: 'common',
    ...getCommonBounds(metadata),
    metadata,
  })));
}

function getFinalLaneBounds(factionId, index) {
  if (factionId === FACTION_IDS.YELLOW) {
    const [y1, y2] = edgeSegmentFromOuter('top', index + 1);
    return { x1: COMMON_B, y1, x2: COMMON_C, y2 };
  }

  if (factionId === FACTION_IDS.GREEN) {
    const [x1, x2] = edgeSegmentFromOuter('right', index + 1);
    return { x1, y1: COMMON_B, x2, y2: COMMON_C };
  }

  if (factionId === FACTION_IDS.BLUE) {
    const [x1, x2] = edgeSegmentFromOuter('left', index + 1);
    return { x1, y1: COMMON_B, x2, y2: COMMON_C };
  }

  if (factionId === FACTION_IDS.RED) {
    const [y1, y2] = edgeSegmentFromOuter('bottom', index + 1);
    return { x1: COMMON_B, y1, x2: COMMON_C, y2 };
  }

  throw new Error(`Unsupported final lane faction: ${factionId}`);
}

export const CLASSIC_COMMON_CELLS = createCommonCells();

export const CLASSIC_FINAL_LANE_CELLS = Object.freeze(
  Object.values(FACTION_IDS).flatMap((factionId) =>
    Array.from({ length: 7 }, (_, index) => createRectFromBounds({
      id: `${factionId}:${index + 1}`,
      factionId,
      index: index + 1,
      type: 'finalLane',
      ...getFinalLaneBounds(factionId, index + 1),
    })),
  ),
);

const HOME_ZONES = Object.freeze({
  [FACTION_IDS.YELLOW]: Object.freeze({ x: BOARD_MIN, y: BOARD_MIN }),
  [FACTION_IDS.GREEN]: Object.freeze({ x: COMMON_D, y: BOARD_MIN }),
  [FACTION_IDS.BLUE]: Object.freeze({ x: BOARD_MIN, y: COMMON_D }),
  [FACTION_IDS.RED]: Object.freeze({ x: COMMON_D, y: COMMON_D }),
});

function createHomeSlots(home) {
  const centerX = home.x + (HOME_EDGE - BOARD_MIN) / 2;
  const centerY = home.y + (HOME_EDGE - BOARD_MIN) / 2;
  const offset = 58;

  return Object.freeze([
    Object.freeze({ x: centerX - offset, y: centerY - offset }),
    Object.freeze({ x: centerX + offset, y: centerY - offset }),
    Object.freeze({ x: centerX - offset, y: centerY + offset }),
    Object.freeze({ x: centerX + offset, y: centerY + offset }),
  ]);
}

export const CLASSIC_HOME_ZONES = Object.freeze(
  Object.entries(HOME_ZONES).map(([factionId, origin]) => {
    const home = freezeRect({
      id: factionId,
      factionId,
      x: origin.x,
      y: origin.y,
      width: HOME_EDGE - BOARD_MIN,
      height: HOME_EDGE - BOARD_MIN,
    });

    return Object.freeze({
      ...home,
      slots: createHomeSlots(home),
    });
  }),
);

export const CLASSIC_GOAL = Object.freeze({
  id: 'goal',
  center: CLASSIC_BOARD_CENTER,
  bounds: freezeRect({
    id: 'goal',
    x: GOAL_NEAR,
    y: GOAL_NEAR,
    width: GOAL_FAR - GOAL_NEAR,
    height: GOAL_FAR - GOAL_NEAR,
  }),
  slots: Object.freeze([
    Object.freeze({ x: 640, y: 588 }),
    Object.freeze({ x: 692, y: 640 }),
    Object.freeze({ x: 640, y: 692 }),
    Object.freeze({ x: 588, y: 640 }),
    Object.freeze({ x: 640, y: 640 }),
    Object.freeze({ x: 603, y: 603 }),
    Object.freeze({ x: 677, y: 603 }),
    Object.freeze({ x: 677, y: 677 }),
    Object.freeze({ x: 603, y: 677 }),
  ]),
  points: Object.freeze([
    Object.freeze({ x: CLASSIC_BOARD_CENTER.x, y: GOAL_NEAR }),
    Object.freeze({ x: GOAL_FAR, y: CLASSIC_BOARD_CENTER.y }),
    Object.freeze({ x: CLASSIC_BOARD_CENTER.x, y: GOAL_FAR }),
    Object.freeze({ x: GOAL_NEAR, y: CLASSIC_BOARD_CENTER.y }),
  ]),
});

export function getCommonCellMetadataById(id) {
  return COMMON_CELL_METADATA.find((metadata) => metadata.id === id) || null;
}

export function getClassicCommonCellById(id) {
  return CLASSIC_COMMON_CELLS.find((cell) => cell.id === id) || null;
}

export function getClassicFinalLaneCellsForFaction(factionId) {
  return CLASSIC_FINAL_LANE_CELLS.filter((cell) => cell.factionId === factionId);
}

export function getClassicHomeZone(factionId) {
  return CLASSIC_HOME_ZONES.find((home) => home.factionId === factionId) || null;
}

export function getClassicStartCells() {
  return Object.entries(START_SQUARE_BY_FACTION).map(([factionId, square]) => ({
    factionId,
    square,
    cell: getClassicCommonCellById(square),
  }));
}

export function getClassicEntryCells() {
  return Object.freeze(
    Object.entries(LAST_COMMON_SQUARE_BY_FACTION).map(([factionId, square]) => Object.freeze({
      factionId,
      square,
      cell: getClassicCommonCellById(square),
    })),
  );
}

export function rectsAreAdjacent(first, second, epsilon = 0.01) {
  const firstRight = first.x + first.width;
  const firstBottom = first.y + first.height;
  const secondRight = second.x + second.width;
  const secondBottom = second.y + second.height;
  const verticalOverlap = Math.min(firstBottom, secondBottom) - Math.max(first.y, second.y);
  const horizontalOverlap = Math.min(firstRight, secondRight) - Math.max(first.x, second.x);
  const touchesVertically = Math.abs(firstRight - second.x) < epsilon || Math.abs(secondRight - first.x) < epsilon;
  const touchesHorizontally = Math.abs(firstBottom - second.y) < epsilon || Math.abs(secondBottom - first.y) < epsilon;

  const cornersTouch = (
    (Math.abs(firstRight - second.x) < epsilon || Math.abs(secondRight - first.x) < epsilon) &&
    (Math.abs(firstBottom - second.y) < epsilon || Math.abs(secondBottom - first.y) < epsilon)
  );

  return (touchesVertically && verticalOverlap > epsilon) ||
    (touchesHorizontally && horizontalOverlap > epsilon) ||
    cornersTouch;
}

export function rectsOverlap(first, second, epsilon = 0.01) {
  return (
    first.x < second.x + second.width - epsilon &&
    first.x + first.width > second.x + epsilon &&
    first.y < second.y + second.height - epsilon &&
    first.y + first.height > second.y + epsilon
  );
}

export function rectGeometryKey(rect) {
  return [rect.x, rect.y, rect.width, rect.height]
    .map((value) => value.toFixed(3))
    .join(':');
}

export function pointListToSvg(points) {
  return points.map((point) => `${point.x},${point.y}`).join(' ');
}
