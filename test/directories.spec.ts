import { taskless } from "@~/core.js";
import { type ConsolePayload } from "@~/types.js";
import { http } from "msw";
import { setupServer } from "msw/node";
import { packageDirectorySync } from "package-directory";
import { describe, test, vi } from "vitest";

// hold a reference to this package's root for loading local WASM files
export const ROOT = packageDirectorySync();

describe("Directory based loading", () => {
  test("Can programatically add packs that intercept requests", async ({
    expect,
  }) => {
    // our msw intercepts requests for inspection
    const msw = setupServer();
    msw.listen();

    // return an empty configuration from Taskless API
    msw.use(
      http.get("https://data.tskl.es/:version/config", async (info) => {
        throw new Error("URL should never be called");
      })
    );

    // captured logs from this run
    const logs: ConsolePayload[] = [];
    const logData = vi.fn((line: string) => {
      for (const ln of line.split(/\n/)) {
        logs.push(JSON.parse(ln) as ConsolePayload);
      }
    });

    const t = taskless(undefined, {
      directory: `${ROOT}/test/wasm`,
      output: ["console"],
      log: {
        data: logData,
      },
      __experimental: {
        msw,
      },
    });

    // validate load
    const stats = await t.load();
    expect(stats.packs, "Able to load packs").toBe(1);

    msw.close();
  });
});
