import { readFile } from "node:fs/promises";
import { taskless } from "@~/core.js";
import { type Config, type NetworkPayload, type Pack } from "@~/types.js";
import yaml from "js-yaml";
import { http } from "msw";
import { setupServer } from "msw/node";
import { type JsonObject } from "type-fest";
import { describe, expect, test, vi } from "vitest";
import { findPayload } from "./helpers/findPayload.js";
import { sleep } from "./helpers/sleep.js";

describe("Loading packs", () => {
  test("Can programatically add packs that intercept requests", async () => {
    // our msw intercepts requests for inspection
    const msw = setupServer();
    msw.listen();

    // tracks if MSW caught the config call
    const configInterceptor = vi.fn();

    // return an empty configuration from Taskless API
    msw.use(
      http.get("https://tskl.es/config", async (info) => {
        configInterceptor();

        const cfg: Config = {
          version: "1",
          organizationId: "test",
          packs: [],
        };

        return new Response(JSON.stringify(cfg), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        });
      })
    );

    msw.use(
      http.get("https://example.com/sample", async (info) => {
        return new Response("Hello world!");
      })
    );

    // captured logs from this run
    const logs: JsonObject[] = [];
    const logData = vi.fn((line: string) => {
      for (const ln of line.split(/\n/)) {
        logs.push(JSON.parse(ln) as JsonObject);
      }
    });

    const t = await taskless("test", {
      // logLevel: "debug",
      forceLog: true,
      log: {
        data: logData,
      },
      __experimental: {
        msw,
      },
    });

    const file = await readFile("test/fixtures/sample.yaml", "utf8");
    const json = yaml.load(file) as Pack;
    t.add(json);

    // validate load
    const stats = await t.load();
    expect(stats.localPacks, "Able to load packs").toBe(1);

    // after loading, we need to add a rule to MSW for catching network requests
    // this ensures our telemetry calls aren't bypassed by the load() call
    // we store payloads for analysis later
    const payloads: NetworkPayload[] = [];
    msw.use(
      http.post("https://tskl.es/event", async (info) => {
        const body = (await info.request.clone().json()) as NetworkPayload;
        payloads.push(body);
        return new Response(JSON.stringify({}), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        });
      })
    );

    // attempting a request
    const reply = await fetch("https://example.com/sample");

    // flush all pending data
    t.flush();
    await sleep(30);

    // validate expected behaviors
    expect(logs, "Recorded duration attribute").toContainEqual(
      expect.objectContaining({
        dimension: "durationMs",
        url: "https://example.com/sample",
      })
    );

    expect(logs, "Recorded status attribute").toContainEqual(
      expect.objectContaining({
        dimension: "status",
        url: "https://example.com/sample",
      })
    );

    expect(
      findPayload(payloads, {
        url: "https://example.com/sample",
        dimension: "durationMs",
      }),
      "Sent a payload with the durationMs dimension"
    ).toHaveLength(1);

    expect(
      findPayload(payloads, {
        url: "https://example.com/sample",
        dimension: "status",
        value: 200,
      }),
      "Sent a payload with the status dimension and the status code"
    ).toHaveLength(1);

    expect(
      await reply.text(),
      "Successfully calls external service (msw)"
    ).toBe("Hello world!");
  });
});
