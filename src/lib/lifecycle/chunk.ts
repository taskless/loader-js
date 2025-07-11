import { type ReadableStreamReadResult } from "node:stream/web";
import { type PluginOutput } from "@~/types.js";
import { packIdentifier } from "../util/id.js";
import { createSandbox } from "./helpers.js";
import { type LifecycleExecutor } from "./types.js";

/**
 * Read bytes with a callback for every chunk,
 * using promises to ensure sequence
 **/
async function getBytes(
  stream: ReadableStream<Uint8Array>,
  onChunk: (bytes: Uint8Array) => Promise<void>
) {
  const reader = stream.getReader();
  let result: ReadableStreamReadResult<Uint8Array>;
  // eslint-disable-next-line no-await-in-loop
  while (!(result = await reader.read()).done) {
    // eslint-disable-next-line no-await-in-loop
    await onChunk(result.value);
  }
}

const LIFECYCLE_ID = "chunk";
const EXTISM_FN = "chunk";

export const chunk: LifecycleExecutor = async (
  requestId,
  _,
  packs,
  { request, response, context, logger, callbacks }
) => {
  const promises = packs.map(async (pack, index) => {
    // not in defaults, so an undefined methods collection skips this
    if (!pack.methods) {
      logger.debug(
        `[${requestId}] (${LIFECYCLE_ID}) pack ${pack.name} skipped`
      );
      return undefined;
    }

    // must be explicitly declared
    if (!pack.methods.includes(LIFECYCLE_ID)) {
      logger.debug(
        `[${requestId}] (${LIFECYCLE_ID}) pack ${pack.name} skipped`
      );
      return undefined;
    }

    const plugins = await callbacks.getModules();
    const plugin = await plugins.get(packIdentifier(pack));

    if (!plugin) {
      throw new Error(
        `[${requestId}] (${LIFECYCLE_ID}) Pack not found in modules`
      );
    }

    if (!response?.body) {
      return undefined;
    }

    await getBytes(response.body, async (bytes) => {
      const output = await plugin.call(
        EXTISM_FN,
        JSON.stringify(
          await createSandbox(requestId, pack, {
            request,
            chunk: bytes,
            context: context[`${index}`] ?? {},
          })
        )
      );

      if (output) {
        const result = output?.json() as PluginOutput;

        if (result.context) {
          context[`${index}`] = result.context;
        }

        await callbacks.onResult(pack, result);
        logger.debug(
          `[${requestId}] (${LIFECYCLE_ID}) pack ${pack.name} completed`
        );
      } else {
        logger.debug(
          `[${requestId}] (${LIFECYCLE_ID}) pack ${pack.name} no output returned`
        );
      }
    });
  });

  const results = await Promise.allSettled(promises);
  for (const hook of results) {
    if (hook.status === "rejected") {
      logger.error(`${hook.reason}`);
      callbacks.onError(hook.reason);
    }
  }
};
