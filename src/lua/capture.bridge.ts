import {
  type CaptureCallback,
  type Sends,
  type LuaBridgeBuilder,
} from "@~/types.js";

/**
 * Creates functions for capturing telemetry events
 */
export const captureFunctions: LuaBridgeBuilder<{
  requestId: string;
  sends: Sends;
  capture: CaptureCallback;
}> = ({ logger }, options) => {
  if (!options?.capture || !options?.requestId || !options?.sends) {
    throw new Error(
      "Capture builder requires the capture callback, send data info, and the request id to generate successfully"
    );
  }

  const { sends, requestId, capture } = options;

  return {
    functions: {
      /** Capture a telemetry event for sending to either the console or taskless.io service */
      capture(key: string, value: string | number) {
        const type = sends?.[key]?.type;
        if (type) {
          capture({
            requestId,
            dimension: key,
            value: `${value}`,
            type,
          });
        } else {
          logger.error(
            `[${requestId}] Unable to capture ${key}, no type for ${type as string} is available`
          );
        }
      },
    },
    internal: {},
  };
};
