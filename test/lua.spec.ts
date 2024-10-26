import luaGet from "@~/lua/get.lua?raw";
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

describe("Lua language helpers", (t) => {
  test("get(table, ...)", async ({ expect, lua }) => {
    lua.global.set("data", {
      one: {
        two: {
          three: {
            four: "five",
          },
        },
      },
    });

    const write = vi.fn();
    lua.global.set("write", write);

    const script = dedent`
      ${luaGet}
      write(get(data, "one", "two", "three", "four"));
      write(get(data, "a", "b", "c"))
    `;

    await lua.doString(script);

    expect(write.mock.calls[0][0]).toBe("five");
    expect(write.mock.calls[1][0]).toBe(null);
  });
});
