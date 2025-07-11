import process from "node:process";
import { type Pack } from "@~/__generated__/pack.js";
import { type Logger } from "@~/types.js";
import { type LifecycleCallbacks } from "./lifecycle/types.js";
import { runPackLifecycle } from "./lifecycle.js";

const isDefined = <T>(value: T | undefined): value is T => {
  return Boolean(value && value !== undefined);
};

/**
 * Run a sandbox with the given packs, returning the final response.
 * This is where the wasm plugins are ran on either side of the request, and simplifies the
 * handlers logic to focus on the mocking and not on the lifecycle
 */
export const run = async (
  requestInfo: {
    requestId: string;
    request: Request;
  },
  logger: Logger,
  packs: Pack[],
  callbacks: LifecycleCallbacks
) => {
  const { requestId, request } = requestInfo;
  const context: Record<string, Record<string, any>> = {};

  /*
  Pre hook handling. Create a collection of promises that receive the
  request object and return a promise that resolves when the pack is done.
  */
  logger.debug(`[${requestId}] (pre) running sandbox`);
  const pre = runPackLifecycle(requestId, "pre", packs, {
    request: request.clone(),
    // response
    logger,
    callbacks,
    context,
  });

  logger.debug(`[${requestId}] making request`);
  const finalizedRequest = request.clone();
  finalizedRequest.headers.set("x-tskl-bypass", "1");
  const rawResponse = await fetch(finalizedRequest);
  await pre;

  // GZIP headers are being handled by undici and must be stripped
  const newHeaders: Array<[string, string]> = [...rawResponse.headers.entries()]
    .map(([key, value]) => {
      // remove content encoding
      if (key === "content-encoding") {
        return undefined;
      }

      // remove content length (with fetch unpacking, we must rely on native header interpretation)
      if (key === "content-length") {
        return undefined;
      }

      return [key, value] as [string, string];
    })
    .filter(isDefined);
  const cleanedResponse = new Response(rawResponse.body, {
    status: rawResponse.status,
    statusText: rawResponse.statusText,
    headers: newHeaders,
  });

  logger.debug(`[${requestId}] (chunk) running sandbox`);
  const chunks = runPackLifecycle(requestId, "chunk", packs, {
    request,
    response: cleanedResponse.clone(),
    logger,
    callbacks,
    context,
  });

  logger.debug(`[${requestId}] (post) running sandbox`);
  const post = runPackLifecycle(requestId, "post", packs, {
    request,
    response: cleanedResponse.clone(),
    logger,
    callbacks,
    context,
  });

  Promise.allSettled([chunks, post])
    .then(() => {
      // finalize the request for local logging
      callbacks.onComplete(requestId);
    })
    .catch(() => {
      // empty. Errors are handled inside of the lifecycle
    });

  return cleanedResponse;
};
