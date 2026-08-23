import { FACTION_IDS } from '../engine';
import blueAlchemistAvatar from '../../assets/characters/blue/alchemy-avatar.png';
import blueHunterAvatar from '../../assets/characters/blue/hunter-avatar.png';
import blueIceMageAvatar from '../../assets/characters/blue/frostmage-avatar.png';
import blueRogueAvatar from '../../assets/characters/blue/rogue-avatar.png';
import greenArcherAvatar from '../../assets/characters/green/archer-avatar.png';
import greenDruidAvatar from '../../assets/characters/green/druid-avatar.png';
import greenFairyAvatar from '../../assets/characters/green/fairy-avatar.png';
import greenRangerAvatar from '../../assets/characters/green/ranger-avatar.png';
import redAssassinAvatar from '../../assets/characters/red/assasin-avatar.png';
import redBlacksmithAvatar from '../../assets/characters/red/forge-avatar.png';
import redFireMageAvatar from '../../assets/characters/red/firemage-avatar.png';
import redWarriorAvatar from '../../assets/characters/red/warrior-avatar.png';
import yellowClericAvatar from '../../assets/characters/yellow/cleric-avatar.png';
import yellowEngineerAvatar from '../../assets/characters/yellow/engineer-avatar.png';
import yellowMonkAvatar from '../../assets/characters/yellow/monk-avatar.png';
import yellowPaladinAvatar from '../../assets/characters/yellow/pala-avatar.png';

export const CHARACTER_VISUALS_BY_ID = Object.freeze({
  druid: Object.freeze({ factionId: FACTION_IDS.GREEN, fallbackInitials: 'DR', portraitSrc: greenDruidAvatar }),
  archer: Object.freeze({ factionId: FACTION_IDS.GREEN, fallbackInitials: 'AR', portraitSrc: greenArcherAvatar }),
  ranger: Object.freeze({ factionId: FACTION_IDS.GREEN, fallbackInitials: 'MO', portraitSrc: greenRangerAvatar }),
  fairy: Object.freeze({ factionId: FACTION_IDS.GREEN, fallbackInitials: 'HA', portraitSrc: greenFairyAvatar }),
  fireMage: Object.freeze({ factionId: FACTION_IDS.RED, fallbackInitials: 'MF', portraitSrc: redFireMageAvatar }),
  warrior: Object.freeze({ factionId: FACTION_IDS.RED, fallbackInitials: 'GU', portraitSrc: redWarriorAvatar }),
  blacksmith: Object.freeze({ factionId: FACTION_IDS.RED, fallbackInitials: 'HE', portraitSrc: redBlacksmithAvatar }),
  assassin: Object.freeze({ factionId: FACTION_IDS.RED, fallbackInitials: 'AS', portraitSrc: redAssassinAvatar }),
  iceMage: Object.freeze({ factionId: FACTION_IDS.BLUE, fallbackInitials: 'MH', portraitSrc: blueIceMageAvatar }),
  hunter: Object.freeze({ factionId: FACTION_IDS.BLUE, fallbackInitials: 'CA', portraitSrc: blueHunterAvatar }),
  alchemist: Object.freeze({ factionId: FACTION_IDS.BLUE, fallbackInitials: 'AL', portraitSrc: blueAlchemistAvatar }),
  rogue: Object.freeze({ factionId: FACTION_IDS.BLUE, fallbackInitials: 'LA', portraitSrc: blueRogueAvatar }),
  paladin: Object.freeze({ factionId: FACTION_IDS.YELLOW, fallbackInitials: 'PA', portraitSrc: yellowPaladinAvatar }),
  monk: Object.freeze({ factionId: FACTION_IDS.YELLOW, fallbackInitials: 'MN', portraitSrc: yellowMonkAvatar }),
  cleric: Object.freeze({ factionId: FACTION_IDS.YELLOW, fallbackInitials: 'CL', portraitSrc: yellowClericAvatar }),
  engineer: Object.freeze({ factionId: FACTION_IDS.YELLOW, fallbackInitials: 'IN', portraitSrc: yellowEngineerAvatar }),
});

function getFallbackInitials(character) {
  return character.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function getCharacterVisual(character) {
  const configuredVisual = CHARACTER_VISUALS_BY_ID[character.characterId];
  const portraitSrc = character.portraitSrc || character.image || configuredVisual?.portraitSrc || null;

  if (configuredVisual) {
    return {
      ...configuredVisual,
      portraitSrc,
    };
  }

  return {
    factionId: character.factionId,
    fallbackInitials: getFallbackInitials(character),
    portraitSrc,
  };
}
