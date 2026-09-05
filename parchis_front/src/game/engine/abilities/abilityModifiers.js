import { MOVEMENT_TYPES } from '../movement/types';
import { ABILITY_HOOKS } from './abilities';
import { ABILITY_ACTIVATION_TYPES } from './types';

const ORDINARY_MOVEMENT_TYPES = new Set([
  MOVEMENT_TYPES.NORMAL,
  MOVEMENT_TYPES.REWARD,
]);

function hasPassiveAbilityHook(rulesContext, hook) {
  return rulesContext.abilities.some(
    (ability) =>
      ability.activationType === ABILITY_ACTIVATION_TYPES.PASSIVE &&
      ability.hooks.includes(hook),
  );
}

export function getOptionalPostMovementAbilities({ rulesContext }) {
  if (!rulesContext || !ORDINARY_MOVEMENT_TYPES.has(rulesContext.movementType)) {
    return [];
  }

  return rulesContext.abilities.filter(
    (ability) =>
      ability.activationType === ABILITY_ACTIVATION_TYPES.PASSIVE &&
      ability.hooks.includes(ABILITY_HOOKS.OPTIONAL_POST_MOVEMENT_ACTIVATION),
  );
}

export function canPassThroughIntermediateBarrier({ rulesContext, pathIndex, pathLength }) {
  if (
    !rulesContext ||
    !ORDINARY_MOVEMENT_TYPES.has(rulesContext.movementType) ||
    pathIndex >= pathLength - 1
  ) {
    return false;
  }

  return hasPassiveAbilityHook(
    rulesContext,
    ABILITY_HOOKS.PASS_THROUGH_INTERMEDIATE_BARRIERS,
  );
}

export function canCaptureEnemyOnSafeDestination({ rulesContext }) {
  if (!rulesContext || !ORDINARY_MOVEMENT_TYPES.has(rulesContext.movementType)) {
    return false;
  }

  return hasPassiveAbilityHook(
    rulesContext,
    ABILITY_HOOKS.CAPTURE_ENEMY_ON_SAFE_DESTINATION,
  );
}
