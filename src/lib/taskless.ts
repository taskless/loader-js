import { readFile } from "node:fs/promises";
import process from "node:process";
import { Worker } from "node:worker_threads";
import { createPlugin, type Plugin } from "@extism/extism";
import { type Manifest } from "@~/__generated__/manifest.js";
import { type Pack } from "@~/__generated__/pack.js";
import { type Schema } from "@~/__generated__/schema.js";
import {
  bypass,
  DEFAULT_FLUSH_INTERVAL,
  noop,
  TASKLESS_HOST,
  emptyConfig,
} from "@~/constants.js";
import {
  type InitOptions,
  type NetworkPayload,
  type CaptureCallback,
  type CaptureItem,
  type TasklessAPI,
  type Logger,
  type MaybePromise,
} from "@~/types.js";
import { createClient, type NormalizeOAS } from "fets";
import { glob } from "glob";
import { setupServer } from "msw/node";
import { InitializationError } from "./error.js";
import { createHandler } from "./handler.js";
import { id, packIdentifier } from "./id.js";
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

/** @deprecated */
type DeprecatedInitOptions = {
  /**
   * @deprecated Use `output` instead as "output": ["network"]
   * Disable the network by setting this to `false` logs will be output
   * via the value of options.log at the `info` level
   */
  network?: boolean;
  /**
   * @deprecated Use `output` instead as "output": ["console"]
   * Force logging of all data elements requests, even when network is enabled. Defaults to !network
   */
  logging?: boolean;
};

/**
 * Taskless
 * Create an instance of the Taskless loader, retrieve remote configurations,
 * and take control of your third party APIs.
 */
export const taskless = (
  secret?: string,
  options?: InitOptions & DeprecatedInitOptions
): TasklessAPI => {
  // deprecated values
  const useDeprecatedOptions =
    options?.network !== undefined || options?.logging !== undefined;
  const deprecatedNetworkOption = Boolean(
    options?.network ?? (secret && secret.length > 0)
  );
  const deprecatedLoggingOption = Boolean(
    options?.logging ?? !deprecatedNetworkOption
  );

  const defaultNetwork =
    Boolean(secret) && typeof secret === "string" && secret.length > 0;
  const defaultOutput = [defaultNetwork ? "network" : "console"];
  const outputOption = options?.output ?? defaultOutput;

  // finalize network and logging options
  const useNetwork = useDeprecatedOptions
    ? deprecatedNetworkOption
    : outputOption.includes("network");
  const useLogging = useDeprecatedOptions
    ? deprecatedLoggingOption
    : outputOption.includes("console");

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
    [
      `Taskless initialized with:`,
      `  - Network: ${useNetwork}`,
      `  - Logging: ${useLogging}`,
      `  - Endpoint: ${activeEndpoint}`,
      `  - Directory: ${options?.directory ?? "none"}`,
      `  - Flush interval: ${options?.flushInterval ?? DEFAULT_FLUSH_INTERVAL}ms`,
    ].join("\n")
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

  /** Flush all pending telemetry asynchronously */
  const flush = async () => {
    logger.trace("Flushing telemetry data");
    const entries = pending.splice(0, pending.length);
    const networkPayload = useNetwork
      ? entriesToNetworkJson(entries)
      : undefined;

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
          headers: {
            authorization: `Bearer ${secret}`,
            ...bypass,
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
                ...bypass,
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
  };

  let exiting = false;
  const exitHandler = () => {
    if (exiting) {
      return;
    }

    exiting = true;
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

  /** Packs are added programatically or during the init step */
  const packs: Pack[] = [];

  const moduleSource = new Map<string, MaybePromise<ArrayBuffer>>();

  /** WASM modules are added programatically or during the init step */
  const modules = new Map<string, Promise<Plugin>>();

  /** Initialization flag, ensures we passed through init */
  let initialized = false;

  /**
   * Fetches the config, storing the result in a promise to resolve later.
   * Using a promise keeps taskless() synchronous for JS loaders and avoid
   * race conditions.
   */
  const promisedConfig: Promise<Schema | undefined> = (async () => {
    if (!secret) {
      return undefined;
    }

    logger.debug("Retrieving configuration from Taskless");
    const response = await client["/{version}/config"].get({
      headers: {
        authorization: `Bearer ${secret}`,
        ...bypass,
      },
      params: {
        version: "pre2",
      },
    });

    if (!response.ok) {
      logger.error(
        `Failed to fetch configuration: ${response.status} ${response.statusText}. Taskless will not apply rules.`
      );
      return emptyConfig;
    }

    const data = (await response.json()) as Schema;

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

    // copy packs from the config into module source
    const config = await promisedConfig;
    const seen = new Set<string>();

    if (options?.directory) {
      logger.debug("Initializing local packs from directory");
      const { directory } = options;

      // glob the dir for manifest.json files
      // for each hit, load a manifest, config, and wasm file
      // merge the manifest with the config
      // packs push of the finalized pack
      // set the module source to the wasm file
      const results = await glob(`${directory}/**/manifest.json`, {
        absolute: true,
      });

      try {
        await Promise.all(
          results.map(async (manifestPath) => {
            const configPath = manifestPath.replace(
              /manifest\.json$/,
              "config.json"
            );
            const wasmPath = manifestPath.replace(
              /manifest\.json$/,
              "pack.wasm"
            );
            try {
              const manifestContents = await readFile(manifestPath, "utf8");
              const manifest = JSON.parse(manifestContents) as Manifest;
              const configContents = await readFile(configPath, "utf8");
              const config = JSON.parse(configContents) as {
                configuration: Pack["configuration"];
                url: Pack["url"];
              };
              const wasmContents = readFile(wasmPath);
              const pack: Pack = {
                ...config,
                ...manifest,
              };
              const ident = packIdentifier(pack);
              seen.add(ident);
              packs.push(pack);
              moduleSource.set(ident, wasmContents);
            } catch (error) {
              console.warn(error instanceof Error ? error.message : error);
            }
          })
        );
      } catch {
        // errors were logged to console, but do not block the load or crash the app
      }
    }

    if (config) {
      logger.debug("Initializing remote packs");
      for (const pack of config.packs ?? []) {
        const ident = packIdentifier(pack as Pack);
        if (seen.has(ident)) {
          continue;
        }

        seen.add(ident);
        packs.push(pack as Pack);
        moduleSource.set(
          ident,
          (async () => {
            logger.trace(`Fetching ${ident} from ${pack.url.source}`);
            const data = await fetch(pack.url.source, {
              headers: {
                ...bypass,
              },
            });
            logger.trace(`Fetched ${ident} from ${pack.url.source}`);
            return data.arrayBuffer();
          })()
        );
      }
    }

    await Promise.all(
      Array.from(moduleSource.entries()).map(async ([ident, source]) => {
        modules.set(
          ident,
          createPlugin(
            {
              wasm: [{ data: await Promise.resolve(source) }],
            },
            { useWasi: true }
          )
        );
      })
    );

    logger.debug(
      `Initialized ${modules.size} wasm modules across ${packs.length} packs`
    );

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
    logger,
    useLogging,
    capture,
    getPacks: async () => packs,
    getModules: async () => modules,
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
    add(manifest: Manifest, wasm: ArrayBuffer) {
      if (initialized) {
        throw new Error("A pack was added after Taskless was initialized");
      }

      const pack: Pack = {
        ...manifest,
        url: { source: "", signature: "" },
      };

      const ident = packIdentifier(pack);

      packs.push(pack);
      moduleSource.set(ident, wasm);
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
