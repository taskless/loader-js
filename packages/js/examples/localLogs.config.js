import { taskless } from "@taskless/shim/node";

const t = taskless("test-secret", {
  // enable local-only mode
  local: true,
  // enable logging
  log(jsonString) {
    console.log(jsonString);
  },
});

t.capture("https://example.com/*", (request) => {
  // transform any x- headers into metadata
  const metadata = {};
  for (const [key, value] of request.headers.entries()) {
    if (key.startsWith("x-")) {
      metadata[key] = value;
    }
  }

  return {
    metadata,
  };
});

/*
If using CommonJS
1. Change:
    import { taskless } from "@taskless/__shim/node";
    const { taskless } = require("@taskless/__shim/node")
2. Include using the `-r` flag instead of `--import`
*/
