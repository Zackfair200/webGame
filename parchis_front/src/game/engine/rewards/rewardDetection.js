import { EXECUTION_EVENT_TYPES } from '../actions/types';
import { REWARD_SOURCE_TYPES, REWARD_STEPS, REWARD_TYPES } from './types';

function assertGeneratingEvent(event, eventName) {
  if (event.characterId === undefined || event.characterId === null || event.characterId === '') {
    throw new Error(`${eventName} event requires characterId.`);
  }

  if (event.factionId === undefined || event.factionId === null || event.factionId === '') {
    throw new Error(`${eventName} event requires factionId.`);
  }
}

function createMovementReward({ sourceType, characterId, ownerFactionId, steps, excludedCharacterIds = [] }) {
  return {
    type: REWARD_TYPES.MOVEMENT_REWARD,
    source: {
      type: sourceType,
      characterId,
    },
    ownerFactionId,
    steps,
    excludedCharacterIds: [...excludedCharacterIds],
  };
}

export function deriveRewardsFromEvents({ events }) {
  if (!Array.isArray(events)) {
    throw new Error('events must be an array.');
  }

  return events.flatMap((event) => {
    if (!event || typeof event !== 'object') {
      throw new Error('event must be an object.');
    }

    if (event.type === EXECUTION_EVENT_TYPES.CHARACTER_CAPTURED) {
      assertGeneratingEvent(event, 'characterCaptured');

      return [
        createMovementReward({
          sourceType: REWARD_SOURCE_TYPES.CAPTURE,
          characterId: event.characterId,
          ownerFactionId: event.factionId,
          steps: REWARD_STEPS.CAPTURE,
        }),
      ];
    }

    if (event.type === EXECUTION_EVENT_TYPES.CHARACTER_REACHED_GOAL) {
      assertGeneratingEvent(event, 'characterReachedGoal');

      return [
        createMovementReward({
          sourceType: REWARD_SOURCE_TYPES.GOAL,
          characterId: event.characterId,
          ownerFactionId: event.factionId,
          steps: REWARD_STEPS.GOAL,
          excludedCharacterIds: [event.characterId],
        }),
      ];
    }

    return [];
  });
}
