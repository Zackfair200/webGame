import { FACTION_IDS, START_SQUARE_BY_FACTION } from '../../engine';
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
  rectGeometryKey,
  rectsAreAdjacent,
} from './classicBoardGeometry';

describe('classicBoardGeometry prototype', () => {
  test('contains exactly 68 common cells', () => {
    expect(CLASSIC_COMMON_CELLS).toHaveLength(68);
    expect(CLASSIC_COMMON_CELLS.map((cell) => cell.id)).toEqual(Array.from({ length: 68 }, (_, index) => index + 1));
  });

  test('contains exactly 28 final lane cells', () => {
    expect(CLASSIC_FINAL_LANE_CELLS).toHaveLength(28);

    Object.values(FACTION_IDS).forEach((factionId) => {
      expect(getClassicFinalLaneCellsForFaction(factionId)).toHaveLength(7);
    });
  });

  test('common and final cells have unique geometry', () => {
    const commonKeys = new Set(CLASSIC_COMMON_CELLS.map(rectGeometryKey));
    const finalKeys = new Set(CLASSIC_FINAL_LANE_CELLS.map(rectGeometryKey));
    const allKeys = new Set([...commonKeys, ...finalKeys]);

    expect(commonKeys.size).toBe(CLASSIC_COMMON_CELLS.length);
    expect(finalKeys.size).toBe(CLASSIC_FINAL_LANE_CELLS.length);
    expect(allKeys.size).toBe(CLASSIC_COMMON_CELLS.length + CLASSIC_FINAL_LANE_CELLS.length);
  });

  test('common sections come from reference metadata, not rotational generation', () => {
    expect(COMMON_CELL_METADATA.map(({ id, arm, lane, index }) => ({ id, arm, lane, index }))).toEqual([
      ...Array.from({ length: 8 }, (_, index) => ({ id: index + 1, arm: 'bottom', lane: 'right-lane', index: index + 1 })),
      ...Array.from({ length: 8 }, (_, index) => ({ id: index + 9, arm: 'right', lane: 'lower-lane', index: index + 1 })),
      { id: 17, arm: 'right', lane: 'connector', index: 1 },
      ...Array.from({ length: 8 }, (_, index) => ({ id: index + 18, arm: 'right', lane: 'upper-lane', index: index + 1 })),
      ...Array.from({ length: 8 }, (_, index) => ({ id: index + 26, arm: 'top', lane: 'right-lane', index: index + 1 })),
      { id: 34, arm: 'top', lane: 'connector', index: 1 },
      ...Array.from({ length: 8 }, (_, index) => ({ id: index + 35, arm: 'top', lane: 'left-lane', index: index + 1 })),
      ...Array.from({ length: 8 }, (_, index) => ({ id: index + 43, arm: 'left', lane: 'upper-lane', index: index + 1 })),
      { id: 51, arm: 'left', lane: 'connector', index: 1 },
      ...Array.from({ length: 8 }, (_, index) => ({ id: index + 52, arm: 'left', lane: 'lower-lane', index: index + 1 })),
      ...Array.from({ length: 8 }, (_, index) => ({ id: index + 60, arm: 'bottom', lane: 'left-lane', index: index + 1 })),
      { id: 68, arm: 'bottom', lane: 'connector', index: 1 },
    ]);
  });

  test('all consecutive common route positions are adjacent', () => {
    for (let id = 1; id <= 68; id += 1) {
      const current = getClassicCommonCellById(id);
      const next = getClassicCommonCellById(id === 68 ? 1 : id + 1);

      expect(rectsAreAdjacent(current, next)).toBe(true);
    }
  });

  test('critical common route transitions are adjacent', () => {
    [[4, 5], [17, 18], [21, 22], [34, 35], [38, 39], [51, 52], [55, 56], [68, 1]].forEach(([from, to]) => {
      expect(rectsAreAdjacent(getClassicCommonCellById(from), getClassicCommonCellById(to))).toBe(true);
    });
  });

  test('starts and entries preserve engine square ids', () => {
    expect(START_SQUARE_BY_FACTION).toEqual({
      [FACTION_IDS.YELLOW]: 39,
      [FACTION_IDS.GREEN]: 22,
      [FACTION_IDS.BLUE]: 56,
      [FACTION_IDS.RED]: 5,
    });
    expect(getClassicStartCells().map(({ factionId, square }) => ({ factionId, square }))).toEqual(expect.arrayContaining([
      { factionId: FACTION_IDS.YELLOW, square: 39 },
      { factionId: FACTION_IDS.GREEN, square: 22 },
      { factionId: FACTION_IDS.BLUE, square: 56 },
      { factionId: FACTION_IDS.RED, square: 5 },
    ]));
    expect(getClassicEntryCells().map(({ factionId, square }) => ({ factionId, square }))).toEqual([
      { factionId: FACTION_IDS.YELLOW, square: 38 },
      { factionId: FACTION_IDS.GREEN, square: 21 },
      { factionId: FACTION_IDS.BLUE, square: 55 },
      { factionId: FACTION_IDS.RED, square: 4 },
    ]);
  });

  test('goal and homes are present as non-common structures', () => {
    expect(CLASSIC_GOAL.center).toEqual({ x: 640, y: 640 });
    expect(CLASSIC_GOAL.points).toHaveLength(4);
    expect(CLASSIC_HOME_ZONES).toHaveLength(4);

    CLASSIC_HOME_ZONES.forEach((home) => {
      expect(home.slots).toHaveLength(4);
    });
  });

  test('homes use the canonical faction orientation', () => {
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
  });
});
