import {
  getAbilitiesForCharacterType,
} from '../abilities/abilityRegistry';
import { ABILITY_REGISTRY } from '../abilities/abilities';
import { MOVEMENT_TYPES } from '../movement/types';

function cloneValue(value) {
  if (value === undefined || value === null) {
    return value;
  }

  return JSON.parse(JSON.stringify(value));
}

function getActor(gameState, actorCharacterId) {
  if (actorCharacterId === null) {
    return null;
  }

  const matchingCharacters = gameState.players
    .flatMap((player) => player.characters)
    .filter((character) => character.id === actorCharacterId);

  if (matchingCharacters.length > 1) {
    throw new Error(`Duplicate character id: ${actorCharacterId}`);
  }

  if (matchingCharacters.length === 0) {
    throw new Error(`actorCharacterId must match exactly one character: ${actorCharacterId}`);
  }

  return matchingCharacters[0];
}

function getEffects({ gameState, actor, terrainPositionKey }) {
  return {
    character: cloneValue(gameState.characterStatesById?.[actor?.id]?.effects || []),
    faction: cloneValue(gameState.factionStatesById?.[actor?.factionId]?.effects || []),
    global: cloneValue(gameState.globalEffects || []),
    terrain: cloneValue(
      terrainPositionKey === null
        ? []
        : gameState.terrainEffectsByPositionKey?.[terrainPositionKey] || [],
    ),
  };
}

export function createRulesContext({
  gameState,
  turnState = null,
  actorCharacterId = null,
  source = null,
  movementType = null,
  terrainPositionKey = null,
  abilityRegistry = ABILITY_REGISTRY,
}) {
  if (!gameState || !Array.isArray(gameState.players)) {
    throw new Error('rulesContext requires a gameState with players.');
  }

  if (movementType !== null && !Object.values(MOVEMENT_TYPES).includes(movementType)) {
    throw new Error(`Invalid rulesContext movementType: ${movementType}`);
  }

  const actor = getActor(gameState, actorCharacterId);
  const abilities = actor
    ? getAbilitiesForCharacterType({ registry: abilityRegistry, characterType: actor.characterId })
    : [];

  return {
    gameState: cloneValue(gameState),
    turnState: cloneValue(turnState),
    actor: cloneValue(actor),
    source: cloneValue(source),
    movementType,
    abilities,
    effects: getEffects({ gameState, actor, terrainPositionKey }),
    terrainPositionKey,
  };
}

export function createMovementRulesContext({
  gameState = null,
  characters,
  actorCharacterId,
  source,
  movementType,
}) {
  if (!Array.isArray(characters)) {
    throw new Error('movement rulesContext requires characters.');
  }

  const contextGameState = gameState || {
    players: [{ characters }],
    characterStatesById: {},
    factionStatesById: {},
    globalEffects: [],
    terrainEffectsByPositionKey: {},
  };

  return createRulesContext({
    gameState: contextGameState,
    actorCharacterId,
    source,
    movementType,
  });
}

export function assertRulesContextActor({ actor, rulesContext }) {
  if (!rulesContext) {
    return;
  }

  if (
    rulesContext.actor?.id !== actor.id ||
    rulesContext.actor?.characterId !== actor.characterId ||
    rulesContext.actor?.factionId !== actor.factionId
  ) {
    throw new Error('rulesContext actor must match the character being evaluated.');
  }
}
