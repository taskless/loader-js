import { type LuaBridgeBuilder } from "@~/types.js";

/**
 * Creates functions for manipulating a "context" object, available in
 * both pre and post lifecycle hooks
 */
export const contextFunctions: LuaBridgeBuilder = () => {
  const current: Record<string, unknown> = {};

  return {
    functions: {
      get(ruleId: string, key: string) {
        return current[key];
      },
      set(ruleId: string, key: string, value: any) {
        current[key] = value;
      },
    },
    internal: {},
  };
};
