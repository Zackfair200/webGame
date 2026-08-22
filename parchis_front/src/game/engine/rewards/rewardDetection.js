import { EXECUTION_EVENT_TYPES } from '../actions/types';
import { REWARD_STEPS, REWARD_TYPES } from './types';

export function deriveRewardsFromEvents({ events }) {
  if (!Array.isArray(events)) {
    throw new Error('events must be an array.');
  }

  return events.flatMap((event) => {
    if (!event || typeof event !== 'object') {
      throw new Error('event must be an object.');
    }

    if (event.type === EXECUTION_EVENT_TYPES.CHARACTER_CAPTURED) {
      if (event.characterId === undefined || event.characterId === null || event.characterId === '') {
        throw new Error('characterCaptured event requires characterId.');
      }

      return [
        {
          type: REWARD_TYPES.CAPTURE_REWARD,
          characterId: event.characterId,
          steps: REWARD_STEPS.CAPTURE,
        },
      ];
    }

    if (event.type === EXECUTION_EVENT_TYPES.CHARACTER_REACHED_GOAL) {
      if (event.characterId === undefined || event.characterId === null || event.characterId === '') {
        throw new Error('characterReachedGoal event requires characterId.');
      }

      return [
        {
          type: REWARD_TYPES.GOAL_REWARD,
          sourceCharacterId: event.characterId,
          steps: REWARD_STEPS.GOAL,
        },
      ];
    }

    return [];
  });
}
