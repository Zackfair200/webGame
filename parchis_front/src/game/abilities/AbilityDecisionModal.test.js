import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  ABILITY_IDS,
  DECISION_TYPES,
  OPTIONAL_ABILITY_ACTION_TYPES,
} from '../engine';
import { AbilityDecisionModal } from './AbilityDecisionModal';

const ACTIVATE_ID = 'optionalAbilityActivation:activateAbility:druid.vines:green.druid:common%3A23';
const SKIP_ID = 'optionalAbilityActivation:skipAbility:druid.vines:green.druid:common%3A23';

function createGameState({ charges = 1, characterId = 'druid', name = 'Druida' } = {}) {
  return {
    players: [{
      id: 'player-green',
      factionId: 'green',
      characters: [{
        id: 'green.druid',
        characterId,
        name,
        factionId: 'green',
        position: { type: 'common', square: 23 },
      }],
    }],
    characterStatesById: {
      'green.druid': {
        abilityStatesById: {
          [ABILITY_IDS.DRUID_VINES]: { charges },
        },
      },
    },
  };
}

function createDecision(abilityId = ABILITY_IDS.DRUID_VINES) {
  return {
    type: DECISION_TYPES.OPTIONAL_ABILITY_ACTIVATION,
    abilityId,
    characterId: 'green.druid',
    position: { type: 'common', square: 23 },
    positionKey: 'common:23',
    movementType: 'normal',
  };
}

function createActions(abilityId = ABILITY_IDS.DRUID_VINES) {
  return [
    {
      id: abilityId === ABILITY_IDS.DRUID_VINES ? ACTIVATE_ID : 'future:activate',
      type: OPTIONAL_ABILITY_ACTION_TYPES.ACTIVATE,
      abilityId,
      characterId: 'green.druid',
    },
    {
      id: abilityId === ABILITY_IDS.DRUID_VINES ? SKIP_ID : 'future:skip',
      type: OPTIONAL_ABILITY_ACTION_TYPES.SKIP,
      abilityId,
      characterId: 'green.druid',
    },
  ];
}

function renderModal(overrides = {}) {
  const onSelectActionId = jest.fn();
  const props = {
    gameState: createGameState(),
    pendingDecision: createDecision(),
    availableDecisionActions: createActions(),
    onSelectActionId,
    ...overrides,
  };

  render(<AbilityDecisionModal {...props} />);

  return { onSelectActionId, ...props };
}

