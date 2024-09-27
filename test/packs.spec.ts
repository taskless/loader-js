import { readFile } from "node:fs/promises";
import { taskless } from "@~/core.js";
import {
  type ConsolePayload,
  type Config,
  type NetworkPayload,
} from "@~/types.js";
import { http } from "msw";
import { setupServer } from "msw/node";
import { describe, test, vi } from "vitest";
import { extractDimension, findLog, findPayload } from "./helpers/find.js";
import { sleep } from "./helpers/sleep.js";

describe("Loading packs", () => {
  test("Can programatically add packs that intercept requests", async ({
    expect,
  }) => {
    // our msw intercepts requests for inspection
    const msw = setupServer();
    msw.listen();

    // tracks if MSW caught the config call
    const configInterceptor = vi.fn();

    // return an empty configuration from Taskless API
    msw.use(
      http.get("https://data.tskl.es/:version/config", async (info) => {
        configInterceptor();

        const cfg: Config = {
          schema: 1,
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
    const logs: ConsolePayload[] = [];
    const logData = vi.fn((line: string) => {
      for (const ln of line.split(/\n/)) {
        logs.push(JSON.parse(ln) as ConsolePayload);
      }
    });

    const t = taskless("test", {
      // logLevel: "debug",
      logging: true,
      log: {
        data: logData,
      },
      __experimental: {
        msw,
      },
    });

    const file = await readFile("test/fixtures/sample.yaml", "utf8");
    t.add(file);

    // validate load
    const stats = await t.load();
    expect(stats.localPacks, "Able to load packs").toBe(1);

    // after loading, we need to add a rule to MSW for catching network requests
    // this ensures our telemetry calls aren't bypassed by the load() call
    // we store payloads for analysis later
    const payloads: Array<NonNullable<NetworkPayload>> = [];
    msw.use(
      http.post("https://data.tskl.es/:version/events", async (info) => {
        const body = (await info.request.clone().json()) as NetworkPayload;
        if (!body) {
          throw new Error("No body found in request");
        }

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
    await t.flush();

    // validate expected behaviors
    expect(
      extractDimension(
        findLog(logs, [
          {
            dimension: "durationMs",
          },
        ])?.[0],
        "url"
      ),
      "Recorded duration attribute for URL"
    ).toEqual("https://example.com/sample");

    expect(
      extractDimension(
        findLog(logs, [
          {
            dimension: "status",
            value: 200,
          },
        ])?.[0],
        "url"
      ),
      "Recorded successful 200 for URL"
    ).toEqual("https://example.com/sample");

    expect(
      findPayload(payloads, [
        {
          dimension: "durationMs",
        },
        {
          dimension: "url",
          value: "https://example.com/sample",
        },
      ]),
      "Sent a payload with the durationMs dimension"
    ).toHaveLength(1);

    expect(
      findPayload(payloads, [
        {
          dimension: "status",
          value: 200,
        },
        {
          dimension: "url",
          value: "https://example.com/sample",
        },
      ]),
      "Sent a payload with the status dimension and the status code"
    ).toHaveLength(1);

    expect(
      await reply.text(),
      "Successfully calls external service (msw)"
    ).toBe("Hello world!");
  });
});
