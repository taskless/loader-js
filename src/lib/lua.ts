import { type Logger } from "@~/types.js";
import { dedent } from "ts-dedent";
import { v4 } from "uuid";
import { type LuaEngine } from "wasmoon";

type Options = {
  debugId: string;
  logger: Logger;
};

type Code = {
  blocks: string[];
  set: Record<string, unknown>;
  headers?: string[];
  async?: string[];
};

/** create a lua safe variable name */
const ns = (prefix = "t") => prefix + v4().replaceAll("-", "");

/** Runs a script within the lua engine. Should manage its own memory space */
export const runLifecycle = async (
  lua: LuaEngine,
  code: Code,
  { logger, debugId }: Options
) => {
  const namespace = ns();

  const setup: string[] = [];
  lua.global.set(namespace, code.set);

  // create local references to our global.set
  for (const [name] of Object.entries(code.set)) {
    setup.push(`local ${name} = ${namespace}.${name}`);
  }

  // localizes async references
  for (const reference of code.async ?? []) {
    // request.getBody needs to be captured
    // and then bridged to std promise. Replace in-place
    const luaref = reference.replace(".", "__");
    setup.push(dedent`
      -- localizing ${luaref}
      local ${luaref} = ${reference}
      ${reference} = function(...)
        ${code.headers?.join("\n")}
        local result = ${luaref}(...):await()
        local promise = Promise.new()
        promise:resolve(result)
        return promise
      end
    `);
  }

  // each code block runs as a continuation, but is contained
  // in its own scope
  const scripts = code.blocks.map((block, index) => {
    // set the locals for execution, followed by the block
    // then, run the blocked out function
    return [
      `${namespace}_${index}`,
      dedent`
        -- ${debugId} block ${index}
        local function ${namespace}_${index}()
          ${code.headers?.join("\n")}
          ${setup.join("\n")}
          ${block}
        end
      `,
    ];
  });

  // our local script also cleans the ns when done
  const localScript = dedent`
    -- ${debugId} START
    local ${namespace}_run = function()
      ${code.headers?.join("\n")}

      ${scripts.map(([_, contents]) => contents).join("\n")}

      promise = Promise.new()
      ${scripts.map(
        ([name], index) => `${index === 0 ? "promise" : ""}:next(${name})`
      )}:next(function()
        -- complete
        return nil
      end)
      promise:resolve()

      -- holds lua open until all promises are settled
      Promise.wait():await()
    end
    
    -- clean up the lua environment after the run
    ${namespace}_run()
    ${namespace}_run = nil
    ${namespace} = nil
    -- ${debugId} END
  `;

  try {
    await lua.doString(localScript);
  } catch (error) {
    logger.error(`${debugId} Error running script: ${error as string}`);
    logger.debug(`-- DEBUG ${debugId} lua contents:\n${localScript}`);
  }

  // ensure globals are cleared
  lua.global.set(namespace, undefined);
};
