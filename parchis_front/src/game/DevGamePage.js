import React, { useState } from 'react';
import {
  EXECUTABLE_ACTION_TYPES,
  EXECUTION_EVENT_TYPES,
  TURN_PHASES,
} from './engine';
import './DevGamePage.css';
import { useGameEngine } from './hooks/useGameEngine';

const ROLL_VALUES = [1, 2, 3, 4, 5, 6];

function formatValue(value) {
  if (value === null || value === undefined) {
    return 'none';
  }

  return String(value);
}

function formatPosition(position) {
  if (!position) {
    return 'unknown';
  }

  if (position.type === 'home') {
    return 'HOME';
  }

  if (position.type === 'common') {
    return `common ${position.square}`;
  }

  if (position.type === 'finalLane') {
    return `finalLane ${position.factionId} ${position.index}`;
  }

  if (position.type === 'goal') {
    return 'GOAL';
  }

  return JSON.stringify(position);
}

function formatPath(path) {
  if (!Array.isArray(path) || path.length === 0) {
    return 'none';
  }

  return path.map(formatPosition).join(' -> ');
}

function getCharacterById(gameState, characterId) {
  return gameState.players
    .flatMap((player) => player.characters)
    .find((character) => character.id === characterId);
}

function getCharacterLabel(gameState, characterId) {
  const character = getCharacterById(gameState, characterId);

  if (!character) {
    return characterId;
  }

  return `${character.name} (${character.id})`;
}

function formatEvent(event, gameState) {
  if (!event || !event.type) {
    return 'Unknown event';
  }

  if (event.type === EXECUTION_EVENT_TYPES.CHARACTER_MOVED) {
    return `${getCharacterLabel(gameState, event.characterId)} moved ${formatPosition(event.from)} -> ${formatPosition(event.to)}`;
  }

  if (event.type === EXECUTION_EVENT_TYPES.CHARACTER_CAPTURED) {
    return `${getCharacterLabel(gameState, event.characterId)} captured ${getCharacterLabel(gameState, event.capturedCharacterId)}`;
  }

  if (event.type === EXECUTION_EVENT_TYPES.CHARACTER_REACHED_GOAL) {
    return `${getCharacterLabel(gameState, event.characterId)} reached GOAL`;
  }

  if (event.type === EXECUTION_EVENT_TYPES.CHARACTER_EXITED_HOME) {
    return `${getCharacterLabel(gameState, event.characterId)} exited HOME to ${formatPosition(event.to)}`;
  }

  if (event.type === EXECUTION_EVENT_TYPES.CHARACTER_REMOVED_FROM_START) {
    return `${getCharacterLabel(gameState, event.characterId)} returned HOME from start`;
  }

  if (event.type === EXECUTION_EVENT_TYPES.BARRIER_BROKEN) {
    return `${getCharacterLabel(gameState, event.characterId)} broke barrier at ${formatPosition(event.position)}`;
  }

  if (event.type === EXECUTION_EVENT_TYPES.REWARD_LOST) {
    return `${event.rewardType} lost for ${getCharacterLabel(gameState, event.characterId)} (${event.reason})`;
  }

  return event.type;
}

function ActionDetails({ action }) {
  const movement = action.movement;

  return (
    <dl className="dev-game-action-details">
      <dt>Type</dt>
      <dd>{action.type}</dd>
      <dt>Character</dt>
      <dd>{action.characterId}</dd>
      {action.destination && (
        <>
          <dt>Destination</dt>
          <dd>{formatPosition(action.destination)}</dd>
        </>
      )}
      {movement?.destination && (
        <>
          <dt>Destination</dt>
          <dd>{formatPosition(movement.destination)}</dd>
        </>
      )}
      {movement?.path && (
        <>
          <dt>Path</dt>
          <dd>{formatPath(movement.path)}</dd>
        </>
      )}
      {movement?.outcome && (
        <>
          <dt>Outcome</dt>
          <dd>{JSON.stringify(movement.outcome)}</dd>
        </>
      )}
      {action.barrier && (
        <>
          <dt>Barrier</dt>
          <dd>
            {formatPosition(action.barrier.position)} | {action.barrier.occupantCharacterIds.join(', ')}
          </dd>
        </>
      )}
    </dl>
  );
}

function RollControls({ disabled, onRoll }) {
  return (
    <section className="dev-game-card" aria-label="Roll controls">
      <h2>Deterministic Roll</h2>
      <div className="dev-game-roll-grid">
        {ROLL_VALUES.map((value) => (
          <button
            key={value}
            type="button"
            className="dev-game-roll-button"
            disabled={disabled}
            onClick={() => onRoll(value)}
          >
            {value}
          </button>
        ))}
      </div>
    </section>
  );
}

function GameStatusPanel({ gameState, turnState, currentPlayer, availableActions, pendingReward, availableRewardActions }) {
  return (
    <section className="dev-game-card dev-game-status" aria-label="Game status">
      <h2>Game Status</h2>
      <dl>
        <dt>Game phase</dt>
        <dd>{gameState.phase}</dd>
        <dt>Current player</dt>
        <dd>{currentPlayer.name} ({gameState.currentPlayerId})</dd>
        <dt>Faction</dt>
        <dd>{currentPlayer.factionId}</dd>
        <dt>Turn phase</dt>
        <dd>{formatValue(turnState?.phase)}</dd>
        <dt>Current roll</dt>
        <dd>{formatValue(turnState?.currentRoll)}</dd>
        <dt>Consecutive sixes</dt>
        <dd>{formatValue(turnState?.consecutiveSixes)}</dd>
        <dt>Winner</dt>
        <dd>{formatValue(gameState.winnerPlayerId)}</dd>
        <dt>Available actions</dt>
        <dd>{availableActions.length}</dd>
        <dt>Pending reward</dt>
        <dd>{pendingReward ? JSON.stringify(pendingReward) : 'none'}</dd>
        <dt>Reward actions</dt>
        <dd>{availableRewardActions.length}</dd>
      </dl>
    </section>
  );
}

