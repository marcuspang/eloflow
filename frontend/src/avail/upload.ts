import { Keyring } from "@polkadot/api";
import { SDK } from "avail-js-sdk";
import { WaitFor } from "avail-js-sdk/sdk/transactions";

export const upload = async (data: string) => {
  const providerEndpoint = "wss://turing-rpc.avail.so/ws";
  const sdk = await SDK.New(providerEndpoint);

  const mnemonic = import.meta.env.VITE_AVAIL_MNEMONIC;
  const account = new Keyring({ type: "sr25519" }).addFromMnemonic(mnemonic);

  const result = await sdk.tx.dataAvailability.submitData(
    data,
    WaitFor.BlockInclusion,
    account
  );
  if (result.isErr) {
    console.log(result.reason);
    return null;
  }

  console.log("Data=" + result.txData.data);
  console.log(
    "Who=" + result.event.who + ", DataHash=" + result.event.dataHash
  );
  console.log("TxHash=" + result.txHash + ", BlockHash=" + result.blockHash);

  return result.txHash;
};

upload("Hello, world!");
