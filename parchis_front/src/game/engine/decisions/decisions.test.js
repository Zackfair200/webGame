import {
  DECISION_TYPES,
  FACTION_IDS,
  REWARD_ACTION_TYPES,
  REWARD_SOURCE_TYPES,
  REWARD_TYPES,
  createCommonPosition,
  createDecision,
  createHomePosition,
  executeDecision,
  getAvailableDecisionActions,
} from '../index';

function createState() {
  return {
    phase: 'inProgress',
    players: [
      {
        id: 'player-red',
        factionId: FACTION_IDS.RED,
        characters: [
          { id: 'red.1', factionId: FACTION_IDS.RED, position: createCommonPosition(10) },
          { id: 'red.2', factionId: FACTION_IDS.RED, position: createCommonPosition(20) },
        ],
      },
      {
        id: 'player-blue',
        factionId: FACTION_IDS.BLUE,
        characters: [
          { id: 'blue.1', factionId: FACTION_IDS.BLUE, position: createHomePosition() },
        ],
      },
    ],
  };
}

function createCaptureDecision() {
  return createDecision({
    type: DECISION_TYPES.REWARD_RECIPIENT_SELECTION,
    reward: {
      type: REWARD_TYPES.MOVEMENT_REWARD,
      source: { type: REWARD_SOURCE_TYPES.CAPTURE, characterId: 'red.1' },
      ownerFactionId: FACTION_IDS.RED,
      steps: 20,
      excludedCharacterIds: [],
    },
  });
}

function getCharacter(state, characterId) {
  return state.players
    .flatMap((player) => player.characters)
    .find((character) => character.id === characterId);
}

describe('generic decisions', () => {
  test('rewardRecipientSelection exposes engine-calculated decision actions', () => {
    const actions = getAvailableDecisionActions({
      state: createState(),
      decision: createCaptureDecision(),
    });

    expect(actions.map((action) => action.characterId)).toEqual(['red.1', 'red.2']);
    expect(actions.every((action) => action.type === REWARD_ACTION_TYPES.MOVEMENT_REWARD_MOVEMENT)).toBe(true);
    expect(actions.map((action) => action.id)).toEqual([
      'rewardRecipientSelection:movementRewardMovement:capture:red.1:red:20:red.1',
      'rewardRecipientSelection:movementRewardMovement:capture:red.1:red:20:red.2',
    ]);
    expect(JSON.parse(JSON.stringify(actions))).toEqual(actions);
  });

  test('creates the same action ids when the decision actions are recalculated', () => {
    const state = createState();
    const decision = createCaptureDecision();

    const first = getAvailableDecisionActions({ state, decision });
    const second = getAvailableDecisionActions({ state, decision });

    expect(second.map((action) => action.id)).toEqual(first.map((action) => action.id));
  });

  test('executes the authoritative recalculated action when payload is manipulated', () => {
    const state = createState();
    const decision = createCaptureDecision();
    const selected = getAvailableDecisionActions({ state, decision })
      .find((action) => action.characterId === 'red.2');
    const result = executeDecision({
      state,
      decision,
      action: {
        ...selected,
        characterId: 'red.1',
        steps: 999,
        movement: {
          ...selected.movement,
          destination: createCommonPosition(1),
        },
      },
    });

    expect(getCharacter(result.state, 'red.1').position).toEqual(createCommonPosition(10));
    expect(getCharacter(result.state, 'red.2').position).toEqual(createCommonPosition(40));
  });

  test('executes an authoritative decision action from its id alone', () => {
    const state = createState();
    const decision = createCaptureDecision();
    const selected = getAvailableDecisionActions({ state, decision })
      .find((action) => action.characterId === 'red.2');
    const result = executeDecision({
      state,
      decision,
      action: { id: selected.id },
    });

    expect(getCharacter(result.state, 'red.1').position).toEqual(createCommonPosition(10));
    expect(getCharacter(result.state, 'red.2').position).toEqual(createCommonPosition(40));
  });

  test('rejects an unknown action id even when its payload describes a legal recipient', () => {
    expect(() => executeDecision({
      state: createState(),
      decision: createCaptureDecision(),
      action: {
        id: 'rewardRecipientSelection:unknown',
        type: REWARD_ACTION_TYPES.MOVEMENT_REWARD_MOVEMENT,
        characterId: 'red.2',
      },
    })).toThrow('Action is not available for the pending decision.');
  });
});
