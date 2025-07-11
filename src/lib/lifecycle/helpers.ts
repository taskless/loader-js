import process from "node:process";
import { type Pack } from "@~/types.js";

/**
 * Creates a JSON-friendly sandbox payload
 * based on the pack's permissions. Responsible for serializing
 * each item and supporting binary streams via chunks of
 * base64 data
 **/
export const createSandbox = async (
  requestId: string,
  pack: Pack,
  info: {
    request: Request;
    response?: Response;
    chunk?: Uint8Array;
    context: Record<string, string>;
    configuration?: Record<string, unknown>;
  }
) => {
  const extractBody = async (httpObject: Request | Response) => {
    const body = await httpObject.clone().text();
    try {
      return JSON.parse(body) as unknown;
    } catch {
      return body;
    }
  };

  const environmentKeys = pack.permissions?.environment ?? [];

  const env: Record<string, string | undefined> = {};
  for (const key of environmentKeys) {
    // eslint-disable-next-line n/no-process-env
    env[key] = process.env[key];
  }

  return {
    requestId,
    context: info.context,
    request: {
      url: info.request.url,
      domain: new URL(info.request.url).hostname,
      path: new URL(info.request.url).pathname,
      headers: [...info.request.headers.entries()],
      body: pack.permissions?.body
        ? await extractBody(info.request)
        : undefined,
    },
    chunk: info.chunk ? Buffer.from(info.chunk).toString("base64") : undefined,
    response: info.response
      ? {
          status: info.response.status,
          headers: [...info.response.headers.entries()],
          body: pack.permissions?.body
            ? await extractBody(info.response)
            : undefined,
        }
      : undefined,
    environment: env,
  };
};
