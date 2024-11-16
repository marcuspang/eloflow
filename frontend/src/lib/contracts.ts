import { ELO_FLOW_ADDRESS } from "@/constants";

export const QUERY_GAME_COLLECTION = `import EloFlow from ${ELO_FLOW_ADDRESS}
access(all) fun main(user: Address): Bool {
    return getAccount(user).storage.check<@EloFlow.GameCollection>(from: EloFlow.GameStoragePath)
}
`.trim();

export const CREATE_GAME_COLLECTION = `import EloFlow from ${ELO_FLOW_ADDRESS}

transaction() {
    prepare(acc: auth(LoadValue, SaveValue, Capabilities) &Account) {
      acc.storage.save(<-EloFlow.createEmptyGameCollection(), to: EloFlow.GameStoragePath)

      log("Created empty collection")

      let cap = acc.capabilities.storage.issue<&EloFlow.GameCollection>(EloFlow.GameStoragePath)
      acc.capabilities.publish(cap, at: EloFlow.GamePublicPath)

      log("Capability created")
    }
}`.trim();

export const CREATE_GAME_COLLECTION_AND_GAME =
  `import EloFlow from ${ELO_FLOW_ADDRESS}

transaction(minimumBet: UFix64) {
    let previousGameId: UInt64
    let game: auth(EloFlow.GameCreator) &EloFlow.Game

    prepare(signer: auth(BorrowValue, SaveValue) &Account) {
        signer.storage.save(<-EloFlow.createEmptyGameCollection(), to: EloFlow.GameStoragePath)

        let collectionRef = signer.storage
            .borrow<auth(EloFlow.GameCreator) &EloFlow.GameCollection>(from: EloFlow.GameStoragePath)
            ?? panic("Could not borrow GameCollection reference")
        let creator = signer.address
        self.previousGameId = EloFlow.gameIdCount
        let gameId = collectionRef.createGame(minimumBet: minimumBet, creator: creator)
        log("Created new game with ID: ".concat(EloFlow.gameIdCount.toString()))
        self.game = collectionRef.borrowGame(id: gameId) ?? panic("No game found")
        self.game.joinGame(player: signer, amount: minimumBet)
    }

    post {
        EloFlow.gameIdCount == self.previousGameId + UInt64(1): "Game ID counter should have increased by 1"

        self.game.id == self.previousGameId: "Game ID is not correct"
        self.game.state == EloFlow.GameState.WAITING: "Game state is not correct"
        self.game.minimumBet == minimumBet: "Minimum bet is not correct"
        self.game.pot == minimumBet: "Pot is not correct"
    }
}
}`.trim();

export const CREATE_GAME = `import EloFlow from ${ELO_FLOW_ADDRESS}

transaction(minimumBet: UFix64) {
    let previousGameId: UInt64
    let game: auth(EloFlow.GameCreator) &EloFlow.Game

    prepare(signer: auth(BorrowValue, SaveValue) &Account) {
        let collectionRef = signer.storage
            .borrow<auth(EloFlow.GameCreator) &EloFlow.GameCollection>(from: EloFlow.GameStoragePath)
            ?? panic("Could not borrow GameCollection reference")
        let creator = signer.address
        self.previousGameId = EloFlow.gameIdCount
        let gameId = collectionRef.createGame(minimumBet: minimumBet, creator: creator)
        log("Created new game with ID: ".concat(EloFlow.gameIdCount.toString()))
        self.game = collectionRef.borrowGame(id: gameId) ?? panic("No game found")
        self.game.joinGame(player: signer, amount: minimumBet)
    }

    post {
        EloFlow.gameIdCount == self.previousGameId + UInt64(1): "Game ID counter should have increased by 1"

        self.game.id == self.previousGameId: "Game ID is not correct"
        self.game.state == EloFlow.GameState.WAITING: "Game state is not correct"
        self.game.minimumBet == minimumBet: "Minimum bet is not correct"
        self.game.pot == minimumBet: "Pot is not correct"
    }
}
`.trim();

export const JOIN_GAME = `import EloFlow from ${ELO_FLOW_ADDRESS}

transaction(gameId: UInt64, betAmount: UFix64) {
    let joiner: Address
    let gameRef: auth(EloFlow.GameCreator) &EloFlow.Game

    prepare(creator: auth(BorrowValue) &Account, joiner: &Account) {
        let collectionRef = creator.storage
            .borrow<auth(EloFlow.GameCreator) &EloFlow.GameCollection>(from: EloFlow.GameStoragePath)
            ?? panic("Could not borrow GameCollection reference")
        self.joiner = joiner.address
        self.gameRef = collectionRef.borrowGame(id: gameId) ?? panic("No game found for ".concat(gameId.toString()))
    }

    execute {
        self.gameRef.joinGame(player: self.joiner, amount: betAmount)

        log("Successfully joined game ".concat(gameId.toString()))
    }

    post {
        self.gameRef!.players.containsKey(self.joiner): "Player should have been added to the game"
    }
}
`.trim();

