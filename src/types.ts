import { type NormalizeOAS, type OASOutput } from "fets";
import { type SetupServerApi } from "msw/node";
import type openapi from "./__generated__/openapi.js";

export function isDefined<T>(value: T): value is NonNullable<T> {
  return value !== undefined && value !== null;
}

export function isLogLevel(value: unknown): value is LogLevel {
  return (
    typeof value === "string" &&
    ["debug", "info", "warn", "error"].includes(value)
  );
}

export type MaybePromise<T> = T | Promise<T>;

type LogLevel = "debug" | "info" | "warn" | "error";

export type Logger = {
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
   * Specify a host for receiving Taskless data. Defaults to "data.tskl.es"
   */
  host?: string;
  /**
   * Override the logging object, defaults to console for all operations
   */
  log?: Partial<Logger>;
  /**
   * Logging level. Defaults to "info"
   */
  logLevel?: LogLevel;
  /**
   * Force logging of all data elements requests, even when network is enabled
   */
  forceLog?: boolean;
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

/** Describes the Taskless configuration */
export type Config = OASOutput<
  NormalizeOAS<typeof openapi>,
  "/{version}/config",
  "get"
>;
/** Describes a pack in the Config */
export type Pack = Config["packs"][number];
/** Describes a rule in the Pack */
export type Rule = Pack["rules"][number];
/** Creates a pick-list of valid hook types */
export type HookName = keyof NonNullable<Rule["hooks"]>;

/** Describes a denormalized rule, supplemented with information from its parent object(s) */
export type DenormalizedRule = Rule & {
  __: {
    matches: RegExp;
    packName: string;
    packVersion: string;
    configOrganizationId: string;
  };
};

export type Entry = {
  requestId: string;
  url: string;
  dimension: string;
  value: string | number;
};

export type NetworkPayload = Record<
  string,
  Record<string, Array<[string, string | number]>>
>;

export type ConsolePayload = Entry;
