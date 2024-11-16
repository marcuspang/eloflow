import { custom } from "viem";
import { createConfig } from "wagmi";
import { flowTestnet } from "wagmi/chains";
import { injected } from "wagmi/connectors";

export const config = createConfig({
  chains: [flowTestnet],
  connectors: [injected()],
  transports: {
    [flowTestnet.id]: custom({
      request: async ({ method, params }) => {
        console.log(method, params);
      },
    }),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
