import EloFlow from 0x06

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
