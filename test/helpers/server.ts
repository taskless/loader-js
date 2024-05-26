import http from "node:http";
import test, { type TestFn } from "ava";
import getPort from "get-port";

export type UseServer = {
  server: {
    instance: http.Server;

    host: string;
    logs: ServerLog[];
  };
};

type GlobalThisWithServerShim = typeof globalThis & {
  TSKL_HOST: string;
};

type ServerLog = {
  url: string;
};

/** Enables a receiving server for requests, and adds the host URL to the globalThis for the test duration */
export const useServer =
  () =>
  (test: TestFn<UseServer>): TestFn<UseServer> => {
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
      (globalThis as GlobalThisWithServerShim).TSKL_HOST = host;

      t.context.server = {
        instance: server,
        host,
        logs,
      };
    });

    test.afterEach.always((t) => {
      delete (globalThis as Partial<GlobalThisWithServerShim>).TSKL_HOST;
      t.context.server.instance.close();
    });

    return test;
  };
