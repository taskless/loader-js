/* eslint-disable unicorn/numeric-separators-style */
import { hrtime } from "node:process";
import { type Logger } from "@~/types.js";
import { base64ToString, stringToBase64 } from "uint8array-extras";
import { type LuaEngine } from "wasmoon";
import { LuaError } from "./error.js";

/** Create the globally available lua functions. Must be synchronous */
export const createGlobals = () => {
  return {
    internal: undefined,
    lua: {
      now() {
        const hrt = hrtime();
        return Math.ceil(hrt[0] * 1000 + hrt[1] / 1000000);
      },
      toJSON(data: string) {
        return JSON.stringify(data);
      },
      fromJSON(data: string) {
        return JSON.parse(data) as unknown;
      },
      toBase64(data: string) {
        return stringToBase64(data);
      },
      fromBase64(data: string) {
        return base64ToString(data);
      },
    },
  };
};

type GetCurrentRequestCallback = () => Request;
export type CaptureCallback = (
  id: string,
  url: string,
  key: string,
  value: string | number
) => void;

/** Create locals - context aware lua functions */
export const createLocals = async (
  requestId: string,
  {
    logger,
    getRequest,
    capture,
  }: {
    logger: Logger;
    getRequest: GetCurrentRequestCallback;
    capture: CaptureCallback;
  }
) => {
  /** Log a message from lua to the parent process */
  function log(message: string): void;
  function log(
    level: "debug" | "info" | "warn" | "error",
    message?: string
  ): void;
  function log(...args: any[]): void {
    const [level, message] =
      args.length === 1 ? ["info", `${args[0]}`] : [`${args[0]}`, `${args[1]}`];
    if (
      level in logger &&
      typeof logger[level as keyof typeof logger] === "function"
    ) {
      logger[level as keyof typeof logger](message);
    }

    logger.info(message);
  }

  return {
    internal: {},
    lua: {
      log,
      send(key: string, value: string | number) {
        const url = getRequest().url;
        capture(requestId, url, key, value);
      },
    },
  };
};

/** Create context functions */
export const createContextFunctions = async (requestId: string) => {
  const current: Record<string, unknown> = {};

  return {
    internal: {},
    lua: {
      get(key: string) {
        return current[key];
      },
      set(key: string, value: any) {
        current[key] = value;
      },
      getRequestId() {
        return requestId;
      },
    },
  };
};

/** Create the lifecycle aware request functions */
export const createRequestFunctions = async (request: Request) => {
  let current = request;
  let body = await current.clone().text();
  let locked = false;

  const checkLock = () => {
    if (locked) {
      throw new LuaError("Unable to modify request after it has been sent");
    }
  };

  return {
    internal: {
      finalize() {
        locked = true;
        return current;
      },
      current() {
        return current.clone();
      },
    },
    lua: {
      getURL() {
        return current.url;
      },
      setURL(url: string) {
        checkLock();
        current = new Request(url, {
          method: current.method,
          headers: current.headers,
          body: current.body,
        });
      },
      getParameter(name: string) {
        const url = new URL(current.url);
        return url.searchParams.get(name);
      },
      setParameter(name: string, value: string) {
        checkLock();
        const url = new URL(current.url);
        url.searchParams.set(name, value);
        current = new Request(url.toString(), {
          method: current.method,
          headers: current.headers,
          body: current.body,
        });
      },
      getHeader(name: string) {
        return current.headers.get(name);
      },
      setHeader(name: string, value: string) {
        checkLock();
        const headers = new Headers(current.headers);
        headers.set(name, value);
        current = new Request(current.url, {
          method: current.method,
          body: current.body,
          headers,
        });
      },
      getBody() {
        return body;
      },
      setBody(data: string) {
        checkLock();
        // keep everything synchronous in lua, but update
        // the request object as well so it stays current
        body = data;
        current = new Request(current.url, {
          method: current.method,
          headers: current.headers,
          body: data,
        });
      },
    },
  };
};

export const createResponseFunctions = async (response: Response) => {
  let current = response;
  let body = await current.clone().text();
  let locked = false;

  const checkLock = () => {
    if (locked) {
      throw new LuaError("Unable to modify request after it has been sent");
    }
  };

  return {
    internal: {
      finalize() {
        locked = true;
        return current;
      },
    },
    lua: {
      getBody() {
        return body;
      },
      setBody(data: string) {
        checkLock();
        // keep everything synchronous in lua, but update
        // the request object as well so it stays current
        body = data;
        current = new Response(data, {
          status: current.status,
          statusText: current.statusText,
          headers: current.headers,
        });
      },
      getHeader(name: string) {
        return current.headers.get(name);
      },
      setHeader(name: string, value: string) {
        checkLock();
        const headers = new Headers(current.headers);
        headers.set(name, value);
        current = new Response(current.body, {
          status: current.status,
          statusText: current.statusText,
          headers,
        });
      },
      getStatus() {
        return current.status;
      },
      setStatus(status: number) {
        checkLock();
        current = new Response(current.body, {
          status,
          statusText: current.statusText,
          headers: current.headers,
        });
      },
    },
  };
};

/** Augment the lua global scope with a set of functions */
export const augment = (
  lua: LuaEngine,
  ns: string,
  functions: Record<string, (...args: any[]) => any>
) => {
  lua.global.set(ns, functions);
};

export const clean = (lua: LuaEngine, ns: string) => {
  lua.global.set(ns, null);
};

/** Create local references  */
export const references = (
  ns: string,
  functions: Record<string, (...args: any[]) => any>
) => {
  // turn all function keys into local statements referencing the global scope ns version
  return Object.entries(functions)
    .map(([key, value]) => `local ${key} = ${ns}.${key}`)
    .join("\n");
};
