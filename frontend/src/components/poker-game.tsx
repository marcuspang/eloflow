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
import {
  JOIN_GAME,
  LEAVE_GAME,
  QUERY_STATE,
  READ_HAND,
  START_GAME,
} from "@/lib/contracts";
import { payerAuthz } from "@/lib/flow";
import * as fcl from "@onflow/fcl";
import { useMutation, useQuery } from "@tanstack/react-query";
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
  const { data: hand } = useQuery({
    queryKey: ["getHand", gameId],
    queryFn: async () => {
      const result = await fcl.query({
        cadence: READ_HAND,
        args: (arg, t) => [arg(gameId.toString(), t.UInt64)],
        authorizations: [fcl.currentUser.authorization],
      });
      return result;
    },
  });
  console.log({ hand });
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
      return result as {
        uuid: string;
        id: string;
        vrf: string;
        state: {
          rawValue: string;
        };
        pot: string;
        players: {
          [key: string]: string;
        };
        activePlayers: {
          [key: string]: string;
        };
        submittedHands: {
          [key: string]: string;
        };
        winners: string[];
        currentTurn: string | null;
        minimumBet: string;
        lastRaise: string;
      };
    },
    enabled: !!gameId && !!user?.addr,
  });
  const { mutate: contractJoinGame } = useMutation({
    mutationFn: async (address: string) => {
      await fcl.mutate({
        cadence: JOIN_GAME,
        args: (arg, t) => [
          arg(gameId.toString(), t.UInt64),
          arg(betAmount, t.UFix64),
        ],
        payer: payerAuthz,
        // TODO: authorizations needs game creator
        authorizations: [
          fcl.currentUser.authorization,
          fcl.currentUser.authorization,
        ],
      });
    },
  });
  const { mutate: contractLeaveGame } = useMutation({
    mutationFn: async (address: string) => {
      await fcl.mutate({
        cadence: LEAVE_GAME,
        payer: payerAuthz,
        // TODO: authorizations needs game creator
        args: (arg, t) => [arg(address, t.Address)],
      });
    },
  });
  const { mutate: contractStartGame } = useMutation({
    mutationFn: async () => {
      await fcl.mutate({
        cadence: START_GAME,
        args: (arg, t) => [arg(gameId.toString(), t.UInt64)],
        payer: payerAuthz,
        // TODO: needs to be game creator only
        authorizations: [fcl.currentUser.authorization],
      });
    },
  });

  const joinGame = (address: string) => {
    contractJoinGame(address);
  };

  const leaveGame = (address: string) => {
    contractLeaveGame(address);
  };

  const startGame = () => {
    contractStartGame();
  };

  const raise = (address: string, amount: number) => {};

  const call = (address: string) => {};

  const submitHand = (address: string) => {};

  return (
    <div className="container p-4 mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Poker Game</CardTitle>
          {gameId > 0 && (
            <Badge>
              {convertGameState(Number(gameState?.state.rawValue ?? 0))} #
              {gameId}
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
            <p>Current Bet: {gameState?.minimumBet}</p>
            <p>Pot: {gameState?.pot}</p>
          </div>
        </CardContent>
        <CardFooter className="flex space-x-4">
          <Button
            onClick={() => leaveGame(user?.addr ?? "")}
            disabled={gameState?.state.rawValue !== "0"}
          >
            Leave Game
          </Button>
          <Button
            onClick={() => joinGame(user?.addr ?? "")}
            disabled={gameState?.state.rawValue !== "0"}
          >
            Join Game
          </Button>
          <Button
            onClick={startGame}
            disabled={gameState?.state.rawValue !== "0"}
          >
            Start Game
          </Button>
        </CardFooter>
      </Card>
      {gameState?.state.rawValue === "1" && (
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
