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

  return logs[0];
}

export { type ConsolePayload } from "@~/types.js";
