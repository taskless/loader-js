import { type ConsolePayload, type NetworkPayload } from "@~/types.js";

type FindResult = Array<[string, NetworkPayload["any"]]>;

export const findPayload = (
  payloads: NetworkPayload[],
  filters?: Array<{
    dimension?: string;
    value?: string | number;
  }>,
  returns?: string[]
): FindResult => {
  const byRequestId: Record<string, NetworkPayload["any"]> = {};
  for (const batch of payloads) {
    for (const [requestId, data] of Object.entries(batch ?? {})) {
      byRequestId[requestId] ||= [];
      byRequestId[requestId].push(...data);
    }
  }

  // get all requests by id that match our filter criteria
  const matches = Object.entries(byRequestId).filter(([requestId, entries]) => {
    let match = true;

    // for every filter, ensure at least one entry satisfies it
    for (const filter of filters ?? []) {
      const has = entries.some((entry) => {
        if (filter.dimension && entry.dim !== filter.dimension) {
          return false;
        }

        if (
          typeof filter.value === "string" &&
          "str" in entry &&
          filter.value !== entry.str
        ) {
          return false;
        }

        if (
          typeof filter.value === "number" &&
          "num" in entry &&
          `${filter.value}` !== entry.num
        ) {
          return false;
        }

        return true;
      });

      match &&= has;
    }

    return match;
  });

  // return only the requested dimensions (if any)
  return matches.map(([requestId, entries]) => {
    if (returns) {
      return [
        requestId,
        entries.filter((entry) => returns.includes(entry.dim)),
      ];
    }

    return [requestId, entries];
  });
};

export const findLog = (
  logs: ConsolePayload[],
  filters?: Array<{
    dimension?: string;
    value?: string | number;
  }>
): FindResult => {
  // normalize logs back into network payloads
  const payload: NetworkPayload = {};
  for (const log of logs) {
    payload[log.req] ||= [];
    payload[log.req].push({
      seq: log.seq,
      dim: log.dim,
      str: log.val,
    });
  }

  return findPayload([payload], filters);
};

export const extractDimension = (
  result: FindResult[0] | undefined,
  dimension: string
) => {
  if (!result) {
    return undefined;
  }

  const match = result[1].find((entry) => entry.dim === dimension);

  if (!match) {
    return undefined;
  }

  if ("str" in match) {
    return match.str;
  }

  if ("num" in match) {
    return Number(match.num);
  }

  return undefined;
};
