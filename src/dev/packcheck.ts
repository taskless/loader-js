/* eslint-disable n/no-process-env */
import process from "node:process";
import { taskless } from "@~/core.js";
import { type ConsolePayload } from "@~/types.js";
import { http } from "msw";
import { setupServer } from "msw/node";

type Fixture = {
  request: Request;
  response: Response;
  /** Attach or inspect the packCheck lifecycle */
  log?: (message: string) => void;
};

/**
 * Packcheck - simple tool for checking your Taskless packs, easily integrated
 * with your existing unit testing framework
 */
export async function packCheck(
  configOrPack: string,
  fixture: Fixture
): Promise<ConsolePayload> {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Taskless `dev` actions cannot be used in production node environments"
    );
  }

  const log =
    fixture.log ??
    (() => {
      /* noop */
    });

  const msw = setupServer(
    http.all("*", async (info) => {
      return fixture.response.clone();
    })
  );
  msw.listen();

  const logs: ConsolePayload[] = [];

  const t = taskless(undefined, {
    network: false,
    logging: true,
    flushInterval: 0,
    logLevel: "debug",
    __experimental: {
      msw,
    },
    log: {
      debug: log,
      info: log,
      warn: log,
      error: log,
      data(message) {
        logs.push(JSON.parse(message) as ConsolePayload);
      },
    },
  });

  t.add(configOrPack);
  await t.load();

  await fetch(fixture.request);

  await t.flush();

  msw.close();

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

  log(`[packCheck] Merged ${logs.length} logs into ${grouped.size} logs`);

  const result = Array.from(grouped.values())[0] ?? {};
  return result;
}

export { type ConsolePayload } from "@~/types.js";
