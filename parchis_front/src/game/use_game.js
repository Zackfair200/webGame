import { createContext, useState } from "react";
import { makeNewGameState } from "./GameState";
import { Players } from "./assets/players";
import { Characters } from "./assets/characters";

export const GameContext = createContext({
    counter: 0,
    gameState: makeNewGameState(),
    dispatch(action, payload) {}
})


function useGame() {

}


export function SelectTokenEvent({player, character}) {
    return {
        event: "SELECT_TOKEN",
        player,
        character
    }
}
export function BoxClickEvent({boxId}) {
    return {
        event: "BOX_CLICK",
        boxId,
    }
}

export function GameStateProvider(props) {
    const [gameState, setGameState] = useState(() => props.initialState || makeNewGameState());
    const [tokenSelected, setTokenSelected] = useState(null);

    function moveCharacterToBox({player, character}, box) {
        setGameState({
          ...gameState,
          [player]: {
            ...gameState[player],
            [character]: box,
          },
        });
    }

    const contextValue = {
        gameState,
        dispatch: ({event, ...payload}) => {
            if (event === "SELECT_TOKEN") {
                setTokenSelected(payload)
            }
            if (event === "BOX_CLICK") {
                if (tokenSelected) {
                    moveCharacterToBox(tokenSelected, payload.boxId)
                }
            }
        }
    }

    return <GameContext.Provider value={contextValue}>
        {props.children}
    </GameContext.Provider>
}