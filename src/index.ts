/* eslint-disable unicorn/prefer-top-level-await */
/* eslint-disable n/no-process-env */
import process from "node:process";
import { TASKLESS_HOST } from "./constants.js";
import { autoload as taskless } from "./lib/taskless.js";
import { isLogLevel } from "./types.js";

/**
 * Taskless Autoloader File
 * node --import @taskless/loader script.js
 */

/** The Taskless API Key */
const TASKLESS_API_KEY = process.env.TASKLESS_API_KEY;

/** Local Mode Enabled - ndjson local logging */
const TASKLESS_LOGGING = process.env.TASKLESS_LOGGING;

/** Debug Enabled */
const TASKLESS_LOG_LEVEL = isLogLevel(process.env.TASKLESS_LOG_LEVEL)
  ? process.env.TASKLESS_LOG_LEVEL
  : "warn";

// taskless will by default auto-initialize, fetching remote
// packs and patching the runtime
taskless(TASKLESS_API_KEY, {
  endpoint: TASKLESS_HOST,
  logging: TASKLESS_LOGGING === "1",
  logLevel: TASKLESS_LOG_LEVEL,
}).catch((error) => {
  console.error(error);
});

// eslint-disable-next-line @typescript-eslint/no-useless-empty-export
export {};
