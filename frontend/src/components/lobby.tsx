import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  QUERY_GAME_COLLECTION,
  CREATE_GAME,
  CREATE_GAME_COLLECTION_AND_GAME,
  JOIN_GAME,
} from "@/lib/contracts";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import * as fcl from "@onflow/fcl";

type Game = {
  id: string;
  creator: string;
  minimumBet: number;
  players: number;
};

export function Lobby() {
  const [games, setGames] = useState<Game[]>([
    { id: "1", creator: "Player1", minimumBet: 100, players: 3 },
    { id: "2", creator: "Player2", minimumBet: 200, players: 2 },
    { id: "3", creator: "Player3", minimumBet: 50, players: 4 },
  ]);
  const [newGameMinBet, setNewGameMinBet] = useState<number>(0);
  const [joinGameId, setJoinGameId] = useState<string>("");

  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: () => fcl.currentUser.snapshot(),
  });

  const { data: hasGameCollection } = useQuery({
    queryKey: ["gameCollection", user?.addr],
    queryFn: async () => {
      const result = await fcl.query({
        cadence: QUERY_GAME_COLLECTION,
        args: (arg, t) => [arg(user?.addr, t.Address)],
      });
      return result as boolean;
    },
    enabled: !!user,
  });
  const { mutate: contractCreateGame } = useMutation({
    mutationFn: async (bet: number) => {
      const config = {
        cadence: CREATE_GAME,
        args: (arg, t) => [arg(bet.toFixed(1), t.UFix64)],
        proposer: fcl.currentUser,
        payer: fcl.currentUser,
        authorizations: [fcl.currentUser.authorization],
        limit: 50,
      };
      if (!hasGameCollection) {
        config.cadence = CREATE_GAME_COLLECTION_AND_GAME;
        config.args = (arg, t) => [arg(bet.toFixed(1), t.UFix64)];
      }
      const transactionId = await fcl.mutate(config);
      const transaction = await fcl.tx(transactionId).onceSealed();

      const gameCreatedEvent = transaction.events.find((e) =>
        e.type.includes("GameCreated")
      );
      if (gameCreatedEvent) {
        const gameId = gameCreatedEvent.data.gameId;
        return gameId;
      }
      return null;
    },
    mutationKey: ["createGame"],
  });

  const { mutate: contractJoinGame } = useMutation({
    mutationFn: async (gameId: string) => {
      const transactionId = await fcl.mutate({
        cadence: JOIN_GAME,
        args: (arg, t) => [arg(gameId, t.UInt64)],
        proposer: fcl.currentUser,
        payer: fcl.currentUser,
        authorizations: [fcl.currentUser.authorization],
        limit: 50,
      });
      const transaction = await fcl.tx(transactionId).onceSealed();
      console.log({ transaction });
    },
    mutationKey: ["joinGame"],
  });

  const createGame = () => {
    contractCreateGame(newGameMinBet);
  };

  const joinGame = (id: string) => {
    contractJoinGame(id);
  };

  return (
    <div className="container p-4 mx-auto">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Poker Game Lobby</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex space-x-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button>Create New Game</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Game</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid items-center grid-cols-4 gap-4">
                      <Label htmlFor="minBet" className="text-right">
                        Minimum Bet
                      </Label>
                      <Input
                        id="minBet"
                        type="number"
                        className="col-span-3"
                        value={newGameMinBet}
                        onChange={(e) =>
                          setNewGameMinBet(Number(e.target.value))
                        }
                      />
                    </div>
                  </div>
                  <Button onClick={createGame}>Create Game</Button>
                </DialogContent>
              </Dialog>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">Join Game</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Join Game</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid items-center grid-cols-4 gap-4">
                      <Label htmlFor="gameId" className="text-right">
                        Game ID
                      </Label>
                      <Input
                        id="gameId"
                        className="col-span-3"
                        value={joinGameId}
                        onChange={(e) => setJoinGameId(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button onClick={() => joinGame(joinGameId)}>
                    Join Game
                  </Button>
                </DialogContent>
              </Dialog>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Available Games</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="p-2 text-left">ID</th>
                        <th className="p-2 text-left">Creator</th>
                        <th className="p-2 text-left">Minimum Bet</th>
                        <th className="p-2 text-left">Players</th>
                        <th className="p-2 text-left">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {games.map((game) => (
                        <tr key={game.id} className="border-t">
                          <td className="p-2">{game.id}</td>
                          <td className="p-2">{game.creator}</td>
                          <td className="p-2">{game.minimumBet}</td>
                          <td className="p-2">{game.players}</td>
                          <td className="p-2">
                            <Button onClick={() => joinGame(game.id)} size="sm">
                              Join
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
