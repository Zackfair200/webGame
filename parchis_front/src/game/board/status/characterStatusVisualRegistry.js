import { CHARACTER_STATUS_TYPES } from '../../engine';
import { FrozenCharacterStatus } from './FrozenCharacterStatus';
import { BleedingCharacterStatus } from './BleedingCharacterStatus';

export const CHARACTER_STATUS_VISUAL_REGISTRY = Object.freeze({
  [CHARACTER_STATUS_TYPES.FROZEN]: Object.freeze({
    label: 'Congelado',
    Renderer: FrozenCharacterStatus,
  }),
  [CHARACTER_STATUS_TYPES.BLEEDING]: Object.freeze({
    label: 'Sangrado',
    Renderer: BleedingCharacterStatus,
  }),
});

export function getCharacterStatusPresentation(effectType) {
  return CHARACTER_STATUS_VISUAL_REGISTRY[effectType] || null;
}
