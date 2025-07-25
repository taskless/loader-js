import { type CaptureItem, type NetworkPayload } from "@~/types.js";

/** Convert a set of log entries to compressed network payload */
export const entriesToNetworkJson = (entries: CaptureItem[]) => {
  const networkPayload: NetworkPayload = {};
  for (const entry of entries) {
    networkPayload[entry.requestId] ||= [];

    // save as number when possible for performance
    if (/^\d+$/.test(entry.value)) {
      networkPayload[entry.requestId].push({
        seq: entry.sequenceId,
        dim: entry.dimension,
        num: entry.value,
      });
    } else {
      networkPayload[entry.requestId].push({
        seq: entry.sequenceId,
        dim: entry.dimension,
        str: entry.value,
      });
    }
  }

  return networkPayload;
};
