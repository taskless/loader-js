import { type OASInput, type NormalizeOAS } from "fets";
import { type SetupServerApi } from "msw/node";
import { type Manifest } from "./__generated__/manifest.js";
import { type Pack } from "./__generated__/pack.js";
import { type Schema } from "./__generated__/schema.js";
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

export function isOutput(value: unknown): value is Output {
  return typeof value === "string" && ["network", "console"].includes(value);
}

export type MaybePromise<T> = T | Promise<T>;

export { type Pack } from "./__generated__/pack.js";
export { type Manifest } from "./__generated__/manifest.js";

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error";

export type Logger = {
  trace?: (message: string) => void;
  debug: (message: string) => void;
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
  data: (ndjson: string) => void;
};

export type Output = "network" | "console";

export type InitOptions = {
  /**
   * Load Taskless packs from a local directory
   */
  directory?: string;
  /**
   * Specify an endpoint for the Taskless Cloud requests. Defaults to "https://data.tskl.es"
   */
  endpoint?: string;
  /**
   * Set a flush interval different from the default 2000ms
   */
  flushInterval?: number;
  /**
   * Override the logging object, defaults to console for all operations
   */
  log?: Partial<Logger>;
  /**
   * Logging level. Defaults to "info"
   */
  logLevel?: LogLevel;
  /**
   * Change the default output of Taskless telemetry data.
   * If you've provided an API key, this will default to `["network"]`.
   * If you have not provided an API key, this will default to `["console"].
   */
  output?: Output[];
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
  add(pack: Pack, wasm: Uint8Array): void;
  shutdown(waitMs?: number): Promise<void>;
  load(): Promise<{
    network: boolean;
    packs: number;
  }>;
};

/** Pack sends collection */
export type Permissions = Pack["permissions"];

export function isConfig(value?: unknown): value is Schema {
  if (!value || typeof value !== "object" || value === null) {
    return false;
  }

  const check = value as Schema;

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
export type CaptureCallback = (item: {
  network?: Omit<CaptureItem, "sequenceId">;
  console?: ConsolePayload;
  pipeline?: number;
}) => void;

export type PluginInput<
  TContext = unknown,
  TRequestBody = unknown,
  TResponseBody = unknown,
> = {
  request: {
    domain: string;
    path: string;
    url: string;
    method: string;
    headers?: Array<[string, string]>;
    body?: TRequestBody;
  };
  response?: {
    status: number;
    headers?: Array<[string, string]>;
    body?: TResponseBody;
  };
  chunk?: string; // base64 encoded chunk
  requestId: string;
  context: TContext;
  environment: Record<string, string | undefined> | undefined;
} & Pick<Pack, "configuration">;

export type PluginOutput<TContext = unknown> = {
  capture?: Record<string, string | number>;
  context?: TContext;
};
