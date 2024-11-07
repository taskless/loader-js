import { taskless } from "@~/core.js";
import {
  type ConsolePayload,
  type Config,
  type NetworkPayload,
} from "@~/types.js";
import { http } from "msw";
import { setupServer } from "msw/node";
import { describe, test, vi } from "vitest";
import YAML from "yaml";
import sampleYamlConfig from "../src/__generated__/config.yaml?raw";

const cfg = YAML.parse(sampleYamlConfig) as Config;
const sampleYaml = YAML.stringify({
  ...cfg.packs[0],
  module: cfg.modules?.[Object.keys(cfg.modules ?? {})[0]],
});

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

    t.add(sampleYaml);

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

    expect(
      log.dimensions.some((d) => d.name === "status" && d.value === "200"),
      "Logs status"
    ).toBe(true);

    expect(
      log.dimensions.some(
        (d) => d.name === "url" && d.value === "https://example.com/sample"
      ),
      "Logs URL"
    ).toBe(true);

    expect(
      await reply.text(),
      "Successfully calls external service (msw)"
    ).toBe("Hello world!");
  });
});
