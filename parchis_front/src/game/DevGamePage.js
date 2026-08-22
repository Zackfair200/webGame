import React from 'react';
import { useGameEngine } from './hooks/useGameEngine';

function formatValue(value) {
  if (value === null || value === undefined) {
    return 'none';
  }

  return String(value);
}

function DevGamePage() {
  const {
    gameState,
    turnState,
    currentPlayer,
    availableActions,
    pendingReward,
    availableRewardActions,
    lastEvents,
  } = useGameEngine();

  return (
    <main>
      <h1>Dev Game Engine</h1>
      <p>Esta pantalla usa el nuevo game engine como fuente de verdad.</p>

      <section aria-label="Game engine diagnostics">
        <dl>
          <dt>Game phase</dt>
          <dd>{gameState.phase}</dd>

          <dt>Current player</dt>
          <dd>{currentPlayer.name} ({gameState.currentPlayerId})</dd>

          <dt>Turn phase</dt>
          <dd>{formatValue(turnState?.phase)}</dd>

          <dt>Winner</dt>
          <dd>{formatValue(gameState.winnerPlayerId)}</dd>

          <dt>Available actions</dt>
          <dd>{availableActions.length}</dd>

          <dt>Pending reward</dt>
          <dd>{pendingReward ? pendingReward.type : 'none'}</dd>

          <dt>Available reward actions</dt>
          <dd>{availableRewardActions.length}</dd>
        </dl>
      </section>

      <section aria-label="Last engine events">
        <h2>Last events</h2>
        {lastEvents.length === 0 ? (
          <p>No events yet.</p>
        ) : (
          <pre>{JSON.stringify(lastEvents, null, 2)}</pre>
        )}
      </section>
    </main>
  );
}

export default DevGamePage;
