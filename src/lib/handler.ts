import { captureFunctions } from "@~/lua/capture.bridge.js";
import { contextFunctions } from "@~/lua/context.bridge.js";
import { logFunctions } from "@~/lua/log.bridge.js";
import { usePromise } from "@~/lua/promise.js";
import { requestFunctions } from "@~/lua/request.bridge.js";
import { responseFunctions } from "@~/lua/response.bridge.js";
import { stringFunctions } from "@~/lua/string.bridge.js";
import { timeFunctions } from "@~/lua/time.bridge.js";
import {
  type CaptureCallback,
  type DenormalizedRule,
  type HookName,
  type Logger,
  type Sends,
} from "@~/types.js";
import { http, type StrictResponse } from "msw";
import { type LuaEngine } from "wasmoon";
import { id } from "./id.js";
import { runLifecycle } from "./lua.js";

/** Checks if a request is bypassed */
const isBypassed = (request: Request) => {
  return request.headers.get("x-tskl-bypass") === "1";
};

export const createHandler = ({
  loaded,
  engine,
  logger,
  getRules,
  capture,
}: {
  loaded: Promise<boolean>;
  engine: Promise<LuaEngine>;
  logger: Logger;
  getRules: () => Promise<DenormalizedRule[]>;
  capture: CaptureCallback;
}) =>
  http.all("https://*", async (info) => {
    // wait for loaded to unblock (means the shim library has loaded)
    // !ok means disable the library's functionality
    const ok = await loaded;

    // let a bypassed request through to any other handlers
    if (!ok || isBypassed(info.request)) {
      return undefined;
    }

    // our lua engine and a namespace safe for our JS bridge
    const lua = await engine;
    const requestId = id();
    logger.debug(`[${requestId}] started`);

    // build our middleware by executing every hook for a matching rule
    const hooks: Record<HookName, string[]> = {
      pre: [],
      post: [],
    };

    let sendData: Sends = {};

    const rules = await getRules();

    // load all matching hooks
    for (const rule of rules) {
      if (!rule.__.matches.test(info.request.url)) {
        continue;
      }

      // pre lifecycle is in forward order
      if (rule.hooks?.pre) {
        sendData = {
          ...sendData,
          ...rule.__.sendData,
        };
        hooks.pre.push(rule.hooks.pre.trim());
      }

      // post lifecycle is in reverse order
      if (rule.hooks?.post) {
        sendData = {
          ...sendData,
          ...rule.__.sendData,
        };
        hooks.post.unshift(rule.hooks.post.trim());
      }
    }

    const [logLibrary, stringLibrary, timeLibrary, contextLibrary] =
      await Promise.all([
        logFunctions({ logger }),
        stringFunctions({ logger }),
        timeFunctions({ logger }),
        contextFunctions({ logger }),
      ]);

    const [requestLibrary, tasklessLibrary] = await Promise.all([
      requestFunctions({ logger }, { request: info.request }),
      captureFunctions(
        {
          logger,
        },
        {
          capture,
          requestId,
          sends: sendData,
        }
      ),
    ]);

    const requestLocals = {
      // available non-namespaced
      ...logLibrary.functions,
      ...stringLibrary.functions,
      ...timeLibrary.functions,
      // in namespace
      context: contextLibrary.functions,
      request: requestLibrary.functions,
      taskless: tasklessLibrary.functions,
    };

    // PRE lifecycle
    await runLifecycle(
      lua,
      {
        set: requestLocals,
        blocks: hooks.pre,
        async: ["request.getBody"],
        headers: [await usePromise(lua)],
      },
      { logger, debugId: `${requestId}.hooks.pre` }
    );

    // Finalize and capture key data
    const finalizedRequest = requestLibrary.internal.finalize();
    capture({
      requestId,
      dimension: "url",
      value: finalizedRequest.url,
      type: "string",
    });
    capture({
      requestId,
      dimension: "domain",
      value: new URL(finalizedRequest.url).hostname,
      type: "string",
    });

    // Fetch
    finalizedRequest.headers.set("x-tskl-bypass", "1");
    const fetchResponse = await fetch(finalizedRequest);

    // add to our locals for the response
    const responseLibrary = await responseFunctions(
      { logger },
      { response: fetchResponse }
    );

    const responseLocals = {
      ...requestLocals,
      response: responseLibrary.functions,
    };

    // POST lifecycle
    await runLifecycle(
      lua,
      {
        set: responseLocals,
        blocks: hooks.post,
        async: ["request.getBody", "response.getBody"],
        headers: [await usePromise(lua)],
      },
      { logger, debugId: `${requestId}.hooks.post` }
    );

    return responseLibrary.internal.finalize() as StrictResponse<any>;
  });
