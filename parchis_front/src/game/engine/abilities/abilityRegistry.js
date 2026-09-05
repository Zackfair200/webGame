import { ABILITY_ACTIVATION_TYPES } from './types';

function cloneDefinition(definition) {
  return JSON.parse(JSON.stringify(definition));
}

function assertNonEmptyString(value, field) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`ability.${field} is required.`);
  }
}

export function createAbilityDefinition({
  id,
  characterType,
  activationType,
  hooks = [],
  initialState = null,
  metadata = {},
}) {
  assertNonEmptyString(id, 'id');
  assertNonEmptyString(characterType, 'characterType');

  if (!Object.values(ABILITY_ACTIVATION_TYPES).includes(activationType)) {
    throw new Error(`Invalid ability activationType: ${activationType}`);
  }

  if (!Array.isArray(hooks) || hooks.some((hook) => typeof hook !== 'string' || hook.length === 0)) {
    throw new Error('ability.hooks must be an array of non-empty strings.');
  }

  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new Error('ability.metadata must be an object.');
  }

  if (initialState !== null && (!initialState || typeof initialState !== 'object' || Array.isArray(initialState))) {
    throw new Error('ability.initialState must be null or an object.');
  }

  return cloneDefinition({
    id,
    characterType,
    activationType,
    hooks,
    ...(initialState === null ? {} : { initialState }),
    metadata,
  });
}

export function createAbilityRegistry(definitions = []) {
  if (!Array.isArray(definitions)) {
    throw new Error('ability definitions must be an array.');
  }

  const normalizedDefinitions = definitions.map(createAbilityDefinition);
  const ids = normalizedDefinitions.map((definition) => definition.id);

  if (new Set(ids).size !== ids.length) {
    throw new Error('Ability ids must be unique.');
  }

  return { definitions: normalizedDefinitions };
}

export function getAbilitiesForCharacterType({ registry, characterType }) {
  if (!registry || !Array.isArray(registry.definitions)) {
    throw new Error('ability registry is invalid.');
  }

  return registry.definitions
    .filter((definition) => definition.characterType === characterType)
    .map(cloneDefinition);
}

export const EMPTY_ABILITY_REGISTRY = Object.freeze({ definitions: Object.freeze([]) });
