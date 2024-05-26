import { lookup } from "node:dns";
import { hrtime } from "node:process";
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
} from "./types.js";

const DEFAULT_INGEST_ENDPOINT = undefined;

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

const taskless = (secret: string, initOptions: InitOptions) => {
  const msw = (initOptions?.__experimental?.msw ??
    setupServer()) as SetupServerApi;

  if (!initOptions?.__experimental?.msw) {
    msw.listen({
      onUnhandledRequest: "bypass",
    });
  }

  const resolvedEndpoint =
    initOptions?.__experimental?.endpoint ?? DEFAULT_INGEST_ENDPOINT;

  if (resolvedEndpoint) {
    // look up endpoint as early as possible to avoid using libuv during userland code
    const u = new URL(resolvedEndpoint);
    lookup(u.hostname, 4, () => {
      // noop
    });
  }

  const log = initOptions?.log;
  const events: RequestEvent[] = [];
  const batchQueue = new PQueue({ concurrency: 1, autoStart: true });
  const bigQueue = new PQueue({ concurrency: 2, autoStart: true });
  const batchThrottle = pThrottle({
    limit: 1,
    interval: 1000,
  });

  /**
   * Sends telemetry to the endpoint. If any payloads are present, it
   * defaults to the "bigQueue" to avoid blocking smaller telemetry
   * in the event of a large payload
   */
  const send = (chunk: RequestEvent[]) => {
    const logFunction = log
      ? () => {
          for (const item of chunk) {
            const entry = {
              level: item.statusCode >= 400 ? "error" : "info",
              url: item.url,
              statusCode: item.statusCode,
              duration: item.duration,
            };
            log(JSON.stringify(entry));
          }
        }
      : noop;

    const sendFunction = async () => {
      // TODO - send request to endpoint via bypass
      logFunction();
    };

    if (chunk.some((event) => event.payloads)) {
      bigQueue.add(sendFunction);
    } else {
      batchQueue.add(sendFunction);
    }
  };

  /** Throttled function that takes events and batch schedules them */
  const dispatchBatch = batchThrottle(async () => {
    // queue all chunks
    let chunk = events.splice(0, 10);
    while (chunk.length > 0) {
      send(chunk);
      chunk = events.splice(0, 10);
    }
  });

  /** Pushes items onto the batch queue (non-payload), then triggers any batch operations */
  const schedule = (event: RequestEvent) => {
    if (event.payloads) {
      send([event]);
    } else {
      events.push(event);
      dispatchBatch();
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

        try {
          response = await fetch(bypass(info.request.clone()));
        } catch (error) {
          if (initOptions?.log) {
            initOptions.log(
              JSON.stringify({
                level: "error",
                url: info.request.url,
                error: isErrorLike(error)
                  ? serializeError(error)
                  : "unknown error",
              })
            );
          }

          send([
            {
              url: info.request.url,
              statusCode: response ? response.status : 0,
              ...(captureOptions.payloads
                ? {
                    payloads: {
                      request: info.request.clone(),
                      response: Response.error(),
                    },
                  }
                : {}),
            },
          ]);

          return Response.error() as StrictResponse<any>;
        }

        const end = hrtime.bigint();

        const duration = convertHrtime(end - start).milliseconds;

        schedule({
          url: info.request.url,
          statusCode: response.status,
          ...(captureOptions.payloads
            ? {
                payloads: {
                  request: info.request.clone(),
                  response: Response.error(),
                },
              }
            : {}),
          duration,
        });

        return response as StrictResponse<any>;
      };

      msw.use(http.all(check, resolver));

      return undefined;
    },
  };

  return API;
};

export { taskless };
