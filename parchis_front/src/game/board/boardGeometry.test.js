import {
  COMMON_SQUARE_COUNT,
  FACTION_IDS,
  FINAL_LANE_LENGTH,
  POSITION_TYPES,
  SAFE_SQUARES,
  START_SQUARE_BY_FACTION,
  LAST_COMMON_SQUARE_BY_FACTION,
  getAvailableRollFiveActions,
} from '../engine';
import {
  CLASSIC_COMMON_CELLS,
  CLASSIC_FINAL_LANE_CELLS,
  CLASSIC_GOAL,
  CLASSIC_HOME_ZONES,
  COMMON_CELL_METADATA,
  getClassicCommonCellById,
  getClassicEntryCells,
  getClassicFinalLaneCellsForFaction,
  getClassicStartCells,
  getClassicHomeZone,
  rectGeometryKey,
  rectsAreAdjacent,
  rectsOverlap,
} from './classicBoardGeometry';
import {
  BOARD_VIEW_BOX_SIZE,
  MULTI_OCCUPANT_TOKEN_MARGIN_SCALE,
  SINGLE_OCCUPANT_TOKEN_SCALE,
  getAllCommonCoordinates,
  getAllFinalLaneCoordinates,
  getBoardCell,
  getBoardCoordinate,
  getCharacterSlotCoordinate,
  getExpectedCommonSlotCount,
  getGoalCell,
  getGoalCoordinate,
  getHomeCoordinate,
  getHomeSlots,
  getHomeZone,
  getPositionKey,
  getTokenBounds,
  tokenBoundsFitInsideBoard,
  tokenBoundsFitInsideCell,
} from './boardGeometry';

const CANONICAL_SAFE_SQUARES = [5, 12, 17, 22, 29, 34, 39, 46, 51, 56, 63, 68];
const BOARD_MIN = 20;
const BOARD_MAX = 1260;
const HOME_EDGE = 433.333;
const COMMON_B = 571.111;
const COMMON_C = 708.889;
const COMMON_D = 846.667;
const TRACK_SEGMENT = (HOME_EDGE - BOARD_MIN) / 8;

