import { chunk } from "./lifecycle/chunk.js";
import { post } from "./lifecycle/post.js";
import { pre } from "./lifecycle/pre.js";
import { type LifecycleExecutor } from "./lifecycle/types.js";

export const runPackLifecycle: LifecycleExecutor = async (
  requestId,
  lifecycle,
  packs,
  data
) => {
  switch (lifecycle) {
    case "pre": {
      await pre(requestId, lifecycle, packs, data);
      break;
    }

    case "post": {
      await post(requestId, lifecycle, packs, data);
      break;
    }

    case "chunk": {
      await chunk(requestId, lifecycle, packs, data);
      break;
    }

    default: {
      data.logger.error(`Unknown lifecycle "${lifecycle}"`);
    }
  }
};
