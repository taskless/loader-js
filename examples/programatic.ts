import { readFileSync } from "fs";
import { resolve } from "path";
import { packageDirectorySync } from "pkg-dir";

// import { taskless } from "@taskless/core";
import { taskless, type Manifest } from "../src/core.js";

/**
 * pnpm tsx --import="./examples/programatic.ts" examples/basic.ts
 *
 * Taskless Programatic Example
 * This example uses Taskless' programatic feature to load a custom pack
 * insted of using the traditional default autoloader. This pack captures
 * duration and status code for fetch requests. If you provide a
 * TASKLESS_API_KEY environment variable, this request will show up in your
 * Taskless console, including any additional Packs you've configured via
 * taskless.io.
 *
 * Instead of using Taskless' loader, you're using your own.
 */

const file = readFileSync(
  resolve(
    packageDirectorySync()!,
    "./wasm/0191e2e7-8da6-7558-915d-4a2ecc82472b.wasm"
  )
);

const manifest: Manifest = {
  schema: "pre2",
  name: "@taskless/example",
  version: "1.0.0",
  description: "Basic telemetry example, showing a programatic manifest",
  permissions: {},
  fields: [
    {
      name: "enableStatus",
      type: "boolean",
      description: "Enable status logging",
      default: true,
    },
  ],
};

const t = taskless(process.env.TASKLESS_API_KEY);
t.add(manifest, file);
t.load();

export {};
