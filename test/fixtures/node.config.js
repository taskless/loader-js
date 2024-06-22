// @ts-check

import { taskless } from "../../src/node/taskless.js";

/**
 * Types the globalThis to allow custom keys to be read
 * @type {globalThis & {[key: string]: any}}
 */
const gt = globalThis;

const t = taskless(
  "test-secret",
  /**
   * @type {import('../../src/types.js').InitOptions}
   */
  {
    // Use a custom logger. We reference a possible global set in our test env,
    // otherwise falling back to console.log
    log: (jsonString) => {
      if (gt.TSKL_LOG) {
        gt.TSKL_LOG(jsonString);
      } else {
        console.log(jsonString);
      }
    },
    // enable a machine id
    machineId: 42,
    // use a custom endpoint for all-local testing
    __experimental: {
      endpoints: {
        ingest: `${gt.ENDPOINT}/ingest`,
        payload: `${gt.ENDPOINT}/payload`,
      },
    },
  }
);

// custom root lets us use a local server to check calls that move
// beyond the interceptor
const root = gt.TSKL_HOST ?? "https://example.com";

// capture with defaults
t.capture(`${root}/wildcards/*`);

// don't capture this though (later entries override earlier ones)
t.capture(`${root}/wildcards/skip`, {
  exclude: true,
});

// dynamic request evaluation for complex logic
t.capture(async (request) => {
  return request.url === `${root}/request/parser`;
});

// static request configuration
t.capture(`${root}/metadata/*`, {
  metadata: {
    static: true,
  },
});

// dynamic per-request config, for example custom searchable
// metadata for the request
t.capture(`${root}/dynamic-options`, async (request) => {
  return {
    metadata: {
      "x-sample-header": request.headers.get("x-sample-header") ?? undefined,
    },
  };
});

// enable payload passing and storage for complex analysis
t.capture(`${root}/payloads`, {
  payloads: true,
});
