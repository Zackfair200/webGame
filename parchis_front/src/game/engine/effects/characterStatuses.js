import { MOVEMENT_TYPES } from '../movement/types';
import { CHARACTER_STATUS_TYPES } from './types';
import { removeCharacterEffectsById } from './characterEffects';

export function resolveMovementStepsFromStatuses({ steps, rulesContext }) {
  const frozen = rulesContext?.effects?.character?.find(
    (effect) => effect.type === CHARACTER_STATUS_TYPES.FROZEN,
  );

  if (rulesContext?.movementType !== MOVEMENT_TYPES.NORMAL || !frozen) {
    return { effectiveSteps: steps, usedStatusEffectIds: [] };
  }

  return {
    effectiveSteps: Math.ceil(steps / 2),
    usedStatusEffectIds: [frozen.id],
  };
}

export function consumeUsedMovementStatuses({ state, characterId, usedStatusEffectIds = [] }) {
  return removeCharacterEffectsById({
    state,
    characterId,
    effectIds: usedStatusEffectIds,
  });
}
