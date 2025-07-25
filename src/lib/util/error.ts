import { type Logger, type TasklessAPI } from "@~/types.js";

export class InitializationError extends Error {}

// a throwable function
const createThrowable =
  <T extends Error>(error: T): ((...args: any[]) => any) =>
  () => {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw error;
  };

/** A default no-op API */
export const createErrorAPI = <T extends Error>(error: T): TasklessAPI => ({
  add: createThrowable(error),
  shutdown: createThrowable(error),
  logger: createThrowable(error) as unknown as Logger,
  load: createThrowable(error),
});
