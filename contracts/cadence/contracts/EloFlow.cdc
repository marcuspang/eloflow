access(all) contract EloFlow {
    access(all) let GameStoragePath: StoragePath
    access(all) let GamePublicPath: PublicPath

    access(all) var gameIdCount: UInt64

    access(all) event GameCreated(gameId: UInt64, creator: Address)
    access(all) event GameStarted(gameId: UInt64)
    access(all) event PlayerJoined(gameId: UInt64, player: Address)
    access(all) event PlayerLeft(gameId: UInt64, player: Address)
    access(all) event GameEnded(gameId: UInt64, winners: [Address])

    access(all) enum GameState: UInt8 {
        access(all) case WAITING
        access(all) case ACTIVE
        access(all) case ENDED
    }

    access(all) resource Game {
        access(all) let id: UInt64
        access(self) let vrf: UInt256  // For generating cards
        access(all) var state: GameState
        access(all) var pot: UFix64
        access(all) var players: {Address: UFix64} // Player -> Current Bet mapping
        access(all) var winners: [Address]
        access(all) var currentTurn: Address?
        access(all) var minimumBet: UFix64

        init(id: UInt64, minimumBet: UFix64) {
            self.id = id
            self.vrf = revertibleRandom<UInt256>()
            self.state = GameState.WAITING
            self.pot = 0.0
            self.players = {}
            self.winners = []
            self.currentTurn = nil
            self.minimumBet = minimumBet
        }

        access(self) fun startGame() {
            pre {
                self.state == GameState.WAITING: "Game must be in WAITING state"
                self.players.length >= 2: "Need at least 2 players"
            }
            self.state = GameState.ACTIVE
            emit GameStarted(gameId: self.id)
        }

        access(all) fun joinGame(player: Address, amount: UFix64) {
            pre {
                self.state == GameState.WAITING: "Game must be in WAITING state"
                amount >= self.minimumBet: "Must meet minimum bet"
                !self.players.containsKey(player): "Player already in game"
            }
            self.players[player] = amount
            self.pot = self.pot + amount
            emit PlayerJoined(gameId: self.id, player: player)
        }

        access(all) fun leaveGame(player: Address) {
            pre {
                self.state == GameState.WAITING: "Can only leave during WAITING state"
                self.players.containsKey(player): "Player not in game"
            }
            let playerBet = self.players.remove(key: player) ?? 0.0
            self.pot = self.pot - playerBet
            emit PlayerLeft(gameId: self.id, player: player)
        }

        access(self) fun endGame(winners: [Address]) {
            pre {
                self.state == GameState.ACTIVE: "Game must be ACTIVE to end"
            }
            self.state = GameState.ENDED
            self.winners = winners
            emit GameEnded(gameId: self.id, winners: winners)
        }
    }

    access(all) resource GameCollection {
        access(all) var gamesCreated: @{UInt64: Game}

        init() {
            self.gamesCreated <- {}
        }

        access(all) fun createGame(minimumBet: UFix64, creator: Address): UInt64 {
            let gameId = EloFlow.gameIdCount
            self.gamesCreated[gameId] <-! create Game(id: gameId, minimumBet: minimumBet)
            EloFlow.gameIdCount = EloFlow.gameIdCount + 1

            emit GameCreated(gameId: gameId, creator: creator)
            return gameId
        }
    }

    access(all) fun createEmptyGameCollection(): @GameCollection {
        return <- create GameCollection()
    }

    init() {
        self.GameStoragePath = /storage/EloFlow
        self.GamePublicPath = /public/EloFlow

        self.gameIdCount = 1
    }
}
