import { getFactionIds } from '../../factions/factions';
import { MOVEMENT_SOURCE_TYPES, MOVEMENT_TYPES } from '../../movement/types';
import { assertCharactersArray } from '../../occupancy/occupancy';
import { createMovementRulesContext } from '../../rulesContext/rulesContext';
import { isSamePosition } from '../../state/positions';
import { getBarriersForFaction } from '../barriers/barriers';
import { evaluateMovement } from '../legalMovement/legalMovement';
import { getMovableCharacters } from '../movableCharacters/movableCharacters';

export const ROLL_SIX_ACTION_TYPES = Object.freeze({
  BREAK_BARRIER: 'breakBarrier',
  NORMAL_MOVEMENT: 'normalMovement',
});

export const ROLL_SIX_ACTION_MODES = Object.freeze({
  BREAK_BARRIER: 'breakBarrier',
  NORMAL_MOVEMENT: 'normalMovement',
  NONE: 'none',
});

function assertValidFactionId(factionId) {
  if (!getFactionIds().includes(factionId)) {
    throw new Error(`Invalid faction id: ${factionId}`);
  }
}

function createRollSixResult({ actionMode, availableActions }) {
  return {
    roll: 6,
    actionMode,
    mustChooseAction: availableActions.length > 0,
    availableActions,
  };
}

function createNormalMovementAction({ characterId, movement }) {
  return {
    type: ROLL_SIX_ACTION_TYPES.NORMAL_MOVEMENT,
    characterId,
    movement,
  };
}

function createBarrierSnapshot(barrier) {
  return {
    position: { ...barrier.position },
    occupantCharacterIds: barrier.occupants.map((occupant) => occupant.id),
  };
}

function createBreakBarrierAction({ characterId, barrier, movement }) {
  return {
    type: ROLL_SIX_ACTION_TYPES.BREAK_BARRIER,
    characterId,
    barrier: createBarrierSnapshot(barrier),
    movement,
  };
}

function getBarrierCharacterIds(barriers) {
  return new Set(barriers.flatMap((barrier) => barrier.occupants.map((occupant) => occupant.id)));
}

function createRollSixRulesContext({ gameState, characters, characterId }) {
  return createMovementRulesContext({
    gameState,
    characters,
    actorCharacterId: characterId,
    source: { type: MOVEMENT_SOURCE_TYPES.DICE, roll: 6 },
    movementType: MOVEMENT_TYPES.NORMAL,
  });
}

function getNormalMovementActions({
  factionId,
  characters,
  gameState,
  excludedCharacterIds = new Set(),
}) {
  const actions = [];

  characters.forEach((character) => {
    if (character.factionId !== factionId || excludedCharacterIds.has(character.id)) {
      return;
    }

    const movement = evaluateMovement({
      characterId: character.id,
      steps: 6,
      characters,
      rulesContext: createRollSixRulesContext({ gameState, characters, characterId: character.id }),
    });

    if (movement.legal) {
      actions.push(createNormalMovementAction({ characterId: character.id, movement }));
    }
  });

  return actions;
}

function getBreakBarrierActions({ barriers, characters, gameState }) {
  const actions = [];

  barriers.forEach((barrier) => {
    barrier.occupants.forEach((occupant) => {
      const movement = evaluateMovement({
        characterId: occupant.id,
        steps: 6,
        characters,
        rulesContext: createRollSixRulesContext({ gameState, characters, characterId: occupant.id }),
      });

      if (!movement.legal || isSamePosition(movement.destination, barrier.position)) {
        return;
      }

      actions.push(createBreakBarrierAction({
        characterId: occupant.id,
        barrier,
        movement,
      }));
    });
  });

  return actions;
}

export function getAvailableRollSixActions({ factionId, characters, gameState = null }) {
  assertCharactersArray(characters);
  assertValidFactionId(factionId);

  const barriers = getBarriersForFaction({ factionId, characters });

  if (barriers.length === 0) {
    const { movableCharacters } = getMovableCharacters({
      factionId,
      steps: 6,
      characters,
      gameState,
    });

    return createRollSixResult({
      actionMode:
        movableCharacters.length > 0
          ? ROLL_SIX_ACTION_MODES.NORMAL_MOVEMENT
          : ROLL_SIX_ACTION_MODES.NONE,
      availableActions: movableCharacters.map(createNormalMovementAction),
    });
  }

  const breakBarrierActions = getBreakBarrierActions({ barriers, characters, gameState });

  if (breakBarrierActions.length > 0) {
    return createRollSixResult({
      actionMode: ROLL_SIX_ACTION_MODES.BREAK_BARRIER,
      // These actions are snapshots for the state received by this call; execution must revalidate current state.
      availableActions: breakBarrierActions,
    });
  }

  const normalMovementActions = getNormalMovementActions({
    factionId,
    characters,
    gameState,
    excludedCharacterIds: getBarrierCharacterIds(barriers),
  });

  return createRollSixResult({
    actionMode:
      normalMovementActions.length > 0
        ? ROLL_SIX_ACTION_MODES.NORMAL_MOVEMENT
        : ROLL_SIX_ACTION_MODES.NONE,
    availableActions: normalMovementActions,
  });
}
