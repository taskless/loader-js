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
  type InitOptions,
  type DenormalizedRule,
  type NetworkPayload,
  type ConsolePayload,
  type CaptureCallback,
  type CaptureItem,
  type TasklessAPI,
  type Logger,
} from "@~/types.js";
import { createClient, type NormalizeOAS } from "fets";
import yaml from "js-yaml";
import { setupServer } from "msw/node";
import { type LuaEngine, LuaFactory } from "wasmoon";
import { InitializationError } from "./error.js";
import { createHandler } from "./handler.js";
import { id } from "./id.js";
import { createLogger } from "./logger.js";
import { extractPacks, getConfig, loadRules } from "./service.js";
import type openapi from "../__generated__/openapi.js";

// a throwable function
const createThrowable =
  <T extends Error>(error: T): ((...args: any[]) => any) =>
  () => {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw error;
  };

/** A default no-op API */
const createErrorAPI = <T extends Error>(error: T): TasklessAPI => ({
  add: createThrowable(error),
  flush: createThrowable(error),
  logger: createThrowable(error) as unknown as Logger,
  load: createThrowable(error),
});

// intentional deferred antipattern
let setLoaded: (value: boolean) => void;
const loaded = new Promise<boolean>((resolve) => {
  setLoaded = resolve;
});

/**
 * Taskless
 * Create an instance of the Taskless loader, retrieve remote configurations,
 * and take control of your third party APIs.
 */
export const taskless = (
  secret?: string,
  options?: InitOptions
): TasklessAPI => {
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
      logger,
    };
  }

  if (useNetwork && !secret) {
    return {
      ...createErrorAPI(
        new InitializationError(
          "Network is enabled, but no secret was provided."
        )
      ),
      logger,
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
    const entries = pending.splice(0, pending.length);

    // Compress the network payload into normalized form
    const networkPayload: NetworkPayload = {};
    for (const entry of entries) {
      if (useNetwork) {
        networkPayload[entry.requestId] ||= [];

        // save as number when possible for performance
        if (/^\d+$/.test(entry.value)) {
          networkPayload[entry.requestId].push({
            seq: entry.sequenceId,
            dim: entry.dimension,
            num: entry.value,
          });
        } else {
          networkPayload[entry.requestId].push({
            seq: entry.sequenceId,
            dim: entry.dimension,
            str: entry.value,
          });
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

    if (useNetwork && entries.length > 0) {
      logger.debug(
        `Flushing telemetry data to Taskless (batch size: ${Object.keys(networkPayload).length})`
      );
      logger.debug(JSON.stringify(networkPayload, null, 2));
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

    // unblock http mock, letting requests through
    setLoaded(true);
    logger.debug("Unblocking HTTP wrapper");

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

  // create the msw interceptor
  const handler = createHandler({
    loaded,
    engine: promisedEngine,
    logger,
    getRules: async () => rules,
    capture,
  });

  /** MSW instance: If one is programatically provided, use that instead */
  const msw = options?.__experimental?.msw ?? setupServer();
  msw.use(handler);

  // start listening if it is our MSW instance and not external
  if (!options?.__experimental?.msw) {
    msw.listen({
      onUnhandledRequest: "bypass",
    });
  }

  const api = {
    /** add additional local packs programatically */
    add(pack: string) {
      const data = typeof pack === "string" ? (yaml.load(pack) as Pack) : pack;
      localPacks.push(data);
    },
    /** get the current logger */
    logger,
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
export const autoload = (secret?: string, options?: InitOptions) => {
  const handleError = (error: unknown) => {
    if (error instanceof Error) {
      t.logger.error(error.message);
      // eslint-disable-next-line unicorn/no-process-exit
      process.exit(1);
    } else {
      t.logger.error(error as string);
      // eslint-disable-next-line unicorn/no-process-exit
      process.exit(1);
    }
  };

  const t = taskless(secret, options);
  t.logger.debug("Initialized Taskless");
  try {
    t.load()
      .then(() => {
        t.logger.debug("Taskless Autoloader ran successfully");
      })
      .catch((error: unknown) => {
        handleError(error);
      });
  } catch (error) {
    handleError(error);
  }
};
