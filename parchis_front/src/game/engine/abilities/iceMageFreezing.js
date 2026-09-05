import { createEffectState } from '../effects/effectState';
import { addCharacterEffect, getCharacterEffects } from '../effects/characterEffects';
import {
  CHARACTER_STATUS_TYPES,
  EFFECT_SCOPE_TYPES,
  TERRAIN_EFFECT_TYPES,
} from '../effects/types';
import { getOccupantsAtPosition } from '../occupancy/occupancy';
import {
  clonePosition,
  getPlayablePositionKey,
  isPlayablePosition,
  isSamePosition,
} from '../state/positions';
import { ABILITY_IDS } from './abilities';
import { getCharacterAbilityState, updateCharacterAbilityState } from './abilityState';

export const ICE_MAGE_FREEZING_INITIAL_CHARGES = 2;

function getCharacters(state) {
  return state.players.flatMap((player) => player.characters);
}

function getCharacter(state, characterId) {
  return getCharacters(state).find((character) => character.id === characterId) || null;
}

function isIceEffectFrom(effect, characterId) {
  return (
    effect?.type === TERRAIN_EFFECT_TYPES.ICE &&
    effect.source?.abilityId === ABILITY_IDS.ICE_MAGE_FREEZING &&
    effect.source?.sourceCharacterId === characterId
  );
}

export function createFrozenStatus({ sourceCharacterId, sourceFactionId, targetCharacterId }) {
  return createEffectState({
    id: `${CHARACTER_STATUS_TYPES.FROZEN}:${targetCharacterId}`,
    type: CHARACTER_STATUS_TYPES.FROZEN,
    scope: { type: EFFECT_SCOPE_TYPES.CHARACTER, targetId: targetCharacterId },
    source: {
      type: 'ability',
      abilityId: ABILITY_IDS.ICE_MAGE_FREEZING,
      sourceCharacterId,
      factionId: sourceFactionId,
    },
    data: {},
  });
}

export function isCharacterFrozen({ state, characterId }) {
  return getCharacterEffects({ state, characterId }).some(
    (effect) => effect.type === CHARACTER_STATUS_TYPES.FROZEN,
  );
}

export function applyFrozenStatus({ state, sourceCharacterId, sourceFactionId, targetCharacterId }) {
  if (isCharacterFrozen({ state, characterId: targetCharacterId })) {
    return state;
  }

  return addCharacterEffect({
    state,
    characterId: targetCharacterId,
    effect: createFrozenStatus({ sourceCharacterId, sourceFactionId, targetCharacterId }),
  });
}

export function createIceEffect({ characterId, factionId, position, chargeSequence }) {
  const positionKey = getPlayablePositionKey(position);

  return createEffectState({
    id: `${ABILITY_IDS.ICE_MAGE_FREEZING}:${characterId}:${positionKey}:${chargeSequence}`,
    type: TERRAIN_EFFECT_TYPES.ICE,
    scope: { type: EFFECT_SCOPE_TYPES.TERRAIN, targetId: positionKey },
    source: {
      type: 'ability',
      abilityId: ABILITY_IDS.ICE_MAGE_FREEZING,
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

function hasValidFreezingState({ state, characterId, position, previousPosition }) {
  const character = getCharacter(state, characterId);
  const abilityState = getCharacterAbilityState({
    state,
    characterId,
    abilityId: ABILITY_IDS.ICE_MAGE_FREEZING,
  });

  return Boolean(
    character?.characterId === 'iceMage' &&
    isSamePosition(character.position, position) &&
    isPlayablePosition(previousPosition) &&
    Number.isInteger(abilityState?.charges) &&
    abilityState.charges > 0
  );
}

export function getIceMageFreezingActivationOptions({
  state,
  characterId,
  position,
  previousPosition,
}) {
  if (!hasValidFreezingState({ state, characterId, position, previousPosition })) {
    return [];
  }

  const character = getCharacter(state, characterId);
  const occupants = getOccupantsAtPosition({
    position: previousPosition,
    characters: getCharacters(state),
  });

  if (occupants.length > 2) {
    throw new Error('Cannot activate freezing with more than two previous-position occupants.');
  }

  if (occupants.length === 0) {
    return [{ targetCharacterId: null }];
  }

  return occupants
    .filter((occupant) => occupant.factionId !== character.factionId)
    .map((occupant) => ({ targetCharacterId: occupant.id }));
}

export function activateIceMageFreezing({
  state,
  characterId,
  position,
  previousPosition,
  targetCharacterId = null,
}) {
  const options = getIceMageFreezingActivationOptions({
    state,
    characterId,
    position,
    previousPosition,
  });
  const selectedOption = options.find(
    (option) => option.targetCharacterId === targetCharacterId,
  );

  if (!selectedOption) {
    throw new Error('Ice Mage freezing cannot be activated in the current state.');
  }

  const character = getCharacter(state, characterId);
  const abilityState = getCharacterAbilityState({
    state,
    characterId,
    abilityId: ABILITY_IDS.ICE_MAGE_FREEZING,
  });
  const stateWithCharge = updateCharacterAbilityState({
    state,
    characterId,
    abilityId: ABILITY_IDS.ICE_MAGE_FREEZING,
    abilityState: { ...abilityState, charges: abilityState.charges - 1 },
  });

  if (targetCharacterId) {
    return applyFrozenStatus({
      state: stateWithCharge,
      sourceCharacterId: characterId,
      sourceFactionId: character.factionId,
      targetCharacterId,
    });
  }

  const positionKey = getPlayablePositionKey(previousPosition);
  const effect = createIceEffect({
    characterId,
    factionId: character.factionId,
    position: previousPosition,
    chargeSequence: abilityState.charges,
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

export function isIceTriggeredBy({ effect, character }) {
  return (
    effect?.type === TERRAIN_EFFECT_TYPES.ICE &&
    effect.source?.factionId !== character.factionId
  );
}

export function applyIceTerrainTrigger({ state, characterId, trigger }) {
  const target = getCharacter(state, characterId);

  return applyFrozenStatus({
    state,
    sourceCharacterId: trigger.effect.source.sourceCharacterId,
    sourceFactionId: trigger.effect.source.factionId,
    targetCharacterId: target.id,
  });
}

export function resetIceMageFreezingAfterCapture({ state, characterId }) {
  const character = getCharacter(state, characterId);

  if (character?.characterId !== 'iceMage') {
    return state;
  }

  const abilityState = getCharacterAbilityState({
    state,
    characterId,
    abilityId: ABILITY_IDS.ICE_MAGE_FREEZING,
  }) || {};
  const stateWithCharges = updateCharacterAbilityState({
    state,
    characterId,
    abilityId: ABILITY_IDS.ICE_MAGE_FREEZING,
    abilityState: { ...abilityState, charges: ICE_MAGE_FREEZING_INITIAL_CHARGES },
  });
  const terrainEffectsByPositionKey = Object.fromEntries(
    Object.entries(stateWithCharges.terrainEffectsByPositionKey || {}).flatMap(([positionKey, effects]) => {
      const remainingEffects = effects.filter(
        (effect) => !isIceEffectFrom(effect, characterId),
      );

      return remainingEffects.length === 0 ? [] : [[positionKey, remainingEffects]];
    }),
  );

  return {
    ...stateWithCharges,
    terrainEffectsByPositionKey,
  };
}
