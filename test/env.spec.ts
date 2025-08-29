import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { execa } from "execa";
import { vi, test, afterEach, describe, beforeAll } from "vitest";
import { taskless } from "../src/core.js";

describe("Taskless environment and importing (requires build)", () => {
  beforeAll(async () => {
    // eslint-disable-next-line n/no-process-env
    if (process.env.NO_BUILD === "1") {
      console.log("Skipping build step");
      return;
    }

    const { stdout, stderr } = await execa({
      preferLocal: true,
      cwd: resolve(dirname(fileURLToPath(import.meta.url)), "../"),
    })`pnpm build`;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  test("This project is able to accept tests", ({ expect }) => {
    expect(true).toBe(true);
  });

  test("Can import the programatic version of Taskless", async ({ expect }) => {
    const t = taskless();
    expect(t).toBeDefined();
  });

  test("Can import via autoloader", async ({ expect }) => {
    const { stdout, stderr } = await execa({
      preferLocal: true,
      env: {
        TASKLESS_LOG_LEVEL: "trace",
      },
      cwd: resolve(dirname(fileURLToPath(import.meta.url)), "../"),
    })`node --import=./dist/index.js test/fixtures/end.js`;

    // console.log(stdout, stderr);

    expect(stdout).toMatch(/initialized taskless/i);
  });

  test("No logging is an error", async ({ expect }) => {
    const { stdout, stderr } = await execa({
      preferLocal: true,
      env: {
        TASKLESS_LOG_LEVEL: "trace",
        TASKLESS_OUTPUT: "network",
      },
      cwd: resolve(dirname(fileURLToPath(import.meta.url)), "../"),
      reject: false,
    })`tsx --import=./dist/index.js test/fixtures/end.js`;

    expect(stdout, "Initializes synchronously").toMatch(
      /initialized taskless/i
    );
    expect(stderr, "Prevents load with no logging enabled").toMatch(
      /logging is disabled/i
    );
  });
});
