import { createContext, useContext, useState } from "react";

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

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [gameId, setGameId] = useState<number | undefined>(undefined);
  return (
    <GameContext.Provider value={{ gameId, setGameId }}>
      {children}
    </GameContext.Provider>
  );
}
