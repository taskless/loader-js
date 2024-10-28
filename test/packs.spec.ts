import { taskless } from "@~/core.js";
import {
  type ConsolePayload,
  type Config,
  type NetworkPayload,
} from "@~/types.js";
import { http } from "msw";
import { setupServer } from "msw/node";
import { describe, test, vi } from "vitest";
import sampleYaml from "./fixtures/sample.yaml?raw";

const mergeLogsByRequestId = (logs: ConsolePayload[]) => {
  // merge any logs that share a request id into a single output
  const grouped = new Map<string, ConsolePayload>();

  for (const log of logs) {
    if (grouped.has(log.requestId)) {
      const existingLog = grouped.get(log.requestId)!;
      existingLog.sequenceIds.push(...log.sequenceIds);
      existingLog.dimensions.push(...log.dimensions);
      grouped.set(log.requestId, existingLog);
    } else {
      grouped.set(log.requestId, { ...log });
    }
  }

  return Array.from(grouped.values());
};

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

    const allLogs = mergeLogsByRequestId(logs);
    const log = allLogs[0];

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
