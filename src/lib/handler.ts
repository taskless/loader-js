import { type Plugin } from "@extism/extism";
import { type Pack } from "@~/__generated__/pack.js";
import {
  type ConsolePayload,
  type CaptureCallback,
  type Logger,
  type PluginOutput,
} from "@~/types.js";
import { http, type HttpResponse } from "msw";
import { id } from "./id.js";
import { runSandbox } from "./sandbox.js";

/** Checks if a request is bypassed */
const isBypassed = (request: Request) => {
  return request.headers.get("x-tskl-bypass") === "1";
};

export const createHandler = ({
  loaded,
  logger,
  useLogging,
  capture,
  getPacks,
  getModules,
}: {
  loaded: Promise<boolean>;
  logger: Logger;
  useLogging: boolean;
  capture: CaptureCallback;
  getPacks: () => Promise<Pack[]>;
  getModules: () => Promise<Map<string, Promise<Plugin>>>;
}) =>
  http.all("https://*", async (info) => {
    // let a bypassed request through to any other handlers
    if (isBypassed(info.request)) {
      return undefined;
    }

    // wait for loaded to unblock (means the shim library has loaded)
    // !ok means disable the library's functionality
    const ok = await loaded;

    if (!ok) {
      return undefined;
    }

    const requestId = id();
    logger.debug(`[${requestId}] started`);

    // find matching packs from the config based on a domain match
    // on match, start an async process that makes a lua engine and saves the pack info
    const packs = await getPacks();

    const logItem: ConsolePayload = {
      requestId,
      dimensions: [],
    };

    const response = await runSandbox(
      { requestId, request: info.request },
      logger,
      packs,
      {
        async getModules() {
          // get modules from parent scope
          return getModules();
        },
        async onResult(pack: Pack, result: PluginOutput) {
          for (const [key, value] of Object.entries(result.capture ?? {})) {
            // name = @taskless/apm
            // new key to be = @taskless/apm/durationMs
            // remove an slashes from the key to prevent namespace issues
            const cleanedKey = key.replaceAll("/", "");
            const nskey = `${pack.name}/${cleanedKey}`;
            capture({
              requestId,
              dimension: nskey,
              value: `${value}`,
            });
            logItem.dimensions.push({
              name: nskey,
              value: `${value}`,
            });
          }
        },
        onError(error) {
          logger.error(`[${requestId}] error: ${error.message}`);
        },
      }
    );

    if (useLogging) {
      logger.data(JSON.stringify(logItem));
    }

    return response;
  });
