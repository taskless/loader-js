import { type OASInput, type NormalizeOAS, type OASOutput } from "fets";
import { type SetupServerApi } from "msw/node";
import type openapi from "./__generated__/openapi.js";

export function isDefined<T>(value: T): value is NonNullable<T> {
  return value !== undefined && value !== null;
}

export function isLogLevel(value: unknown): value is LogLevel {
  return (
    typeof value === "string" &&
    ["trace", "debug", "info", "warn", "error"].includes(value)
  );
}

export type MaybePromise<T> = T | Promise<T>;

type LogLevel = "trace" | "debug" | "info" | "warn" | "error";

export type Logger = {
  trace?: (message: string) => void;
  debug: (message: string) => void;
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
  data: (ndjson: string) => void;
};

export type InitOptions = {
  /**
   * Disable the network by setting this to `false` logs will be output
   * via the value of options.log at the `info` level
   */
  network?: boolean;
  /**
   * Specify an endpoint for receiving Taskless data. Defaults to "https://data.tskl.es"
   */
  endpoint?: string;
  /**
   * Override the logging object, defaults to console for all operations
   */
  log?: Partial<Logger>;
  /**
   * Logging level. Defaults to "info"
   */
  logLevel?: LogLevel;
  /**
   * Force logging of all data elements requests, even when network is enabled. Defaults to !network
   */
  logging?: boolean;
  /**
   * Set a flush interval different from the default 2000ms
   */
  flushInterval?: number;
  /**
   * Experimental options for Taskless
   */
  __experimental?: {
    /**
     * Enable MSW for local development
     */
    msw?: SetupServerApi;
  };
};

export type TasklessAPI = {
  logger: Logger;
  add(pack: string | Pack): void;
  addDefaultPacks(): void;
  flush(): Promise<void>;
  flushSync(): void;
  load(): Promise<{
    network: boolean;
    packs: number;
  }>;
};

/** Describes the Taskless configuration */
export type Config = OASOutput<
  NormalizeOAS<typeof openapi>,
  "/{version}/config",
  "get"
>;
/** Describes a pack in the Config */
export type Pack = Config["packs"][number];
/** Creates a pick-list of valid hook types */
export type HookName = keyof NonNullable<Pack["hooks"]>;
/** Pack sends collection */
export type Permissions = Pack["permissions"];

export function isConfig(value?: unknown): value is Config {
  if (!value || typeof value !== "object" || value === null) {
    return false;
  }

  const check = value as Config;

  if (
    check.organizationId !== undefined &&
    Array.isArray(check.packs) &&
    check.schema !== undefined
  ) {
    return true;
  }

  return false;
}

export function isPack(value?: unknown): value is Pack {
  if (!value || typeof value !== "object" || value === null) {
    return false;
  }

  const check = value as Pack;

  if (
    check.name !== undefined &&
    check.schema !== undefined &&
    check.version !== undefined
  ) {
    return true;
  }

  return false;
}

/** Network payload intended for Taskless */
export type NetworkPayload = NonNullable<
  OASInput<NormalizeOAS<typeof openapi>, "/{version}/events", "post", "json">
>;

/** Console payload intended for stdout */
export type ConsolePayload = {
  /** The request ID. Can be used on the backend to merge related logs from a request */
  requestId: string;
  /** The sequenceIDs connected to this log entry */
  sequenceIds: string[];
  /** The dimension name & value that are recorded */
  dimensions: Array<{
    name: string;
    value: string;
  }>;
};

/** The object generated during a telemetry capture */
export type CaptureItem = {
  requestId: string;
  sequenceId: string;
  dimension: string;
  value: string;
};

/** The capture callback does not include a sequence id by default. It is added later */
export type CaptureCallback = (entry: Omit<CaptureItem, "sequenceId">) => void;
