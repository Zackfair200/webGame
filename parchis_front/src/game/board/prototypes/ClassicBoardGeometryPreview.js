import React, { useState } from 'react';
import { FACTION_IDS } from '../../engine';
import {
  CLASSIC_BOARD_VIEW_BOX_SIZE,
  CLASSIC_COMMON_CELLS,
  CLASSIC_FINAL_LANE_CELLS,
  CLASSIC_GOAL,
  CLASSIC_HOME_ZONES,
  getClassicEntryCells,
  pointListToSvg,
} from './classicBoardGeometry';
import './ClassicBoardGeometryPreview.css';

const FACTION_LABELS = Object.freeze({
  [FACTION_IDS.YELLOW]: 'Yellow',
  [FACTION_IDS.GREEN]: 'Green',
  [FACTION_IDS.BLUE]: 'Blue',
  [FACTION_IDS.RED]: 'Red',
});

function rectProps(cell) {
  return {
    x: cell.x,
    y: cell.y,
    width: cell.width,
    height: cell.height,
  };
}

function HomeZone({ home }) {
  return (
    <g className={`classic-board-preview__home classic-board-preview__home--${home.factionId}`} aria-label={`${home.factionId} home`}>
      <rect {...rectProps(home)} rx="26" />
      <circle className="classic-board-preview__home-ring" cx={home.center.x} cy={home.center.y} r="150" />
      <circle className="classic-board-preview__home-ring classic-board-preview__home-ring--inner" cx={home.center.x} cy={home.center.y} r="98" />
      {home.slots.map((slot, index) => (
        <circle key={`${home.factionId}:slot:${index}`} className="classic-board-preview__home-slot" cx={slot.x} cy={slot.y} r="36" />
      ))}
      <text x={home.center.x} y={home.center.y + 8}>{FACTION_LABELS[home.factionId]}</text>
    </g>
  );
}

function CommonCell({ cell, showNumbers }) {
  return (
    <g className={`classic-board-preview__common-cell${cell.isSafe ? ' classic-board-preview__common-cell--safe' : ''}${cell.isStart ? ' classic-board-preview__common-cell--start' : ''}`} aria-label={`common ${cell.id}`}>
      <rect {...rectProps(cell)} />
      {cell.isSafe && <circle className="classic-board-preview__safe-marker" cx={cell.center.x} cy={cell.center.y} r="16" />}
      {showNumbers && <text x={cell.center.x} y={cell.center.y + 8}>{cell.id}</text>}
    </g>
  );
}

function FinalLaneCell({ cell }) {
  return (
    <g className={`classic-board-preview__final-cell classic-board-preview__final-cell--${cell.factionId}`} aria-label={`${cell.factionId} final ${cell.index}`}>
      <rect {...rectProps(cell)} />
      <text x={cell.center.x} y={cell.center.y + 8}>{cell.index}</text>
    </g>
  );
}

function Goal() {
  return (
    <g className="classic-board-preview__goal" aria-label="goal">
      <polygon points={pointListToSvg(CLASSIC_GOAL.points)} />
      <line x1="640" y1="502.416" x2="640" y2="777.584" />
      <line x1="502.416" y1="640" x2="777.584" y2="640" />
      <text x="640" y="648">GOAL</text>
    </g>
  );
}

function EntryMarkers() {
  return (
    <g className="classic-board-preview__entry-markers" aria-label="entry markers">
      {getClassicEntryCells().map(({ factionId, square, cell }) => (
        <text key={`${factionId}:${square}`} x={cell.center.x} y={cell.center.y - 18}>{factionId} entry</text>
      ))}
    </g>
  );
}

export function ClassicBoardGeometryPreview() {
  const [showNumbers, setShowNumbers] = useState(true);

  return (
    <main className="classic-board-preview-page">
      <header className="classic-board-preview-page__header">
        <div>
          <p>Geometry prototype</p>
          <h1>Classic Spanish Parchis Board</h1>
        </div>
        <label className="classic-board-preview-page__toggle">
          <input type="checkbox" checked={showNumbers} onChange={(event) => setShowNumbers(event.target.checked)} />
          Show common route numbers
        </label>
      </header>

      <section className="classic-board-preview-card" aria-label="Classic board geometry preview">
        <svg
          className="classic-board-preview"
          viewBox={`0 0 ${CLASSIC_BOARD_VIEW_BOX_SIZE} ${CLASSIC_BOARD_VIEW_BOX_SIZE}`}
          role="img"
          aria-label="Classic Parchis geometry prototype"
        >
          <rect className="classic-board-preview__base" x="10" y="10" width="1260" height="1260" rx="18" />
          {CLASSIC_HOME_ZONES.map((home) => <HomeZone key={home.factionId} home={home} />)}
          {CLASSIC_COMMON_CELLS.map((cell) => <CommonCell key={cell.id} cell={cell} showNumbers={showNumbers} />)}
          {CLASSIC_FINAL_LANE_CELLS.map((cell) => <FinalLaneCell key={cell.id} cell={cell} />)}
          <Goal />
          {showNumbers && <EntryMarkers />}
        </svg>
      </section>

      <section className="classic-board-preview-page__notes" aria-label="Geometry counts">
        <span>Common cells: {CLASSIC_COMMON_CELLS.length}</span>
        <span>Final cells: {CLASSIC_FINAL_LANE_CELLS.length}</span>
        <span>Homes: {CLASSIC_HOME_ZONES.length}</span>
        <span>Goal: 1</span>
      </section>
    </main>
  );
}

export default ClassicBoardGeometryPreview;
