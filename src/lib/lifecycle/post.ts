import { type PluginOutput } from "@~/types.js";
import { packIdentifier } from "../util/id.js";
import { createSandbox } from "./helpers.js";
import { type LifecycleExecutor } from "./types.js";

const LIFECYCLE_ID = "post";
const EXTISM_FN = "post";

export const post: LifecycleExecutor = async (
  requestId,
  _,
  packs,
  { request, response, context, logger, callbacks }
) => {
  // reverse the packs FIFO order
  const promises = packs.reverse().map(async (pack, index) => {
    if (pack.methods && !pack.methods.includes(LIFECYCLE_ID)) {
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

    const output = await plugin.call(
      EXTISM_FN,
      JSON.stringify(
        await createSandbox(requestId, pack, {
          request,
          response, // <= post includes a response object
          // context is at original (non-reversed) index
          context: context[`${packs.length - index - 1}`] ?? {},
        })
      )
    );

    if (output) {
      const result = output?.json() as PluginOutput;

      if (result.context) {
        context[`${packs.length - index - 1}`] = result.context;
      }

      await callbacks.onResult(pack, result);
      logger.debug(
        `[${requestId}] (${LIFECYCLE_ID}) pack ${pack.name} completed (captured: ${Object.keys(result.capture ?? {}).length})`
      );
    } else {
      logger.debug(
        `[${requestId}] (${LIFECYCLE_ID}) pack ${pack.name} no output returned`
      );
    }
  });

  const results = await Promise.allSettled(promises);
  for (const hook of results) {
    if (hook.status === "rejected") {
      logger.error(`${hook.reason}`);
      callbacks.onError(hook.reason);
    }
  }
};
