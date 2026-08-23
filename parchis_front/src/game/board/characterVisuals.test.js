import { FACTION_IDS } from '../engine';
import { CHARACTER_VISUALS_BY_ID, getCharacterVisual } from './characterVisuals';

function createCharacter({ characterId, factionId, name = characterId, portraitSrc, image }) {
  return {
    id: `${factionId}.${characterId}`,
    characterId,
    factionId,
    name,
    portraitSrc,
    image,
  };
}

describe('characterVisuals', () => {
  test.each([
    ['druid', FACTION_IDS.GREEN, 'druid-avatar.png'],
    ['archer', FACTION_IDS.GREEN, 'archer-avatar.png'],
    ['ranger', FACTION_IDS.GREEN, 'ranger-avatar.png'],
    ['fairy', FACTION_IDS.GREEN, 'fairy-avatar.png'],
    ['fireMage', FACTION_IDS.RED, 'firemage-avatar.png'],
    ['warrior', FACTION_IDS.RED, 'warrior-avatar.png'],
    ['blacksmith', FACTION_IDS.RED, 'forge-avatar.png'],
    ['assassin', FACTION_IDS.RED, 'assasin-avatar.png'],
    ['iceMage', FACTION_IDS.BLUE, 'frostmage-avatar.png'],
    ['hunter', FACTION_IDS.BLUE, 'hunter-avatar.png'],
    ['alchemist', FACTION_IDS.BLUE, 'alchemy-avatar.png'],
    ['rogue', FACTION_IDS.BLUE, 'rogue-avatar.png'],
    ['paladin', FACTION_IDS.YELLOW, 'pala-avatar.png'],
    ['monk', FACTION_IDS.YELLOW, 'monk-avatar.png'],
    ['cleric', FACTION_IDS.YELLOW, 'cleric-avatar.png'],
    ['engineer', FACTION_IDS.YELLOW, 'engineer-avatar.png'],
  ])('resolves the %s portrait asset', (characterId, factionId, expectedFilename) => {
    const visual = getCharacterVisual(createCharacter({ characterId, factionId }));

    expect(visual.factionId).toBe(factionId);
    expect(visual.portraitSrc).toBe(expectedFilename);
  });

  test('all configured characters have portrait assets', () => {
    Object.entries(CHARACTER_VISUALS_BY_ID).forEach(([characterId, visual]) => {
      expect(getCharacterVisual(createCharacter({ characterId, factionId: visual.factionId })).portraitSrc).toBeTruthy();
      expect(visual.fallbackInitials).toBeTruthy();
    });
  });

  test('keeps fallback initials for unconfigured characters without portraits', () => {
    const visual = getCharacterVisual(createCharacter({
      characterId: 'unconfigured',
      factionId: FACTION_IDS.BLUE,
      name: 'Personaje sin retrato',
    }));

    expect(visual.factionId).toBe(FACTION_IDS.BLUE);
    expect(visual.fallbackInitials).toBe('PS');
    expect(visual.portraitSrc).toBeNull();
  });

  test('allows explicit character portrait overrides without changing fallback identity', () => {
    const visual = getCharacterVisual(createCharacter({
      characterId: 'hunter',
      factionId: FACTION_IDS.BLUE,
      portraitSrc: 'custom-hunter.png',
    }));

    expect(visual.factionId).toBe(FACTION_IDS.BLUE);
    expect(visual.fallbackInitials).toBe('CA');
    expect(visual.portraitSrc).toBe('custom-hunter.png');
  });
});
