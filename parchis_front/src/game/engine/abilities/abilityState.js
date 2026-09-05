export function getCharacterAbilityState({ state, characterId, abilityId }) {
  return state.characterStatesById?.[characterId]?.abilityStatesById?.[abilityId] || null;
}

export function updateCharacterAbilityState({ state, characterId, abilityId, abilityState }) {
  if (!abilityState || typeof abilityState !== 'object' || Array.isArray(abilityState)) {
    throw new Error('abilityState must be an object.');
  }

  const characterState = state.characterStatesById?.[characterId] || {};

  return {
    ...state,
    characterStatesById: {
      ...(state.characterStatesById || {}),
      [characterId]: {
        ...characterState,
        abilityStatesById: {
          ...(characterState.abilityStatesById || {}),
          [abilityId]: JSON.parse(JSON.stringify(abilityState)),
        },
      },
    },
  };
}
