import {
  COMMON_SQUARES,
  LAST_COMMON_SQUARE_BY_FACTION,
  FINAL_LANES_BY_FACTION,
  GOAL_POSITION,
  START_SQUARE_BY_FACTION,
} from './board';
import { getFactionIds } from '../factions/factions';
import { createCommonPosition, createHomePosition } from '../state/positions';

export function getCommonRouteSquaresForFaction(factionId) {
  const startSquare = START_SQUARE_BY_FACTION[factionId];
  const entrySquare = LAST_COMMON_SQUARE_BY_FACTION[factionId];

  if (!startSquare || !entrySquare) {
    return [];
  }

  const route = [];
  let currentSquare = startSquare;

  while (true) {
    route.push(currentSquare);

    if (currentSquare === entrySquare) {
      return route;
    }

    currentSquare = currentSquare === COMMON_SQUARES.length ? 1 : currentSquare + 1;
  }
}

export function getRouteForFaction(factionId) {
  return Object.freeze([
    createHomePosition(),
    ...getCommonRouteSquaresForFaction(factionId).map(createCommonPosition),
    ...FINAL_LANES_BY_FACTION[factionId],
    GOAL_POSITION,
  ]);
}

export const ROUTES_BY_FACTION = Object.freeze(
  getFactionIds().reduce((routes, factionId) => {
    return {
      ...routes,
      [factionId]: getRouteForFaction(factionId),
    };
  }, {}),
);
