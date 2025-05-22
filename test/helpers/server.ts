import { serve, type ServerType } from "@hono/node-server";
import { bypass } from "@~/constants.js";
import getPort from "get-port";
import { Hono } from "hono";
import { afterEach, type test } from "vitest";

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

      await new Promise<void>((resolve) => {
        server.on("listening", () => {
          resolve();
        });
      });

      await use({ server, app, port });
    },
  });

  // use an afterEach hook to ensure hono is cleaned up
  afterEach<HonoContext>(async ({ hono }) => {
    if (hono) {
      hono.server.removeAllListeners();
      hono.server.unref();
      hono.server.close();
    }
  });

  return next;
};

export const defaultConfig = (app: Hono) => {
  app.get("/pre2/config", async (c) => {
    const rawConfig = await fetch("https://data.tskl.es/public/config", {
      headers: {
        ...bypass,
      },
    });
    const config = (await rawConfig.json()) as unknown;

    return c.json(config as any);
  });
};

export const defaultEvents = (app: Hono) => {
  app.post("/v1/events", (c) => {
    return c.json({ received: 1 });
  });
};
