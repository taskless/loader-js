/* eslint-disable */
import { type Schema } from "./schema.js";

const publicConfig: Schema = {
  schema: "pre2",
  organizationId: "00000000-0000-0000-0000-000000000000",
  packs: [
    {
      schema: "pre2",
      name: "core",
      version: "0.0.2",
      description:
        "Taskless core Telemetry. The core telemetry contains common monitoring and logging found in APM-like solutions, and is a solid baseline for any observability stack.",
      permissions: {
        body: false,
      },
      url: {
        source: "./wasm/0191e2e7-8da6-7558-915d-4a2ecc82472b.wasm",
        signature: "",
      },
    },
  ],
};

export { publicConfig };
