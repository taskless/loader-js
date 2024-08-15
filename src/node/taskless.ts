import process from "node:process";
import {
  bypass,
  DEFAULT_FLUSH_INTERVAL,
  emptyConfig,
  noop,
  TASKLESS_HOST,
} from "@~/constants.js";
import {
  type Pack,
  type Config,
  type InitOptions,
  type DenormalizedRule,
  type MaybePromise,
  type HookName,
  type Logger,
  type NetworkPayload,
  type ConsolePayload,
  type CaptureCallback,
  type CaptureItem,
  type Sends,
} from "@~/types.js";
import { createClient, type OASClient, type NormalizeOAS } from "fets";
import { http, type StrictResponse } from "msw";
import { setupServer } from "msw/node";
import { dedent } from "ts-dedent";
import { v4, v7 } from "uuid";
import { type LuaEngine, LuaFactory } from "wasmoon";
import { InitializationError } from "./error.js";
import { createLogger } from "./logger.js";
import {
  createContextFunctions,
  createGlobals,
  createLocals,
  createRequestFunctions,
  createResponseFunctions,
} from "./lua.js";
import type openapi from "../__generated__/openapi.js";

const id = () => `${v7().replaceAll("-", "")}`;

/** Checks if a request is bypassed */
const isBypassed = (request: Request) => {
  return request.headers.get("x-tskl-bypass") === "1";
};

/** Extract all packs from the config, ensuring the config is resolved */
const extractPacks = async (packs: Promise<Config>) => {
  const data = await packs;
  return data?.packs ?? [];
};

/** Fetch the configuration from taskless using the provided API secret */
const getConfig = async (
  secret: string,
  {
    logger,
    client,
  }: { logger: Logger; client: OASClient<NormalizeOAS<typeof openapi>> }
): Promise<Config> => {
  const response = await client["/{version}/config"].get({
    params: {
      version: "v1",
    },
  });

  if (!response.ok) {
    logger.error(
      `Failed to fetch configuration: ${response.status} ${response.statusText}. Taskless will not apply rules.`
    );
    return emptyConfig;
  }

  const data = await response.json();

  logger.debug(
    `Retrieved configuration from Taskless (orgId: ${data.organizationId}, schema: ${data.__v})`
  );
  return data;
};

/** Load rules into a denormalized form */
const loadRules = async (
  packs: MaybePromise<Pack[]>,
  config: MaybePromise<Config | undefined>
) => {
  const [resolvedPacks, resolvedConfig] = await Promise.all([packs, config]);
  const flatRules: DenormalizedRule[] = [];

  for (const pack of resolvedPacks) {
    for (const rule of pack.rules) {
      flatRules.push({
        ...rule,
        __: {
          matches: new RegExp(rule.matches),
          packName: pack.name,
          packVersion: pack.version,
          configOrganizationId: resolvedConfig?.organizationId ?? "",
          sendData: pack.sends,
        },
      });
    }
  }

  return flatRules;
};

/** Describes a lifecycle hook, both its lua script and the pack it came from */
type LifecycleHookData = { pack: string; hook: string };

/** Runs a lua script with local context features and cleans up after itself */
const runLifecycle = async (
  lua: LuaEngine,
  blocks: LifecycleHookData[],
  functions: Record<string, unknown>,
  { logger, debugName }: { logger: Logger; debugName: string }
) => {
  const ns = "t" + v4().replaceAll("-", "");
  const scopedFunctions: string[] = [];
  lua.global.set(ns, functions);

  for (const function_ of Object.keys(functions)) {
    scopedFunctions.push(`local ${function_} = ${ns}.${function_}`);
  }

  const scripts = blocks.map((block, index) => {
    // set the locals for execution, followed by the block
    // then, run the blocked out function
    return dedent`
      -- START: ${block.pack}
      local ${ns}_fn_${index} = function()
        ${scopedFunctions.join("\n")}
        ${block.hook}
      end
      ${ns}_fn_${index}()
      ${ns}_fn_${index} = nil
      -- END: ${block.pack}
    `.trim();
  });

  // our local script also cleans the ns when done
  const localScript = dedent`
    -- START: ${debugName}
    local ${ns}_fn = function()
      ${scripts.join("\n  ")}
    end
    ${ns}_fn()
    ${ns}_fn = nil
    ${ns} = nil
    -- END: ${debugName}
  `.trim();

  logger.debug(`${debugName} lua contents:\n${localScript}`);

  await lua.doString(localScript);
};

