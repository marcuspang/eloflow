import EloFlow from 0x06

transaction {
    prepare(creator: auth(SaveValue, BorrowValue) &Account, player: auth(SaveValue) &Account) {
        creator.storage.save(<-EloFlow.createEmptyGameCollection(), to: EloFlow.GameStoragePath)

        let gameCollection = creator
            .storage
            .borrow<auth(EloFlow.GameCreator) &EloFlow.GameCollection>(from: EloFlow.GameStoragePath)
            ?? panic("Could not borrow game collection")

        let gameId = gameCollection.createGame(minimumBet: 1.0, creator: creator.address)
        let game = gameCollection
            .borrowGame(id: gameId)
            ?? panic("Game not found")

        game.joinGame(player: creator, amount: 1.0)
        game.joinGame(player: player, amount: 1.0)
    }
}
