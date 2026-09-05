export const FACTION_IDS = Object.freeze({
  RED: 'red',
  GREEN: 'green',
  BLUE: 'blue',
  YELLOW: 'yellow',
});

export const FACTIONS = Object.freeze([
  Object.freeze({ id: FACTION_IDS.RED, name: 'Roja' }),
  Object.freeze({ id: FACTION_IDS.GREEN, name: 'Verde' }),
  Object.freeze({ id: FACTION_IDS.BLUE, name: 'Azul' }),
  Object.freeze({ id: FACTION_IDS.YELLOW, name: 'Amarilla' }),
]);

export const CHARACTERS_BY_FACTION = Object.freeze({
  [FACTION_IDS.GREEN]: Object.freeze([
    Object.freeze({ id: 'druid', name: 'Druida', factionId: FACTION_IDS.GREEN }),
    Object.freeze({ id: 'archer', name: 'Arquero', factionId: FACTION_IDS.GREEN }),
    Object.freeze({ id: 'ranger', name: 'Montaraz', factionId: FACTION_IDS.GREEN }),
    Object.freeze({ id: 'fairy', name: 'Hada', factionId: FACTION_IDS.GREEN }),
  ]),
  [FACTION_IDS.RED]: Object.freeze([
    Object.freeze({ id: 'fireMage', name: 'Mago de fuego', factionId: FACTION_IDS.RED }),
    Object.freeze({ id: 'warrior', name: 'Guerrero', factionId: FACTION_IDS.RED }),
    Object.freeze({ id: 'blacksmith', name: 'Herrero', factionId: FACTION_IDS.RED }),
    Object.freeze({ id: 'assassin', name: 'Asesino', factionId: FACTION_IDS.RED }),
  ]),
  [FACTION_IDS.BLUE]: Object.freeze([
    Object.freeze({ id: 'iceMage', name: 'Mago de hielo', factionId: FACTION_IDS.BLUE }),
    Object.freeze({ id: 'hunter', name: 'Cazador', factionId: FACTION_IDS.BLUE }),
    Object.freeze({ id: 'alchemist', name: 'Alquimista', factionId: FACTION_IDS.BLUE }),
    Object.freeze({ id: 'rogue', name: 'Ladrón', factionId: FACTION_IDS.BLUE }),
  ]),
  [FACTION_IDS.YELLOW]: Object.freeze([
    Object.freeze({ id: 'paladin', name: 'Paladín', factionId: FACTION_IDS.YELLOW }),
    Object.freeze({ id: 'monk', name: 'Monje', factionId: FACTION_IDS.YELLOW }),
    Object.freeze({ id: 'cleric', name: 'Clérigo', factionId: FACTION_IDS.YELLOW }),
    Object.freeze({ id: 'engineer', name: 'Ingeniero', factionId: FACTION_IDS.YELLOW }),
  ]),
});

export function getFactionIds() {
  return FACTIONS.map((faction) => faction.id);
}

export function getCharactersForFaction(factionId) {
  return CHARACTERS_BY_FACTION[factionId] || [];
}
