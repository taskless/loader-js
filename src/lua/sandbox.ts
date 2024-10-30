import process, { hrtime } from "node:process";
import { type CaptureCallback, type Logger } from "@~/types.js";
import luaGet from "./get.lua?raw";

export type Options = {
  logger: Logger;
  permissions: {
    request?: string[];
    response?: string[];
    capture?: Record<
      string,
      {
        type: string;
        description?: string;
      }
    >;
    environment?: string[];
  };
  request: Request;
  response?: Response;
  capture: {
    callback: CaptureCallback;
  };
  context: Map<string, unknown>;
};

export const createSandbox = async (requestId: string, options: Options) => {
  const { logger } = options;
  const captureKeys = Object.keys(options.permissions?.capture ?? {});
  const requestKeys = options.permissions?.request ?? [];
  const responseKeys =
    (options.response ? options.permissions?.response : undefined) ?? [];
  const environmentKeys = options.permissions?.environment ?? [];

  // log utility
  function log(message: string): void;
  function log(
    level: "trace" | "debug" | "info" | "warn" | "error",
    message?: string
  ): void;
  function log(...args: any[]): void {
    const [level, message] =
      args.length === 1 ? ["info", `${args[0]}`] : [`${args[0]}`, `${args[1]}`];

    const logFunction = logger[level as keyof typeof logger];
    if (logFunction) {
      logFunction(`[${requestId}] ${message}`);
    }
  }

  const extractBody = async (httpObject: Request | Response) => {
    const body = await httpObject.clone().text();
    try {
      return JSON.parse(body) as unknown;
    } catch {
      return body;
    }
  };

  const context = options.context;

  const env: Record<string, string | undefined> = {};
  for (const key of environmentKeys) {
    // eslint-disable-next-line n/no-process-env
    env[key] = process.env[key];
  }

  return {
    headers: [luaGet],
    variables: {
      request: {
        url: options.request.url,
        domain: new URL(options.request.url).hostname,
        path: new URL(options.request.url).pathname,
        headers: requestKeys.includes("headers")
          ? Object.fromEntries(options.request.headers.entries())
          : undefined,
        body: requestKeys.includes("body")
          ? await extractBody(options.request)
          : undefined,
      },
      response: options.response
        ? {
            status: options.response.status,
            headers: responseKeys.includes("headers")
              ? Object.fromEntries(options.response.headers.entries())
              : undefined,
            body: responseKeys.includes("body")
              ? await extractBody(options.response)
              : undefined,
          }
        : undefined,
      environment: env,
      context: {
        set(key: string, value: string | number) {
          context.set(key, value);
        },
        get(key: string) {
          return context.get(key);
        },
        unset(key: string) {
          context.delete(key);
        },
      },
      capture(key: string, value: string | number) {
        if (!captureKeys.includes(key)) {
          logger.error(`Key ${key} not listed as valid telemetry for capture`);
          return;
        }

        logger.debug(`[${requestId}] Capturing: ${key}`);

        options.capture.callback({
          requestId,
          dimension: key,
          value: `${value}`,
        });
      },
      log,
      now() {
        const hrt = hrtime();
        // eslint-disable-next-line unicorn/numeric-separators-style
        return Math.ceil(hrt[0] * 1000 + hrt[1] / 1000000);
      },
    },
  };
};
