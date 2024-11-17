import { createContext, useContext, useEffect, useState } from "react";
import * as fcl from "@onflow/fcl";

export interface GameContext {
  gameId?: number;
  setGameId: (gameId: number) => void;
  user: { loggedIn: boolean };
  setUser: (user: { loggedIn: boolean }) => void;
  logIn: () => void;
  logOut: () => void;
}

export const GameContext = createContext<GameContext>({
  setGameId: () => {},
  user: { loggedIn: false },
  setUser: () => {},
  logIn: () => {},
  logOut: () => {},
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
  const [user, setUser] = useState({ loggedIn: false });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const gameIdParam = urlParams.get("gameId");
    if (gameIdParam) {
      setGameId(parseInt(gameIdParam));
    }
  }, []);

  useEffect(() => {
    fcl.currentUser.subscribe(setUser);
  }, []);

  const logIn = () => {
    fcl.authenticate();
  };

  const logOut = () => {
    fcl.unauthenticate();
  };

  return (
    <GameContext.Provider
      value={{
        gameId,
        setGameId: (newGameId) => {
          // update URL state
          setGameId(newGameId);
          window.history.replaceState({}, "", `?gameId=${newGameId}`);
        },
        user,
        setUser,
        logIn,
        logOut,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
