import { readFile } from "node:fs/promises";
import process from "node:process";
import { createPlugin, type Plugin } from "@extism/extism";
import { DEFAULT_FLUSH_INTERVAL } from "@~/constants.js";
import { type Manifest } from "@~/types/manifest.js";
import { type Pack } from "@~/types/pack.js";
import {
  type InitOptions,
  type CaptureCallback,
  type CaptureItem,
  type TasklessAPI,
  type MaybePromise,
} from "@~/types.js";
import { glob } from "glob";
import { setupServer } from "msw/node";
import { createHandler } from "./msw.js";
import { createErrorAPI, InitializationError } from "./util/error.js";
import { id, packIdentifier } from "./util/id.js";
import { createLogger } from "./util/logger.js";

export type * from "../types.js";
export { toUint8Array } from "uint8array-extras";

/** Autoloading interface for Taskless, hides manual pack loading and automatically initializes */
export const autoload = (options?: InitOptions) => {
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

  const t = taskless(options);
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
export const taskless = (options?: InitOptions): TasklessAPI => {
  const defaultOutput = ["console"];
  const outputOption = options?.output ?? defaultOutput;

  // finalize network and logging options
  const useLogging = outputOption.includes("console");
  const logger = createLogger(options?.logLevel, options?.log, useLogging);

  // the exiting state of the loader
  let exiting = false;

  // ref counter for outstanding interceptors
  let pipelineCount = 0;

  // a queue of pending network requests to make
  const pendingNetwork: CaptureItem[] = [];

  // a timer for flushing telemetry data
  let timer: NodeJS.Timeout;

  logger.debug(
    [
      `Taskless initialized with:`,
      `  - Logging: ${useLogging}`,
      `  - Directory: ${options?.directory ?? "none"}`,
      `  - Flush interval: ${options?.flushInterval ?? DEFAULT_FLUSH_INTERVAL}ms`,
    ].join("\n")
  );

  if (!useLogging) {
    return {
      ...createErrorAPI(
        new InitializationError(
          "Logging is disabled. No telemetry will be captured"
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

  // triggered by sigint, sigterm, etc.
  const exitHandler = () => {
    if (exiting) {
      return;
    }

    exiting = true;
    logger.debug("Shutting down Taskless");
    stopDrain();
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

  const moduleSource = new Map<string, MaybePromise<Uint8Array>>();

  /** WASM modules are added programatically or during the init step */
  const modules = new Map<string, Promise<Plugin>>();

  /** Initialization flag, ensures we passed through init */
  let initialized = false;

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
              const wasmContents = readFile(wasmPath) as Promise<Uint8Array>;
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
   * Captures a key/value data point and assigns it a sequence id
   * This is externalized from the lifecycle so that our id() function
   * creates monotonic increasing values for each telemetry point
   */
  const capture: CaptureCallback = (entry) => {
    // push data to the network queue
    if (entry.network) {
      pendingNetwork.push({
        ...entry.network,
        sequenceId: id(),
      });
      logger.debug(
        `[${entry.network.requestId}] Captured ${entry.network.dimension} as ${entry.network.value}`
      );
    }

    // push data to the console
    if (entry.console && useLogging) {
      if (logger.data) {
        logger.data(JSON.stringify(entry.console));
      } else {
        console.log(JSON.stringify(entry.console));
      }
    }

    // adjust the pipeline count
    if (entry.pipeline !== undefined) {
      pipelineCount += entry.pipeline;
      logger.trace(
        `Pipeline count is now ${pipelineCount} (incremented by ${entry.pipeline})`
      );
    }
  };

  // create the msw interceptor
  const handler = createHandler({
    loaded,
    logger,
    capture,
    getPacks: async () => packs,
    getModules: async () => modules,
    isActive: () => !exiting,
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
    /** get the current logger */
    logger,

    /** add additional local packs programatically */
    add(manifest: Manifest, wasm: Uint8Array) {
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

    /** Load all registered packs and initialize Taskless */
    async load() {
      await initialize();

      return {
        packs: packs.length,
      };
    },

    /** Shuts down Taskless, waiting for pipeline to complete */
    async shutdown(waitMs = 3000) {
      // flags shutdown and stops drain, no new data
      exiting = true;
      stopDrain();

      // Create a promise that resolves when pipelineCount reaches 0
      // or a timeout completes
      const waitForPipelineCompletion = async (): Promise<boolean> => {
        return new Promise<boolean>((resolve) => {
          if (pipelineCount === 0) {
            resolve(true);
            return;
          }

          let isResolved = false;
          const safeResolve = (value: boolean) => {
            if (!isResolved) {
              isResolved = true;
              resolve(value);
            }
          };

          // Set up an interval to check the pipeline count
          const checkInterval = setInterval(() => {
            if (pipelineCount === 0) {
              clearInterval(checkInterval);
              safeResolve(true);
            }
          }, 10); // Check every 10ms

          // Set up a timeout to fail if waitMs is exceeded
          const timeout = setTimeout(() => {
            clearInterval(checkInterval);
            safeResolve(false);
          }, waitMs);
        });
      };

      const success = await waitForPipelineCompletion();

      if (!success) {
        logger.warn(
          `Taskless shutdown timed out after ${waitMs}ms, not all telemetry may have been captured`
        );
      }
    },
  };

  return api;
};
