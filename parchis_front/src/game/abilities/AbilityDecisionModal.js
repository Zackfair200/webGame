import React, { useEffect, useId, useRef } from 'react';
import {
  ABILITY_REGISTRY,
  DECISION_TYPES,
  OPTIONAL_ABILITY_ACTION_TYPES,
} from '../engine';
import { getCharacterVisual } from '../board/characterVisuals';
import { getAbilityPresentation } from './abilityPresentationRegistry';
import './AbilityDecisionModal.css';

function getCharacter(gameState, characterId) {
  return gameState.players
    .flatMap((player) => player.characters)
    .find((character) => character.id === characterId) || null;
}

function getChargeState({ gameState, decision }) {
  const charges = gameState.characterStatesById
    ?.[decision.characterId]
    ?.abilityStatesById
    ?.[decision.abilityId]
    ?.charges;
  const ability = ABILITY_REGISTRY.definitions.find(
    (definition) => definition.id === decision.abilityId,
  );
  const maxCharges = ability?.initialState?.charges;

  if (!Number.isInteger(charges) || !Number.isInteger(maxCharges) || maxCharges < 1) {
    return null;
  }

  return { charges, maxCharges };
}

function ChargeMeter({ charges, maxCharges }) {
  return (
    <div className="ability-decision__charges" aria-label={`Cargas: ${charges} de ${maxCharges}`}>
      <span>Cargas</span>
      <div className="ability-decision__charge-track" aria-hidden="true">
        {Array.from({ length: maxCharges }, (_, index) => (
          <i
            key={index}
            className={index < charges ? 'ability-decision__charge ability-decision__charge--available' : 'ability-decision__charge'}
          />
        ))}
      </div>
      <strong>{charges}/{maxCharges}</strong>
    </div>
  );
}

function getDecisionActionLabel({ action, gameState, presentation }) {
  const label = presentation.actionLabels[action.type] || 'Continuar';

  if (!action.targetCharacterId) {
    return label;
  }

  const target = getCharacter(gameState, action.targetCharacterId);

  return `${label}: ${target?.name || action.targetCharacterId}`;
}

export function AbilityDecisionModal({
  gameState,
  pendingDecision,
  availableDecisionActions,
  onSelectActionId,
}) {
  const titleId = useId();
  const primaryButtonRef = useRef(null);
  const panelRef = useRef(null);
  const isAbilityDecision = pendingDecision?.type === DECISION_TYPES.OPTIONAL_ABILITY_ACTIVATION;
  const character = isAbilityDecision
    ? getCharacter(gameState, pendingDecision.characterId)
    : null;
  const presentation = getAbilityPresentation(pendingDecision?.abilityId);
  const characterVisual = character ? getCharacterVisual(character) : null;
  const chargeState = isAbilityDecision
    ? getChargeState({ gameState, decision: pendingDecision })
    : null;
  const skipAction = availableDecisionActions.find(
    (action) => action.type === OPTIONAL_ABILITY_ACTION_TYPES.SKIP,
  );
  const primaryActions = availableDecisionActions.filter(
    (action) => action.type !== OPTIONAL_ABILITY_ACTION_TYPES.SKIP,
  );

  useEffect(() => {
    if (isAbilityDecision) {
      primaryButtonRef.current?.focus();
    }
  }, [isAbilityDecision, pendingDecision?.abilityId, pendingDecision?.characterId]);

  if (!isAbilityDecision) {
    return null;
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    const buttons = Array.from(panelRef.current?.querySelectorAll('button:not(:disabled)') || []);

    if (buttons.length < 2) {
      return;
    }

    const firstButton = buttons[0];
    const lastButton = buttons[buttons.length - 1];

    if (event.shiftKey && document.activeElement === firstButton) {
      event.preventDefault();
      lastButton.focus();
    } else if (!event.shiftKey && document.activeElement === lastButton) {
      event.preventDefault();
      firstButton.focus();
    }
  }

  const Icon = presentation.Icon;

  return (
    <div className="ability-decision-overlay" data-testid="ability-decision-overlay">
      <section
        ref={panelRef}
        className={`ability-decision ability-decision--${presentation.visualTheme}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleKeyDown}
      >
        <div className="ability-decision__aura" aria-hidden="true" />
        <p className="ability-decision__eyebrow">Habilidad disponible</p>

        <div className="ability-decision__portrait" aria-label={character ? `Retrato de ${character.name}` : 'Sin retrato disponible'}>
          {characterVisual?.portraitSrc ? (
            <img src={characterVisual.portraitSrc} alt="" />
          ) : (
            <span aria-hidden="true">{characterVisual?.fallbackInitials || '?'}</span>
          )}
        </div>

        <p className="ability-decision__character">{character?.name || 'Personaje'}</p>
        <div className="ability-decision__title-row">
          {Icon && <Icon size={24} strokeWidth={1.8} aria-hidden="true" />}
          <h2 id={titleId}>{presentation.title}</h2>
        </div>
        <p className="ability-decision__description">{presentation.description}</p>

        {chargeState && <ChargeMeter {...chargeState} />}

        <div className="ability-decision__actions">
          {primaryActions.map((action, index) => (
            <button
              key={action.id}
              ref={index === 0 ? primaryButtonRef : null}
              type="button"
              className="ability-decision__primary-action"
              data-decision-action-id={action.id}
              onClick={() => onSelectActionId(action.id)}
            >
              {Icon && <Icon size={20} strokeWidth={2} aria-hidden="true" />}
              {getDecisionActionLabel({ action, gameState, presentation })}
            </button>
          ))}

          {skipAction && (
            <button
              type="button"
              className="ability-decision__skip-action"
              data-decision-action-id={skipAction.id}
              onClick={() => onSelectActionId(skipAction.id)}
            >
              {presentation.actionLabels[skipAction.type] || 'Omitir'}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

export default AbilityDecisionModal;
