import { Hono } from "hono";
import { handle } from "hono/aws-lambda";
import * as fcl from "@onflow/fcl";
import { fromEnv } from "@aws-sdk/credential-providers";
import { KmsAuthorizer } from "fcl-kms-authorizer";

fcl.config({
  "flow.network": "testnet",
  "accessNode.api": "https://rest-testnet.onflow.org",
  "discovery.wallet": "https://fcl-discovery.onflow.org/testnet/authn",
  "app.detail.title": "Test Harness",
  "app.detail.icon": "https://i.imgur.com/r23Zhvu.png",
  "app.detail.description": "A test harness for FCL",
  "app.detail.url": "https://eloflow.vercel.app",
  "walletconnect.projectId": "8fd34a822be9e49c93bf7356cab97ca8",
});

const region = "us-east-1";
const keyIds = ["3e31a646-8ed3-4389-a2ec-4566e79b7f26"];

const app = new Hono();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.post("/sign", async (c) => {
  const { message } = await c.req.json();
  const authorizer = new KmsAuthorizer(
    {
      credentials: fromEnv(),
      region,
    },
    keyIds
  );

  const signer = authorizer.getSigner();
  const signature = await signer.signUserMessage(message);
  return c.json({ signature });
});

export const handler = handle(app);
