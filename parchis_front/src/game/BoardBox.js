import React, { useContext } from "react";
import { getCharacterAsset } from "./assets/characters";
import { GameContext, BoxClickEvent, SelectTokenEvent } from "./use_game";


export function BoardBox(props) {
  const context = useContext(GameContext);
  const tokens = context.tokenPositions[props.position] ||  []

  function handleBoxClick() {
    context.dispatch(BoxClickEvent({ boxId: props.position }));
  }

  return (
    <td rowSpan="2" onClick={handleBoxClick}>
      {tokens.map((playerToken) => {
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
      {props.position}
    </td>
  );
}
