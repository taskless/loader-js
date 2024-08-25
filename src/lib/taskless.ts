import process from "node:process";
import {
  bypass,
  DEFAULT_FLUSH_INTERVAL,
  emptyConfig,
  noop,
  TASKLESS_HOST,
} from "@~/constants.js";
import { captureFunctions } from "@~/lua/capture.bridge.js";
import { contextFunctions } from "@~/lua/context.bridge.js";
import { logFunctions } from "@~/lua/log.bridge.js";
import { usePromise } from "@~/lua/promise.lua.js";
import { requestFunctions } from "@~/lua/request.bridge.js";
import { responseFunctions } from "@~/lua/response.bridge.js";
import { stringFunctions } from "@~/lua/string.bridge.js";
import { timeFunctions } from "@~/lua/time.bridge.js";
import {
  type Pack,
  type InitOptions,
  type DenormalizedRule,
  type HookName,
  type NetworkPayload,
  type ConsolePayload,
  type CaptureCallback,
  type CaptureItem,
  type Sends,
  type TasklessAPI,
} from "@~/types.js";
import { createClient, type NormalizeOAS } from "fets";
import { http, type StrictResponse } from "msw";
import { setupServer } from "msw/node";
import { v7 } from "uuid";
import { type LuaEngine, LuaFactory } from "wasmoon";
import { InitializationError } from "./error.js";
import { createLogger } from "./logger.js";
import { runLifecycle } from "./lua.js";
import { extractPacks, getConfig, loadRules } from "./service.js";
import type openapi from "../__generated__/openapi.js";

/** create a 128 bit uuid7 and remove the dashes, turning it into a k-ordered bigint in hex */
const id = () => `${v7().replaceAll("-", "")}`;

/** Checks if a request is bypassed */
const isBypassed = (request: Request) => {
  return request.headers.get("x-tskl-bypass") === "1";
};

// a throwable function
const createThrowable =
  <T extends Error>(error: T): ((...args: any[]) => any) =>
  () => {
    // eslint-disable-next-line @typescript-eslint/no-throw-literal
    throw error;
  };

/** A default no-op API */
const createErrorAPI = <T extends Error>(errror: T): TasklessAPI => ({
  add: createThrowable(errror),
  flush: createThrowable(errror),
  logger: createThrowable(errror),
  load: createThrowable(errror),
});

/**
 * Taskless
 * Create an instance of the Taskless loader, retrieve remote configurations,
 * and take control of your third party APIs.
 */
export const taskless = async (
  secret?: string,
  options?: InitOptions
): Promise<TasklessAPI> => {
  // Network opt-in or secret required
  const useNetwork = Boolean(options?.network ?? (secret && secret.length > 0));

  // prefer explicit set, defaulting to the inverse of useNetwork
  const useLogging =
    options?.logging === undefined ? !useNetwork : Boolean(options.logging);

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

  if (!useNetwork && !useLogging) {
    return {
      ...createErrorAPI(
        new InitializationError(
          "Network and logging are both disabled. No telemetry will be captured"
        )
      ),
      logger: () => logger,
    };
  }

  if (useNetwork && !secret) {
    return {
      ...createErrorAPI(
        new InitializationError(
          "Network is enabled, but no secret was provided."
        )
      ),
      logger: () => logger,
    };
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

      if (useLogging) {
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

  /**
   * Captures a lua key/value data point and assigns it a sequence id
   * This is externalized from the lifecycle so that our id() function
   * creates monotonic increasing values for each telemetry point
   */
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
      const hooks: Record<HookName, string[]> = {
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
          hooks.pre.push(rule.hooks.pre.trim());
        }

        // post lifecycle is in reverse order
        if (rule.hooks?.post) {
          sendData = {
            ...sendData,
            ...rule.__.sendData,
          };
          hooks.post.unshift(rule.hooks.post.trim());
        }
      }

      const [logLibrary, stringLibrary, timeLibrary, contextLibrary] =
        await Promise.all([
          logFunctions({ logger }),
          stringFunctions({ logger }),
          timeFunctions({ logger }),
          contextFunctions({ logger }),
        ]);

      const [requestLibrary, tasklessLibrary] = await Promise.all([
        requestFunctions({ logger }, { request: info.request }),
        captureFunctions(
          {
            logger,
          },
          {
            capture,
            requestId,
            sends: sendData,
          }
        ),
      ]);

      const requestLocals = {
        // available non-namespaced
        ...logLibrary.functions,
        ...stringLibrary.functions,
        ...timeLibrary.functions,
        // in namespace
        context: contextLibrary.functions,
        request: requestLibrary.functions,
        taskless: tasklessLibrary.functions,
      };

      // PRE lifecycle
      await runLifecycle(
        lua,
        {
          set: requestLocals,
          blocks: hooks.pre,
          async: ["request.getBody"],
          headers: [await usePromise(lua)],
        },
        { logger, debugId: `${requestId}.hooks.pre` }
      );

      // Finalize and capture key data
      const finalizedRequest = requestLibrary.internal.finalize();
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

      // add to our locals for the response
      const [responseLibrary] = await Promise.all([
        responseFunctions({ logger }, { response: fetchResponse }),
      ]);

      const responseLocals = {
        ...requestLocals,
        response: responseLibrary.functions,
      };

      // POST lifecycle
      await runLifecycle(
        lua,
        {
          set: responseLocals,
          blocks: hooks.post,
          async: ["request.getBody", "response.getBody"],
          headers: [await usePromise(lua)],
        },
        { logger, debugId: `${requestId}.hooks.post` }
      );

      return responseLibrary.internal.finalize() as StrictResponse<any>;
    })
  );

  const api = {
    /** add additional local packs programatically */
    add(pack: Pack) {
      localPacks.push(pack);
    },
    /** get the current logger */
    logger() {
      return logger;
    },
    /** Explicitly flush any pending logs. Useful before shutting down to ensure all events are captured */
    flush() {
      clearTimeout(timer);
      flush();
    },
    /** Load all registered packs and initialize Taskless */
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

  return api;
};

/** Autoloading interface for Taskless, hides manual pack loading and automatically initializes */
export const autoload = async (secret?: string, options?: InitOptions) => {
  const t = await taskless(secret, options);
  try {
    await t.load();
    t.logger().debug("Taskless Autoloader ran successfully");
    return {};
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
  }

  throw new InitializationError("Taskless Autoloader failed to run");
};
