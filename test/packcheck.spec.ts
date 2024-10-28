import { packcheck } from "@~/dev/packcheck.js";
import { describe, test } from "vitest";
import sampleYaml from "./fixtures/sample.yaml?raw";

describe("Packcheck", () => {
  test("Packcheck assertion library is working", async ({ expect }) => {
    const results = await packcheck(sampleYaml, {
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
