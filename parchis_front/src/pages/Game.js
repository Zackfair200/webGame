import React from 'react';
import Board from '../game/Board';
import './Game.css';
import {GameStateProvider} from '../game/use_game'
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
