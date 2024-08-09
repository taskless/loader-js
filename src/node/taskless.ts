import process from "node:process";
import { TASKLESS_HOST } from "@~/constants.js";
import {
  type Pack,
  type Config,
  type InitOptions,
  type DenormalizedRule,
  type MaybePromise,
  type HookName,
  type Logger,
  type Entry,
  type NetworkPayload,
  type ConsolePayload,
} from "@~/types.js";
import { http, type StrictResponse } from "msw";
import { setupServer } from "msw/node";
import { dedent } from "ts-dedent";
import { v4, v7 } from "uuid";
import { type LuaEngine, LuaFactory } from "wasmoon";
import { InitializationError } from "./error.js";
import {
  type CaptureCallback,
  createContextFunctions,
  createGlobals,
  createLocals,
  createRequestFunctions,
  createResponseFunctions,
} from "./lua.js";

type LifecycleHookData = { pack: string; hook: string };

const DEFAULT_FLUSH_INTERVAL = 2000;

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

const defaultLogger: Logger = {
  debug(messsage: string) {
    console.debug(messsage);
  },
  info(messsage: string) {
    console.info(messsage);
  },
  warn(messsage: string) {
    console.warn(messsage);
  },
  error(messsage: string) {
    console.error(messsage);
  },
  data(ndjson: string) {
    console.log(ndjson);
  },
};

const bypass = (request: Request) => {
  // add x-tskl-bypass header
  const clone = request.clone();
  clone.headers.set("x-tskl-bypass", "1");
  return clone;
};

const isBypassed = (request: Request) => {
  return request.headers.get("x-tskl-bypass") === "1";
};

/** Extract all packs from the config, ensuring the config is resolved */
const extractPacks = async (packs: Promise<Config | undefined>) => {
  const data = await packs;
  return data?.packs ?? [];
};

/** Fetch the configuration from taskless using a provided API secret */
const getConfig = async (
  secret: string,
  { logger }: { logger: Logger },
  options?: InitOptions
) => {
  const host = options?.host ?? TASKLESS_HOST;
  const url = new URL(`https://${host}/config`);
  const request = bypass(
    new Request(url.toString(), {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
    })
  );
  const response = await fetch(request);

  const data = (await response.json()) as Config;

  logger.debug(
    `Retrieved configuration from Taskless (orgId: ${data.organizationId}, version: ${data.version})`
  );

  return data;
};

