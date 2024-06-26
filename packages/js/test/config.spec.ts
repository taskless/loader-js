import anyTest, { type TestFn } from "ava";
import { dashrConfig } from "./helpers/dashr.js";
import { type UseLocalLogs, useLocalLogs } from "./helpers/localLogs.js";
import { type UseServer, useServer } from "./helpers/server.js";
import { withContext } from "./helpers/withContext.js";

const test = withContext(anyTest)
  .use<UseServer<"TSKL_HOST">>(useServer("TSKL_HOST"))
  .use<UseLocalLogs>(useLocalLogs())
  .build();

test("Requires explicit local mode opt-in when no secret is set", async (t) => {
  await t.throwsAsync(async () => {
    await dashrConfig("node-error/missing-local.config.js");
  });
});

test("Requires a machineId 0-1023 for snowflake compatibility", async (t) => {
  await t.throwsAsync(async () => {
    await dashrConfig("node-error/bad-machineid.config.js");
  });
});
