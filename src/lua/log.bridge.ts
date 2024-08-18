import { type LuaBridgeBuilder } from "@~/types.js";

/**
 * Exposes logging functions that can be used to log from lua back to
 * the host system
 */
export const logFunctions: LuaBridgeBuilder = ({ logger }) => {
  function log(message: string): void;
  function log(
    level: "debug" | "info" | "warn" | "error",
    message?: string
  ): void;
  function log(...args: any[]): void {
    const [level, message] =
      args.length === 1 ? ["info", `${args[0]}`] : [`${args[0]}`, `${args[1]}`];
    if (
      level in logger &&
      typeof logger[level as keyof typeof logger] === "function"
    ) {
      logger[level as keyof typeof logger](message);
    }

    logger.info(message);
  }

  return {
    functions: {
      log,
    },
    internal: {},
  };
};
