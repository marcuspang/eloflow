import { createContext, useContext, useEffect, useState } from "react";

export interface GameContext {
  gameId?: number;
  setGameId: (gameId: number) => void;
}

export const GameContext = createContext<GameContext>({
  setGameId: () => {},
});

export function useGameContext() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGameContext must be used within a GameProvider");
  }
  return context;
}

interface Props {
  children?: React.ReactNode;
}

export function GameProvider({ children }: Props) {
  // try and reach gameId from URL state
  const [gameId, setGameId] = useState<number | undefined>(undefined);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const gameIdParam = urlParams.get("gameId");
    if (gameIdParam) {
      setGameId(parseInt(gameIdParam));
    }
  }, []);

  return (
    <GameContext.Provider
      value={{
        gameId,
        setGameId: (newGameId) => {
          // update URL state
          setGameId(newGameId);
          window.history.replaceState({}, "", `?gameId=${newGameId}`);
        },
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
