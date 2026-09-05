import { EFFECT_SCOPE_TYPES } from './types';

function cloneEffect(effect) {
  return JSON.parse(JSON.stringify(effect));
}

export function getCharacterEffects({ state, characterId }) {
  return (state.characterStatesById?.[characterId]?.effects || []).map(cloneEffect);
}

export function addCharacterEffect({ state, characterId, effect }) {
  if (
    effect?.scope?.type !== EFFECT_SCOPE_TYPES.CHARACTER ||
    effect.scope.targetId !== characterId
  ) {
    throw new Error('Character effect scope must match characterId.');
  }

  const characterState = state.characterStatesById?.[characterId] || {};
  const effects = characterState.effects || [];

  if (effects.some((candidate) => candidate.id === effect.id)) {
    return state;
  }

  return {
    ...state,
    characterStatesById: {
      ...(state.characterStatesById || {}),
      [characterId]: {
        ...characterState,
        effects: [...effects.map(cloneEffect), cloneEffect(effect)],
      },
    },
  };
}

export function removeCharacterEffectsById({ state, characterId, effectIds }) {
  const ids = new Set(effectIds || []);

  if (ids.size === 0) {
    return state;
  }

  const characterState = state.characterStatesById?.[characterId];

  if (!characterState?.effects?.some((effect) => ids.has(effect.id))) {
    return state;
  }

  return {
    ...state,
    characterStatesById: {
      ...state.characterStatesById,
      [characterId]: {
        ...characterState,
        effects: characterState.effects
          .filter((effect) => !ids.has(effect.id))
          .map(cloneEffect),
      },
    },
  };
}
