import { type SetupServerApi } from "msw/node";

export type MaybePromise<T> = T | Promise<T>;

type RequestInterpreter<T> = (request: Request) => MaybePromise<T>;

export type InitOptions = {
  /**
   * Enables local mode. No outbound requests will be made to Taskless. Most
   * commonly used with the "log" property to use the Taskless interceptor
   * with an existing logdrain
   */
  local?: boolean;
  /**
   * Specify a logger to begin logging structued data. Useful if you already
   * have a logdrain you'd like to use
   */
  log?: (json: string) => any;
  __experimental?: {
    /** Experimental: Replace the MSW library used, or BYO */
    msw?: SetupServerApi | unknown;
    /** Experimental: Change the Taskless logging endpoint */
    endpoint?: string;
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
  metadata?: Record<string, unknown>;
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
  /** The duration of the request, undefined if a duration could not be determined */
  duration?: number;
};
