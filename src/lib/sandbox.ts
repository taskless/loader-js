import process from "node:process";
import { type Plugin } from "@extism/extism";
import { type Pack } from "@~/__generated__/pack.js";
import { type PluginOutput, type Logger } from "@~/types.js";
import { packIdentifier } from "./id.js";

/** internal: creates a sandbox based on the pack's permissions */
const createSandbox = async (
  requestId: string,
  pack: Pack,
  info: {
    request: Request;
    response?: Response;
    context: Record<string, string>;
    configuration?: Record<string, unknown>;
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
      headers: [...info.request.headers.entries()],
      body: pack.permissions?.body
        ? await extractBody(info.request)
        : undefined,
    },
    response: info.response
      ? {
          status: info.response.status,
          headers: Object.fromEntries(info.response.headers.entries()),
          body: pack.permissions?.body
            ? await extractBody(info.response)
            : undefined,
        }
      : undefined,
    environment: env,
  };
};

type getModulesCallback = () => Promise<Map<string, Promise<Plugin>>>;
type onResultCallback = (
  pack: Pack,
  result: NonNullable<PluginOutput>
) => Promise<void>;
type onErrorCallback = (error: any) => void;
type Callbacks = {
  getModules: getModulesCallback;
  onResult: onResultCallback;
  onError: onErrorCallback;
};

/**
 * Run a sandbox with the given packs, returning the final response.
 * This is where the wasm plugins are ran on either side of the request, and simplifies the
 * handlers logic to focus on the mocking and not on the lifecycle
 */
export const runSandbox = async (
  requestInfo: {
    requestId: string;
    request: Request;
  },
  logger: Logger,
  packs: Pack[],
  callbacks: Callbacks
) => {
  const { requestId, request } = requestInfo;
  const context: Record<string, Record<string, any>> = {};
  const plugins = await callbacks.getModules();

  // run packs forward
  logger.debug(`[${requestId}] (pre) running sandbox`);
  const preHooks = await Promise.allSettled(
    packs.map(async (pack, index) => {
      const plugin = await plugins.get(packIdentifier(pack));

      if (!plugin) {
        throw new Error(`[${requestId}] Plugin not found in modules`);
      }

      // logger.debug(`[${requestId}] running pack`);

      const output = await plugin.call(
        "pre",
        JSON.stringify(
          await createSandbox(requestId, pack, {
            request,
            context: context[`${index}`] ?? {},
          })
        )
      );

      // logger.debug(`[${requestId}] pack ran`);

      const result = output?.json() as PluginOutput;

      if (result.context) {
        context[`${index}`] = result.context;
      }

      await callbacks.onResult(pack, result);
    })
  );

  for (const hook of preHooks) {
    if (hook.status === "rejected") {
      callbacks.onError(hook.reason);
    }
  }

  // run request
  const finalizedRequest = request.clone();
  finalizedRequest.headers.set("x-tskl-bypass", "1");
  const fetchResponse = await fetch(finalizedRequest);

  // run packs backwards
  logger.debug(`[${requestId}] (post) running sandbox`);
  const postHooks = await Promise.allSettled(
    packs.reverse().map(async (pack, index) => {
      const plugin = await plugins.get(packIdentifier(pack));

      if (!plugin) {
        throw new Error(`[${requestId}] Plugin not found in modules`);
      }

      const output = await plugin.call(
        "post",
        JSON.stringify(
          await createSandbox(requestId, pack, {
            request,
            response: fetchResponse,
            // context is at original (non-reversed) index
            context: context[`${packs.length - index - 1}`] ?? {},
          })
        )
      );

      const result = output?.json() as PluginOutput;

      if (result.context) {
        context[`${index}`] = result.context;
      }

      await callbacks.onResult(pack, result);
    })
  );

  for (const hook of postHooks) {
    if (hook.status === "rejected") {
      callbacks.onError(hook.reason);
    }
  }

  return fetchResponse;
};
