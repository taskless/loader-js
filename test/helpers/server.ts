import { readFileSync } from "node:fs";
import { serve, type ServerType } from "@hono/node-server";
import { type Config } from "@~/types.js";
import getPort from "get-port";
import { Hono } from "hono";
import jsYaml from "js-yaml";
import { afterEach, type test } from "vitest";

const defaultPack = jsYaml.load(
  readFileSync("test/fixtures/sample.yaml", "utf8")
);

type HonoContext = {
  hono: {
    server: ServerType;
    app: Hono;
    port: number;
  };
};

export const withHono = <T extends typeof test>(t: T) => {
  const next = t.extend<HonoContext>({
    // eslint-disable-next-line no-empty-pattern
    async hono({}, use) {
      const app = new Hono();
      const port = await getPort();
      const server = serve({ fetch: app.fetch, port });
      await use({ server, app, port });
    },
  });

  // use an afterEach hook to ensure hono is cleaned up
  afterEach<HonoContext>(async ({ hono }) => {
    await new Promise<void>((resolve) => {
      if (hono) {
        hono.server.removeAllListeners();
        hono.server.unref();
        hono.server.close(() => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  });

  return next;
};

export const defaultConfig = (app: Hono) => {
  app.get("/v1/config", (c) => {
    return c.json({
      schema: 1,
      organizationId: "test",
      packs: [defaultPack],
    } as Config);
  });
};

export const defaultEvents = (app: Hono) => {
  app.post("/v1/events", (c) => {
    return c.json({ received: 1 });
  });
};
