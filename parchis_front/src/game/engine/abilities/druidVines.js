import { createEffectState } from '../effects/effectState';
import { EFFECT_SCOPE_TYPES, TERRAIN_EFFECT_TYPES } from '../effects/types';
import {
  clonePosition,
  getPlayablePositionKey,
  isPlayablePosition,
  isSamePosition,
} from '../state/positions';
import { ABILITY_IDS } from './abilities';
import { getCharacterAbilityState, updateCharacterAbilityState } from './abilityState';

export const DRUID_VINES_INITIAL_CHARGES = 2;
export const DRUID_VINES_MAX_ACTIVE = 2;

function getCharacter(state, characterId) {
  return state.players
    .flatMap((player) => player.characters)
    .find((character) => character.id === characterId) || null;
}

function isDruidVinesEffectFrom(effect, characterId) {
  return (
    effect?.type === TERRAIN_EFFECT_TYPES.DRUID_VINES &&
    effect.source?.abilityId === ABILITY_IDS.DRUID_VINES &&
    effect.source?.sourceCharacterId === characterId
  );
}

export function getActiveDruidVines({ state, characterId }) {
  return Object.values(state.terrainEffectsByPositionKey || {})
    .flat()
    .filter((effect) => isDruidVinesEffectFrom(effect, characterId));
}

export function canActivateDruidVines({ state, characterId, position }) {
  const character = getCharacter(state, characterId);
  const abilityState = getCharacterAbilityState({
    state,
    characterId,
    abilityId: ABILITY_IDS.DRUID_VINES,
  });

  if (
    character?.characterId !== 'druid' ||
    !isPlayablePosition(position) ||
    !isSamePosition(character.position, position) ||
    !Number.isInteger(abilityState?.charges) ||
    abilityState.charges <= 0
  ) {
    return false;
  }

  const activeVines = getActiveDruidVines({ state, characterId });

  return (
    activeVines.length < DRUID_VINES_MAX_ACTIVE &&
    !activeVines.some((effect) => isSamePosition(effect.data?.position, position))
  );
}

export function createDruidVinesEffect({ characterId, factionId, position }) {
  const positionKey = getPlayablePositionKey(position);

  return createEffectState({
    id: `${ABILITY_IDS.DRUID_VINES}:${characterId}:${positionKey}`,
    type: TERRAIN_EFFECT_TYPES.DRUID_VINES,
    scope: { type: EFFECT_SCOPE_TYPES.TERRAIN, targetId: positionKey },
    source: {
      type: 'ability',
      abilityId: ABILITY_IDS.DRUID_VINES,
      sourceCharacterId: characterId,
      factionId,
    },
    data: {
      position: clonePosition(position),
      sourceCharacterId: characterId,
      factionId,
    },
  });
}

export function activateDruidVines({ state, characterId, position }) {
  if (!canActivateDruidVines({ state, characterId, position })) {
    throw new Error('Druid vines cannot be activated in the current state.');
  }

  const character = getCharacter(state, characterId);
  const abilityState = getCharacterAbilityState({
    state,
    characterId,
    abilityId: ABILITY_IDS.DRUID_VINES,
  });
  const positionKey = getPlayablePositionKey(position);
  const effect = createDruidVinesEffect({
    characterId,
    factionId: character.factionId,
    position,
  });
  const stateWithCharge = updateCharacterAbilityState({
    state,
    characterId,
    abilityId: ABILITY_IDS.DRUID_VINES,
    abilityState: { ...abilityState, charges: abilityState.charges - 1 },
  });

  return {
    ...stateWithCharge,
    terrainEffectsByPositionKey: {
      ...(stateWithCharge.terrainEffectsByPositionKey || {}),
      [positionKey]: [
        ...(stateWithCharge.terrainEffectsByPositionKey?.[positionKey] || []),
        effect,
      ],
    },
  };
}

export function resetDruidVinesAfterCapture({ state, characterId }) {
  const character = getCharacter(state, characterId);

  if (character?.characterId !== 'druid') {
    return state;
  }

  const abilityState = getCharacterAbilityState({
    state,
    characterId,
    abilityId: ABILITY_IDS.DRUID_VINES,
  }) || {};
  const stateWithCharges = updateCharacterAbilityState({
    state,
    characterId,
    abilityId: ABILITY_IDS.DRUID_VINES,
    abilityState: { ...abilityState, charges: DRUID_VINES_INITIAL_CHARGES },
  });
  const terrainEffectsByPositionKey = Object.fromEntries(
    Object.entries(stateWithCharges.terrainEffectsByPositionKey || {}).flatMap(([positionKey, effects]) => {
      const remainingEffects = effects.filter(
        (effect) => !isDruidVinesEffectFrom(effect, characterId),
      );

      return remainingEffects.length === 0 ? [] : [[positionKey, remainingEffects]];
    }),
  );

  return {
    ...stateWithCharges,
    terrainEffectsByPositionKey,
  };
}

export function isDruidVinesTriggeredBy({ effect, character }) {
  return (
    effect?.type === TERRAIN_EFFECT_TYPES.DRUID_VINES &&
    effect.source?.factionId !== character.factionId
  );
}