function AvailableActionCard({ action, gameState, onExecuteAction }) {
  const [removeCharacterId, setRemoveCharacterId] = useState(action.occupantRemoval?.removableCharacterIds?.[0] || '');
  const needsRemoval = action.type === EXECUTABLE_ACTION_TYPES.EXIT_HOME && action.occupantRemoval?.required;

  function handleExecute() {
    if (needsRemoval) {
      onExecuteAction(action, { removeCharacterId });
      return;
    }

    onExecuteAction(action);
  }

  return (
    <article className="dev-game-action-card">
      <header>
        <h3>{getCharacterLabel(gameState, action.characterId)}</h3>
        <span>{action.type}</span>
      </header>
      <ActionDetails action={action} />
      {needsRemoval && (
        <label className="dev-game-field">
          Remove occupant
          <select value={removeCharacterId} onChange={(event) => setRemoveCharacterId(event.target.value)}>
            {action.occupantRemoval.removableCharacterIds.map((characterId) => (
              <option key={characterId} value={characterId}>
                {getCharacterLabel(gameState, characterId)}
              </option>
            ))}
          </select>
        </label>
      )}
      <button type="button" className="dev-game-primary-button" onClick={handleExecute}>
        Execute
      </button>
    </article>
  );
}

function AvailableActionsPanel({ actions, gameState, onExecuteAction }) {
  return (
    <section className="dev-game-card" aria-label="Available actions">
      <h2>Available Actions</h2>
      {actions.length === 0 ? (
        <p className="dev-game-muted">No actions available.</p>
      ) : (
        <div className="dev-game-action-list">
          {actions.map((action) => (
            <AvailableActionCard
              key={`${action.type}:${action.characterId}`}
              action={action}
              gameState={gameState}
              onExecuteAction={onExecuteAction}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function RewardActionsPanel({ pendingReward, actions, gameState, onExecuteRewardChoice }) {
  return (
    <section className="dev-game-card" aria-label="Reward actions">
      <h2>Reward Choices</h2>
      <p className="dev-game-muted">Pending: {pendingReward ? JSON.stringify(pendingReward) : 'none'}</p>
      {actions.length === 0 ? (
        <p className="dev-game-muted">No reward choices available.</p>
      ) : (
        <div className="dev-game-action-list">
          {actions.map((action) => (
            <article className="dev-game-action-card" key={`${action.type}:${action.characterId}`}>
              <header>
                <h3>{getCharacterLabel(gameState, action.characterId)}</h3>
                <span>{action.type}</span>
              </header>
              <ActionDetails action={action} />
              <button type="button" className="dev-game-primary-button" onClick={() => onExecuteRewardChoice(action)}>
                Execute reward
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function PositionsPanel({ gameState }) {
  return (
    <section className="dev-game-card" aria-label="Character positions">
      <h2>Positions</h2>
      <div className="dev-game-table-wrap">
        <table className="dev-game-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>Faction</th>
              <th>Character</th>
              <th>ID</th>
              <th>Position</th>
            </tr>
          </thead>
          <tbody>
            {gameState.players.flatMap((player) => player.characters.map((character) => (
              <tr key={character.id}>
                <td>{player.name}</td>
                <td>{player.factionId}</td>
                <td>{character.name}</td>
                <td>{character.id}</td>
                <td>{formatPosition(character.position)}</td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function LastEventsPanel({ events, gameState }) {
  return (
    <section className="dev-game-card" aria-label="Last events">
      <h2>Last Events</h2>
      {events.length === 0 ? (
        <p className="dev-game-muted">No events from the last operation.</p>
      ) : (
        <div className="dev-game-event-list">
          {events.map((event, index) => (
            <details key={`${event.type}:${index}`} className="dev-game-event" open>
              <summary>{formatEvent(event, gameState)}</summary>
              <pre>{JSON.stringify(event, null, 2)}</pre>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}

export function DevGamePageContent({ engine }) {
  const canRoll = engine.turnState?.phase === TURN_PHASES.WAITING_FOR_ROLL;

  return (
    <main className="dev-game-page">
      <header className="dev-game-hero">
        <p className="dev-game-kicker">Engine integration lab</p>
        <h1>Dev Game Engine</h1>
        <p>
          Temporary controls for observing a real engine-driven match. No board clicks, no manual destinations.
        </p>
      </header>

      <div className="dev-game-layout">
        <div className="dev-game-column">
          <GameStatusPanel
            gameState={engine.gameState}
            turnState={engine.turnState}
            currentPlayer={engine.currentPlayer}
            availableActions={engine.availableActions}
            pendingReward={engine.pendingReward}
            availableRewardActions={engine.availableRewardActions}
          />
          <RollControls disabled={!canRoll} onRoll={engine.registerRoll} />
          <LastEventsPanel events={engine.lastEvents} gameState={engine.gameState} />
        </div>

        <div className="dev-game-column dev-game-column-wide">
          <AvailableActionsPanel
            actions={engine.availableActions}
            gameState={engine.gameState}
            onExecuteAction={engine.executeAction}
          />
          <RewardActionsPanel
            pendingReward={engine.pendingReward}
            actions={engine.availableRewardActions}
            gameState={engine.gameState}
            onExecuteRewardChoice={engine.executeRewardChoice}
          />
          <PositionsPanel gameState={engine.gameState} />
        </div>
      </div>
    </main>
  );
}

function DevGamePage() {
  const engine = useGameEngine();

  return <DevGamePageContent engine={engine} />;
}

export default DevGamePage;
