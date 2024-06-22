import type { LogEntry } from "@~/types.js";

export const stringify = (logEntry: LogEntry) => {
  return JSON.stringify(logEntry);
};

export const ndjson = (lines: string[]) => {
  return lines.join("\n");
};
