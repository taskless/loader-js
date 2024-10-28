// import { taskless } from "@taskless/core";
import { taskless } from "../src/core.js";

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
 */

const pack = /* yaml */ `
# Sample YAML pack that captures some additional telemetry data
# This is included in @taskless/core normally, along with additional functionality
pack: 1
name: "@taskless/example"
version: "1.0.0"
description: Basic telemetry
sends:
  durationMs:
    type: "number"
    description: "The duration of the request in milliseconds"
  status:
    type: "number"
    description: "The status code of the request"
rules:
  - matches: "https://.+"
    hooks:
      pre: |
        context.set("start", now())
      post: |
        taskless.capture("durationMs", now() - context.get("start"))
        taskless.capture("status", response.getStatus())
`;

const t = taskless(process.env.TASKLESS_API_KEY);
t.add(pack);
await t.load();

export {};
