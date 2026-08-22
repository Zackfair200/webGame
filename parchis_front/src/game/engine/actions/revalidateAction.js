import { getFactionIds } from '../factions/factions';
import { getAvailableRollFiveActions } from '../rules/rollFive/rollFive';
import { getAvailableRollSixActions } from '../rules/rollSix/rollSix';
import { getMovableCharacters } from '../rules/movableCharacters/movableCharacters';
import { EXECUTABLE_ACTION_TYPES } from './types';

function assertValidFactionId(factionId) {
  if (!getFactionIds().includes(factionId)) {
    throw new Error(`Invalid faction id: ${factionId}`);
  }
}

function assertSupportedRoll(roll) {
  if (!Number.isInteger(roll) || roll < 1 || roll > 6) {
    throw new Error(`Unsupported roll: ${roll}. Roll must be an integer from 1 to 6.`);
  }
}

function assertValidAction(action) {
  if (!action || typeof action !== 'object') {
    throw new Error('action is required.');
  }

  if (!Object.values(EXECUTABLE_ACTION_TYPES).includes(action.type)) {
    throw new Error(`Unknown action type: ${action.type}`);
  }

  if (action.characterId === undefined || action.characterId === null || action.characterId === '') {
    throw new Error('action.characterId is required.');
  }
}

function findAvailableAction({ availableActions, action }) {
  return availableActions.find(
    (availableAction) =>
      availableAction.type === action.type && availableAction.characterId === action.characterId,
  );
}

function assertActionAvailable(availableAction) {
  if (!availableAction) {
    throw new Error('Action is not available for the current state.');
  }
}

function revalidateNormalRollAction({ factionId, roll, action, characters }) {
  if (action.type !== EXECUTABLE_ACTION_TYPES.NORMAL_MOVEMENT) {
    throw new Error('Action is not available for the current state.');
  }

  const { movableCharacters } = getMovableCharacters({ factionId, steps: roll, characters });
  const movableCharacter = movableCharacters.find(
    (candidate) => candidate.characterId === action.characterId,
  );

  assertActionAvailable(movableCharacter);

  return {
    action: {
      type: EXECUTABLE_ACTION_TYPES.NORMAL_MOVEMENT,
      characterId: movableCharacter.characterId,
    },
    movement: movableCharacter.movement,
    steps: roll,
  };
}

function revalidateRollFiveAction({ factionId, action, characters }) {
  const result = getAvailableRollFiveActions({ factionId, characters });
  const availableAction = findAvailableAction({ availableActions: result.availableActions, action });

  assertActionAvailable(availableAction);

  return {
    action: availableAction,
    movement: availableAction.movement,
    steps: 5,
  };
}

function revalidateRollSixAction({ factionId, action, characters }) {
  const result = getAvailableRollSixActions({ factionId, characters });
  const availableAction = findAvailableAction({ availableActions: result.availableActions, action });

  assertActionAvailable(availableAction);

  return {
    action: availableAction,
    movement: availableAction.movement,
    steps: 6,
  };
}

export function revalidateAction({ factionId, roll, action, characters }) {
  assertValidFactionId(factionId);
  assertSupportedRoll(roll);
  assertValidAction(action);

  if (roll >= 1 && roll <= 4) {
    return revalidateNormalRollAction({ factionId, roll, action, characters });
  }

  if (roll === 5) {
    return revalidateRollFiveAction({ factionId, action, characters });
  }

  return revalidateRollSixAction({ factionId, action, characters });
}
