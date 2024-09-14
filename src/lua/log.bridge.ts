import { type LuaBridgeBuilder } from "@~/types.js";

/**
 * Exposes logging functions that can be used to log from lua back to
 * the host system
 */
export const logFunctions: LuaBridgeBuilder = ({ logger }) => {
  function log(ruleId: string, message: string): void;
  function log(
    ruleId: string,
    level: "debug" | "info" | "warn" | "error",
    message?: string
  ): void;
  function log(...args: any[]): void {
    const [ruleId, level, message] =
      args.length === 2
        ? [`${args[0]}`, "info", `${args[1]}`]
        : [`${args[0]}`, `${args[1]}`, `${args[2]}`];
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
