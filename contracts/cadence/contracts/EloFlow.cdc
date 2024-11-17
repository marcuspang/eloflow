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
    access(all) event HandSubmitted(gameId: UInt64, player: Address)
    access(all) event RoundComplete(gameId: UInt64)

    access(all) enum Suit: UInt8 {
        access(all) case HEARTS
        access(all) case DIAMONDS
        access(all) case CLUBS
        access(all) case SPADES
    }

    access(all) enum PlayerAction: UInt8 {
        access(all) case FOLD
        access(all) case CALL
        access(all) case RAISE
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
        access(all) var cards: [Card; 2]

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
        // TODO: move this to private storage slot
        access(self) let vrf: UInt256  // For generating cards
        access(all) var state: GameState
        access(all) var pot: UFix64
        access(all) var players: {Address: UFix64} // Player -> Current Bet
        access(all) var activePlayers: {Address: Bool} // Player -> Active status
        // This is okay to be public since everyone's hand is revealed in poker at the end
        access(all) var submittedHands: @{Address: PlayerHand}
        access(all) var winners: [Address]
        access(all) var currentTurn: Address?
        access(all) var minimumBet: UFix64
        access(all) var lastRaise: UFix64

        init(id: UInt64, minimumBet: UFix64) {
            self.id = id
            self.vrf = revertibleRandom<UInt256>()
            self.state = GameState.WAITING
            self.pot = 0.0
            self.players = {}
            self.winners = []
            self.currentTurn = nil
            self.minimumBet = minimumBet
            self.lastRaise = 0.0
            self.activePlayers = {}
            self.submittedHands <- {}
        }

        access(GameCreator) fun startGame() {
            pre {
                self.state == GameState.WAITING: "Game must be in WAITING state"
                self.players.length >= 2: "Need at least 2 players"
            }

            for player in self.players.keys {
                self.activePlayers[player] = true
            }

            // Set the first player's turn
            self.currentTurn = self.players.keys[0]

            self.state = GameState.ACTIVE
            emit GameStarted(gameId: self.id)
        }

        access(self) fun dealCardsToPlayer(player: auth(SaveValue) &Account) {
            // TODO: use more cryptographically secure mechanism
            let seed = (self.vrf / UInt256(self.activePlayers.length)) % 52 // 52 cards in a deck
            let seed2 = (self.vrf / UInt256(self.activePlayers.length) / 52) % 51 // Use different parts of VRF for second card

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

        access(all) fun raise(player: Address, amount: UFix64) {
            pre {
                self.state == GameState.ACTIVE: "Game must be ACTIVE"
                self.currentTurn == player: "Not player's turn. Current: ".concat(self.currentTurn?.toString() ?? "No one")
                amount > self.lastRaise: "Raise must be higher than last raise"
                self.activePlayers[player] ?? false: "Player must be active"
            }

            self.lastRaise = amount
            self.players[player] = (self.players[player] ?? 0.0) + amount
            self.pot = self.pot + amount

            // Find next active player
            var found = false
            for addr in self.activePlayers.keys {
                if found && self.activePlayers[addr]! {
                    self.currentTurn = addr
                    return
                }
                if addr == player {
                    found = true
                }
            }
            // Wrap around to first active player
            for addr in self.activePlayers.keys {
                if self.activePlayers[addr]! {
                    self.currentTurn = addr
                    return
                }
            }
        }

        access(all) fun call(player: Address) {
            pre {
                self.state == GameState.ACTIVE: "Game must be ACTIVE"
                self.currentTurn == player: "Not player's turn"
                self.activePlayers[player] ?? false: "Player must be active"
            }

            let highestBet = self.getHighestBet()
            let currentBet = self.players[player] ?? 0.0
            let callAmount = highestBet - currentBet

            if callAmount > 0.0 {
                self.players[player] = highestBet
                self.pot = self.pot + callAmount
            }

            // Find next active player
            var found = false
            for addr in self.activePlayers.keys {
                if found && self.activePlayers[addr]! {
                    self.currentTurn = addr
                    return
                }
                if addr == player {
                    found = true
                }
            }
            // Wrap around to first active player
            for addr in self.activePlayers.keys {
                if self.activePlayers[addr]! {
                    self.currentTurn = addr
                    return
                }
            }
        }

        access(all) fun submitHand(player: auth(LoadValue) &Account) {
            pre {
                self.state == GameState.ACTIVE: "Game must be ACTIVE"
                self.activePlayers[player.address] ?? false: "Player must be active"
                !self.submittedHands.containsKey(player.address): "Player has already submitted their hand"
            }

            let path = StoragePath(identifier: EloFlow.generatePlayerHandStoragePath(id: self.id)) ?? panic("Failed to generate storage path")
            let playerHand <- player.storage.load<@PlayerHand>(from: path) ?? panic("Failed to get player hand")

            if playerHand == nil || playerHand.cards.length != 2 {
                panic("Invalid player hand in storage")
            }

            self.submittedHands[player.address] <-! playerHand
            emit HandSubmitted(gameId: self.id, player: player.address)

            // Check if all active players have submitted their hands
            if self.checkAllHandsSubmitted() {
                self.determineWinners()
            }
        }

        access(self) view fun checkAllHandsSubmitted(): Bool {
            for player in self.activePlayers.keys {
                if self.activePlayers[player]! && !self.submittedHands.containsKey(player) {
                    return false
                }
            }
            return true
        }

        access(self) view fun getHighestBet(): UFix64 {
            var highest: UFix64 = 0.0
            for bet in self.players.values {
                if bet > highest {
                    highest = bet
                }
            }
            return highest
        }

        access(self) fun determineWinners() {
            if !self.checkAllHandsSubmitted() {
                panic("All active players must submit hands")
            }

            var highestRank: UInt8 = 0
            var currentWinners: [Address] = []

            for player in self.submittedHands.keys {
                if !self.activePlayers[player]! {
                    continue
                }

                let hand <-self.submittedHands.remove(key: player) ?? panic("Error removing player hand")
                let handRank = self.getHandRank(hand: <-hand)

                if handRank > highestRank {
                    highestRank = handRank
                    currentWinners = [player]
                } else if handRank == highestRank {
                    currentWinners.append(player)
                }
            }

            self.winners = currentWinners
            self.state = GameState.ENDED

            let winnerShare = self.pot / UFix64(currentWinners.length)
            // TODO: give out share
            emit GameEnded(gameId: self.id, winners: currentWinners)
        }

        access(self) fun getHandRank(hand: @PlayerHand): UInt8 {
            var handRank: UInt8 = 0
            // Simple poker hand ranking logic
            if hand.cards[0].suit == hand.cards[1].suit {
                // Flush
                handRank = 20 + (hand.cards[0].rank > hand.cards[1].rank ? hand.cards[0].rank : hand.cards[1].rank)
            } else if hand.cards[0].rank == hand.cards[1].rank {
                // Pair
                handRank = 15 + hand.cards[0].rank
            } else {
                // High card
                handRank = hand.cards[0].rank > hand.cards[1].rank ? hand.cards[0].rank : hand.cards[1].rank
            }
            destroy hand
            return handRank
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
            self.determineWinners()
            self.state = GameState.ENDED
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

        access(all) view fun getAllGameIds(): [UInt64] {
            return self.gamesCreated.keys
        }

        access(GameCreator) view fun borrowGame(id: UInt64): auth(GameCreator) &Game? {
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

    access(all) view fun generatePlayerHandStoragePath(id: UInt64): String {
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
