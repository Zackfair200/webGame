import {
  FACTION_IDS,
  createCommonPosition,
  createFinalLanePosition,
  createGoalPosition,
  createHomePosition,
  getOccupantsAtPosition,
} from '../index';

function createCharacter({ id, factionId, position }) {
  return {
    id,
    factionId,
    position,
  };
}

describe('getOccupantsAtPosition', () => {
  test.each([undefined, null, {}])('rejects non-array characters: %s', (characters) => {
    expect(() =>
      getOccupantsAtPosition({ position: createCommonPosition(10), characters }),
    ).toThrow('characters must be an array.');
  });

  test('returns an empty array when no character occupies the position', () => {
    const characters = [
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
    ];

    expect(getOccupantsAtPosition({ position: createCommonPosition(11), characters })).toEqual([]);
  });

  test('returns one occupant at a common position', () => {
    const character = createCharacter({
      id: 'red.1',
      factionId: FACTION_IDS.RED,
      position: createCommonPosition(10),
    });

    expect(getOccupantsAtPosition({ position: createCommonPosition(10), characters: [character] })).toEqual([
      character,
    ]);
  });

  test('returns two occupants at the same common position', () => {
    const characters = [
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
    ];

    expect(getOccupantsAtPosition({ position: createCommonPosition(10), characters })).toEqual(characters);
  });

  test('does not include characters in different positions', () => {
    const characters = [
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(11) }),
    ];

    expect(getOccupantsAtPosition({ position: createCommonPosition(10), characters })).toEqual([
      characters[0],
    ]);
  });

  test('distinguishes final lanes by faction', () => {
    const characters = [
      createCharacter({
        id: 'red.1',
        factionId: FACTION_IDS.RED,
        position: createFinalLanePosition(FACTION_IDS.RED, 3),
      }),
      createCharacter({
        id: 'blue.1',
        factionId: FACTION_IDS.BLUE,
        position: createFinalLanePosition(FACTION_IDS.BLUE, 3),
      }),
    ];

    expect(
      getOccupantsAtPosition({
        position: createFinalLanePosition(FACTION_IDS.RED, 3),
        characters,
      }),
    ).toEqual([characters[0]]);
  });

  test('does not treat home as a playable occupied position', () => {
    const characters = [
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createHomePosition() }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createHomePosition() }),
    ];

    expect(getOccupantsAtPosition({ position: createHomePosition(), characters })).toEqual([]);
  });

  test('does not treat goal as a playable occupied position', () => {
    const characters = [
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
      createCharacter({ id: 'red.2', factionId: FACTION_IDS.RED, position: createGoalPosition() }),
    ];

    expect(getOccupantsAtPosition({ position: createGoalPosition(), characters })).toEqual([]);
  });

  test('returns a new array with defensive character and position copies', () => {
    const character = createCharacter({
      id: 'red.1',
      factionId: FACTION_IDS.RED,
      position: createCommonPosition(10),
    });
    const characters = [character];
    const occupants = getOccupantsAtPosition({ position: createCommonPosition(10), characters });

    occupants[0].id = 'changed';
    occupants[0].position.square = 99;

    expect(occupants).not.toBe(characters);
    expect(occupants[0]).not.toBe(character);
    expect(occupants[0].position).not.toBe(character.position);
    expect(character).toEqual({
      id: 'red.1',
      factionId: FACTION_IDS.RED,
      position: createCommonPosition(10),
    });
  });

  test('does not mutate characters', () => {
    const characters = [
      createCharacter({ id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) }),
      createCharacter({ id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createCommonPosition(12) }),
    ];
    const before = JSON.parse(JSON.stringify(characters));

    getOccupantsAtPosition({ position: createCommonPosition(10), characters });

    expect(characters).toEqual(before);
  });
});
