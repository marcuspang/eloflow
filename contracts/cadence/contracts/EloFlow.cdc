// TODO: add tests to ensure that the game creator functions are not accessible by players
access(all) contract EloFlow {
    access(all) let GameStoragePath: StoragePath
    access(all) let GamePublicPath: PublicPath
    access(all) let PlayerHandStoragePath: StoragePath

    access(all) var gameIdCount: UInt64

    access(all) entitlement GameCreator

    access(all) event GameCreated(gameId: UInt64, creator: Address)
    access(all) event GameStarted(gameId: UInt64)
    access(all) event PlayerJoined(gameId: UInt64, player: Address)
    access(all) event PlayerLeft(gameId: UInt64, player: Address)
    access(all) event GameEnded(gameId: UInt64, winners: [Address])

    access(all) enum Suit: UInt8 {
        access(all) case HEARTS
        access(all) case DIAMONDS
        access(all) case CLUBS
        access(all) case SPADES
    }

    access(all) struct Card {
        access(all) let suit: Suit
        access(all) let rank: UInt8 // 1-14 (1=Uninitialized,14=Ace)

        init(suit: Suit, rank: UInt8) {
            pre {
                rank >= 1 && rank <= 14: "Invalid card rank"
            }
            self.suit = suit
            self.rank = rank
        }
    }

    // should only be accessible by the user
    access(all) resource PlayerHand {
        access(self) var cards: [Card; 2]

        init(card1: Card, card2: Card) {
            self.cards = [card1, card2]
        }
    }

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
        access(all) var players: {Address: UFix64} // Player -> Current Bet
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

        access(GameCreator) fun startGame() {
            pre {
                self.state == GameState.WAITING: "Game must be in WAITING state"
                self.players.length >= 2: "Need at least 2 players"
            }

            self.state = GameState.ACTIVE
            emit GameStarted(gameId: self.id)
        }

        access(self) fun dealCardsToPlayer(player: auth(SaveValue) &Account) {
            // TODO: use more cryptographically secure mechanism
            let seed = self.vrf % 52 // 52 cards in a deck
            let seed2 = (self.vrf / 52) % 51 // Use different parts of VRF for second card

            // Generate cards
            let card1Suit = Suit(rawValue: UInt8(seed % 4))!
            let card1Rank = UInt8((seed / 4) % 13) + 2
            let card1 = Card(suit: card1Suit, rank: card1Rank)
            let card2Suit = Suit(rawValue: UInt8(seed2 % 4))!
            let card2Rank = UInt8((seed2 / 4) % 13) + 2
            let card2 = Card(suit: card2Suit, rank: card2Rank)

            let newHand <- create PlayerHand(card1: card1, card2: card2)
            player.storage.save(
                <-newHand,
                to: StoragePath(identifier: EloFlow.generatePlayerHandStoragePath(id: self.id)) ?? panic("Failed to generate storage path")
            )
        }

        access(GameCreator) fun joinGame(player: auth(SaveValue) &Account, amount: UFix64) {
            pre {
                self.state == GameState.WAITING: "Game must be in WAITING state"
                amount >= self.minimumBet: "Must meet minimum bet"
                !self.players.containsKey(player.address): "Player already in game"
            }
            if self.players.insert(key: player.address, amount) != nil {
                panic("Player is already in the game: ".concat(player.address.toString()))
            }
            self.dealCardsToPlayer(player: player)
            self.pot = self.pot + amount
            emit PlayerJoined(gameId: self.id, player: player.address)
        }

        // TODO: allow users to leave game without creator's signature
        access(all) fun leaveGame(player: Address) {
            pre {
                self.state == GameState.WAITING: "Can only leave during WAITING state"
                self.players.containsKey(player): "Player not in game"
            }
            let playerBet = self.players.remove(key: player) ?? 0.0
            self.pot = self.pot - playerBet
            emit PlayerLeft(gameId: self.id, player: player)
        }

        access(GameCreator) fun endGame() {
            pre {
                self.state == GameState.ACTIVE: "Game must be ACTIVE to end"
            }
            self.state = GameState.ENDED
            // TODO: add winners logic
            self.winners = []
            emit GameEnded(gameId: self.id, winners: [])
        }
    }

    // This resource is publicly accessible using the public game path, to allow gamesCreated to be public and
    // for anyone to read the game information. So, all the mutation functions need to have the entitlement,
    // which also needs to be enforced at the Game level since the references are public
    access(all) resource GameCollection {
        access(all) var gamesCreated: @{UInt64: Game}

        init() {
            self.gamesCreated <- {}
        }

        access(GameCreator) fun borrowGame(id: UInt64): auth(GameCreator) &Game? {
            return &self.gamesCreated[id]
        }

        access(GameCreator) fun createGame(minimumBet: UFix64, creator: Address): UInt64 {
            let gameId = EloFlow.gameIdCount
            self.gamesCreated[gameId] <-! create Game(id: gameId, minimumBet: minimumBet)
            EloFlow.gameIdCount = EloFlow.gameIdCount + 1

            emit GameCreated(gameId: gameId, creator: creator)
            return gameId
        }

        access(GameCreator) fun setGames(games: @{UInt64: Game}) {
            var other <- games
            self.gamesCreated <-> other
            destroy other
        }
    }

    access(all) fun createEmptyGameCollection(): @GameCollection {
        return <- create GameCollection()
    }

    access(all) fun generatePlayerHandStoragePath(id: UInt64): String {
        return EloFlow.PlayerHandStoragePath.toString().concat("/").concat(id.toString())
    }

    init() {
        self.GameStoragePath = /storage/EloFlow
        self.GamePublicPath = /public/EloFlow
        self.PlayerHandStoragePath = /storage/EloFlowPlayerHand

        self.gameIdCount = 1

        let cap = self.account.capabilities.storage.issue<&GameCollection>(self.GameStoragePath)
        self.account.capabilities.publish(cap, at: self.GamePublicPath)
    }
}
