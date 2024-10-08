import { type LuaBridgeBuilder } from "@~/types.js";

/** Exposes functions for manipulating the node.js response object during lifecycle hooks */
export const responseFunctions: LuaBridgeBuilder<
  {
    response: Response;
  },
  {
    finalize(): Response;
  }
> = async (options, builderOptions) => {
  if (!builderOptions) {
    throw new Error("Response bridge requires builder-specific options");
  }

  let current = builderOptions.response;
  let locked = false;

  const checkLock = () => {
    if (locked) {
      throw new Error("Unable to modify response after it has been sent");
    }
  };

  return {
    internal: {
      finalize() {
        locked = true;
        return current;
      },
    },
    functions: {
      async getBody(ruleId: string) {
        return current.clone().text();
      },
      setBody(ruleId: string, data: string) {
        checkLock();
        // keep everything synchronous in lua, but update
        // the request object as well so it stays current
        current = new Response(data, {
          ...current,
        });
      },
      getHeader(ruleId: string, name: string) {
        return current.headers.get(name);
      },
      setHeader(ruleId: string, name: string, value: string) {
        checkLock();
        const headers = new Headers(current.headers);
        headers.set(name, value);
        current = new Response(current.body, {
          ...current,
          headers,
        });
      },
      getStatus(ruleId: string) {
        return current.status;
      },
      setStatus(ruleId: string, status: number) {
        checkLock();
        current = new Response(current.body, {
          ...current,
          status,
        });
      },
    },
  };
};
