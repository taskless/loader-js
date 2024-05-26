import { taskless } from "@taskless/__shim/node";

const t = taskless("test-secret", {
  // enable local-only mode
  local: true,
  // enable logging
  log: (jsonString) => {
    console.log(jsonString);
  },
  logLevel: "info",
});

t.capture("https://example.com/*");

/*
If using CommonJS
1. Change:
    import { taskless } from "@taskless/__shim/node";
    const { taskless } = require("@taskless/__shim/node")
2. Include using the `-r` flag instead of `--import`
*/
