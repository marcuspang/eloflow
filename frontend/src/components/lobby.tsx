import { useGameContext } from "@/components/game-context";
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
  CREATE_GAME,
  CREATE_GAME_COLLECTION_AND_GAME,
  QUERY_GAME_COLLECTION,
  READ_LATEST_COUNT,
} from "@/lib/contracts";
import { payerAuthz } from "@/lib/flow";
import * as fcl from "@onflow/fcl";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

export function Lobby() {
  const { setGameId, logIn, logOut, user } = useGameContext();
  const [newGameMinBet, setNewGameMinBet] = useState<number>(0);

  const { data: userData } = useQuery({
    queryKey: ["user"],
    queryFn: () => fcl.currentUser.snapshot(),
  });

  const { data: latestGameId } = useQuery({
    queryKey: ["latestGameId"],
    queryFn: async () => {
      const result = await fcl.query({ cadence: READ_LATEST_COUNT });
      return result as number;
    },
  });

  const { data: hasGameCollection } = useQuery({
    queryKey: ["gameCollection", userData?.addr],
    queryFn: async () => {
      const result = await fcl.query({
        cadence: QUERY_GAME_COLLECTION,
        args: (arg, t) => [arg(userData?.addr, t.Address)],
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
        payer: payerAuthz,
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

  const createGame = () => {
    contractCreateGame(newGameMinBet);
  };

  const viewGame = (id: number) => {
    setGameId(id);
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
              {user?.loggedIn ? (
                <Button onClick={logOut}>Log Out</Button>
              ) : (
                <Button onClick={logIn}>Log In</Button>
              )}
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
                        <th className="p-2 text-left">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from(
                        { length: latestGameId ?? 0 },
                        (_, i) => i + 1
                      ).map((gameId) => (
                        <tr key={gameId} className="border-t">
                          <td className="p-2">{gameId}</td>
                          <td className="p-2">
                            <Button onClick={() => viewGame(gameId)} size="sm">
                              View
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
