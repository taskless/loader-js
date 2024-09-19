import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execa, execaSync } from "execa";
import { vi, expect, test, afterEach, describe, beforeAll } from "vitest";
import { taskless } from "../src/core.js";

describe("Taskless environment and importing (requires build)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  test("This project is able to accept tests", (t) => {
    expect(true).toBe(true);
  });

  test("Can import the programatic version of Taskless", async () => {
    const t = taskless(undefined, {
      network: false,
    });
    expect(t).toBeDefined();
  });

  test("Can import via autoloader", async () => {
    const { stdout, stderr } = await execa({
      preferLocal: true,
      env: {
        TASKLESS_LOG_LEVEL: "debug",
      },
      cwd: resolve(dirname(fileURLToPath(import.meta.url)), "../"),
    })`node --import=./dist/index.js test/fixtures/end.js`;

    console.log(stdout, stderr);

    expect(stdout).toMatch(/initialized taskless/i);
  });

  test("No network and no logging is an error", async () => {
    const { stdout, stderr } = await execa({
      preferLocal: true,
      env: {
        TASKLESS_LOG_LEVEL: "debug",
        TASKLESS_OPTIONS: "network=false;logging=false",
      },
      cwd: resolve(dirname(fileURLToPath(import.meta.url)), "../"),
      reject: false,
    })`tsx --import=./dist/index.js test/fixtures/end.js`;

    expect(stdout, "Initializes synchronously").toMatch(
      /initialized taskless/i
    );
    expect(
      stderr,
      "Prevents load with no API key and no logging enabled"
    ).toMatch(/network and logging are both disabled/i);
  });
});
