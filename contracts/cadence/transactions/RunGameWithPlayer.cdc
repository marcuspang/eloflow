import EloFlow from 0x06

transaction {
    prepare(creator: auth(SaveValue, LoadValue, BorrowValue) &Account, player: auth(SaveValue, LoadValue) &Account) {
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

        game.startGame()

        let player1 = game.players.keys[0] == creator.address ? creator : player
        let player2 = game.players.keys[1] == creator.address ? creator : player

        game.raise(player: player1.address, amount: 2.0)
        game.call(player: player2.address)
        game.raise(player: player1.address, amount: 3.0)
        game.call(player: player2.address)

        game.submitHand(player: creator)
        game.submitHand(player: player)
    }
}
