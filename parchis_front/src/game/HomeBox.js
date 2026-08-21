import React, { useContext } from "react";
import { getCharacterAsset } from "./assets/characters";
import { GameContext, SelectTokenEvent } from "./use_game";


export function HomeBox(props) {
  const context = useContext(GameContext);
  const gameState = context.gameState;
  const playerState = gameState[props.player];
  return (
    <td className={props.player} colSpan="7" rowSpan="7">
      <div className="emojis">
        {Object.keys(playerState)
          .filter((character) => {
            return playerState[character] == 0;
          })
          .map((character) => {
            function handleEmojiClick() {
              context.dispatch(
                SelectTokenEvent({ player: props.player, character })
              );
            }
            return (
              <span
                className="emoji"
                key={character}
                onClick={handleEmojiClick}
              >
                {getCharacterAsset(character)}
              </span>
            );
          })}
      </div>
    </td>
  );
}