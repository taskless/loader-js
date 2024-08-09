import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execa } from "execa";
import { vi, expect, test, afterEach, describe } from "vitest";
import { taskless } from "../src/core.js";

describe("Taskless environment and importing", () => {
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
        TASKLESS_LOCAL_MODE: "1",
        TASKLESS_LOG_LEVEL: "debug",
      },
      cwd: resolve(dirname(fileURLToPath(import.meta.url)), "../"),
    })`tsx --import=./src/index.ts test/fixtures/end.ts`;

    expect(stdout).toMatch(/taskless autoloader ran successfully/i);
  });
});
