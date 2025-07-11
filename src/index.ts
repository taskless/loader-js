/* eslint-disable unicorn/prevent-abbreviations */
/* eslint-disable n/no-process-env */

// AUTOLOADER FILE
// This file is used to load the taskless library and initialize it
// when used with the `--import` flag in Node.js
import { readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import dotenv from "dotenv";
import { autoload } from "./lib/taskless.js";
import {
  type InitOptions,
  isLogLevel,
  isOutput,
  type LogLevel,
  type Output,
} from "./types.js";
import type { PartialDeep } from "type-fest";

/*
 * Taskless Autoloader File
 * node --import @taskless/loader script.js
 */

type Maybe<T> = T | undefined;

type EnvironmentKeys = {
  TASKLESS_API_KEY: string;
  TASKLESS_ENDPOINT: string;
  TASKLESS_FLUSH_INTERVAL: number;
  TASKLESS_LOG_LEVEL: LogLevel;
  TASKLESS_OUTPUT: Output[];
  TASKLESS_DIRECTORY: string;
};

type EnvParser<T extends keyof EnvironmentKeys> = (
  value: string
) => EnvironmentKeys[T] | undefined;

// simple noop for strings
const asString = (value: string): string => value.trim();

/** A key/value collection of parsers for every environment key we're supporting */
const environmentParsers: {
  [K in keyof EnvironmentKeys]: EnvParser<K>;
} = {
  TASKLESS_DIRECTORY(value) {
    const pwd = process.cwd();
    if (value && value.trim().length > 0) {
      return join(pwd, value.trim());
    }

    return undefined;
  },
  TASKLESS_API_KEY: asString,
  TASKLESS_ENDPOINT: asString,
  TASKLESS_FLUSH_INTERVAL(value) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      throw new Error(`Invalid flush interval: ${value}`);
    }

    return parsed;
  },
  TASKLESS_LOG_LEVEL(value) {
    if (!isLogLevel(value)) {
      throw new Error(`Invalid log level: ${value}`);
    }

    return value;
  },
  TASKLESS_OUTPUT(value) {
    const outputs = value
      .split(",")
      .map((o) => o.trim().toLowerCase())
      .filter((o) => o.length > 0)
      .filter(isOutput);
    if (outputs.length === 0) {
      throw new Error(`Invalid output: ${value}`);
    }

    return outputs;
  },
};

/** Get and parse a value from the environment or a parsed environment file */
const getRawEnv = (name: string): undefined | string => {
  const value = process.env[name];
  if (value === undefined) {
    return undefined;
  }

  return value;
};

const mergeEnvironments = (
  ...sources: Array<Record<string, string | undefined> | undefined>
) => {
  const env: Partial<EnvironmentKeys> = {};
  for (const [key, parser] of Object.entries(environmentParsers)) {
    for (const source of sources) {
      const value = source?.[key];
      if (!value) {
        continue;
      }

      const parsedValue = parser(value);
      if (parsedValue !== undefined) {
        // Type assertion is safe here because we know the parser matches the key
        (env as Record<string, any>)[key] = parsedValue;
      }
    }
  }

  return env;
};

/** Load an ENV file for taskless if requested, uses dotenv */
const TASKLESS_ENV = getRawEnv("TASKLESS_ENV");
const envFile =
  TASKLESS_ENV && TASKLESS_ENV.length > 0
    ? dotenv.parse(readFileSync(join(process.cwd(), TASKLESS_ENV), "utf8"))
    : {};

/** Resolve a final env from all the provided options */
const ENV = mergeEnvironments(envFile, process.env);

const configuration: InitOptions = {
  directory: ENV.TASKLESS_DIRECTORY as Maybe<string>,
  endpoint: ENV.TASKLESS_ENDPOINT as Maybe<string>,
  flushInterval: ENV.TASKLESS_FLUSH_INTERVAL as Maybe<number>,
  log: undefined,
  logLevel: ENV.TASKLESS_LOG_LEVEL as Maybe<InitOptions["logLevel"]>,
  output: ENV.TASKLESS_OUTPUT as Maybe<InitOptions["output"]>,
  __experimental: undefined,
};

const TASKLESS_DEPRECATED_OPTIONS = getRawEnv("TASKLESS_OPTIONS");
const deprecatedOptions = Object.assign(
  {},
  {
    // common values
    logLevel: configuration.logLevel,
  },
  // split the TASKLESS_OPTIONS which is going away in the future
  ...`${TASKLESS_DEPRECATED_OPTIONS ?? ""}`
    .split(";")
    .map((raw) => {
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

      const [key, value] = raw.split("=", 2);
      if (key && value) {
        return {
          [key]: castString(value),
        };
      }

      return undefined;
    })
    .filter((v) => v !== undefined)
) as Record<string, unknown>;

// taskless will by default auto-initialize, fetching remote
// packs and patching the runtime
autoload(ENV.TASKLESS_API_KEY as Maybe<string>, {
  ...(TASKLESS_DEPRECATED_OPTIONS ? deprecatedOptions : configuration),
});

if (TASKLESS_DEPRECATED_OPTIONS) {
  console.warn(
    "Taskless: Deprecated options are being used. Please update your configuration."
  );
}

// eslint-disable-next-line @typescript-eslint/no-useless-empty-export
export {};
export type * from "./types.js";
