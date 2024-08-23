import { nextTick } from "node:process";
import { dedent } from "ts-dedent";
import { v4 } from "uuid";
import { type LuaEngine } from "wasmoon";

// @ts-expect-error vite import is a FS bundled import
// eslint-disable-next-line n/file-extension-in-import
import luaPromise from "./promise.lua?raw";

type UnknownFunction = (...args: unknown[]) => unknown;

// unique ns for this module
const ns = "m" + v4().replaceAll("-", "");

/**
 * Registers and exposes a A+ promise implementaiton to the lua environment.
 * Loads the lua code from the .lua file, places the module into a unique
 * scope, then adds local bindings required for functionality
 * - Creates a "wait" function that holds the lua environment open while promises are pending
 * - Exposes a "schedule" function that allows lua to schedule async tasks
 * - Ensures that the module and bindings are only loaded once in a given lua environment
 */
export const usePromise = async (lua: LuaEngine) => {
  const name = `${ns}_module`;
  const installed = lua.global.get(`${ns}_installed`) as boolean | undefined;

  // if installed, then just return the module localizer
  if (installed) {
    return `local Promise = ${name}`;
  }

  lua.global.set(`${ns}_installed`, true);

  /** Tracks pending promises and ticks so we don't close lua prematurely */
  let referenceCounter = 0;

  lua.global.set(`${ns}_wait`, async () => {
    return new Promise<void>((resolve) => {
      function loop() {
        if (referenceCounter === 0) {
          resolve();
        } else {
          nextTick(loop);
        }
      }

      loop();
    });
  });

  lua.global.set(`${ns}_schedule`, async (callback: UnknownFunction) => {
    referenceCounter++;
    return new Promise<void>((resolve) => {
      nextTick(() => {
        referenceCounter--;
        callback();
        resolve();
      });
    });
  });

  const script = dedent`
    local ${ns} = function()
      ${luaPromise}
    end
    ${name} = ${ns}()
    ${name}.wait = ${ns}_wait
    ${name}.async = ${ns}_schedule
  `;

  await lua.doString(script);

  return `local Promise = ${name}`;
};
