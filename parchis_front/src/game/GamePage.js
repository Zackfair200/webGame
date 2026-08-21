import React from 'react';
import Board from './Board';
import './GamePage.css';
import {GameStateProvider} from './use_game'
const Game = () => {
  return (
    <GameStateProvider>
    <div className="game">
      <Board />
    </div>
  </GameStateProvider>
  );
};

export default Game;
