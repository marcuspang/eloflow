import { useGameContext } from "@/components/game-context";
import { Lobby } from "@/components/lobby";
import { PokerGame } from "@/components/poker-game";

export function HomePage() {
  const { gameId } = useGameContext();

  if (!gameId) {
    return <Lobby />;
  }
  return <PokerGame gameId={gameId} />;
}
