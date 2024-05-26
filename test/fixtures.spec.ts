import anyTest, { type TestFn } from "ava";
import { dashrConfig } from "./helpers/dashr.js";
import { type UseLocalLogs, useLocalLogs } from "./helpers/localLogs.js";
import { type UseServer, useServer } from "./helpers/server.js";
import { withContext } from "./helpers/withContext.js";

const test = withContext(anyTest)
  .use<UseServer>(useServer())
  .use<UseLocalLogs>(useLocalLogs())
  .build();

test("Can load a fixture properly", async (t) => {
  await dashrConfig("node.config.js");
  t.pass("Loaded a fixture");
});
