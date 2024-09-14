import { type LuaBridgeBuilder } from "@~/types.js";
import { base64ToString, stringToBase64 } from "uint8array-extras";

/** Exposes common string behaviors that are not natively available in lua, but important to working with requests */
export const stringFunctions: LuaBridgeBuilder = () => {
  return {
    functions: {
      toJSON(ruleId: string, data: string) {
        return JSON.stringify(data);
      },
      fromJSON(ruleId: string, data: string) {
        return JSON.parse(data) as unknown;
      },
      toBase64(ruleId: string, data: string) {
        return stringToBase64(data);
      },
      fromBase64(ruleId: string, data: string) {
        return base64ToString(data);
      },
    },
    internal: {},
  };
};
