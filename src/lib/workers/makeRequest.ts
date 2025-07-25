import { Worker } from "node:worker_threads";

// our on-demand worker code for a synchronous flush
const workerCode = /* js */ `
const {
  parentPort, workerData: { notifyHandle, data }
} = require('worker_threads');

const run = async () => {
  try {
    await fetch(data.url, data.requestInit);
  }
  catch {}
  finally {
    Atomics.store(notifyHandle, 0, 1);
    Atomics.notify(notifyHandle, 0);
  }
};

// ensure we run on the next tick
setTimeout(run, 0);
`;

type Options = {
  url: string;
  requestInit: RequestInit;
};

export const makeSynchronousRequest = (options: Options) => {
  // worker setup
  const notifyHandle = new Int32Array(new SharedArrayBuffer(4));
  const headers = [...new Headers(options.requestInit.headers).entries()];

  const w = new Worker(workerCode, {
    eval: true,
    workerData: {
      notifyHandle,
      data: {
        url: options.url,
        requestInit: {
          method: options.requestInit.method,
          headers,
          body: options.requestInit.body,
        },
      },
    },
  });

  // wait for notify
  Atomics.wait(notifyHandle, 0, 0);
  w.terminate();
};
