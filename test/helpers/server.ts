import http from "node:http";
import test, { type TestFn } from "ava";
import getPort from "get-port";

export type UseServer<T extends string> = {
  server: {
    [key in T]: {
      instance: http.Server;

      host: string;
      logs: ServerLog[];
    };
  };
};

// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
type GlobalThisWithServerShim = typeof globalThis & {
  [key: string]: string;
};

type ServerLog = {
  url: string;
};

/** Enables a receiving server for requests, and adds the host URL to the globalThis for the test duration */
export const useServer =
  (id: string) =>
  (test: TestFn<UseServer<typeof id>>): TestFn<UseServer<typeof id>> => {
    test.beforeEach(async (t) => {
      const logs: ServerLog[] = [];
      const server = http.createServer((request, response) => {
        logs.push({
          url: request.url ?? "",
        });

        response.writeHead(200, undefined, {
          "content-type": "application/json",
        });
        response.end(
          JSON.stringify({
            url: request.url,
          })
        );
      });

      const port = await getPort();
      const host = `http://localhost:${port}`;

      await new Promise<{
        server: http.Server;
        host: string;
        logs: ServerLog[];
      }>((resolve) => {
        server.listen(port, "localhost", () => {
          resolve({ server, host, logs });
        });
      });

      // shim into global
      (globalThis as GlobalThisWithServerShim)[id] = host;

      t.context.server = {
        ...t.context.server,
        [id]: {
          instance: server,
          host,
          logs,
        },
      };
    });

    test.afterEach.always((t) => {
      t.context.server[id].instance.close();
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (globalThis as Partial<GlobalThisWithServerShim>)[id];
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete t.context.server[id];
    });

    return test;
  };