describe('AbilityDecisionModal', () => {
  test('renders the Druid presentation, portrait, description, and authoritative charges', () => {
    renderModal();

    expect(screen.getByRole('dialog', { name: 'Enredaderas' })).toBeInTheDocument();
    expect(screen.getByText('Druida')).toBeInTheDocument();
    expect(screen.getByText(/Cubre esta casilla con enredaderas/)).toBeInTheDocument();
    const chargeMeter = screen.getByLabelText('Cargas: 1 de 2');

    expect(chargeMeter).toBeInTheDocument();
    expect(chargeMeter.querySelectorAll('.ability-decision__charge')).toHaveLength(2);
    expect(chargeMeter.querySelectorAll('.ability-decision__charge--available')).toHaveLength(1);
    expect(screen.getByLabelText('Retrato de Druida').querySelector('img')).toHaveAttribute(
      'src',
      'druid-avatar.png',
    );
  });

  test('sends only the selected engine action id for activate and skip', () => {
    const { onSelectActionId } = renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Crear enredaderas' }));
    fireEvent.click(screen.getByRole('button', { name: 'Omitir' }));

    expect(onSelectActionId).toHaveBeenNthCalledWith(1, ACTIVATE_ID);
    expect(onSelectActionId).toHaveBeenNthCalledWith(2, SKIP_ID);
    expect(onSelectActionId.mock.calls.flat()).toEqual([ACTIVATE_ID, SKIP_ID]);
  });

  test('renders Ice Mage freezing, charges, targets, and sends only the selected id', () => {
    const freezeRedId = 'freeze-red';
    const freezeGreenId = 'freeze-green';
    const skipId = 'skip-freezing';
    const gameState = {
      players: [
        {
          id: 'player-blue',
          factionId: 'blue',
          characters: [{
            id: 'blue.iceMage',
            characterId: 'iceMage',
            name: 'Mago de hielo',
            factionId: 'blue',
            position: { type: 'common', square: 13 },
          }],
        },
        {
          id: 'player-red',
          factionId: 'red',
          characters: [{
            id: 'red.warrior',
            characterId: 'warrior',
            name: 'Guerrero',
            factionId: 'red',
            position: { type: 'common', square: 12 },
          }],
        },
        {
          id: 'player-green',
          factionId: 'green',
          characters: [{
            id: 'green.ranger',
            characterId: 'ranger',
            name: 'Montaraz',
            factionId: 'green',
            position: { type: 'common', square: 12 },
          }],
        },
      ],
      characterStatesById: {
        'blue.iceMage': {
          abilityStatesById: {
            [ABILITY_IDS.ICE_MAGE_FREEZING]: { charges: 1 },
          },
        },
      },
    };
    const pendingDecision = {
      type: DECISION_TYPES.OPTIONAL_ABILITY_ACTIVATION,
      abilityId: ABILITY_IDS.ICE_MAGE_FREEZING,
      characterId: 'blue.iceMage',
      position: { type: 'common', square: 13 },
      positionKey: 'common:13',
      previousPosition: { type: 'common', square: 12 },
      previousPositionKey: 'common:12',
      movementType: 'normal',
    };
    const availableDecisionActions = [
      { id: freezeRedId, type: OPTIONAL_ABILITY_ACTION_TYPES.ACTIVATE, targetCharacterId: 'red.warrior' },
      { id: freezeGreenId, type: OPTIONAL_ABILITY_ACTION_TYPES.ACTIVATE, targetCharacterId: 'green.ranger' },
      { id: skipId, type: OPTIONAL_ABILITY_ACTION_TYPES.SKIP },
    ];
    const { onSelectActionId } = renderModal({
      gameState,
      pendingDecision,
      availableDecisionActions,
    });

    expect(screen.getByRole('dialog', { name: 'Congelación' })).toHaveClass(
      'ability-decision--frost',
    );
    expect(screen.getByText('Mago de hielo')).toBeInTheDocument();
    expect(screen.getByLabelText('Cargas: 1 de 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Retrato de Mago de hielo').querySelector('img')).toHaveAttribute(
      'src',
      'frostmage-avatar.png',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Congelar: Montaraz' }));

    expect(onSelectActionId).toHaveBeenCalledWith(freezeGreenId);
    expect(onSelectActionId).toHaveBeenCalledTimes(1);
  });

  test('uses a neutral readable fallback when visual metadata is missing', () => {
    const abilityId = 'future.mysticBurst';

    renderModal({
      gameState: createGameState({ characterId: 'unknownCharacter', name: 'Invocador' }),
      pendingDecision: createDecision(abilityId),
      availableDecisionActions: createActions(abilityId),
    });

    expect(screen.getByRole('dialog', { name: 'Mystic Burst' })).toHaveClass(
      'ability-decision--neutral',
    );
    expect(screen.getByText('Puedes activar esta habilidad antes de continuar.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Activar habilidad' })).toBeInTheDocument();
    expect(screen.getByLabelText('Retrato de Invocador').querySelector('img')).toBeNull();
    expect(screen.getByText('I')).toBeInTheDocument();
  });

  test('does not dismiss or execute a decision when Escape is pressed', () => {
    const { onSelectActionId } = renderModal();
    const dialog = screen.getByRole('dialog', { name: 'Enredaderas' });

    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(dialog).toBeInTheDocument();
    expect(onSelectActionId).not.toHaveBeenCalled();
  });

  test('does not render for a non-ability decision', () => {
    renderModal({
      pendingDecision: { type: DECISION_TYPES.REWARD_RECIPIENT_SELECTION },
      availableDecisionActions: [],
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
