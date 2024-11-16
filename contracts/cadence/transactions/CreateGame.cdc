import EloFlow from 0x06

transaction(minimumBet: UFix64) {
    let collectionRef: &EloFlow.GameCollection
    let creator: Address
    let previousGameId: UInt64
    var game: &EloFlow.Game?

    prepare(signer: auth(BorrowValue) &Account) {
        // Try to borrow the GameCollection from storage
        self.collectionRef = signer.storage
            .borrow<&EloFlow.GameCollection>(from: EloFlow.GameStoragePath)
            ?? panic("Could not borrow GameCollection reference")
        self.creator = signer.address
        self.previousGameId = EloFlow.gameIdCount
        self.game = nil
    }

    execute {
        let gameId = self.collectionRef.createGame(minimumBet: minimumBet, creator: self.creator)

        if self.previousGameId != gameId {
            panic("Wrong game ID created")
        }

        log("Created new game with ID: ".concat(EloFlow.gameIdCount.toString()))
        self.game = self.collectionRef.gamesCreated[self.previousGameId]
    }

    post {
        EloFlow.gameIdCount == self.previousGameId + 1: "Game ID counter should have increased by 1"

        self.game?.id == self.previousGameId: "Game ID is not correct"
        self.game?.state == EloFlow.GameState.WAITING: "Game state is not correct"
        self.game?.minimumBet == minimumBet: "Minimum bet is not correct"
        self.game?.pot == 0.0: "Pot is not correct"
    }
}
