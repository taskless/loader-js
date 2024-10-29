import { packCheck } from "@~/dev/packcheck.js";
import { describe, test } from "vitest";
import sampleYaml from "./fixtures/sample.yaml?raw";

describe("Packcheck", () => {
  test("Packcheck assertion library is working", async ({ expect }) => {
    const results = await packCheck(sampleYaml, {
      request: new Request("https://example.com"),
      response: new Response("Hello world!"),
    });

    expect(
      results.dimensions.some(
        (d) => d.name === "domain" && d.value === "example.com"
      )
    ).toBe(true);
  });
});
