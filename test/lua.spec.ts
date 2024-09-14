import { createLogger } from "@~/lib/logger.js";
import { runLifecycle } from "@~/lib/lua.js";
import { usePromise } from "@~/lua/promise.js";
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
        .mockImplementation(
          (block, testValue) => `global sync (${block} ${testValue})`
        ),
      globalAsync: vi
        .fn()
        .mockImplementation(
          async (block, testValue) => `global async (${block} ${testValue})`
        ),
      namespaced: {
        nsSync: vi
          .fn()
          .mockImplementation(
            (block, testValue) => `ns sync (${block} ${testValue})`
          ),
        nsSyncAlt: vi
          .fn()
          .mockImplementation(
            (block, testValue) => `ns sync (${block} ${testValue})`
          ),
        nsAsync: vi
          .fn()
          .mockImplementation(
            async (block, testValue) => `ns async (${block} ${testValue})`
          ),
      },
    };

    const logShim = {
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
    };
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
        id: "test",
        blocks: [script],
        set: fixture,
        headers: [await usePromise(lua)],
        async: ["globalAsync", "namespaced.nsAsync"],
      },
      { logger, debugId: "test" }
    );

    expect(fixture.globalSync).toBeCalledWith("test_0", "gs1");
    expect(fixture.globalAsync).toBeCalledWith("test_0", "gsa1");
    expect(fixture.namespaced.nsSync).toBeCalledWith("test_0", "ns1");
    expect(fixture.namespaced.nsSyncAlt).toBeCalledWith("test_0", "ns2");
    expect(fixture.namespaced.nsAsync).toBeCalledWith("test_0", "nsa1");

    expect(true).toBe(true);
  });

  test("Promise library tests", async ({ expect, lua }) => {
    const promiseLibrary = await usePromise(lua);
    const sequence = vi.fn();
    lua.global.set("sequence", sequence);

    const fixture = dedent`
      local run = function()
        ${promiseLibrary}

        sequence("start")
        promise = Promise.new()
        promise:next(function()
          -- complete
          sequence("next")
          return nil
        end)
        promise:resolve()

        -- holds lua open until all promises are settled
        Promise.wait():await()
        sequence("done")
      end
      -- run the script
      run()
    `;

    await lua.doString(fixture);

    expect(sequence.mock.calls.flat(), "Promise order preserved").toStrictEqual(
      ["start", "next", "done"]
    );
  });
});
