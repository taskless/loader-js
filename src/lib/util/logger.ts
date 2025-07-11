import { noop } from "@~/constants.js";
import { type Logger } from "@~/types.js";

/** Default logger, passes strings into console */
const defaultLogger: Required<Logger> = {
  trace(messsage: string) {
    console.trace(messsage);
  },
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
  userLogger?: Partial<Logger>,
  enableDataLogging?: boolean
): Required<Logger> => {
  const logLevels: Record<keyof Logger, number> = {
    trace: 10,
    debug: 20,
    info: 30,
    warn: 40,
    error: 50,
    data: Number.POSITIVE_INFINITY,
  };

  const logLevel = logLevels[userLogLevel ?? "info"];
  const trace = userLogger?.trace ?? defaultLogger.trace;
  const debug = userLogger?.debug ?? defaultLogger.debug;
  const info = userLogger?.info ?? defaultLogger.info;
  const warn = userLogger?.warn ?? defaultLogger.warn;
  const error = userLogger?.error ?? defaultLogger.error;
  const data = userLogger?.data ?? defaultLogger.data;

  return {
    trace: logLevel <= logLevels.trace ? trace : noop,
    debug: logLevel <= logLevels.debug ? debug : noop,
    info: logLevel <= logLevels.info ? info : noop,
    warn: logLevel <= logLevels.warn ? warn : noop,
    error: logLevel <= logLevels.error ? error : noop,
    data: enableDataLogging ? data : noop,
  };
};
