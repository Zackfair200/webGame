import { START_SQUARE_BY_FACTION } from '../../board/board';
import { getFactionIds } from '../../factions/factions';
import { assertCharactersArray, getOccupantsAtPosition } from '../../occupancy/occupancy';
import { POSITION_TYPES, createCommonPosition } from '../../state/positions';
import { getMovableCharacters } from '../movableCharacters/movableCharacters';

export const ROLL_FIVE_ACTION_TYPES = Object.freeze({
  EXIT_HOME: 'exitHome',
  NORMAL_MOVEMENT: 'normalMovement',
});

export const ROLL_FIVE_ACTION_MODES = Object.freeze({
  EXIT_HOME: 'exitHome',
  NORMAL_MOVEMENT: 'normalMovement',
  NONE: 'none',
});

function assertValidFactionId(factionId) {
  if (!getFactionIds().includes(factionId)) {
    throw new Error(`Invalid faction id: ${factionId}`);
  }
}

function assertValidRelevantCharacterId(character) {
  if (character.id === undefined || character.id === null || character.id === '') {
    throw new Error('Relevant character requires an id.');
  }
}

function assertKnownFactionId(factionId, messagePrefix) {
  if (!getFactionIds().includes(factionId)) {
    throw new Error(`${messagePrefix}: ${factionId}`);
  }
}

function assertUniqueRelevantCharacterId(character, characters) {
  assertValidRelevantCharacterId(character);

  const matchingCharacters = characters.filter((candidate) => candidate.id === character.id);

  if (matchingCharacters.length > 1) {
    throw new Error(`Duplicate character id: ${character.id}`);
  }
}

function getHomeCharactersForFaction({ factionId, characters }) {
  return characters.filter(
    (character) => character.factionId === factionId && character.position?.type === POSITION_TYPES.HOME,
  );
}

function createExitHomeAction({ characterId, destination, removableCharacterIds }) {
  return {
    type: ROLL_FIVE_ACTION_TYPES.EXIT_HOME,
    characterId,
    destination: { ...destination },
    occupantRemoval: {
      required: removableCharacterIds.length === 2,
      removableCharacterIds: [...removableCharacterIds],
      isCapture: false,
      grantsCaptureReward: false,
    },
  };
}

function createNormalMovementAction({ characterId, movement }) {
  return {
    type: ROLL_FIVE_ACTION_TYPES.NORMAL_MOVEMENT,
    characterId,
    movement,
  };
}

function createRollFiveResult({ actionMode, availableActions }) {
  return {
    roll: 5,
    actionMode,
    mustChooseAction: availableActions.length > 0,
    availableActions,
  };
}

export function getAvailableRollFiveActions({ factionId, characters }) {
  assertCharactersArray(characters);
  assertValidFactionId(factionId);

  const homeCharacters = getHomeCharactersForFaction({ factionId, characters });

  if (homeCharacters.length === 0) {
    const { movableCharacters } = getMovableCharacters({ factionId, steps: 5, characters });

    return createRollFiveResult({
      actionMode:
        movableCharacters.length > 0
          ? ROLL_FIVE_ACTION_MODES.NORMAL_MOVEMENT
          : ROLL_FIVE_ACTION_MODES.NONE,
      availableActions: movableCharacters.map(createNormalMovementAction),
    });
  }

  homeCharacters.forEach((character) => {
    assertKnownFactionId(character.factionId, 'Invalid home character faction id');
    assertUniqueRelevantCharacterId(character, characters);
  });

  const destination = createCommonPosition(START_SQUARE_BY_FACTION[factionId]);
  const occupants = getOccupantsAtPosition({ position: destination, characters });

  if (occupants.length > 2) {
    throw new Error('Cannot evaluate roll 5 home exit with more than two start-square occupants.');
  }

  occupants.forEach((occupant) => {
    assertKnownFactionId(occupant.factionId, 'Invalid start-square occupant faction id');
    assertUniqueRelevantCharacterId(occupant, characters);
  });

  const removableCharacterIds = occupants.length === 2 ? occupants.map((occupant) => occupant.id) : [];

  return createRollFiveResult({
    actionMode: ROLL_FIVE_ACTION_MODES.EXIT_HOME,
    // These actions are snapshots for the state received by this call; execution must revalidate current state.
    availableActions: homeCharacters.map((character) =>
      createExitHomeAction({
        characterId: character.id,
        destination,
        removableCharacterIds,
      }),
    ),
  });
}
