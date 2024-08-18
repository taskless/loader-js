import { createLogger } from "@~/lib/logger.js";
import { runLifecycle } from "@~/lib/lua.js";
import { usePromise } from "@~/lua/promise.lua.js";
import { dedent } from "ts-dedent";
import { test as vitest, describe, vi } from "vitest";
import { type LuaEngine, LuaFactory } from "wasmoon";

/* memory testing info
import { setFlagsFromString } from "v8";
import { runInNewContext } from "vm";

setFlagsFromString("--expose_gc");
const gc = runInNewContext("gc") as (...args: unknown[]) => void; // nocommit
*/

const test = vitest.extend<{
  lua: LuaEngine;
}>({
  // eslint-disable-next-line no-empty-pattern
  async lua({}, use) {
    const factory = new LuaFactory();
    const lua = await factory.createEngine();
    await use(lua);
    lua.global.close();
  },
});

describe("Lua environment capabilities", (t) => {
  test("lua sandbox with async support", async ({ expect, lua }) => {
    const fixture = {
      globalSync: vi
        .fn()
        .mockImplementation((testValue) => `global sync (${testValue})`),
      globalAsync: vi
        .fn()
        .mockImplementation(async (testValue) => `global async (${testValue})`),
      namespaced: {
        nsSync: vi
          .fn()
          .mockImplementation((testValue) => `ns sync (${testValue})`),
        nsSyncAlt: vi
          .fn()
          .mockImplementation((testValue) => `ns sync (${testValue})`),
        nsAsync: vi
          .fn()
          .mockImplementation(async (testValue) => `ns async (${testValue})`),
      },
    };

    const logShim = { info: vi.fn(), debug: vi.fn() };
    const logger = createLogger("debug", logShim);

    const script = dedent`
      globalSync("gs1")
      globalAsync("gsa1"):next(function()
        namespaced.nsSync("ns1")
        -- no waiting (would be unhandled promise rejection)
        namespaced.nsAsync("nsa1")
        namespaced.nsSyncAlt("ns2")
      end):catch(function(err)
        print("Error", err)
      end)
    `;

    await runLifecycle(
      lua,
      {
        blocks: [script],
        set: fixture,
        headers: [await usePromise(lua)],
      },
      { logger, debugId: "test" }
    );

    // console.log(logShim.debug.mock.calls[0][0]);

    expect(fixture.globalSync).toBeCalledWith("gs1");
    expect(fixture.globalAsync).toBeCalledWith("gsa1");
    expect(fixture.namespaced.nsSync).toBeCalledWith("ns1");
    expect(fixture.namespaced.nsSyncAlt).toBeCalledWith("ns2");
    expect(fixture.namespaced.nsAsync).toBeCalledWith("nsa1");

    expect(true).toBe(true);
  });
});
