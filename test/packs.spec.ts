import { readFile } from "node:fs/promises";
import { taskless } from "@~/core.js";
import { type Schema } from "@~/types/schema.js";
import { type ConsolePayload, type Pack } from "@~/types.js";
import { http } from "msw";
import { setupServer } from "msw/node";
import { packageDirectorySync } from "package-directory";
import { toUint8Array } from "uint8array-extras";
import { describe, test, vi } from "vitest";

// hold a reference to this package's root for loading local WASM files
export const ROOT = packageDirectorySync();

describe("Loading packs", () => {
  test("Can programatically add packs that intercept requests", async ({
    expect,
  }) => {
    // our msw intercepts requests for inspection
    const msw = setupServer();
    msw.listen();

    // tracks if MSW caught the config call
    const configInterceptor = vi.fn();

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

    const t = taskless({
      // logLevel: "debug",
      output: ["console"],
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
        ...(JSON.parse(manifest.toString()) as Pack),
      },
      toUint8Array(wasm.buffer as ArrayBuffer)
    );

    // validate load
    const stats = await t.load();
    expect(stats.packs, "Able to load packs").toBe(1);

    // attempting a request
    const reply = await fetch("https://example.com/sample");

    // flush all pending data
    await t.shutdown();

    const log = logs[0];
    // console.log(JSON.stringify(logs, null, 2));

    expect(
      log.dimensions.some(
        (d) => d.name === "testpack/testPre" && d.value === "test_pre_value"
      ),
      "Logs pre test capture"
    ).toBe(true);

    expect(
      log.dimensions.some(
        (d) => d.name === "testpack/testPost" && d.value === "test_post_value"
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
