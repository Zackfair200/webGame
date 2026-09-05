import { TERRAIN_EFFECT_TYPES } from '../../engine';
import { VinesTerrainEffect } from './VinesTerrainEffect';
import { IceTerrainEffect } from './IceTerrainEffect';

export const TERRAIN_VISUAL_REGISTRY = Object.freeze({
  [TERRAIN_EFFECT_TYPES.DRUID_VINES]: VinesTerrainEffect,
  [TERRAIN_EFFECT_TYPES.ICE]: IceTerrainEffect,
});

export function getTerrainEffectRenderer(effectType) {
  return TERRAIN_VISUAL_REGISTRY[effectType] || null;
}
