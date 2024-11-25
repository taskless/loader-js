/* eslint-disable */
import { type Config } from "./config.js";

const publicConfig: Config = {
  schema: "pre1",
  organizationId: "00000000-0000-0000-0000-000000000000",
  packs: [
    {
      schema: "pre1",
      name: "core",
      version: "0.0.1",
      description:
        "Taskless core Telemetry. The core telemetry contains common monitoring and logging found in APM-like solutions, and is a solid baseline for any observability stack.",
      url: {
        source: "./wasm/0191e2e7-8da6-7558-915d-4a2ecc82472b.wasm",
        signature: "",
      },
      capture: {
        url: {
          type: "string",
          description: "The full URL of the request",
        },
        path: {
          type: "string",
          description:
            "The path of the request in the form of '/path/to/resource'",
        },
        error: {
          type: "string",
          description:
            "The error message in the event of a non-200 response code",
        },
        domain: {
          type: "string",
          description: "The domain of the request",
        },
        status: {
          type: "number",
          description: "The status code of the request",
        },
        durationMs: {
          type: "number",
          description: "The duration of the request in milliseconds",
        },
      },
      permissions: {
        domains: [".+"],
        response: ["body", "headers"],
      },
    },
  ],
};
export { publicConfig };
