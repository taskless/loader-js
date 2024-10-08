import { type LuaBridgeBuilder } from "@~/types.js";

/** Exposes functions for manipulating the node.js request object during lifecycle hooks */
export const requestFunctions: LuaBridgeBuilder<
  { request: Request },
  {
    finalize: () => Request;
    current: () => Request;
  }
> = async (options, builderOptions) => {
  if (!builderOptions) {
    throw new Error("Request bridge requires builder-specific options");
  }

  let current = builderOptions.request;
  let locked = false;

  const checkLock = () => {
    if (locked) {
      throw new Error("Unable to modify request after it has been sent");
    }
  };

  return {
    internal: {
      finalize() {
        locked = true;
        return current;
      },
      current() {
        return current.clone();
      },
    },
    functions: {
      getURL(ruleId: string) {
        return current.url;
      },
      setURL(ruleId: string, url: string) {
        checkLock();
        current = new Request(url, current);
      },
      getParameter(ruleId: string, name: string) {
        const url = new URL(current.url);
        return url.searchParams.get(name);
      },
      setParameter(ruleId: string, name: string, value: string) {
        checkLock();
        const url = new URL(current.url);
        url.searchParams.set(name, value);
        current = new Request(url.toString(), current);
      },
      getHeader(ruleId: string, name: string) {
        return current.headers.get(name);
      },
      setHeader(ruleId: string, name: string, value: string) {
        checkLock();
        const headers = new Headers(current.headers);
        headers.set(name, value);

        current = new Request(current.url, {
          ...current,
          headers,
        });
      },
      async getBody(ruleId: string) {
        return current.clone().text();
      },
      setBody(ruleId: string, data: string) {
        checkLock();
        // keep everything synchronous in lua, but update
        // the request object as well so it stays current
        current = new Request(current.url, {
          ...current,
          body: data,
        });
      },
    },
  };
};
