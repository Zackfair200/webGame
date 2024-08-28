import { createContext, useState, useMemo } from "react";
import { makeNewGameState } from "./GameState";

export const GameContext = createContext({
    gameState: makeNewGameState(),
    tokenPositions: {},
    dispatch(event) {}
})


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

    const tokenPositions = useMemo(() => {
        const value = {}
        Object.keys(gameState).map(player => {
            const characters = gameState[player]
            Object.keys(characters).map(character => {
                const position = gameState[player][character]
                const playerToken = {player, character}
                const tokenList = value[position] || []
                value[position] = [
                    ...tokenList,
                    playerToken
                ]
            })
        })
        return value
    }, [gameState])

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
        tokenPositions,
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