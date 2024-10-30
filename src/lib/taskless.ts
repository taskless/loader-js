import process, { exit } from "node:process";
import { Worker, MessageChannel } from "node:worker_threads";
import {
  bypass,
  DEFAULT_FLUSH_INTERVAL,
  noop,
  TASKLESS_HOST,
  emptyConfig,
} from "@~/constants.js";
import {
  type Pack,
  type InitOptions,
  type NetworkPayload,
  type CaptureCallback,
  type CaptureItem,
  type TasklessAPI,
  type Logger,
  type Config,
  isConfig,
  isPack,
  type ConsolePayload,
} from "@~/types.js";
import { createClient, type NormalizeOAS } from "fets";
import yaml from "js-yaml";
import { setupServer } from "msw/node";
import { LuaFactory } from "wasmoon";
import defaultConfig from "../__generated__/config.yaml?raw";
import { InitializationError } from "./error.js";
import { createHandler } from "./handler.js";
import { id } from "./id.js";
import { createLogger } from "./logger.js";
import type openapi from "../__generated__/openapi.js";

// our on-demand worker code for a synchronous flush
const workerCode = /* js */ `
const {
  parentPort, workerData: { notifyHandle, data }
} = require('worker_threads');

const run = async () => {
  try {
    await fetch(data.url, data.requestInit);
  }
  catch {}
  finally {
    Atomics.store(notifyHandle, 0, 1);
    Atomics.notify(notifyHandle, 0);
  }
};

// ensure we run on the next tick
setTimeout(run, 0);
`;

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
  addDefaultPacks: createThrowable(error),
  flush: createThrowable(error),
  flushSync: createThrowable(error),
  logger: createThrowable(error) as unknown as Logger,
  load: createThrowable(error),
});

