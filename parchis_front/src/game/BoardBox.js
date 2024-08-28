import React, { useContext } from "react";
import { getCharacterAsset, Characters } from "./assets/characters";
import { GameContext, BoxClickEvent, SelectTokenEvent } from "./use_game";


export function BoardBox(props) {
  const context = useContext(GameContext);
  const gameState = context.gameState;

  function handleBoxClick() {
    context.dispatch(BoxClickEvent({ boxId: props.position }));
  }

  return (
    <td rowSpan="2" onClick={handleBoxClick}>
      {props.position}
      {getTokensForPosition(gameState, props.position).map((playerToken) => {
        const tokenClassName = `emoji token player-${playerToken.player}`;

        function handleClick(e) {
          e.stopPropagation();
          context.dispatch(SelectTokenEvent(playerToken));
        }

        return (
          <span
            key={`${playerToken.player}__${playerToken.character}`}
            className={tokenClassName}
            onClick={handleClick}
          >
            {getCharacterAsset(playerToken.character)}
          </span>
        );
      })}
    </td>
  );
}

function getTokensForPosition(gameState, position) {
  const result = [];
  Object.keys(gameState).map((playerColor) => {
    const playerState = gameState[playerColor];
    Object.keys(playerState).map((characterName) => {
      const tokenPosition = playerState[characterName];
      if (position === tokenPosition) {
        result.push({ player: playerColor, character: characterName });
      }
    });
  });

  return result;
}
