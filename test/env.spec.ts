import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execa } from "execa";
import { vi, test as vitest, afterEach, describe, beforeAll } from "vitest";
import { packcheck } from "../dist/dev/packcheck.js";
import { taskless } from "../src/core.js";
import sampleYaml from "./fixtures/sample.yaml?raw";
import { defaultConfig, withHono } from "./helpers/server.js";

const test = withHono(vitest);

describe("Taskless environment and importing (requires build)", () => {
  beforeAll(async () => {
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
    const t = taskless(undefined, {
      network: false,
    });
    expect(t).toBeDefined();
  });

  test("Can import via autoloader", async ({ expect }) => {
    const { stdout, stderr } = await execa({
      preferLocal: true,
      env: {
        TASKLESS_LOG_LEVEL: "debug",
      },
      cwd: resolve(dirname(fileURLToPath(import.meta.url)), "../"),
    })`node --import=./dist/index.js test/fixtures/end.js`;

    // console.log(stdout, stderr);

    expect(stdout).toMatch(/initialized taskless/i);
  });

  test("Autoloader calls taskless with an API key", async ({
    hono,
    expect,
  }) => {
    const TASKLESS_OPTIONS = [
      // local taskless options. Point to the hono server
      `endpoint=http://localhost:${hono.port}`,
    ].join(";");

    defaultConfig(hono.app);

    const eventListener = vi.fn();

    hono.app.post("/v1/events", async (c) => {
      const data = await c.req.json<Record<string, unknown>>();
      eventListener({
        body: data,
      });

      return c.json({});
    });

    const { stdout, stderr } = await execa({
      preferLocal: true,
      env: {
        TASKLESS_LOG_LEVEL: "debug",
        TASKLESS_API_KEY: "test",
        TASKLESS_OPTIONS,
      },
      cwd: resolve(dirname(fileURLToPath(import.meta.url)), "../"),
    })`node --import=./dist/index.js test/fixtures/one.js`;

    expect(stdout).toMatch(/initialized taskless/i);
    expect(stdout).toMatch(/taskless autoloader ran successfully/i);
    expect(stdout).toMatch(/performing cleanup/i);
    // console.log(stdout);
    expect(eventListener, "Mock event server was called").toBeCalledTimes(1);
  });

  test("No network and no logging is an error", async ({ expect }) => {
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