// intentional deferred antipattern - loaded is used to unblock the HTTP wrapper
// it may be checked multiple times, and we rely on the A+ spec to ensure it is
// resolved once with the same value. Like a massive awaited "onReady"
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

  const activeEndpoint = (options?.endpoint ?? TASKLESS_HOST).replace(
    /\/$/,
    ""
  );
  const logger = createLogger(options?.logLevel, options?.log);
  const client = createClient<NormalizeOAS<typeof openapi>>({
    endpoint: activeEndpoint,
    globalParams: {
      headers: {
        authorization: `Bearer ${secret}`,
        ...bypass,
      },
    },
  });
  const pending: CaptureItem[] = [];
  let timer: NodeJS.Timeout;

  logger.debug(
    yaml.dump({
      resolved: {
        useNetwork,
        useLogging,
        activeEndpoint,
      },
      original: {
        network: options?.network,
        logging: options?.logging,
        endpoint: options?.endpoint,
        logLevel: options?.logLevel,
      },
    })
  );

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
      logger.trace("Flushing telemetry data");
      flush().catch(noop); // discard flush errors
      startDrain();
    }

    /** Timeout lets GC run with one reference to the flush function */
    timer = setTimeout(
      flushAndRestart,
      options?.flushInterval ?? DEFAULT_FLUSH_INTERVAL
    );
  }

  function stopDrain() {
    clearTimeout(timer);
  }

  /** Convert a set of log entries to compressed network payload */
  const entriesToNetworkJson = (entries: CaptureItem[]) => {
    const networkPayload: NetworkPayload = {};
    for (const entry of entries) {
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

    return networkPayload;
  };

  /** Sends a set of entries to the registered logging function */
  const logEntries = (entries: CaptureItem[]) => {
    // group all entries by their request id
    const grouped = new Map<string, ConsolePayload>();

    // convert entries to the grouped structure
    for (const entry of entries) {
      const group = grouped.get(entry.requestId) ?? {
        requestId: entry.requestId,
        sequenceIds: [],
        dimensions: [],
      };

      group.sequenceIds.push(entry.sequenceId);
      group.dimensions.push({
        name: entry.dimension,
        value: entry.value,
      });

      grouped.set(entry.requestId, group);
    }

    for (const [_id, line] of grouped.entries()) {
      logger.data(JSON.stringify(line));
    }
  };

  /** Flush all pending telemetry asynchronously */
  const flush = async () => {
    logger.trace("Flushing telemetry data");
    const entries = pending.splice(0, pending.length);
    const networkPayload = useNetwork
      ? entriesToNetworkJson(entries)
      : undefined;

    if (useLogging) {
      logEntries(entries);
    }

    if (
      useNetwork &&
      networkPayload &&
      Object.keys(networkPayload).length > 0
    ) {
      logger.trace(
        `Flushing telemetry data to Taskless (batch size: ${Object.keys(networkPayload).length})`
      );

      try {
        await client["/{version}/events"].post({
          json: networkPayload,
          params: {
            version: "v1",
          },
        });
      } catch {}
    }
  };

  /**
   * Synchronous flush. Performs a final send of pending telemetry data
   * uses a worker thread and Atomics to make the final http call
   * appear synchronous in the main thread before completely exiting.
   */
  const flushSync = () => {
    const entries = pending.splice(0, pending.length);
    logger.trace(`Flushing (sync) ${entries.length} entries`);
    if (entries.length === 0) {
      return;
    }

    const networkPayload = useNetwork
      ? entriesToNetworkJson(entries)
      : undefined;

    if (
      useNetwork &&
      networkPayload &&
      Object.keys(networkPayload).length > 0
    ) {
      // worker setup
      const notifyHandle = new Int32Array(new SharedArrayBuffer(4));

      logger.trace("Spawning worker");

      const w = new Worker(workerCode, {
        eval: true,
        workerData: {
          notifyHandle,
          data: {
            url: `${activeEndpoint}/v1/events`,
            requestInit: {
              method: "POST",
              headers: {
                authorization: `Bearer ${secret}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(networkPayload),
            },
          },
        },
      });
      // wait for notify
      logger.trace("Wait for notify");
      Atomics.wait(notifyHandle, 0, 0);
      w.terminate();
    }

    if (useLogging) {
      logEntries(entries);
    }
  };

  const exitHandler = () => {
    logger.debug("Shutting down Taskless");
    stopDrain();
    flushSync();
  };

  for (const event of [
    "exit",
    "SIGINT",
    "SIGTERM",
    "SIGBREAK",
    "beforeExit",
    "uncaughtException",
  ]) {
    process.on(event, exitHandler);
  }

  /** A lua factory for creating WASM VMs */
  const factory = new LuaFactory();

  /** Packs are added programatically or during the init step */
  const packs: Pack[] = [];

  /** Initialization flag, ensures we passed through init */
  let initialized = false;

  /**
   * Fetches the config, storing the result in a promise to resolve later.
   * Using a promise keeps taskless() synchronous for JS loaders and avoid
   * race conditions.
   */
  const promisedConfig: Promise<Config | undefined> = (async () => {
    if (!secret) {
      return undefined;
    }

    const response = await client["/{version}/config"].get({
      headers: {
        authorization: `Bearer ${secret}`,
      },
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
      `Retrieved configuration from Taskless (orgId: ${data.organizationId}, schema: ${data.schema})`
    );

    return data;
  })();

  /** Initialize all local rules and ensure remote rules are loaded */
  const initialize = async () => {
    if (initialized) {
      throw new InitializationError(
        "Taskless has already been initialized. Did you mean to include autoload: false?"
      );
    }

    // freeze
    initialized = true;

    // copy packs from the config
    const config = await promisedConfig;

    if (config) {
      for (const pack of config.packs ?? []) {
        packs.unshift(pack);
      }
    }

    // start the drain
    startDrain();
    logger.trace("Drain started");

    // unblock http mock, letting requests through
    setLoaded(true);
    logger.trace("Unblocking HTTP wrapper");
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
    factory,
    logger,
    capture,
    getPacks: async () => packs,
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
    /** add additional local packs programatically, or an entire configuration */
    add(packOrConfig: string) {
      if (initialized) {
        throw new Error("A pack was added after Taskless was initialized");
      }

      const data =
        typeof packOrConfig === "string"
          ? yaml.load(packOrConfig)
          : packOrConfig;

      const loadedConfig: Config = isConfig(data)
        ? data
        : {
            schema: 1,
            organizationId: "none",
            packs: [...(isPack(data) ? [data] : [])],
          };

      packs.push(...loadedConfig.packs);
    },

    addDefaultPacks() {
      const config = yaml.load(defaultConfig, {
        schema: yaml.FAILSAFE_SCHEMA,
      }) as Config;

      for (const pack of config.packs) {
        packs.push(pack);
      }
    },

    /** get the current logger */
    logger,

    /** Explicitly flush any pending logs. Useful before shutting down to ensure all events are captured */
    async flush() {
      clearTimeout(timer);
      return flush();
    },

    /** Flush all pending logs synchronously */
    flushSync,

    /** Load all registered packs and initialize Taskless */
    async load() {
      await initialize();

      return {
        network: useNetwork,
        packs: packs.length,
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
      process.exit(1);
    } else {
      t.logger.error(error as string);
      process.exit(1);
    }
  };

  const t = taskless(secret, options);
  t.logger.debug("Initialized Taskless");
  try {
    if (!secret) {
      t.addDefaultPacks();
    }

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

export type * from "../types.js";
