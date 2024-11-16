import EloFlow from 0x06

transaction(minimumBet: UFix64) {
    let collectionRef: auth(EloFlow.GameCreator) &EloFlow.GameCollection
    let creator: Address
    let previousGameId: UInt64
    let game: auth(EloFlow.GameCreator) &EloFlow.Game

    prepare(signer: auth(BorrowValue) &Account) {
        self.collectionRef = signer.storage
            .borrow<auth(EloFlow.GameCreator) &EloFlow.GameCollection>(from: EloFlow.GameStoragePath)
            ?? panic("Could not borrow GameCollection reference")
        self.creator = signer.address
        self.previousGameId = EloFlow.gameIdCount
        let gameId = self.collectionRef.createGame(minimumBet: minimumBet, creator: self.creator)
        log("Created new game with ID: ".concat(EloFlow.gameIdCount.toString()))
        self.game = self.collectionRef.borrowGame(id: gameId) ?? panic("No game found")
        self.game.joinGame(player: self.creator, amount: minimumBet)
    }

    post {
        EloFlow.gameIdCount == self.previousGameId + 1: "Game ID counter should have increased by 1"

        self.game.id == self.previousGameId: "Game ID is not correct"
        self.game.state == EloFlow.GameState.WAITING: "Game state is not correct"
        self.game.minimumBet == minimumBet: "Minimum bet is not correct"
        self.game.pot == minimumBet: "Pot is not correct"
    }
}
