import { readFile } from "node:fs/promises";
import { type Manifest } from "@~/__generated__/manifest.js";
import { ROOT } from "@~/constants.js";
import { packCheck } from "@~/dev/packcheck.js";
import { describe, test } from "vitest";

describe("Packcheck", () => {
  test("Packcheck assertion library is working", async ({ expect }) => {
    const file = await readFile(
      `${ROOT}/wasm/0191e2e7-8da6-7558-915d-4a2ecc82472b.wasm`
    );

    const manifest: Manifest = {
      name: "test",
      description: "test pack",
      version: "1.0.0",
      schema: "pre1",
      permissions: {
        domains: [".+"],
      },
      capture: {
        domain: {
          type: "string",
          description: "Domain of the request",
        },
      },
    };

    const results = await packCheck(manifest, file, {
      request: new Request("https://example.com"),
      response: new Response("Hello world!"),
      // log: console.log,
    });

    expect(
      results.dimensions.some(
        (d) => d.name === "domain" && d.value === "example.com"
      )
    ).toBe(true);
  });
});