export const LEAVE_GAME = `import EloFlow from ${ELO_FLOW_ADDRESS}

transaction(gameId: UInt64) {
    let collectionRef: auth(EloFlow.GameCreator) &EloFlow.GameCollection
    let gameRef: auth(EloFlow.GameCreator) &EloFlow.Game
    let previousState: EloFlow.GameState
    let previousPlayers: Int
    let leaver: Address

    prepare(creator: auth(BorrowValue) &Account, leaver: &Account) {
        log("Leaving Game ID ".concat(gameId.toString()).concat(""))

        self.collectionRef = creator.storage
            .borrow<auth(EloFlow.GameCreator) &EloFlow.GameCollection>(from: EloFlow.GameStoragePath)
            ?? panic("Could not borrow GameCollection reference")

        self.gameRef = self.collectionRef.borrowGame(id: gameId)
            ?? panic("Game with ID ".concat(gameId.toString()).concat(" does not exist"))

        self.previousState = self.gameRef.state
        self.previousPlayers = self.gameRef.players.length
        self.leaver = leaver.address
    }

    execute {
        self.gameRef.leaveGame(player: self.leaver)

        log("Successfully left game ".concat(self.leaver.toString()))
    }

    post {
        self.previousState == EloFlow.GameState.WAITING: "Game must have been in WAITING state"
        self.gameRef.state == EloFlow.GameState.ACTIVE: "Game must be in ACTIVE state"
        self.gameRef.players.length == self.previousPlayers - 1: "Game must have 1 player left"
    }
}
`.trim();

export const READ_HAND = `import EloFlow from 0x06

transaction(gameId: UInt64) {
    prepare(player: auth(BorrowValue) &Account) {
        let path = StoragePath(identifier: EloFlow.generatePlayerHandStoragePath(id: gameId))!

        let playerHand = player.storage.borrow<&EloFlow.PlayerHand>(from: path) ?? panic("No hand found")

        log("Card 0: Suit ".concat(playerHand.cards[0].suit.rawValue.toString()).concat(" Rank: ").concat(playerHand.cards[0].rank.toString()))
        log("Card 1: Suit ".concat(playerHand.cards[1].suit.rawValue.toString()).concat(" Rank: ").concat(playerHand.cards[1].rank.toString()))

    }
}
`.trim();

export const START_GAME = `import EloFlow from 0x06

transaction(gameId: UInt64) {
    let collectionRef: auth(EloFlow.GameCreator) &EloFlow.GameCollection
    let gameRef: auth(EloFlow.GameCreator) &EloFlow.Game
    let previousState: EloFlow.GameState

    prepare(creator: auth(BorrowValue) &Account) {
        log("Joining Game ID ".concat(gameId.toString()).concat(""))

        self.collectionRef = creator.storage
            .borrow<auth(EloFlow.GameCreator) &EloFlow.GameCollection>(from: EloFlow.GameStoragePath)
            ?? panic("Could not borrow GameCollection reference")

        self.gameRef = self.collectionRef.borrowGame(id: gameId)
            ?? panic("Game with ID ".concat(gameId.toString()).concat(" does not exist"))

        self.previousState = self.gameRef.state
    }

    execute {
        self.gameRef.startGame()

        log("Successfully started game ".concat(gameId.toString()))
    }

    post {
        self.previousState == EloFlow.GameState.WAITING: "Game must have been in WAITING state"
        self.gameRef.state == EloFlow.GameState.ACTIVE: "Game must be in ACTIVE state"
        self.gameRef.players.length >= 2: "Game must have at least 2 players"
    }
}
`.trim();

export const END_GAME = `import EloFlow from ${ELO_FLOW_ADDRESS}

transaction(gameId: UInt64) {
    let collectionRef: auth(EloFlow.GameCreator) &EloFlow.GameCollection
    let gameRef: auth(EloFlow.GameCreator) &EloFlow.Game
    let previousState: EloFlow.GameState
    let previousPot: UFix64

    prepare(creator: auth(BorrowValue) &Account) {
        log("Ending Game ID ".concat(gameId.toString()))

        self.collectionRef = creator.storage
            .borrow<auth(EloFlow.GameCreator) &EloFlow.GameCollection>(from: EloFlow.GameStoragePath)
            ?? panic("Could not borrow GameCollection reference")

        self.gameRef = self.collectionRef.borrowGame(id: gameId)
            ?? panic("Game with ID ".concat(gameId.toString()).concat(" does not exist"))

        self.previousState = self.gameRef.state
        self.previousPot = self.gameRef.pot
    }

    execute {
        self.gameRef.endGame()

        log("Successfully ended game ".concat(gameId.toString()))
    }

    post {
        self.previousState == EloFlow.GameState.ACTIVE: "Game must have been in ACTIVE state"
        self.gameRef.state == EloFlow.GameState.ENDED: "Game must be in ENDED state"
        self.gameRef.pot == 0.0: "Game pot must be empty after ending"
        self.previousPot > 0.0: "Game must have had funds to distribute"
    }
}
`.trim();

export const QUERY_STATE = `import EloFlow from ${ELO_FLOW_ADDRESS}

access(all) fun main(gameId: UInt64, creator: Address): EloFlow.GameState? {
  let cap = getAccount(creator).capabilities.get<&EloFlow.GameCollection>(EloFlow.GamePublicPath)

  let ref = cap.borrow() ?? panic("Failed to borrow games collection")
  let game = ref.gamesCreated[gameId]
  return game?.state
}
`.trim();

export const CHECK_GAME_COLLECTION = `import EloFlow from ${ELO_FLOW_ADDRESS}

access(all) fun main(user: Address): [UInt64] {
    let account = getAccount(user)

    let capability = account.capabilities.get<&EloFlow.GameCollection>(EloFlow.GamePublicPath)
    let gameCollectionRef = capability.borrow() ?? panic("Could not borrow reference to Game Collection")
    return gameCollectionRef.getAllGameIds()
}
`.trim();

export const READ_LATEST_COUNT = `import EloFlow from ${ELO_FLOW_ADDRESS}

access(all) fun main(): UInt64 {
    return EloFlow.gameIdCount
}
`.trim();
