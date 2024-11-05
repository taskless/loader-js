import { type Plugin } from "@extism/extism";
import {
  type CaptureItem,
  type ConsolePayload,
  type CaptureCallback,
  type Logger,
  type Pack,
  type PluginOutput,
} from "@~/types.js";
import { http, type StrictResponse } from "msw";
import { id } from "./id.js";
import { createSandbox, getModuleName } from "./sandbox.js";

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

    await Promise.all(
      use.map(async (pack, index) => {
        try {
          const plugin = await plugins.get(getModuleName(pack));

          if (!plugin) {
            throw new Error(
              `Plugin ${getModuleName(pack)} not found in modules`
            );
          }

          const output = await plugin.call(
            "pre",
            JSON.stringify(
              await createSandbox(requestId, pack, {
                request: info.request,
                context: context[`${index}`] ?? {},
              })
            )
          );
          const result = (output?.json() ?? {}) as
            | PluginOutput
            | Record<string, undefined>;

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

          if (result.context) {
            context[`${index}`] = result.context;
          }

          return result;
        } catch (error) {
          logger.error(`[${requestId}] ${error as any}`);
        }

        return {};
      })
    );

    // Fetch
    logger.debug(`[${requestId}] sending request`);
    const finalizedRequest = info.request;
    finalizedRequest.headers.set("x-tskl-bypass", "1");
    const fetchResponse = await fetch(finalizedRequest);

    logger.debug(`[${requestId}] post hooks (${use.length})`);

    await Promise.all(
      use.reverse().map(async (pack, index) => {
        try {
          const plugin = await plugins.get(getModuleName(pack))!;

          if (!plugin) {
            throw new Error(
              `Plugin ${getModuleName(pack)} not found in modules`
            );
          }

          const output = await plugin.call(
            "post",
            JSON.stringify(
              await createSandbox(requestId, pack, {
                request: info.request,
                response: fetchResponse,
                // context is at original (non-reversed) index
                context: context[`${use.length - index - 1}`] ?? {},
              })
            )
          );

          const result = (output?.json() ?? {}) as
            | PluginOutput
            | Record<string, undefined>;

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

          return result;
        } catch (error) {
          logger.error(`[${requestId}] ${error as any}`);
        }

        return {};
      })
    );

    if (useLogging) {
      logger.data(JSON.stringify(logItem));
    }

    return fetchResponse as StrictResponse<any>;
  });
