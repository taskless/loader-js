import { readFile } from "node:fs/promises";
import { type Schema } from "@~/__generated__/schema.js";
import { ROOT } from "@~/constants.js";
import { taskless } from "@~/core.js";
import {
  type Manifest,
  type ConsolePayload,
  type NetworkPayload,
} from "@~/types.js";
import { http } from "msw";
import { setupServer } from "msw/node";
import { describe, test, vi } from "vitest";

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

        const cfg: Schema = {
          schema: "pre2",
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

    // load local test files
    const manifest = await readFile(`${ROOT}/test/wasm/manifest.json`);
    const wasm = await readFile(`${ROOT}/test/wasm/pack.wasm`);

    t.add(
      {
        ...(JSON.parse(manifest.toString()) as Manifest),
      },
      wasm
    );

    // validate load
    const stats = await t.load();
    expect(stats.packs, "Able to load packs").toBe(1);

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

    const log = logs[0];
    // console.log(JSON.stringify(logs, null, 2));

    expect(
      log.dimensions.some(
        (d) => d.name === "testpack/testPre" && d.value === "preTest"
      ),
      "Logs pre test capture"
    ).toBe(true);

    expect(
      log.dimensions.some(
        (d) => d.name === "testpack/testPost" && d.value === "postTest"
      ),
      "Logs post test capture"
    ).toBe(true);

    expect(
      await reply.text(),
      "Successfully calls external service (msw)"
    ).toBe("Hello world!");

    msw.close();
  });
});
