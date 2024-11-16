import * as fcl from "@onflow/fcl";

const USE_DEVNET = false;

export function setupFlow() {
  if (USE_DEVNET) {
    fcl.config({
      "flow.network": "local",
      "accessNode.api": "http://localhost:8888", // Flow Emulator
      "discovery.wallet": "http://localhost:8701/fcl/authn", // Local Wallet Discovery
      "walletconnect.projectId": "8fd34a822be9e49c93bf7356cab97ca8",
    });
  } else {
    fcl.config({
      "flow.network": "testnet",
      "accessNode.api": "https://rest-testnet.onflow.org",
      "discovery.wallet": "https://fcl-discovery.onflow.org/testnet/authn",
      "app.detail.title": "Test Harness",
      "app.detail.icon": "https://i.imgur.com/r23Zhvu.png",
      "app.detail.description": "A test harness for FCL",
      "app.detail.url": "https://myapp.com",
      "walletconnect.projectId": "8fd34a822be9e49c93bf7356cab97ca8",
    });
  }
}
