import {
  type CaptureItem,
  type ConsolePayload,
  type CaptureCallback,
  type HookName,
  type Logger,
  type Pack,
} from "@~/types.js";
import { http, type StrictResponse } from "msw";
import { id } from "./id.js";
import { Plugin } from "@extism/extism";

/** Checks if a request is bypassed */
const isBypassed = (request: Request) => {
  return request.headers.get("x-tskl-bypass") === "1";
};

const createSandbox = async (
  requestId: string,
  pack: Pack,
  info: {
    request: Request;
    response?: Response;
    context: Record<string, string>;
  }
) => {
  const extractBody = async (httpObject: Request | Response) => {
    const body = await httpObject.clone().text();
    try {
      return JSON.parse(body) as unknown;
    } catch {
      return body;
    }
  };

  const requestKeys = pack.permissions?.request ?? [];
  const responseKeys: string[] = /*pack.permissions?.response ??*/ [];
  const environmentKeys = pack.permissions?.environment ?? [];

  const env: Record<string, string | undefined> = {};
  for (const key of environmentKeys) {
    // eslint-disable-next-line n/no-process-env
    env[key] = process.env[key];
  }

  return {
    requestId,
    context: info.context,
    request: {
      url: info.request.url,
      domain: new URL(info.request.url).hostname,
      path: new URL(info.request.url).pathname,
      headers: requestKeys.includes("headers")
        ? Object.fromEntries(info.request.headers.entries())
        : undefined,
      body: requestKeys.includes("body")
        ? await extractBody(info.request)
        : undefined,
    },
    response: info.response
      ? {
          status: info.response.status,
          headers: responseKeys.includes("headers")
            ? Object.fromEntries(info.response.headers.entries())
            : undefined,
          body: responseKeys.includes("body")
            ? await extractBody(info.response)
            : undefined,
        }
      : undefined,
    environment: env,
  };
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
  getModules: () => Promise<Record<string, Plugin>>;
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
    logger.debug(`[${requestId}] total ${Object.keys(plugins).length} modules`);

    const use: Pack[] = [];
    const context: Record<string, Record<string, string>> = {};

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

    const preResult = await Promise.all(
      use.map(async (pack, index) => {
        try {
          const plugin = plugins[pack.name];
          const output = await plugin.call(
            "pre",
            JSON.stringify(
              await createSandbox(requestId, pack, {
                request: info.request,
                context: context[`${index}`] ?? {},
              })
            )
          );
          const result = output?.json() ?? {};

          if (result.capture) {
            // todo
          }

          if (result.context) {
            context[`${index}`] = result.context;
          }

          return result;
        } catch (e) {
          logger.error(`[${requestId}] ${e}`);
        }
        return {};
      })
    );

    console.log(preResult);

    // Fetch
    logger.debug(`[${requestId}] sending request`);
    const finalizedRequest = info.request;
    finalizedRequest.headers.set("x-tskl-bypass", "1");
    const fetchResponse = await fetch(finalizedRequest);

    logger.debug(`[${requestId}] post hooks (${use.length})`);

    const postResult = await Promise.all(
      use.reverse().map(async (pack, index) => {
        try {
          console.log(context[`${use.length - index - 1}`]);
          const plugin = plugins[pack.name];
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
          return output?.json() ?? {};
        } catch (e) {
          logger.error(`[${requestId}] ${e}`);
        }
      })
    );

    console.log(postResult);

    // if (useLogging) {
    //   logger.data(JSON.stringify(logItem));
    // }

    return fetchResponse as StrictResponse<any>;
  });
