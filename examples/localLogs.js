import { setTimeout } from "node:timers/promises";

/**
 * localLogs.ts
 * Taskless local logging. This example makes use of the local logging
 * features of taskless for creating structured JSON logs you can
 * consume in data analytics tools.
 *
 * To view this demo:
 * 1. run `pnpm build` to create the current artifacts
 * 2. cd into this directory (examples)
 * 3. run `node --import=./localLogs.config.js localLogs.js`
 */

// main
const main = async () => {
  await fetch("https://example.com");

  await setTimeout(400);

  await fetch("https://example.com/another_path");
};

await main();
