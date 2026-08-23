import { FACTION_IDS, POSITION_TYPES } from '../engine';
import { createActionsByCharacterId, getVisualBarriers, groupCharactersByPosition } from './boardOccupancy';

function createGameState(players) {
  return {
    players,
  };
}

function createCharacter(id, factionId, position) {
  return {
    id,
    characterId: id.split('.')[1],
    name: id,
    factionId,
    position,
  };
}

describe('boardOccupancy', () => {
  test('groups characters by engine position key', () => {
    const gameState = createGameState([
      {
        id: 'player-a',
        name: 'Player A',
        characters: [
          createCharacter('red.fireMage', FACTION_IDS.RED, { type: POSITION_TYPES.HOME }),
          createCharacter('red.warrior', FACTION_IDS.RED, { type: POSITION_TYPES.COMMON, square: 22 }),
        ],
      },
    ]);

    const groups = groupCharactersByPosition(gameState);

    expect(groups.get('home:red')).toHaveLength(1);
    expect(groups.get('common:22')).toHaveLength(1);
  });

  test('maps character ids to action arrays', () => {
    const firstAction = { type: 'normalMovement', characterId: 'red.fireMage' };
    const secondAction = { type: 'breakBarrier', characterId: 'red.fireMage' };
    const thirdAction = { type: 'normalMovement', characterId: 'red.warrior' };
    const actionsByCharacterId = createActionsByCharacterId([firstAction, secondAction, thirdAction]);

    expect(actionsByCharacterId.get('red.fireMage')).toEqual([firstAction, secondAction]);
    expect(actionsByCharacterId.get('red.warrior')).toEqual([thirdAction]);
  });

  test('derives visual barriers through the engine barrier helper', () => {
    const gameState = createGameState([
      {
        id: 'player-a',
        name: 'Player A',
        characters: [
          createCharacter('red.fireMage', FACTION_IDS.RED, { type: POSITION_TYPES.COMMON, square: 22 }),
          createCharacter('red.warrior', FACTION_IDS.RED, { type: POSITION_TYPES.COMMON, square: 22 }),
        ],
      },
    ]);

    const barriers = getVisualBarriers(gameState);

    expect(barriers).toHaveLength(1);
    expect(barriers[0].position).toEqual({ type: POSITION_TYPES.COMMON, square: 22 });
    expect(barriers[0].factionId).toBe(FACTION_IDS.RED);
  });
});