const APPROVED_METADATA = [
  [1, 'bottom', 'right-lane', 1], [2, 'bottom', 'right-lane', 2], [3, 'bottom', 'right-lane', 3], [4, 'bottom', 'right-lane', 4, null, FACTION_IDS.RED],
  [5, 'bottom', 'right-lane', 5, FACTION_IDS.RED], [6, 'bottom', 'right-lane', 6], [7, 'bottom', 'right-lane', 7], [8, 'bottom', 'right-lane', 8],
  [9, 'right', 'lower-lane', 1], [10, 'right', 'lower-lane', 2], [11, 'right', 'lower-lane', 3], [12, 'right', 'lower-lane', 4],
  [13, 'right', 'lower-lane', 5], [14, 'right', 'lower-lane', 6], [15, 'right', 'lower-lane', 7], [16, 'right', 'lower-lane', 8], [17, 'right', 'connector', 1],
  [18, 'right', 'upper-lane', 1], [19, 'right', 'upper-lane', 2], [20, 'right', 'upper-lane', 3], [21, 'right', 'upper-lane', 4, null, FACTION_IDS.GREEN],
  [22, 'right', 'upper-lane', 5, FACTION_IDS.GREEN], [23, 'right', 'upper-lane', 6], [24, 'right', 'upper-lane', 7], [25, 'right', 'upper-lane', 8],
  [26, 'top', 'right-lane', 1], [27, 'top', 'right-lane', 2], [28, 'top', 'right-lane', 3], [29, 'top', 'right-lane', 4],
  [30, 'top', 'right-lane', 5], [31, 'top', 'right-lane', 6], [32, 'top', 'right-lane', 7], [33, 'top', 'right-lane', 8], [34, 'top', 'connector', 1],
  [35, 'top', 'left-lane', 1], [36, 'top', 'left-lane', 2], [37, 'top', 'left-lane', 3], [38, 'top', 'left-lane', 4, null, FACTION_IDS.YELLOW],
  [39, 'top', 'left-lane', 5, FACTION_IDS.YELLOW], [40, 'top', 'left-lane', 6], [41, 'top', 'left-lane', 7], [42, 'top', 'left-lane', 8],
  [43, 'left', 'upper-lane', 1], [44, 'left', 'upper-lane', 2], [45, 'left', 'upper-lane', 3], [46, 'left', 'upper-lane', 4],
  [47, 'left', 'upper-lane', 5], [48, 'left', 'upper-lane', 6], [49, 'left', 'upper-lane', 7], [50, 'left', 'upper-lane', 8], [51, 'left', 'connector', 1],
  [52, 'left', 'lower-lane', 1], [53, 'left', 'lower-lane', 2], [54, 'left', 'lower-lane', 3], [55, 'left', 'lower-lane', 4, null, FACTION_IDS.BLUE],
  [56, 'left', 'lower-lane', 5, FACTION_IDS.BLUE], [57, 'left', 'lower-lane', 6], [58, 'left', 'lower-lane', 7], [59, 'left', 'lower-lane', 8],
  [60, 'bottom', 'left-lane', 1], [61, 'bottom', 'left-lane', 2], [62, 'bottom', 'left-lane', 3], [63, 'bottom', 'left-lane', 4],
  [64, 'bottom', 'left-lane', 5], [65, 'bottom', 'left-lane', 6], [66, 'bottom', 'left-lane', 7], [67, 'bottom', 'left-lane', 8], [68, 'bottom', 'connector', 1],
].map(([id, arm, lane, index, startFaction = null, finalEntryFaction = null]) => ({ id, arm, lane, index, startFaction, finalEntryFaction }));

function expectCoordinateClose(actual, expected) {
  expect(actual.x).toBeCloseTo(expected.x, 3);
  expect(actual.y).toBeCloseTo(expected.y, 3);
}

function expectTokenSizeClose(actual, expected) {
  expect(actual.tokenSize).toBeCloseTo(expected, 3);
}

function expectRectClose(actual, expected) {
  expect(actual.x).toBeCloseTo(expected.x, 3);
  expect(actual.y).toBeCloseTo(expected.y, 3);
  expect(actual.width).toBeCloseTo(expected.width, 3);
  expect(actual.height).toBeCloseTo(expected.height, 3);
}

function segmentFromOuter(edge, segment) {
  const offset = (segment - 1) * TRACK_SEGMENT;

  if (edge === 'top' || edge === 'left') {
    return [BOARD_MIN + offset, BOARD_MIN + offset + TRACK_SEGMENT];
  }

  return [BOARD_MAX - offset - TRACK_SEGMENT, BOARD_MAX - offset];
}

function expectedFinalLaneRect(factionId, index) {
  const segment = index + 1;

  if (factionId === FACTION_IDS.YELLOW) {
    const [y1, y2] = segmentFromOuter('top', segment);
    return { x: COMMON_B, y: y1, width: COMMON_C - COMMON_B, height: y2 - y1 };
  }

  if (factionId === FACTION_IDS.GREEN) {
    const [x1, x2] = segmentFromOuter('right', segment);
    return { x: x1, y: COMMON_B, width: x2 - x1, height: COMMON_C - COMMON_B };
  }

  if (factionId === FACTION_IDS.BLUE) {
    const [x1, x2] = segmentFromOuter('left', segment);
    return { x: x1, y: COMMON_B, width: x2 - x1, height: COMMON_C - COMMON_B };
  }

  const [y1, y2] = segmentFromOuter('bottom', segment);
  return { x: COMMON_B, y: y1, width: COMMON_C - COMMON_B, height: y2 - y1 };
}

