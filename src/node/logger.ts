import { noop } from "@~/constants.js";
import { type Logger } from "@~/types.js";

/** Default logger, passes strings into console */
const defaultLogger: Logger = {
  debug(messsage: string) {
    console.debug(messsage);
  },
  info(messsage: string) {
    console.info(messsage);
  },
  warn(messsage: string) {
    console.warn(messsage);
  },
  error(messsage: string) {
    console.error(messsage);
  },
  data(ndjson: string) {
    console.log(ndjson);
  },
};

export const createLogger = (
  userLogLevel?: keyof Logger,
  userLogger?: Partial<Logger>
): Logger => {
  const logLevels: Record<keyof Logger, number> = {
    debug: 20,
    info: 30,
    warn: 40,
    error: 50,
    data: Number.POSITIVE_INFINITY,
  };

  const logLevel = logLevels[userLogLevel ?? "info"];

  return {
    debug:
      logLevel <= logLevels.debug
        ? userLogger?.debug ?? defaultLogger.debug
        : noop,
    info:
      logLevel <= logLevels.info
        ? userLogger?.info ?? defaultLogger.info
        : noop,
    warn:
      logLevel <= logLevels.warn
        ? userLogger?.warn ?? defaultLogger.warn
        : noop,
    error:
      logLevel <= logLevels.error
        ? userLogger?.error ?? defaultLogger.error
        : noop,
    data: userLogger?.data ?? defaultLogger.data,
  };
};
