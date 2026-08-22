import { shufflePlayerIds } from './shufflePlayerIds';

describe('shufflePlayerIds', () => {
  test.each([
    [2, ['player-a', 'player-b']],
    [3, ['player-a', 'player-b', 'player-c']],
    [4, ['player-a', 'player-b', 'player-c', 'player-d']],
  ])('returns an exact permutation for %i players', (_, playerIds) => {
    const result = shufflePlayerIds(playerIds, () => 0.25);

    expect(result).toHaveLength(playerIds.length);
    expect(new Set(result).size).toBe(playerIds.length);
    expect([...result].sort()).toEqual([...playerIds].sort());
  });

  test('returns the same ids as a new array', () => {
    const playerIds = ['player-a', 'player-b', 'player-c', 'player-d'];
    const result = shufflePlayerIds(playerIds, () => 0.5);

    expect(result).not.toBe(playerIds);
    expect([...result].sort()).toEqual([...playerIds].sort());
  });

  test('does not mutate the input array', () => {
    const playerIds = ['player-a', 'player-b', 'player-c'];

    shufflePlayerIds(playerIds, () => 0);

    expect(playerIds).toEqual(['player-a', 'player-b', 'player-c']);
  });

  test('is deterministic with an injected random function', () => {
    const values = [0, 0.99, 0.5];
    const random = jest.fn(() => values.shift());

    expect(shufflePlayerIds(['player-a', 'player-b', 'player-c', 'player-d'], random)).toEqual([
      'player-d',
      'player-b',
      'player-c',
      'player-a',
    ]);
    expect(random).toHaveBeenCalledTimes(3);
  });
});
