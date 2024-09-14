import { type Logger } from "@~/types.js";
import { dedent } from "ts-dedent";
import { type LuaEngine } from "wasmoon";
import { id } from "./id.js";

type Options = {
  debugId: string;
  logger: Logger;
};

type Code = {
  id: string;
  blocks: string[];
  set: Record<string, unknown>;
  headers?: string[];
  async?: string[];
};

/** create a lua safe variable name, beginning with a letter */
const ns = () => `t${id()}`;

const localize = (
  name: string,
  value: unknown,
  env: {
    reference: string;
    id: string;
    awaited: string[] | undefined;
  },
  prefixes?: string[]
): string => {
  const { reference, id, awaited = [] } = env;
  const fqvn = [...(prefixes ?? []), name].join(".");
  const localPrefix = prefixes && prefixes.length > 0 ? "" : "local ";
  switch (typeof value) {
    case "function": {
      const captureLine = awaited.includes(fqvn)
        ? dedent`
          -- async capture from host
          local result = ${reference}.${fqvn}("${id}", ...)
          local promise = Promise.new()
          promise:resolve(result)
          return promise
        `
        : dedent`
          -- synchronous capture from host
          local result = ${reference}.${fqvn}("${id}", ...)
          return result
        `;
      return dedent`
        ${localPrefix}${fqvn} = function(...)
          ${captureLine}
        end
      `;
    }

    case "object": {
      if (value === null) {
        return `${localPrefix}${fqvn} = nil`;
      }

      if (Array.isArray(value)) {
        return [
          `${localPrefix}${fqvn} = []`,
          ...value.map((value, index) =>
            localize(index.toString(), value, env, [...(prefixes ?? []), name])
          ),
        ].join("\n");
      }

      return [
        `${localPrefix}${fqvn} = {}`,
        ...Object.entries(value).map(([key, value]) =>
          localize(key, value, env, [...(prefixes ?? []), name])
        ),
      ].join("\n");
    }

    default: {
      return `${localPrefix}${fqvn} = ${reference}.${fqvn}`;
    }
  }
};

/** Runs a script within the lua engine. Should manage its own memory space */
export const runLifecycle = async (
  lua: LuaEngine,
  code: Code,
  { logger, debugId }: Options
) => {
  const namespace = ns();
  lua.global.set(namespace, code.set);
  const debug: string[] = [];

  // For each block, we need to create local references the block can rely on.
  // For any function, we need to also wrap it in a lua function that passes
  // the code block identifier as the first argument
  const scripts = code.blocks.map((block, index) => {
    // this is the variable that tells lua "who" called the function
    const id = `${code.id}_${index}`;
    const lines: string[] = [];

    for (const [name, value] of Object.entries(code.set)) {
      lines.push(
        localize(name, value, { reference: namespace, id, awaited: code.async })
      );
    }

    // set the locals for execution, followed by the block
    // then, run the blocked out function
    return [
      `${namespace}_${index}`,
      dedent`
        -- ${debugId} block ${index}
        local function ${namespace}_${index}()
          ${code.headers?.join("\n")}
          ${lines.join("\n")}
          ${block}
        end
      `,
    ];
  });

  // our local script also cleans the ns when done
  // it unrolls our scripts into chained promises
  const localScript = dedent`
    -- ${debugId} START
    local ${namespace}_run = function()
      ${code.headers?.join("\n")}

      -- BLOCK DEFINE
      ${scripts.map(([_, contents]) => contents).join("\n")}

      -- ASYNC WRAP
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
