import process from "node:process";
import { type Pack } from "@~/types.js";

export const getModuleName = (pack: Pack) => {
  return `${pack.name} @ ${pack.version}`;
};

export const createSandbox = async (
  requestId: string,
  pack: Pack,
  info: {
    request: Request;
    response?: Response;
    context: Record<string, string>;
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

  const requestKeys = pack.permissions?.request ?? [];
  const responseKeys = pack.permissions?.response ?? [];
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
      headers: requestKeys.includes("headers")
        ? Object.fromEntries(info.request.headers.entries())
        : undefined,
      body: requestKeys.includes("body")
        ? await extractBody(info.request)
        : undefined,
    },
    response: info.response
      ? {
          status: info.response.status,
          headers: responseKeys.includes("headers")
            ? Object.fromEntries(info.response.headers.entries())
            : undefined,
          body: responseKeys.includes("body")
            ? await extractBody(info.response)
            : undefined,
        }
      : undefined,
    environment: env,
  };
};
