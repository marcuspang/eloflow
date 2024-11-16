import EloFlow from 0x06

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
