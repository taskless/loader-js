import { readFileSync } from "node:fs";
import { serve } from "@hono/node-server";
import { type Config } from "@~/types.js";
import getPort from "get-port";
import { Hono } from "hono";
import jsYaml from "js-yaml";

const defaultPack = jsYaml.load(
  readFileSync("test/fixtures/sample.yaml", "utf8")
);

const run = async () => {
  const app = new Hono();
  const port = await getPort();
  const server = serve({ fetch: app.fetch, port });
  console.log(`Server listening on http://localhost:${port}`);

  app.get("/v1/config", (c) => {
    console.log("config called");
    return c.json({
      schema: 1,
      organizationId: "test",
      packs: [defaultPack],
    } as Config);
  });

  app.post("/v1/events", (c) => {
    console.log("events called");
    return c.json({ received: 1 });
  });
};

run();
