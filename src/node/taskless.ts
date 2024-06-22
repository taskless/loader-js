import { lookup } from "node:dns";
import { hrtime, pid } from "node:process";
import { Snowflake } from "@theinternetfolks/snowflake";
import convertHrtime from "convert-hrtime";
import {
  type HttpResponseResolver,
  http,
  bypass,
  type StrictResponse,
} from "msw";
import { type SetupServerApi, setupServer } from "msw/node";
import PQueue from "p-queue";
import pThrottle from "p-throttle";
import { serializeError, isErrorLike } from "serialize-error";
import {
  type TasklessCoreAPI,
  type InitOptions,
  type RequestEvent,
  type CaptureOptions,
} from "../types.js";
import { stringify } from "../util/stringify.js";

const DEFAULT_INGEST_ENDPOINT = undefined;
const DEAULT_PAYLOAD_ENDPOINT = undefined;

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

// IDs are generated using snowflake epoch 2020 with the shard as PID
// on Taskless' side if using the cloud integration, it will be further
// disambiguated by the project id. However, for local logs, this should
// be sufficient.
Snowflake.EPOCH = Date.UTC(2020, 0, 1).valueOf();
Snowflake.SHARD_ID = pid % 1024;

const taskless = (secret: string | undefined, initOptions?: InitOptions) => {
  const ingestEndpoint =
    initOptions?.__experimental?.endpoints?.ingest ?? DEFAULT_INGEST_ENDPOINT;
  const payloadEndpoint =
    initOptions?.__experimental?.endpoints?.payload ?? DEAULT_PAYLOAD_ENDPOINT;
  const hasSecret = Boolean(secret && secret.length > 0);
  const useNetwork = Boolean(
    hasSecret && !initOptions?.local && ingestEndpoint && payloadEndpoint
  );

  // change the machine id if requested. Ensure number is within 10 bits
  if (initOptions?.machineId) {
    if (initOptions.machineId < 0 || initOptions.machineId > 1023) {
      throw new Error(
        `taskless initOptions.machineId must be between 0 and 1023, but got ${initOptions.machineId}`
      );
    }

    Snowflake.SHARD_ID = initOptions.machineId;
  }

  // ensure local enabled if no project/api key
  if (!hasSecret && !initOptions?.local) {
    throw new Error(
      "taskless requires a secret to be set, or must run with initOptions.local as true"
    );
  }

  const msw = (initOptions?.__experimental?.msw ??
    setupServer()) as SetupServerApi;

  if (!initOptions?.__experimental?.msw) {
    msw.listen({
      onUnhandledRequest: "bypass",
    });
  }

  if (ingestEndpoint) {
    lookup(new URL(ingestEndpoint).hostname, 4, noop);
  }

  if (payloadEndpoint) {
    lookup(new URL(payloadEndpoint).hostname, 4, noop);
  }

  const logQueue = new PQueue({ concurrency: 1, autoStart: true });
  const telemetryQueue = new PQueue({ concurrency: 1, autoStart: true });
  const telemetryBatch: RequestEvent[] = [];
  const payloadQueue = new PQueue({ concurrency: 2, autoStart: true });
  const payloadBatch: RequestEvent[] = [];

  const eventToString = (event: RequestEvent) => {
    return stringify({
      level: event.statusCode >= 400 ? "error" : "info",
      id: Snowflake.generate(),
      v: 1,
      url: event.url,
      statusCode: event.statusCode,
      durationMs: event.durationMs,
      metadata: event.metadata,
      error:
        event.statusCode >= 400
          ? event.payloads?.response?.statusText
          : undefined,
    });
  };

  const log = (event: RequestEvent) => async () => {
    /* c8 ignore next 3 */
    if (!initOptions?.log) {
      return;
    }

    initOptions.log(eventToString(event));
  };

  // send a batch of telemetry events to Taskless
  const dispatchTelemetryBatch = pThrottle({ limit: 1, interval: 1000 })(
    async () => {
      const batch = telemetryBatch.splice(0, telemetryBatch.length);
      /* c8 ignore next 3 */
      if (batch.length === 0) {
        return;
      }

      // TODO: send telemetry items to endpoint as lines of ndjson
      const _temporary = "";
    }
  );

  const sendTelemetry = (event: RequestEvent) => async () => {
    if (!useNetwork) {
      return;
    }

    telemetryBatch.push(event);
    dispatchTelemetryBatch();
  };

  // upload a batch of payloads to Taskless
  const dispatchPayloadBatch = pThrottle({ limit: 1, interval: 1000 })(
    async () => {
      const batch = payloadBatch.splice(0, payloadBatch.length);
      /* c8 ignore next 3 */
      if (batch.length === 0) {
        return;
      }

      // TODO: get signed URLs for all payloads in batch operation
      // TODO: upload directly to signed destinations (individual)
      const _temporary = "";
    }
  );

  const sendPayload = (event: RequestEvent) => async () => {
    if (!useNetwork) {
      return;
    }

    payloadBatch.push(event);
    dispatchPayloadBatch();
  };

  /**
   * Sends telemetry to the endpoints. If any payloads are present, it
   * defaults to the "bigQueue" to avoid blocking smaller telemetry
   * in the event of a large payload
   */
  const send = (event: RequestEvent, options: CaptureOptions) => {
    if (options.exclude) {
      return;
    }

    logQueue.add(log(event));
    telemetryQueue.add(sendTelemetry(event));
    if (event.payloads) {
      payloadQueue.add(sendPayload(event));
    }
  };

  const API: TasklessCoreAPI = {
    capture(matcher, options) {
      const check = typeof matcher === "function" ? "*" : matcher;
      const resolver: HttpResponseResolver = async (info) => {
        // check matcher for function pattern
        if (typeof matcher === "function") {
          const result = await matcher(info.request.clone());
          if (!result) {
            return undefined;
          }
        }

        // get request config
        const captureOptions =
          (typeof options === "function"
            ? await options(info.request.clone())
            : options) ?? {};

        let response: Response | undefined;

        const start = hrtime.bigint();
        let end: bigint;

        try {
          response = await fetch(bypass(info.request.clone()));
        } catch (error) {
          /* c8 ignore start */
          if (initOptions?.log && !captureOptions.exclude) {
            initOptions.log(
              JSON.stringify({
                level: "error",
                url: info.request.url,
                error: isErrorLike(error)
                  ? serializeError(error)
                  : "unknown error",
              })
            );
            /* c8 ignore end */
          }

          // capture end on failure
          end = hrtime.bigint();
          const durationMs = convertHrtime(end - start).milliseconds;

          send(
            {
              url: info.request.url,
              statusCode: response ? response.status : 0,
              durationMs,
              metadata: captureOptions.metadata,
              ...(captureOptions.payloads
                ? {
                    payloads: {
                      request: info.request.clone(),
                      response: Response.error(),
                    },
                  }
                : {}),
            },
            captureOptions
          );

          return Response.error() as StrictResponse<any>;
        }

        // capture end if not already set (success)
        end ??= hrtime.bigint();

        const durationMs = convertHrtime(end - start).milliseconds;

        send(
          {
            url: info.request.url,
            statusCode: response.status,
            durationMs,
            metadata: captureOptions.metadata,
            ...(captureOptions.payloads
              ? {
                  payloads: {
                    request: info.request.clone(),
                    response: Response.error(),
                  },
                }
              : {}),
          },
          captureOptions
        );

        return response as StrictResponse<any>;
      };

      msw.use(http.all(check, resolver));

      return undefined;
    },
  };

  return API;
};

export { taskless };
