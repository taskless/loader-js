import { hrtime } from "node:process";
import { type LuaBridgeBuilder } from "@~/types.js";

/** Exposes time based functions that are not available in lua, but important for developers working with Packs */
export const timeFunctions: LuaBridgeBuilder = () => {
  return {
    functions: {
      now(ruleId: string) {
        const hrt = hrtime();
        // eslint-disable-next-line unicorn/numeric-separators-style
        return Math.ceil(hrt[0] * 1000 + hrt[1] / 1000000);
      },
    },
    internal: {},
  };
};
