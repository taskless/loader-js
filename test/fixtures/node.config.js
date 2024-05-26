import { taskless } from "../../src/node";

const t = taskless("test-secret", {
  // Use a custom logger. We reference a possible global set in our test env,
  // otherwise falling back to console.log
  log: (jsonString) => {
    if (globalThis.TSKL_LOG) {
      globalThis.TSKL_LOG(jsonString);
    } else {
      console.log(jsonString);
    }
  },
  logLevel: "info",
});

// custom root lets us use a local server to check calls that move
// beyond the interceptor
const root = globalThis.TSKL_HOST ?? "https://example.com";

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
      "x-sample-header": request.headers.get("x-sample-header"),
    },
  };
});

// enable payload passing and storage for complex analysis
t.capture(`${root}/payloads`, {
  payloads: true,
});
