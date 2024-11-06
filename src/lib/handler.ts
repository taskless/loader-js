import { type Plugin } from "@extism/extism";
import {
  type ConsolePayload,
  type CaptureCallback,
  type Logger,
  type Pack,
  type PluginOutput,
} from "@~/types.js";
import { http, type StrictResponse } from "msw";
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
    // wait for loaded to unblock (means the shim library has loaded)
    // !ok means disable the library's functionality
    const ok = await loaded;

    // let a bypassed request through to any other handlers
    if (!ok || isBypassed(info.request)) {
      return undefined;
    }

    const requestId = id();
    logger.debug(`[${requestId}] started`);

    // find matching packs from the config based on a domain match
    // on match, start an async process that makes a lua engine and saves the pack info
    const packs = await getPacks();
    logger.debug(`[${requestId}] total ${packs.length} packs`);
    const plugins = await getModules();
    logger.debug(`[${requestId}] total ${plugins.size} modules`);

    const use: Pack[] = [];
    const context: Record<string, Record<string, any>> = {};

    for (const pack of packs) {
      // skip non-domain matches
      if (!pack.permissions?.domains) {
        continue;
      }

      let matched = false;
      for (const domain of pack.permissions.domains) {
        if (new RegExp(domain).test(info.request.url)) {
          matched = true;
          break;
        }
      }

      if (!matched) {
        continue;
      }

      use.push(pack);
    }

    logger.debug(`[${requestId}] pre hooks (${use.length})`);

    const logItem: ConsolePayload = {
      requestId,
      dimensions: [],
    };

    const response = await runSandbox(requestId, info.request, use, {
      async getModules() {
        // get modules from parent scope
        return getModules();
      },
      async onResult(result: PluginOutput) {
        for (const [key, value] of Object.entries(result.capture ?? {})) {
          capture({
            requestId,
            dimension: key,
            value: `${value}`,
          });
          logItem.dimensions.push({
            name: key,
            value: `${value}`,
          });
        }
      },
      onError(error: Error) {
        logger.error(`[${requestId}] ${error.message}`);
      },
    });

    if (useLogging) {
      logger.data(JSON.stringify(logItem));
    }

    return response as StrictResponse<any>;
  });
