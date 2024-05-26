import test, { type TestFn } from "ava";

export type UseLocalLogs = {
  localLogs: {
    logId: string;
    logs: string[];
  };
};

type GlobalThisWithLogShim = typeof globalThis & {
  TSKL_LOG: (typeof console)["log"];
};

/** Enables capturing of local Taskless shim logs */
export const useLocalLogs =
  () =>
  (test: TestFn<UseLocalLogs>): TestFn<UseLocalLogs> => {
    test.beforeEach((t) => {
      const logs: string[] = [];
      const log = (structuredLog: string) => {
        logs.push(structuredLog);
      };

      // shim global
      (globalThis as GlobalThisWithLogShim).TSKL_LOG = log;

      t.context.localLogs = {
        logs,
        logId: `inst-${Math.random()}`,
      };
    });

    test.afterEach.always((t) => {
      delete (globalThis as Partial<GlobalThisWithLogShim>).TSKL_LOG;
    });

    return test;
  };
