import EloFlow from 0x06

transaction() {
    prepare(acc: auth(LoadValue, SaveValue) &Account) {
      acc.storage.save(<-EloFlow.createEmptyGameCollection(), to: EloFlow.GameStoragePath)

      log("Created empty collection")
    }
}
