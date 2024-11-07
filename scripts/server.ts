import { readFileSync } from "node:fs";
import { serve } from "@hono/node-server";
import { type Config } from "@~/types.js";
import getPort from "get-port";
import { Hono } from "hono";
import YAML from "yaml";

const cfg = YAML.parse(
  readFileSync("src/__generated__config.yaml", "utf8")
) as Config;

const run = async () => {
  const app = new Hono();
  const port = await getPort();
  const server = serve({ fetch: app.fetch, port });
  console.log(`Server listening on http://localhost:${port}`);

  app.get("/v1/config", (c) => {
    console.log("config called");
    return c.json(cfg);
  });

  app.post("/v1/events", (c) => {
    console.log("events called");
    return c.json({ received: 1 });
  });
};

run();