/** Load rules into a denormalized form */
const loadRules = async (
  packs: MaybePromise<Pack[]>,
  config: MaybePromise<Config | undefined>,
  { logger }: { logger: Logger }
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
        },
      });
    }
  }

  return flatRules;
};

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

  const logLevels: Record<keyof Logger, number> = {
    debug: 20,
    info: 30,
    warn: 40,
    error: 50,
    data: Number.POSITIVE_INFINITY,
  };

  const logLevel = logLevels[options?.logLevel ?? "info"];

  const logger: Logger = {
    debug:
      logLevel <= logLevels.debug
        ? options?.log?.debug ?? defaultLogger.debug
        : noop,
    info:
      logLevel <= logLevels.info
        ? options?.log?.info ?? defaultLogger.info
        : noop,
    warn:
      logLevel <= logLevels.warn
        ? options?.log?.warn ?? defaultLogger.warn
        : noop,
    error:
      logLevel <= logLevels.error
        ? options?.log?.error ?? defaultLogger.error
        : noop,
    data: options?.log?.data ?? defaultLogger.data,
  };

  const pending: Entry[] = [];
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
    const consolePayload: ConsolePayload[] = [];
    for (const entry of entries) {
      networkPayload[entry.requestId] ||= {};
      networkPayload[entry.requestId][entry.url] ||= [];
      networkPayload[entry.requestId][entry.url].push([
        entry.dimension,
        entry.value,
      ]);
      consolePayload.push({
        requestId: entry.requestId,
        url: entry.url,
        dimension: entry.dimension,
        value: entry.value,
      });
    }

    logger.debug(`Flushing pending telemetry (${consolePayload.length})`);

    if ((!useNetwork || options?.forceLog) && consolePayload.length > 0) {
      logger.data(
        consolePayload.map((item) => JSON.stringify(item)).join("\n")
      );
    }

    if (useNetwork) {
      const request = bypass(
        new Request(`https://${options?.host ?? TASKLESS_HOST}/event`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${secret}`,
          },
          body: JSON.stringify(networkPayload),
        })
      );

      fetch(request)
        .then(async (response) => {
          if (response.status > 0 && response.status < 400) {
            return response.json();
          }

          logger.error(`Received an error ${response.status} from Taskless`);
          throw new Error("Failed request");
        })
        .catch(noop);
    }

    // for (const entry of Object.values(pending)) {
    //   if (!entry.url) {
    //     continue;
    //   }
    // }

    // const entries = Object.values(pending)
    //   .map((entry) => {
    //     if (!entry.url) {
    //       return undefined;
    //     }

    //     // capture & clear existing data
    //     const data = entry.data;
    //     pending[entry.requestId].data = [];

    //     return data.map(([key, value]) =>
    //       JSON.stringify({
    //         requestId: entry.requestId,
    //         url: entry.url,
    //         dimension: key,
    //         value,
    //       })
    //     );
    //   })
    //   .filter(isDefined)
    //   .flat();

    // logger.debug(
    //   `Flushing pending telemetry (${entries.length}, ${Object.values(pending).length})`
    // );

    // if ((!useNetwork || options?.forceLog) && entries.length > 0) {
    //   logger.info(entries.join("\n"));
    // }

    // if (useNetwork) {
    //   const request = bypass(
    //     new Request(`https://${host}/event`, {
    //       method: "POST",
    //       headers: {
    //         "Content-Type": "application/x-ndjson",
    //         Authorization: `Bearer ${secret}`,
    //       },
    //       body: entries.join("\n"),
    //     })
    //   );

    //   fetch(request)
    //     .then(async (response) => {
    //       if (response.status > 0 && response.status < 400) {
    //         return response.json();
    //       }

    //       logger.error(`Received an error ${response.status} from Taskless`);
    //       throw new Error("Failed request");
    //     })
    //     .catch(noop);
    // }
  }

  // a bunch of promises to not block on. Hold their awaited values instead
  const factory = new LuaFactory();
  const promisedConfig =
    secret && useNetwork
      ? getConfig(secret, { logger }, options)
      : Promise.resolve(undefined);
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
      loadRules(promisedPacks, promisedConfig, { logger }),
      loadRules(localPacks, promisedConfig, { logger }),
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
  const capture: CaptureCallback = (requestId, url, dimension, value) => {
    pending.push({
      requestId,
      url,
      dimension,
      value,
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
      const requestId = v7();
      logger.debug(`[${requestId}] started`);
      const [request, context] = await Promise.all([
        createRequestFunctions(info.request),
        createContextFunctions(requestId),
      ]);
      const locals = await createLocals(requestId, {
        logger,
        getRequest: () => request.internal.current(),
        capture,
      });

      // build our middleware by executing every hook for a matching rule
      const hooks: Record<HookName, LifecycleHookData[]> = {
        pre: [],
        post: [],
      };

      // load all matching hooks
      for (const rule of rules) {
        if (!rule.__.matches.test(info.request.url)) {
          continue;
        }

        // pre lifecycle is in forward order
        if (rule.hooks?.pre) {
          hooks.pre.push({
            pack: `${rule.__.packName}@${rule.__.packVersion}`,
            hook: rule.hooks.pre.trim(),
          });
        }

        // post lifecycle is in reverse order
        if (rule.hooks?.post) {
          hooks.post.unshift({
            pack: `${rule.__.packName}@${rule.__.packVersion}`,
            hook: rule.hooks.post.trim(),
          });
        }
      }

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
      const finalizedRequest = request.internal.finalize();

      const fetchResponse = await fetch(bypass(finalizedRequest));

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
      startDrain();
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

/** Autoloading interface for Taskless, hiding configuration that wouldn't be available anyway */
export const autoload = async (secret?: string, options?: InitOptions) => {
  const t = await taskless(secret, options);
  await t.load();
  t.logger().debug("Taskless Autoloader ran successfully");
  return {};
};
