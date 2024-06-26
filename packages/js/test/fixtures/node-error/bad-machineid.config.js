import { taskless } from "../../../src/node.js";

// this config fails because it contains a machine id outside of 0-1023
// eslint-disable-next-line no-unused-vars
const t = taskless("secret", {
  machineId: 5000,
});
