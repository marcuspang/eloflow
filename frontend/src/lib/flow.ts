import { BACKEND_URL, PAYER_ADDRESS } from "@/constants";
import * as fcl from "@onflow/fcl";

const USE_DEVNET = false;
const PAYER_KEYID = 0;

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
      "app.detail.title": "ELO Flow",
      "app.detail.icon": "https://eloflow.vercel.app/logo.png",
      "app.detail.description": "Fully on-chain poker game on Flow",
      "app.detail.url": "https://eloflow.vercel.app",
      "walletconnect.projectId": "8fd34a822be9e49c93bf7356cab97ca8",
    });
  }
}

export const payerAuthz = async (account: any = {}) => {
  return {
    ...account,
    tempId: `${PAYER_ADDRESS}-${PAYER_KEYID}`,
    keyId: PAYER_KEYID,
    signingFunction: async (signable: any) => {
      const res = await fetch(`${BACKEND_URL}/sign`, {
        method: "POST",
        body: JSON.stringify({ message: signable }),
      });
      const { signature } = await res.json();
      return {
        addr: PAYER_ADDRESS,
        keyId: PAYER_KEYID,
        signature,
      };
    },
  };
};
