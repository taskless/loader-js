import { type SetupServerApi } from "msw/node";

export type MaybePromise<T> = T | Promise<T>;

type RequestInterpreter<T> = (request: Request) => MaybePromise<T>;

type MetadataValue = string | number | boolean | undefined;

export type InitOptions = {
  /**
   * Enables local mode. No outbound requests will be made to Taskless. Most
   * commonly used with the "log" property to use the Taskless interceptor
   * with an existing logdrain
   */
  local?: boolean;
  /**
   * Specify the "machine ID" in a distributed environment. When performing
   * local logging, this helps create uniqueness in the event IDs by ensuring
   * two machines are generating different IDs within the same milisecond
   * of precision. Defaults to process.pid % 1024, which is suitable for most
   * use cases. Range 0-1023.
   */
  machineId?: number;
  /**
   * Specify a logger to begin logging structued data. Useful if you already
   * have a logdrain you'd like to use
   */
  log?: (message: string) => any;
  __experimental?: {
    /** Experimental: Replace the MSW library used, or BYO */
    msw?: SetupServerApi | unknown;
    /** Experimental: Change the Taskless logging endpoint */
    endpoints?: {
      ingest?: string;
      payload?: string;
    };
  };
};

export type TasklessInit = (
  secret: string,
  options?: InitOptions
) => TasklessCoreAPI;

export type Matcher = string | RequestInterpreter<boolean>;

export type CaptureOptions = {
  exclude?: boolean;
  payloads?: boolean;
  metadata?: Record<string, MetadataValue>;
};

export type TasklessCoreAPI = {
  capture: (
    matcher: Matcher,
    options?: CaptureOptions | RequestInterpreter<CaptureOptions>
  ) => undefined;
};

export type RequestEvent = {
  url: string;
  statusCode: number;
  payloads?: {
    request?: Request;
    response?: Response;
  };
  metadata?: Record<string, MetadataValue>;
  /** The duration of the request, undefined if a duration could not be determined */
  durationMs?: number;
};

export type LogEntry = {
  /** Describes the type of entry, using common structured JSON logging identifiers */
  level: "debug" | "info" | "warning" | "error";
  /** Identifies the LogEntry version */
  v: 1;
  /** An event identifier, unique per event */
  id: string;
  /** The URL associated with the event */
  url: string;
  /** In the event of an error, this contains either the exception or the status text from response headers */
  error?: string;
  /** The status code of the request, or `0` for an error generated outside of the request lifecycle */
  statusCode?: number;
  /** The duration in miliseconds of the request */
  durationMs?: number;
  /** The metadata associated with the event */
  metadata?: Record<string, MetadataValue>;
};
