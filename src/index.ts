/* eslint-disable unicorn/prefer-top-level-await */
/* eslint-disable n/no-process-env */
import process from "node:process";
import { TASKLESS_HOST } from "./constants.js";
import { autoload as taskless } from "./node/taskless.js";
import { isLogLevel } from "./types.js";

/**
 * Taskless Autoloader File
 * node --import @taskless/loader script.js
 */

/** The Taskless API Key */
const TASKLESS_API_KEY = process.env.TASKLESS_API_KEY;

/** Local Mode Enabled - ndjson local logging */
const TASKLESS_LOCAL_MODE = process.env.TASKLESS_LOCAL_MODE;

/** Debug Enabled */
const TASKLESS_LOG_LEVEL = isLogLevel(process.env.TASKLESS_LOG_LEVEL)
  ? process.env.TASKLESS_LOG_LEVEL
  : "warn";

// taskless will by default auto-initialize, fetching remote
// packs and patching the runtime
taskless(TASKLESS_API_KEY, {
  host: TASKLESS_HOST,
  network: TASKLESS_LOCAL_MODE !== "1",
  logLevel: TASKLESS_LOG_LEVEL,
}).catch((error) => {
  console.error(error);
});

// eslint-disable-next-line @typescript-eslint/no-useless-empty-export
export {};
