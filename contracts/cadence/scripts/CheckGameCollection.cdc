import EloFlow from 0x06

access(all) fun main(user: Address): [UInt64] {
    let account = getAccount(user)

    let capability = account.capabilities.get<&EloFlow.GameCollection>(EloFlow.GamePublicPath)
    let gameCollectionRef = capability.borrow() ?? panic("Could not borrow reference to Game Collection")
    return gameCollectionRef.getAllGameIds()
}