function expectedTwoOccupantTokenSize(cell) {
  const shortSide = Math.min(cell.width, cell.height);
  const longSide = Math.max(cell.width, cell.height);
  const margin = shortSide * MULTI_OCCUPANT_TOKEN_MARGIN_SCALE;

  return Math.min(
    shortSide - (margin * 2),
    (longSide - (margin * 3)) / 2,
  );
}

function expectBoundsInsideCell(bounds, cell) {
  expect(bounds.x).toBeGreaterThanOrEqual(cell.x);
  expect(bounds.y).toBeGreaterThanOrEqual(cell.y);
  expect(bounds.right).toBeLessThanOrEqual(cell.x + cell.width);
  expect(bounds.bottom).toBeLessThanOrEqual(cell.y + cell.height);
}

function expectTwoOccupantLongAxisLayout(position, factionId) {
  const cell = getBoardCell(position, factionId);
  const first = getCharacterSlotCoordinate(position, factionId, 0, 2);
  const second = getCharacterSlotCoordinate(position, factionId, 1, 2);

  expect(first).not.toEqual(second);
  expectTokenSizeClose(first, expectedTwoOccupantTokenSize(cell));
  expectTokenSizeClose(second, expectedTwoOccupantTokenSize(cell));
  expectBoundsInsideCell(getTokenBounds(first), cell);
  expectBoundsInsideCell(getTokenBounds(second), cell);

  if (cell.width >= cell.height) {
    expect(first.x).toBeLessThan(cell.center.x);
    expect(second.x).toBeGreaterThan(cell.center.x);
    expect(first.y).toBeCloseTo(cell.center.y, 3);
    expect(second.y).toBeCloseTo(cell.center.y, 3);
  } else {
    expect(first.y).toBeLessThan(cell.center.y);
    expect(second.y).toBeGreaterThan(cell.center.y);
    expect(first.x).toBeCloseTo(cell.center.x, 3);
    expect(second.x).toBeCloseTo(cell.center.x, 3);
  }
}

