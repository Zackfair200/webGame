import { EFFECT_SCOPE_TYPES, createEffectState } from '../index';

describe('effect contracts', () => {
  test('creates a serializable deterministic effect state', () => {
    const effect = createEffectState({
      id: 'effect-1',
      type: 'testEffect',
      scope: { type: EFFECT_SCOPE_TYPES.CHARACTER, targetId: 'red.1' },
      source: { type: 'test' },
      remainingTurns: 2,
      data: { amount: 1 },
    });

    expect(JSON.parse(JSON.stringify(effect))).toEqual(effect);
    expect(effect.remainingTurns).toBe(2);
  });

  test('global effects do not require a target', () => {
    expect(createEffectState({
      id: 'global-1',
      type: 'testGlobalEffect',
      scope: { type: EFFECT_SCOPE_TYPES.GLOBAL },
    }).scope).toEqual({ type: EFFECT_SCOPE_TYPES.GLOBAL });
  });
});
