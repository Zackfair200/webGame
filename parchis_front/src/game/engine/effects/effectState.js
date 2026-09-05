import { EFFECT_SCOPE_TYPES } from './types';

function assertNonEmptyString(value, field) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`effect.${field} is required.`);
  }
}

export function createEffectState({
  id,
  type,
  scope,
  source = null,
  remainingTurns = null,
  data = {},
}) {
  assertNonEmptyString(id, 'id');
  assertNonEmptyString(type, 'type');

  if (!scope || !Object.values(EFFECT_SCOPE_TYPES).includes(scope.type)) {
    throw new Error(`Invalid effect scope type: ${scope?.type}`);
  }

  if (scope.type !== EFFECT_SCOPE_TYPES.GLOBAL) {
    assertNonEmptyString(scope.targetId, 'scope.targetId');
  }

  if (remainingTurns !== null && (!Number.isInteger(remainingTurns) || remainingTurns < 0)) {
    throw new Error('effect.remainingTurns must be null or a non-negative integer.');
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('effect.data must be an object.');
  }

  return JSON.parse(JSON.stringify({
    id,
    type,
    scope,
    source,
    remainingTurns,
    data,
  }));
}