/**
 * Taskless
 * Create an instance of the Taskless loader, retrieve remote configurations,
 * and take control of your third party APIs.
 */
export const taskless = async (secret?: string, options?: InitOptions) => {
  const useNetwork = options?.network !== false;
  const universalFunctions = createGlobals();
  const globalNS = "t" + v4().replaceAll("-", "");
  const logger = createLogger(options?.logLevel, options?.log);
  const client = createClient<NormalizeOAS<typeof openapi>>({
    endpoint: (options?.endpoint ?? TASKLESS_HOST).replace(/\/$/, ""),
    globalParams: {
      headers: {
        authorization: `Bearer ${secret}`,
        ...bypass,
      },
    },
  });
  const pending: CaptureItem[] = [];
  let timer: NodeJS.Timeout;

  if (!secret && useNetwork) {
    throw new Error(
      "Taskless API Key is missing or may not be corectly included"
    );
  }

  /** Start the drain of telemetry data */
  function startDrain() {
    /** Inner function to flush and restart drain */
    function flushAndRestart() {
      flush();
      startDrain();
    }

    /** Timeout lets GC run with one reference to the flush function */
    timer = setTimeout(
      flushAndRestart,
      options?.flushInterval ?? DEFAULT_FLUSH_INTERVAL
    );
  }

  /** Flush all valid pending telemetry */
  function flush() {
    const entries = pending.slice();

    // Compress the network payload into normalized form
    const networkPayload: NetworkPayload = {};
    for (const entry of entries) {
      if (useNetwork) {
        networkPayload[entry.requestId] ||= [];

        switch (entry.type) {
          case "number": {
            networkPayload[entry.requestId].push({
              seq: entry.sequenceId,
              dim: entry.dimension,
              num: entry.value,
            });
            break;
          }

          case "string": {
            networkPayload[entry.requestId].push({
              seq: entry.sequenceId,
              dim: entry.dimension,
              str: entry.value,
            });
            break;
          }
        }
      }

      if (!useNetwork || options?.forceLog) {
        logger.data(
          JSON.stringify({
            req: entry.requestId,
            seq: entry.sequenceId,
            dim: entry.dimension,
            val: entry.value,
          } satisfies ConsolePayload)
        );
      }
    }

    if (useNetwork) {
      logger.debug(
        `Flushing telemetry data to Taskless (batch size: ${Object.keys(networkPayload).length})`
      );
      client["/{version}/events"]
        .post({
          json: networkPayload,
          params: {
            version: "v1",
          },
        })
        .catch(noop);
    }
  }

  // a bunch of promises to not block on. Hold their awaited values instead
  const factory = new LuaFactory();
  const promisedConfig =
    secret && useNetwork
      ? getConfig(secret, { logger, client })
      : Promise.resolve(emptyConfig);
  const promisedPacks = extractPacks(promisedConfig);
  const promisedEngine = factory.createEngine();
  let resolvedLua: LuaEngine | undefined;

  /** Local packs can be added manually via add() on the programatic API */
  const localPacks: Pack[] = [];
  /** All rules, flattened and resolved at initialization time */
  const rules: DenormalizedRule[] = [];
  /** Initialization flag, ensures we passed through init */
  let initialized = false;

  /** Initialize all local rules and ensure remote rules are loaded */
  const initialize = async () => {
    if (initialized) {
      throw new InitializationError(
        "Taskless has already been initialized. Did you mean to include autoload: false?"
      );
    }

    initialized = true;
    const [remote, local] = await Promise.all([
      loadRules(promisedPacks, promisedConfig),
      loadRules(localPacks, promisedConfig),
    ]);

    logger.debug(
      `Loaded ${remote.length} remote rules and ${local.length} local rules`
    );

    const lua = await promisedEngine;
    resolvedLua = lua;
    lua.global.set(globalNS, universalFunctions);

    rules.push(...[remote, local].flat());

    // start the drain
    startDrain();
    logger.debug("Drain started");

    // attach cleanup to process exit
    process.on("exit", cleanup);
  };

  const cleanup = () => {
    logger.debug("Performing cleanup");
    // disable queue timer
    clearTimeout(timer);
    // close the lua engine
    if (resolvedLua) {
      resolvedLua.global.close();
    }
  };

  /** MSW instance: If one is programatically provided, use that instead */
  const msw = options?.__experimental?.msw ?? setupServer();

  // start listening if it is our MSW instance and not external
  if (!options?.__experimental?.msw) {
    msw.listen({
      onUnhandledRequest: "bypass",
    });
  }

  /** Captures a lua key/value data point and ties it to a request id */
  const capture: CaptureCallback = (entry) => {
    logger.debug(
      `[${entry.requestId}] Captured ${entry.dimension} as ${entry.value}`
    );
    pending.push({
      ...entry,
      sequenceId: id(),
    });
  };

  // use the post-init API for msw to intercept our requests
  msw.use(
    http.all("https://*", async (info) => {
      if (!initialized) {
        throw new InitializationError(
          "Taskless must be explicitly loaded in programatic mode. Please call load() before the first request."
        );
      }

      // let a bypassed request through to any other handlers
      if (isBypassed(info.request)) {
        return undefined;
      }

      // our lua engine and a namespace safe for our JS bridge
      const lua = await promisedEngine;
      const requestId = id();
      logger.debug(`[${requestId}] started`);

      // build our middleware by executing every hook for a matching rule
      const hooks: Record<HookName, LifecycleHookData[]> = {
        pre: [],
        post: [],
      };

      let sendData: Sends = {};

      // load all matching hooks
      for (const rule of rules) {
        if (!rule.__.matches.test(info.request.url)) {
          continue;
        }

        // pre lifecycle is in forward order
        if (rule.hooks?.pre) {
          sendData = {
            ...sendData,
            ...rule.__.sendData,
          };
          hooks.pre.push({
            pack: `${rule.__.packName}@${rule.__.packVersion}`,
            hook: rule.hooks.pre.trim(),
          });
        }

        // post lifecycle is in reverse order
        if (rule.hooks?.post) {
          sendData = {
            ...sendData,
            ...rule.__.sendData,
          };
          hooks.post.unshift({
            pack: `${rule.__.packName}@${rule.__.packVersion}`,
            hook: rule.hooks.post.trim(),
          });
        }
      }

      const [request, context] = await Promise.all([
        createRequestFunctions(info.request),
        createContextFunctions(requestId),
      ]);
      const locals = await createLocals(requestId, {
        logger,
        sendData,
        capture,
      });

      // PRE lifecycle
      await runLifecycle(
        lua,
        hooks.pre,
        {
          context: context.lua,
          request: request.lua,
          ...locals.lua,
          ...universalFunctions.lua,
        },
        {
          logger,
          debugName: `[${requestId}] hooks.pre`,
        }
      );

      // Finalize and capture key data
      const finalizedRequest = request.internal.finalize();
      capture({
        requestId,
        dimension: "url",
        value: finalizedRequest.url,
        type: "string",
      });
      capture({
        requestId,
        dimension: "domain",
        value: new URL(finalizedRequest.url).hostname,
        type: "string",
      });

      // Fetch
      finalizedRequest.headers.set("x-tskl-bypass", "1");
      const fetchResponse = await fetch(finalizedRequest);

      // POST lifecycle
      const response = await createResponseFunctions(fetchResponse);
      await runLifecycle(
        lua,
        hooks.post,
        {
          context: context.lua,
          request: request.lua,
          response: response.lua,
          ...locals.lua,
          ...universalFunctions.lua,
        },
        {
          logger,
          debugName: `[${requestId}] hooks.post`,
        }
      );

      return response.internal.finalize() as StrictResponse<any>;
    })
  );

  return {
    /** add additional local packs programatically */
    add(pack: Pack) {
      localPacks.push(pack);
    },
    logger() {
      return logger;
    },
    flush() {
      clearTimeout(timer);
      flush();
    },
    /** Trigger the loading of all packs */
    async load() {
      await initialize();
      const remotePacks = await promisedPacks;
      return {
        network: useNetwork,
        remotePacks: remotePacks.length,
        localPacks: localPacks.length,
      };
    },
  };
};

/** Autoloading interface for Taskless, hides manual pack loading and automatically initializes */
export const autoload = async (secret?: string, options?: InitOptions) => {
  const t = await taskless(secret, options);
  await t.load();
  t.logger().debug("Taskless Autoloader ran successfully");
  return {};
};
