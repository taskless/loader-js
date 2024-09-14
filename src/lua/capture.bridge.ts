import { type CaptureCallback, type LuaBridgeBuilder } from "@~/types.js";

/**
 * Creates functions for capturing telemetry events
 */
export const captureFunctions: LuaBridgeBuilder<{
  requestId: string;
  capture: CaptureCallback;
}> = ({ logger, rules }, options) => {
  if (!options?.capture || !options?.requestId) {
    throw new Error(
      "Capture builder requires the capture callback, send data info, and the request id to generate successfully"
    );
  }

  const { requestId, capture } = options;

  return {
    functions: {
      /** Capture a telemetry event for sending to either the console or taskless.io service */
      capture(ruleId: string, key: string, value: string | number) {
        // check permissions for allowed capture
        const [ns, index] = ruleId.split("_");
        const indexNumber = Number.parseInt(index, 10);

        if (Number.isNaN(indexNumber)) {
          logger.error(`Invalid rule id ${ruleId}`);
          return;
        }

        const rule = rules[ns]?.[indexNumber];

        if (!rule) {
          logger.error(`Rule ${ruleId} does not exist`);
          return;
        }

        const allowList = rule.__.permissions?.captures ?? [];

        if (allowList.includes(key)) {
          capture({
            requestId,
            dimension: key,
            value: `${value}`,
          });
        } else {
          logger.error(
            `Rule for ${rule.__.packName} does not have permission to capture ${key}`
          );
        }
      },
    },
    internal: {},
  };
};
