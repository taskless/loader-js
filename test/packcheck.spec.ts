import { packCheck } from "@~/dev/packcheck.js";
import { describe, test } from "vitest";
import { getYamlPack } from "./helpers/yamlGen.js";

describe("Packcheck", () => {
  test("Packcheck assertion library is working", async ({ expect }) => {
    const results = await packCheck(getYamlPack(), {
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