describe('boardGeometry', () => {
  test('uses the approved classic SVG viewBox', () => {
    expect(BOARD_VIEW_BOX_SIZE).toBe(1280);
  });

  test('maps all common engine positions to the canonical common cells', () => {
    const cells = getAllCommonCoordinates();

    expect(Object.keys(cells)).toHaveLength(COMMON_SQUARE_COUNT);
    expect(getExpectedCommonSlotCount()).toBe(COMMON_SQUARE_COUNT);

    for (let square = 1; square <= COMMON_SQUARE_COUNT; square += 1) {
      const enginePosition = { type: POSITION_TYPES.COMMON, square };
      const canonicalCell = getClassicCommonCellById(square);

      expect(getBoardCell(enginePosition)).toBe(canonicalCell);
      expectCoordinateClose(getBoardCoordinate(enginePosition), canonicalCell.center);
    }
  });

  test('common positions are unique canonical cells', () => {
    const uniqueKeys = new Set(CLASSIC_COMMON_CELLS.map(rectGeometryKey));

    expect(CLASSIC_COMMON_CELLS).toHaveLength(COMMON_SQUARE_COUNT);
    expect(uniqueKeys.size).toBe(COMMON_SQUARE_COUNT);
  });

  test('common metadata matches the approved reference-derived table', () => {
    expect(COMMON_CELL_METADATA.map(({ id, arm, lane, index, startFaction, finalEntryFaction, previousId, nextId, safe }) => ({
      id,
      arm,
      lane,
      index,
      startFaction,
      finalEntryFaction,
      previousId,
      nextId,
      safe,
    }))).toEqual(APPROVED_METADATA.map((metadata) => ({
      ...metadata,
      previousId: metadata.id === 1 ? 68 : metadata.id - 1,
      nextId: metadata.id === 68 ? 1 : metadata.id + 1,
      safe: CANONICAL_SAFE_SQUARES.includes(metadata.id),
    })));
  });

  test('route is physically continuous and playable rectangles do not overlap', () => {
    for (let square = 1; square <= COMMON_SQUARE_COUNT; square += 1) {
      expect(rectsAreAdjacent(getClassicCommonCellById(square), getClassicCommonCellById(square === 68 ? 1 : square + 1))).toBe(true);
    }

    const playableCells = [...CLASSIC_COMMON_CELLS, ...CLASSIC_FINAL_LANE_CELLS];

    playableCells.forEach((cell, index) => {
      playableCells.slice(index + 1).forEach((otherCell) => {
        expect(rectsOverlap(cell, otherCell)).toBe(false);
      });
    });
  });

  test('maps homes to canonical corner orientation with four slots', () => {
    expect(CLASSIC_HOME_ZONES.map((home) => ({
      factionId: home.factionId,
      x: Number(home.x.toFixed(3)),
      y: Number(home.y.toFixed(3)),
    }))).toEqual([
      { factionId: FACTION_IDS.YELLOW, x: 20, y: 20 },
      { factionId: FACTION_IDS.GREEN, x: 846.667, y: 20 },
      { factionId: FACTION_IDS.BLUE, x: 20, y: 846.667 },
      { factionId: FACTION_IDS.RED, x: 846.667, y: 846.667 },
    ]);

    Object.values(FACTION_IDS).forEach((factionId) => {
      expect(getHomeZone(factionId)).toBe(getClassicHomeZone(factionId));
      expect(getHomeSlots(factionId)).toHaveLength(4);
      expectCoordinateClose(getHomeCoordinate(factionId), getClassicHomeZone(factionId).center);
      expect(getBoardCell({ type: POSITION_TYPES.HOME }, factionId)).toBe(getClassicHomeZone(factionId));
    });
  });

  test('maps every final lane slot to the canonical final lane cells', () => {
    const lanes = getAllFinalLaneCoordinates();

    expect(CLASSIC_FINAL_LANE_CELLS).toHaveLength(Object.values(FACTION_IDS).length * FINAL_LANE_LENGTH);

    Object.values(FACTION_IDS).forEach((factionId) => {
      expect(Object.keys(lanes[factionId])).toHaveLength(FINAL_LANE_LENGTH);

      for (let index = 1; index <= FINAL_LANE_LENGTH; index += 1) {
        const enginePosition = { type: POSITION_TYPES.FINAL_LANE, factionId, index };
        const canonicalCell = getClassicFinalLaneCellsForFaction(factionId).find((cell) => cell.index === index);

        expect(getBoardCell(enginePosition)).toBe(canonicalCell);
        expectCoordinateClose(getBoardCoordinate(enginePosition), canonicalCell.center);
      }
    });
  });

  test('final lanes occupy physical segments 2..8 from entry side toward the center', () => {
    Object.values(FACTION_IDS).forEach((factionId) => {
      const cells = getClassicFinalLaneCellsForFaction(factionId);

      expect(cells).toHaveLength(FINAL_LANE_LENGTH);
      expect(cells.map((cell) => cell.index)).toEqual([1, 2, 3, 4, 5, 6, 7]);

      cells.forEach((cell) => {
        expectRectClose(cell, expectedFinalLaneRect(factionId, cell.index));
      });
    });
  });

  test('final lane index 1 is outermost and index 7 is innermost for every faction', () => {
    const yellow = getClassicFinalLaneCellsForFaction(FACTION_IDS.YELLOW);
    const green = getClassicFinalLaneCellsForFaction(FACTION_IDS.GREEN);
    const blue = getClassicFinalLaneCellsForFaction(FACTION_IDS.BLUE);
    const red = getClassicFinalLaneCellsForFaction(FACTION_IDS.RED);

    expect(yellow[0].y).toBeLessThan(yellow[6].y);
    expect(red[0].y).toBeGreaterThan(red[6].y);
    expect(blue[0].x).toBeLessThan(blue[6].x);
    expect(green[0].x).toBeGreaterThan(green[6].x);

    expect(yellow[6].y + yellow[6].height).toBeCloseTo(HOME_EDGE, 3);
    expect(red[6].y).toBeCloseTo(COMMON_D, 3);
    expect(blue[6].x + blue[6].width).toBeCloseTo(HOME_EDGE, 3);
    expect(green[6].x).toBeCloseTo(COMMON_D, 3);
  });

  test('maps goal to the canonical central goal', () => {
    expect(getGoalCell()).toBe(CLASSIC_GOAL.bounds);
    expect(getGoalCoordinate()).toEqual(CLASSIC_GOAL.center);
    expect(getBoardCell({ type: POSITION_TYPES.GOAL })).toBe(CLASSIC_GOAL.bounds);
    expect(getBoardCoordinate({ type: POSITION_TYPES.GOAL })).toEqual(CLASSIC_GOAL.bounds.center);
  });

  test('preserves start and entry square ids', () => {
    expect(START_SQUARE_BY_FACTION).toEqual({
      [FACTION_IDS.YELLOW]: 39,
      [FACTION_IDS.GREEN]: 22,
      [FACTION_IDS.BLUE]: 56,
      [FACTION_IDS.RED]: 5,
    });
    expect(LAST_COMMON_SQUARE_BY_FACTION).toEqual({
      [FACTION_IDS.YELLOW]: 38,
      [FACTION_IDS.GREEN]: 21,
      [FACTION_IDS.BLUE]: 55,
      [FACTION_IDS.RED]: 4,
    });
    expect(getClassicEntryCells().map(({ factionId, square }) => ({ factionId, square }))).toEqual([
      { factionId: FACTION_IDS.YELLOW, square: 38 },
      { factionId: FACTION_IDS.GREEN, square: 21 },
      { factionId: FACTION_IDS.BLUE, square: 55 },
      { factionId: FACTION_IDS.RED, square: 4 },
    ]);
  });

  test('engine safe squares match the canonical safe set and include every faction start', () => {
    expect(SAFE_SQUARES).toEqual(CANONICAL_SAFE_SQUARES);

    Object.values(START_SQUARE_BY_FACTION).forEach((startSquare) => {
      expect(SAFE_SQUARES).toContain(startSquare);
    });
  });

  test('canonical starts border their visual homes and entries retain approved metadata', () => {
    getClassicStartCells().forEach(({ factionId, cell }) => {
      expect(rectsAreAdjacent(cell, getClassicHomeZone(factionId))).toBe(true);
    });

    expect(getClassicEntryCells().map(({ factionId, square }) => ({ factionId, square }))).toEqual([
      { factionId: FACTION_IDS.YELLOW, square: 38 },
      { factionId: FACTION_IDS.GREEN, square: 21 },
      { factionId: FACTION_IDS.BLUE, square: 55 },
      { factionId: FACTION_IDS.RED, square: 4 },
    ]);
  });

  test('every safe square resolves to one canonical common geometry', () => {
    CANONICAL_SAFE_SQUARES.forEach((square) => {
      const cell = getClassicCommonCellById(square);

      expect(cell).toBeTruthy();
      expect(getBoardCell({ type: POSITION_TYPES.COMMON, square })).toBe(cell);
    });
  });

  test('roll 5 home exits resolve to each faction start geometry', () => {
    Object.entries({
      [FACTION_IDS.YELLOW]: 39,
      [FACTION_IDS.GREEN]: 22,
      [FACTION_IDS.BLUE]: 56,
      [FACTION_IDS.RED]: 5,
    }).forEach(([factionId, startSquare]) => {
      const character = {
        id: `${factionId}.test`,
        factionId,
        position: { type: POSITION_TYPES.HOME },
      };
      const result = getAvailableRollFiveActions({ factionId, characters: [character] });

      expect(result.availableActions[0].destination).toEqual({ type: POSITION_TYPES.COMMON, square: startSquare });
      expect(getBoardCell(result.availableActions[0].destination)).toBe(getClassicCommonCellById(startSquare));
    });
  });

  test('distinguishes position keys', () => {
    expect(getPositionKey({ type: POSITION_TYPES.HOME }, FACTION_IDS.RED)).toBe('home:red');
    expect(getPositionKey({ type: POSITION_TYPES.COMMON, square: 22 })).toBe('common:22');
    expect(getPositionKey({ type: POSITION_TYPES.FINAL_LANE, factionId: FACTION_IDS.BLUE, index: 3 })).toBe('finalLane:blue:3');
    expect(getPositionKey({ type: POSITION_TYPES.GOAL })).toBe('goal');
  });

  test('returns exactly centered coordinates for one occupant in every common cell', () => {
    for (let square = 1; square <= COMMON_SQUARE_COUNT; square += 1) {
      const position = { type: POSITION_TYPES.COMMON, square };
      const coordinate = getCharacterSlotCoordinate(position, FACTION_IDS.BLUE, 0, 1);

      expectCoordinateClose(coordinate, getBoardCoordinate(position));
    }
  });

  test('start-square tokens use the same generic one-occupant layout as other common cells', () => {
    expect(Object.values(START_SQUARE_BY_FACTION).sort((a, b) => a - b)).toEqual([5, 22, 39, 56]);

    Object.entries(START_SQUARE_BY_FACTION).forEach(([, square]) => {
      const position = { type: POSITION_TYPES.COMMON, square };
      const cell = getClassicCommonCellById(square);
      const coordinate = getCharacterSlotCoordinate(position, FACTION_IDS.GREEN, 0, 1);

      expectCoordinateClose(coordinate, cell.center);
      expectTokenSizeClose(coordinate, Math.min(cell.width, cell.height) * SINGLE_OCCUPANT_TOKEN_SCALE);
      expect(tokenBoundsFitInsideCell(coordinate, cell)).toBe(true);
      expect(tokenBoundsFitInsideBoard(coordinate)).toBe(true);
    });
  });

  test('returns distinct long-axis coordinates for two occupants in the same common cell without mutating input', () => {
    const position = { type: POSITION_TYPES.COMMON, square: 22 };
    const before = { ...position };
    const first = getCharacterSlotCoordinate(position, FACTION_IDS.BLUE, 0, 2);
    const second = getCharacterSlotCoordinate(position, FACTION_IDS.BLUE, 1, 2);

    expect(first).not.toEqual(second);
    expect(first.x).toBeCloseTo(second.x, 3);
    expect(first.y).toBeLessThan(second.y);
    expect(tokenBoundsFitInsideCell(first, getClassicCommonCellById(22))).toBe(true);
    expect(tokenBoundsFitInsideCell(second, getClassicCommonCellById(22))).toBe(true);
    expect(position).toEqual(before);
  });

  test('two occupants fit inside every common cell and follow the cell long axis', () => {
    for (let square = 1; square <= COMMON_SQUARE_COUNT; square += 1) {
      expectTwoOccupantLongAxisLayout({ type: POSITION_TYPES.COMMON, square }, FACTION_IDS.YELLOW);
    }
  });

  test('two occupants fit inside every final-lane cell and follow the cell long axis', () => {
    Object.values(FACTION_IDS).forEach((factionId) => {
      for (let index = 1; index <= FINAL_LANE_LENGTH; index += 1) {
        expectTwoOccupantLongAxisLayout({ type: POSITION_TYPES.FINAL_LANE, factionId, index }, factionId);
      }
    });
  });

  test('valid common, final, home, and goal token placements remain inside the board', () => {
    for (let square = 1; square <= COMMON_SQUARE_COUNT; square += 1) {
      expect(tokenBoundsFitInsideBoard(getCharacterSlotCoordinate({ type: POSITION_TYPES.COMMON, square }, FACTION_IDS.YELLOW, 0, 1))).toBe(true);
    }

    Object.values(FACTION_IDS).forEach((factionId) => {
      for (let index = 1; index <= FINAL_LANE_LENGTH; index += 1) {
        expect(tokenBoundsFitInsideBoard(getCharacterSlotCoordinate({ type: POSITION_TYPES.FINAL_LANE, factionId, index }, factionId, 0, 1))).toBe(true);
      }

      for (let slotIndex = 0; slotIndex < 4; slotIndex += 1) {
        expect(tokenBoundsFitInsideBoard(getCharacterSlotCoordinate({ type: POSITION_TYPES.HOME }, factionId, slotIndex, 4))).toBe(true);
      }
    });

    for (let slotIndex = 0; slotIndex < 4; slotIndex += 1) {
      expect(tokenBoundsFitInsideBoard(getCharacterSlotCoordinate({ type: POSITION_TYPES.GOAL }, FACTION_IDS.YELLOW, slotIndex, 4))).toBe(true);
    }
  });

  test('complete visible token footprint fits inside every common and final cell', () => {
    for (let square = 1; square <= COMMON_SQUARE_COUNT; square += 1) {
      const position = { type: POSITION_TYPES.COMMON, square };
      const coordinate = getCharacterSlotCoordinate(position, FACTION_IDS.YELLOW, 0, 1);

      expectTokenSizeClose(coordinate, Math.min(getBoardCell(position).width, getBoardCell(position).height) * SINGLE_OCCUPANT_TOKEN_SCALE);
      expect(tokenBoundsFitInsideCell(
        coordinate,
        getBoardCell(position),
      )).toBe(true);
    }

    Object.values(FACTION_IDS).forEach((factionId) => {
      for (let index = 1; index <= FINAL_LANE_LENGTH; index += 1) {
        const position = { type: POSITION_TYPES.FINAL_LANE, factionId, index };
        const coordinate = getCharacterSlotCoordinate(position, factionId, 0, 1);

        expectTokenSizeClose(coordinate, Math.min(getBoardCell(position).width, getBoardCell(position).height) * SINGLE_OCCUPANT_TOKEN_SCALE);
        expect(tokenBoundsFitInsideCell(
          coordinate,
          getBoardCell(position),
        )).toBe(true);
      }
    });
  });

  test('token bounds represent the complete visible footprint including the ring', () => {
    const position = { type: POSITION_TYPES.COMMON, square: START_SQUARE_BY_FACTION[FACTION_IDS.BLUE] };
    const coordinate = getCharacterSlotCoordinate(position, FACTION_IDS.BLUE, 0, 1);
    const bounds = getTokenBounds(coordinate);

    expect(bounds.width).toBeCloseTo(coordinate.tokenSize, 3);
    expect(bounds.height).toBeCloseTo(coordinate.tokenSize, 3);
    expectBoundsInsideCell(bounds, getBoardCell(position));
  });

  test('returns dedicated home slots for four home occupants', () => {
    const slots = Array.from({ length: 4 }, (_, index) =>
      getCharacterSlotCoordinate({ type: POSITION_TYPES.HOME }, FACTION_IDS.RED, index, 4),
    );

    expect(new Set(slots.map((slot) => `${slot.x}:${slot.y}`)).size).toBe(4);
  });

  test('returns deterministic goal slots for multiple goal occupants', () => {
    const slots = Array.from({ length: 4 }, (_, index) =>
      getCharacterSlotCoordinate({ type: POSITION_TYPES.GOAL }, FACTION_IDS.RED, index, 4),
    );

    expect(new Set(slots.map((slot) => `${slot.x}:${slot.y}`)).size).toBe(4);
  });
});
