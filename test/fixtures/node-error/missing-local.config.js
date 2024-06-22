import { taskless } from "../../../src/node";

// this config fails because it has no secret, and local mode is not explicitly set
const t = taskless(undefined);
