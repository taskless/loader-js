import { type RequestEvent } from "@~/types.js";
import anyTest, { type TestFn } from "ava";
import { type PartialDeep } from "type-fest";
import { dashrConfig } from "./helpers/dashr.js";
import { type UseLocalLogs, useLocalLogs } from "./helpers/localLogs.js";
import { type UseServer, useServer } from "./helpers/server.js";
import { withContext } from "./helpers/withContext.js";

const test = withContext(anyTest)
  .use<UseServer<"TSKL_HOST">>(useServer("TSKL_HOST"))
  .use<UseServer<"ENDPOINT">>(useServer("ENDPOINT"))
  .use<UseLocalLogs>(useLocalLogs())
  .build();

test("Can use a provided msw & logging instance", async (t) => {
  await dashrConfig("node.config.js");

  // now call something in the shim, which should hit the server and make logs
  const tsklTrigger = await fetch(
    `${t.context.server.TSKL_HOST.host}/wildcards/trigger`
  );
  const tsklJson = (await tsklTrigger.json()) as Record<string, any>;
  t.deepEqual(tsklJson.url, "/wildcards/trigger", "Passed through to server");

  // make sure we call an endpoint that enables payload passing too
  const tsklWithPayload = await fetch(
    `${t.context.server.TSKL_HOST.host}/payloads`,
    {
      headers: {
        "x-from-test": "1",
      },
    }
  );

  const tasklessLog = JSON.parse(
    t.context.localLogs.logs[0] ?? "{}"
  ) as PartialDeep<RequestEvent>;

  t.truthy(
    (tasklessLog.url ?? "").includes("/wildcards/trigger"),
    "Performed logging event"
  );
});
