import { readFile } from "node:fs/promises";
import { serve, type ServerType } from "@hono/node-server";
import { publicConfig } from "@~/__generated__/publicConfig.js";
import { ROOT } from "@~/constants.js";
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
  app.get("/pre2/config", (c) => {
    const u = new URL(c.req.url);
    const base = `${u.protocol}//${u.host}`;
    const modifiedConfig = structuredClone(publicConfig);
    modifiedConfig.packs = modifiedConfig.packs.map((pack) => {
      pack.url.source = `${base}/${pack.url.source.replace(/^\.\//, "")}`;
      return pack;
    });

    return c.json(modifiedConfig);
  });
};

export const anyWasm = (app: Hono) => {
  app.get("/wasm/:id", async (c) => {
    // console.log(`serving wasm: ${c.req.param("id")}`);
    const file = await readFile(`${ROOT}/wasm/${c.req.param("id")}`);

    return new Response(file, {
      status: 200,
      headers: {
        "Content-Type": "application/wasm",
      },
    });
  });
};

export const defaultEvents = (app: Hono) => {
  app.post("/v1/events", (c) => {
    return c.json({ received: 1 });
  });
};
