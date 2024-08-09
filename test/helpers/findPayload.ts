import { type NetworkPayload } from "@~/types.js";

export const findPayload = (
  payloads: NetworkPayload[],
  filters?: {
    requestId?: string;
    url?: string;
    dimension?: string;
    value?: string | number;
  }
) => {
  return payloads.filter((payload) => {
    return Object.entries(payload).filter(([requestId, byUrlSchema]) => {
      return Object.entries(byUrlSchema).filter(([url, byDimension]) => {
        return byDimension.filter(([dimension, value]) => {
          const isRequestId =
            !filters?.requestId || requestId === filters.requestId;
          const isUrl = !filters?.url || url === filters.url;
          const isDimension =
            !filters?.dimension || dimension === filters.dimension;
          const isValue = !filters?.value || value === filters.value;

          return isRequestId && isUrl && isDimension && isValue;
        });
      });
    });
  });
};
