import EloFlow from 0x06

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
