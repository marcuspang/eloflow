import EloFlow from 0x06

transaction(gameId: UInt64) {
    prepare(player: auth(BorrowValue) &Account) {
        let path = StoragePath(identifier: EloFlow.generatePlayerHandStoragePath(id: gameId))!

        let playerHand = player.storage.borrow<&EloFlow.PlayerHand>(from: path) ?? panic("No hand found")

        log("Card 0: Suit ".concat(playerHand.cards[0].suit.rawValue.toString()).concat(" Rank: ").concat(playerHand.cards[0].rank.toString()))
        log("Card 1: Suit ".concat(playerHand.cards[1].suit.rawValue.toString()).concat(" Rank: ").concat(playerHand.cards[1].rank.toString()))

    }
}
