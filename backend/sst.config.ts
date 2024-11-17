/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "aws-hono",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const hono = new sst.aws.Function("Hono", {
      url: true,
      handler: "index.handler",
    });
  },
});
