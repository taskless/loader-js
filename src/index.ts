/* eslint-disable n/no-process-env */
import process from "node:process";
import { autoload } from "./lib/taskless.js";
import { isLogLevel } from "./types.js";

/**
 * Taskless Autoloader File
 * node --import @taskless/loader script.js
 */

/** The Taskless API Key */
const TASKLESS_API_KEY = process.env.TASKLESS_API_KEY;

/** Taskless Options via single env */
const importedOptions = (process.env.TASKLESS_OPTIONS ?? "").split(";");
const options: Record<string, unknown> = {};

/** Casts strings to Taskless-compatible options */
const castString = (value: string) => {
  switch (value) {
    case "true": {
      return true;
    }

    case "false": {
      return false;
    }

    default: {
      // convert numbers on regex match
      if (/^\d+$/.test(value)) {
        return Number.parseInt(value, 10);
      }

      return value;
    }
  }
};

for (const option of importedOptions) {
  const [key, value] = option.split("=", 2);
  options[key] = castString(value);
}

/** Debug Enabled */
const TASKLESS_LOG_LEVEL = isLogLevel(process.env.TASKLESS_LOG_LEVEL)
  ? process.env.TASKLESS_LOG_LEVEL
  : "warn";
options.logLevel ??= TASKLESS_LOG_LEVEL;

// taskless will by default auto-initialize, fetching remote
// packs and patching the runtime
autoload(TASKLESS_API_KEY, {
  ...options,
});

// eslint-disable-next-line @typescript-eslint/no-useless-empty-export
export {};
