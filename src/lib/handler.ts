import { createSandbox, type Options } from "@~/lua/sandbox.js";
import {
  type CaptureCallback,
  type HookName,
  type Logger,
  type Pack,
} from "@~/types.js";
import { http, type StrictResponse } from "msw";
import { type LuaFactory, type LuaEngine } from "wasmoon";
import { id } from "./id.js";

/** Checks if a request is bypassed */
const isBypassed = (request: Request) => {
  return request.headers.get("x-tskl-bypass") === "1";
};

export const createHandler = ({
  loaded,
  factory,
  logger,
  capture,
  getPacks,
}: {
  loaded: Promise<boolean>;
  factory: LuaFactory;
  logger: Logger;
  capture: CaptureCallback;
  getPacks: () => Promise<Pack[]>;
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
    logger.debug(`[${requestId}] scanning ${packs.length} packs`);

    const hooks: Record<
      HookName,
      Array<{
        engine: Promise<LuaEngine>;
        options: Options;
        code: string;
      }>
    > = {
      pre: [],
      post: [],
    };

    const cleanup: Array<() => Promise<void>> = [];

    // create our engine for any matching packs
    for (const pack of packs) {
      // skip packs without hooks
      if (!pack.hooks) {
        continue;
      }

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

      // register hooks
      const engine = factory.createEngine();
      const coreOptions = {
        logger,
        permissions: pack.permissions,
        request: info.request,
        capture: {
          callback: capture,
        },
        context: new Map(),
      };

      if (pack.hooks.pre) {
        hooks.pre.push({
          engine,
          options: coreOptions,
          code: pack.hooks.pre,
        });
      }

      if (pack.hooks.post) {
        hooks.post.push({
          engine,
          options: coreOptions,
          code: pack.hooks.post,
        });
      }

      // add the cleanup task regardless
      cleanup.push(async () => {
        const lua = await engine;
        lua.global.close();
      });
    }

    logger.debug(
      `[${requestId}] pre (${hooks.pre.length}) / post (${hooks.post.length})`
    );

    logger.debug(`[${requestId}] pre hooks`);

    // run pre
    await Promise.all(
      hooks.pre.map<Promise<void>>(async (hook) => {
        const lua = await hook.engine;
        const sandbox = await createSandbox(requestId, hook.options);
        for (const [name, value] of Object.entries(sandbox.variables)) {
          lua.global.set(name, value);
        }

        await lua.doString([...sandbox.headers, hook.code].join("\n"));
      })
    );

    // Fetch
    logger.debug(`[${requestId}] sending request`);
    const finalizedRequest = info.request;
    finalizedRequest.headers.set("x-tskl-bypass", "1");
    const fetchResponse = await fetch(finalizedRequest);

    logger.debug(`[${requestId}] post hooks`);

    // run post
    await Promise.all(
      hooks.post.map<Promise<void>>(async (hook) => {
        const lua = await hook.engine;
        const sandbox = await createSandbox(requestId, {
          ...hook.options,
          response: fetchResponse,
        });
        for (const [name, value] of Object.entries(sandbox.variables)) {
          lua.global.set(name, value);
        }

        await lua.doString([...sandbox.headers, hook.code].join("\n"));
      })
    );

    // cleanup
    await Promise.allSettled(cleanup.map(async (step) => step()));

    return fetchResponse as StrictResponse<any>;
  });
