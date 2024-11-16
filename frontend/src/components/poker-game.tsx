import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { QUERY_STATE } from "@/lib/contracts";
import * as fcl from "@onflow/fcl";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

type Player = { address: string; chips: number };

function convertGameState(rawValue: number) {
  switch (rawValue) {
    case 0:
      return "WAITING";
    case 1:
      return "ACTIVE";
    case 2:
      return "ENDED";
  }
  return "UNKNOWN";
}

interface Props {
  gameId: number;
}

export function PokerGame({ gameId }: Props) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentBet, setCurrentBet] = useState<number>(0);
  const [pot, setPot] = useState<number>(0);

  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: () => fcl.currentUser.snapshot(),
  });
  const { data: gameState } = useQuery({
    queryKey: ["gameState", gameId],
    queryFn: async () => {
      const result = await fcl.query({
        cadence: QUERY_STATE,
        args: (arg, t) => [
          arg(gameId.toString(), t.UInt64),
          arg(user?.addr, t.Address),
        ],
      });
      console.log({ result });
      return result as { rawValue: string };
    },
    enabled: !!gameId && !!user?.addr,
  });

  const leaveGame = (address: string) => {
    setPlayers(players.filter((player) => player.address !== address));
    // Here you would call the backend leaveGame function
  };

  const startGame = () => {
    // Here you would call the backend startGame function
  };

  const raise = (address: string, amount: number) => {
    setCurrentBet(currentBet + amount);
    setPot(pot + amount);
    // Here you would call the backend raise function
  };

  const call = (address: string) => {
    setPot(pot + currentBet);
    // Here you would call the backend call function
  };

  const submitHand = (address: string) => {
    // Here you would call the backend submitHand function
  };

  return (
    <div className="container p-4 mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Poker Game</CardTitle>
          {currentGameId > 0 && (
            <Badge>
              {convertGameState(Number(gameState?.rawValue ?? 0))} #
              {currentGameId}
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Players</h3>
            <ul>
              {players.map((player, index) => (
                <li key={index} className="flex items-center justify-between">
                  <span>{player.address}</span>
                  <span>{player.chips} chips</span>
                  <Button onClick={() => leaveGame(player.address)}>
                    Leave
                  </Button>
                </li>
              ))}
            </ul>
          </div>
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Game Info</h3>
            <p>Current Bet: {currentBet}</p>
            <p>Pot: {pot}</p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button onClick={startGame} disabled={gameState?.rawValue !== "0"}>
            Start Game
          </Button>
        </CardFooter>
      </Card>
      {gameState?.rawValue === "1" && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Player Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Input type="number" placeholder="Raise Amount" />
                <Button onClick={() => raise("currentPlayer", 100)}>
                  Raise
                </Button>
              </div>
              <Button onClick={() => call("currentPlayer")}>Call</Button>
              <Button onClick={() => submitHand("currentPlayer")}>
                Submit Hand
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
