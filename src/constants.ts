import { type Schema } from "./__generated__/schema.js";

/** The default Taskless host */
export const TASKLESS_HOST = "https://data.tskl.es";

/** Headers that change a request to one that bypasses our MSW interceptor */
export const bypass = {
  "x-tskl-bypass": "1",
};

/** An empty config in the event of a request error */
export const emptyConfig: Schema = {
  schema: "pre2",
  organizationId: "none",
  packs: [],
};

export const DEFAULT_FLUSH_INTERVAL = 2000;

// a reusable noop function
// eslint-disable-next-line @typescript-eslint/no-empty-function
export const noop = () => {};
