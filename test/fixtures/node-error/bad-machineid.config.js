import { taskless } from "../../../src/node";

// this config fails because it contains a machine id outside of 0-1023
const t = taskless("secret", {
  machineId: 5000,
});
