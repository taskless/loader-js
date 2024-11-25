import { packageDirectorySync } from "pkg-dir";
import { type Config } from "./__generated__/config.js";

/** The default Taskless host */
export const TASKLESS_HOST = "https://data.tskl.es";

/** Headers that change a request to one that bypasses our MSW interceptor */
export const bypass = {
  "x-tskl-bypass": "1",
};

/** An empty config in the event of a request error */
export const emptyConfig: Config = {
  schema: "pre1",
  organizationId: "none",
  packs: [],
};

export const DEFAULT_FLUSH_INTERVAL = 2000;

// hold a reference to this package's root for loading WASM files
export const ROOT = packageDirectorySync();

// eslint-disable-next-line @typescript-eslint/no-empty-function
export const noop = () => {};
