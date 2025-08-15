import { readFile } from "node:fs/promises";
import { taskless } from "@~/core.js";
import { type ConsolePayload, type Pack } from "@~/types.js";
import { http } from "msw";
import { setupServer } from "msw/node";
import { packageDirectorySync } from "package-directory";
import { toUint8Array } from "uint8array-extras";
import { describe, test, vi } from "vitest";

// hold a reference to this package's root for loading local WASM files
export const ROOT = packageDirectorySync();

describe("Chunked encoding using SSE", () => {
  test("Captures chunks", async ({ expect }) => {
    // our msw intercepts requests for inspection
    const msw = setupServer();

    msw.use(
      http.post("https://example.com/sse", async (info) => {
        // console.log("SSE request received");
        const stream = new ReadableStream({
          start(controller) {
            // console.log("Starting stream");
            controller.enqueue(
              new TextEncoder().encode(
                `event:payload\ndata:${JSON.stringify({ totallyData: "yes" })}\n\n`
              )
            );
            // console.log("Enqueued first chunk");
            controller.close();
          },
        });

        // console.log("Returning stream response");
        return new Response(stream, {
          status: 202,
          headers: {
            "Content-Type": "text/event-stream",
          },
        });
      })
    );

    // start MSW. Taskless will use() on its own when it sees an MSW instance
    msw.listen();

    // captured logs from this run
    const logs: ConsolePayload[] = [];
    const logData = vi.fn((line: string) => {
      // console.log(`LOG LINE> ${line}`);
      for (const ln of line.split(/\n/)) {
        logs.push(JSON.parse(ln) as ConsolePayload);
      }
    });

    const t = taskless(undefined, {
      // logLevel: "debug",
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

    // load taskless and init
    await t.load();

    // attempting a request
    const reply = await fetch("https://example.com/sse", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ method: "test", params: [] }),
    });

    // flush all pending network data
    await t.shutdown();

    // console.log(JSON.stringify(logs, null, 2));
    // console.log(`LOGS> ${logs.length} logs captured`);

    // inside of the logs should be an object with
    // a name of testpack/chunk1 and a value that contains
    // event:payload
    const chunked = logs.find((log) => {
      return log.dimensions.some((d) => d.name === "testpack/chunk1");
    });

    expect(chunked).toBeTruthy();

    msw.close();
  });
});
